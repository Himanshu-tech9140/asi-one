const { MongoMemoryServer } = require('mongodb-memory-server')
function assert(value, message) { if (!value) throw new Error(`ASSERTION FAILED: ${message}`); console.log(`  ok - ${message}`) }
async function main() {
  const mongod = await MongoMemoryServer.create(); process.env.MONGODB_URI = mongod.getUri('planner_test'); process.env.ASI_ONE_API_KEY = 'TEST_KEY'
  const mongoose = require('mongoose'); const { connectDB } = require('../src/config/db'); const asiOne = require('../src/services/asiOne.service'); const { toolRegistry } = require('../src/tools/toolRegistry'); const planner = require('../src/services/asiPlanner.service'); const ToolExecution = require('../src/models/ToolExecution')
  const original = { understand: asiOne.understandIntent, chat: asiOne.createChatCompletion, find: toolRegistry.findFacilities.execute, route: toolRegistry.calculateRoute.execute }
  try {
    await connectDB(); asiOne.understandIntent = async () => ({ intent: 'find_facility', serviceType: 'hospital', needsRoute: false, locationRequired: true, confidence: 0.9 })
    toolRegistry.findFacilities.execute = async () => ({ facilities: [{ id: 'facility-1', placeId: 'facility-1', name: 'Test Hospital', location: { lat: 28.62, lng: 77.36 } }] }); toolRegistry.calculateRoute.execute = async () => ({ distanceMeters: 1200, durationSeconds: 300, distanceText: '1.2 km', durationText: '5 min' })
    let calls = 0; asiOne.createChatCompletion = async () => (++calls === 1 ? { tool_calls: [{ id: 'call-1', function: { name: 'findFacilities', arguments: '{"serviceType":"hospital","radius":5000}' } }] } : { content: 'I found a nearby hospital.' })
    const hospital = await planner.runPlan({ message: 'Find a hospital', location: { lat: 28.61, lng: 77.20 } })
    assert(hospital.status === 'completed' && hospital.steps.length === 1, 'hospital search executes one mocked tool'); assert((await ToolExecution.countDocuments({ coordinationId: hospital.coordinationId })) === 1, 'tool execution is logged')
    assert(hospital.finalResponse.includes('Test Hospital') && !hospital.finalResponse.includes('RML Hospital'), 'final response is grounded in Facility A instead of model narrative')
    toolRegistry.findFacilities.execute = async () => ({ facilities: [{ id: 'facility-b', placeId: 'facility-b', name: 'Facility B', address: 'B Address', location: { lat: 28.63, lng: 77.37 } }] })
    calls = 0; asiOne.createChatCompletion = async () => (++calls === 1 ? { tool_calls: [{ id: 'call-b', function: { name: 'findFacilities', arguments: '{"serviceType":"hospital"}' } }] } : { content: 'Unrelated Hospital' })
    const facilityB = await planner.runPlan({ message: 'Find another hospital', location: { lat: 28.61, lng: 77.20 } })
    assert(facilityB.finalResponse.includes('Facility B') && !facilityB.finalResponse.includes('Unrelated Hospital'), 'final response is grounded in Facility B')
    toolRegistry.findFacilities.execute = async () => ({ facilities: [] })
    calls = 0; asiOne.createChatCompletion = async () => (++calls === 1 ? { tool_calls: [{ id: 'call-empty', function: { name: 'findFacilities', arguments: '{"serviceType":"hospital"}' } }] } : { content: 'Invented Hospital' })
    const empty = await planner.runPlan({ message: 'Find an unavailable hospital', location: { lat: 28.61, lng: 77.20 } })
    assert(empty.finalResponse === 'No facility was confirmed for this request.', 'empty facility search never invents a facility')
    toolRegistry.findFacilities.execute = async () => ({ facilities: [{ id: 'facility-1', placeId: 'facility-1', name: 'Test Hospital', location: { lat: 28.62, lng: 77.36 } }] })
    calls = 0; asiOne.createChatCompletion = async () => (++calls === 1 ? { tool_calls: [{ id: 'call-2', function: { name: 'findFacilities', arguments: '{"serviceType":"emergency"}' } }] } : calls === 2 ? { tool_calls: [{ id: 'call-3', function: { name: 'calculateRoute', arguments: '{"facilityId":"facility-1"}' } }] } : { content: 'Google Routes estimates five minutes.' })
    const route = await planner.runPlan({ message: 'Find emergency hospital and route', location: { lat: 28.61, lng: 77.20 } }); assert(route.steps.length === 2 && route.result.calculateRoute.durationSeconds === 300, 'facility plus route multi-step flow works'); assert(route.finalResponse.includes('Test Hospital') && !route.finalResponse.includes('Google Routes estimates'), 'route narrative names the tool-selected facility')
    toolRegistry.findFacilities.execute = async () => { throw new Error('provider failure') }
    calls = 0; asiOne.createChatCompletion = async () => ({ tool_calls: [{ id: 'call-fail', function: { name: 'findFacilities', arguments: '{"serviceType":"hospital"}' } }] })
    await planner.runPlan({ message: 'Fail safely', location: { lat: 28.61, lng: 77.20 } }).then(() => { throw new Error('expected tool failure') }, () => {})
    assert(true, 'tool failure returns no successful facility response')
    toolRegistry.findFacilities.execute = async () => ({ facilities: [{ id: 'facility-1', placeId: 'facility-1', name: 'Test Hospital', location: { lat: 28.62, lng: 77.36 } }] })
    const missing = await planner.runPlan({ message: 'Find a hospital', location: null }); assert(missing.status === 'location_required', 'missing location stops before tool execution'); console.log('\nAll Phase 7 Planner Tests passed.')
  } finally { asiOne.understandIntent = original.understand; asiOne.createChatCompletion = original.chat; toolRegistry.findFacilities.execute = original.find; toolRegistry.calculateRoute.execute = original.route; await mongoose.disconnect(); await mongod.stop() }
}
main().catch((error) => { console.error('\nTest failed:', error.message); process.exit(1) })
