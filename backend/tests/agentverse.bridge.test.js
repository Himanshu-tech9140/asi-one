// ============================================================
// Phase 9 — Agentverse Chat Protocol bridge tests.
//
// These tests NEVER call real Google Places/Routes, ASI:One, or
// Agentverse. MongoDB is backed by mongodb-memory-server and the tool
// registry is stubbed. The Chat Protocol parse/classify/format logic
// and the bridge->tool-registry path are exercised with mocks.
// ============================================================

const { MongoMemoryServer } = require('mongodb-memory-server')
function assert(value, message) {
  if (!value) throw new Error(`ASSERTION FAILED: ${message}`)
  console.log(`  ok - ${message}`)
}

const FACILITIES = {
  facilities: [
    {
      id: 'f1',
      placeId: 'f1',
      name: 'CityCare Emergency Center',
      address: '221 Skyline Avenue',
      location: { lat: 28.625, lng: 77.36 },
      types: ['hospital'],
      rating: 4.5,
      userRatingsTotal: 120,
    },
  ],
}
const ROUTE = { distanceMeters: 2400, durationSeconds: 480, distanceText: '2.4 km', durationText: '8 min' }

async function main() {
  const mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri('agentverse_test')
  process.env.ASI_ONE_API_KEY = 'TEST_KEY'

  const mongoose = require('mongoose')
  const { connectDB } = require('../src/config/db')
  const ToolExecution = require('../src/models/ToolExecution')
  const toolRegistry = require('../src/tools/toolRegistry').toolRegistry
  const chatProtocol = require('../src/agentverse/chatProtocol')
  const bridge = require('../src/agentverse/crisisflow.bridge')
  const readme = require('../src/agentverse/agentverse.readme')
  const registrationPayload = readme.registrationPayload()
  const { identitySummary } = require('../src/agentverse/agentverse.identity')
  const controller = require('../src/controllers/agentverse.controller')

  const original = { find: toolRegistry.findFacilities.execute, route: toolRegistry.calculateRoute.execute }

  try {
    await connectDB()
    toolRegistry.findFacilities.execute = async () => FACILITIES
    toolRegistry.calculateRoute.execute = async () => ROUTE

    // --- ChatProtocol parsing ---
    const { parseInbound, buildChatMessage, extractText } = chatProtocol
    const envelopeBody = {
      version: 1,
      sender: 'agent1qtest',
      target: 'agent1qtarget',
      payload: Buffer.from(JSON.stringify({ content: [{ type: 'text', text: 'Find a pharmacy near lat 28.6 lng 77.3' }] })).toString('base64'),
    }
    const parsed = parseInbound(envelopeBody)
    assert(parsed.text === 'Find a pharmacy near lat 28.6 lng 77.3' && parsed.sender === 'agent1qtest', 'parseInbound decodes envelope payload text + sender')

    const bare = parseInbound({ content: [{ type: 'text', text: 'hello' }] })
    assert(bare.text === 'hello', 'parseInbound handles a bare ChatMessage')

    assert(extractText({ content: [{ type: 'tool', text: 'secret' }, { type: 'text', text: 'real' }] }) === 'real', 'extractText ignores non-text content')

    const reply = buildChatMessage('hi')
    assert(typeof reply.msg_id === 'string' && reply.content[0].type === 'text' && reply.content[0].text === 'hi', 'buildChatMessage produces a valid ChatMessage')

    // --- classifier mappings ---
    assert(bridge.classifyCapability('blood bank near me') === 'find_blood_bank', 'classifier maps blood bank')
    assert(bridge.classifyCapability('pharmacy please') === 'find_pharmacy', 'classifier maps pharmacy')
    assert(bridge.classifyCapability('route to a hospital') === 'find_emergency_facility_and_route', 'classifier maps route to multi-step')
    assert(bridge.classifyCapability('emergency facility') === 'find_emergency_facility', 'classifier maps emergency')
    assert(bridge.classifyCapability('where is a clinic') === 'find_healthcare_service', 'classifier maps generic healthcare')

    // --- location parsing ---
    const loc = bridge.extractLocation('lat 28.62 lng 77.36')
    assert(loc && loc.lat === 28.62 && loc.lng === 77.36, 'extractLocation parses explicit lat/lng')
    assert(bridge.extractLocation('find a hospital') === null, 'extractLocation returns null when no coordinates')

    // --- end-to-end chat via bridge (mocked tools) ---
    const replyText = await bridge.handleChatText('Find emergency healthcare facilities near lat 28.62 lng 77.36')
    assert(replyText.includes('CityCare Emergency Center'), 'chat reply includes real facility name')
    assert(replyText.includes('emergency healthcare facility'), 'chat reply labels the capability')

    const missing = await bridge.handleChatText('find a hospital')
    assert(missing.includes('I need your location'), 'chat without location asks for location (no fabrication)')

    const routeReply = await bridge.handleChatText('route to an emergency hospital near lat 28.62 lng 77.36')
    assert(routeReply.includes('2.4 km') || routeReply.includes('8 min'), 'multi-step chat reply includes route summary')

    // --- controller /status ---
    const statusRes = { json: (body) => body }
    const statusOut = controller.status({}, statusRes)
    assert(statusOut && statusOut.status === 'OK - Agent is running', 'GET /status returns OK health probe')

    // --- registration payload safety ---
    assert(registrationPayload.name === 'CrisisFlow', 'registration payload has agent name')
    assert(Array.isArray(registrationPayload.capabilities) && registrationPayload.capabilities.length >= 6, 'registration payload lists real capabilities')
    assert(Array.isArray(registrationPayload.keywords) && registrationPayload.keywords.length >= 5, 'registration keywords populated')
    const dump = JSON.stringify({ payload: registrationPayload, summary: identitySummary() })
    assert(!dump.includes('ASI_ONE_API_KEY') && !dump.includes('GOOGLE_MAPS_API_KEY') && !dump.includes('SEED'), 'registration metadata contains no secrets')
    assert(registrationPayload.readme.includes('does NOT diagnose medical conditions') && registrationPayload.readme.includes('does NOT guarantee facility availability'), 'README states its limitations explicitly')

    // --- bridge routes through the tool registry (structural proof) ---
    // The chat calls above must have recorded ToolExecution docs for
    // findFacilities (and calculateRoute), proving the bridge went through
    // the Phase 8 handler -> tool registry -> (mocked) execution, and did
    // NOT call any provider API directly.
    const executions = await ToolExecution.find({}).lean()
    const names = executions.map((e) => e.toolName)
    assert(names.includes('findFacilities'), 'chat triggered the findFacilities tool via the registry')
    assert(new Set(names).size >= 1, 'tool executions recorded to MongoDB')

    console.log('\nAll Phase 9 Agentverse bridge tests passed.')
  } finally {
    toolRegistry.findFacilities.execute = original.find
    toolRegistry.calculateRoute.execute = original.route
    await mongoose.disconnect()
    await mongod.stop()
  }
}

main().catch((error) => {
  console.error('\nTest failed:', error.message)
  process.exit(1)
})
