// ============================================================
// Phase 8 — CrisisFlow Agent + ACP tests.
//
// These tests NEVER call real Google Places/Routes or ASI:One APIs.
// MongoDB is backed by mongodb-memory-server and the registered tool
// registry executions are stubbed. Every external provider is mocked.
// ============================================================

const { MongoMemoryServer } = require('mongodb-memory-server')
function assert(value, message) {
  if (!value) throw new Error(`ASSERTION FAILED: ${message}`)
  console.log(`  ok - ${message}`)
}

const SAMPLE_FACILITIES = [
  {
    id: 'facility-1',
    placeId: 'facility-1',
    name: 'CityCare Emergency Center',
    address: '221 Skyline Avenue',
    location: { lat: 28.625, lng: 77.36 },
    types: ['hospital', 'health'],
    rating: 4.5,
    userRatingsTotal: 120,
  },
  {
    id: 'facility-2',
    placeId: 'facility-2',
    name: 'MetroBlood Bank',
    address: '12 Donor Street',
    location: { lat: 28.61, lng: 77.31 },
    types: ['blood_bank'],
    rating: 4.1,
    userRatingsTotal: 40,
  },
]

const SAMPLE_ROUTE = {
  distanceMeters: 2400,
  durationSeconds: 480,
  distanceText: '2.4 km',
  durationText: '8 min',
}

const EMPTY_FACILITIES = { facilities: [] }
const FACILITIES = { facilities: SAMPLE_FACILITIES }

async function main() {
  const mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri('acp_test')
  process.env.ASI_ONE_API_KEY = 'TEST_KEY'

  const mongoose = require('mongoose')
  const { connectDB } = require('../src/config/db')
  const { handleACPRequest } = require('../src/agents/crisisflow/crisisflow.agent')
  const { toolRegistry } = require('../src/tools/toolRegistry')
  const { isCapability, capabilityNames, publicCapabilities } = require('../src/agents/crisisflow/crisisflow.manifest')
  const ToolExecution = require('../src/models/ToolExecution')
  const Coordination = require('../src/models/Coordination')

  const original = {
    find: toolRegistry.findFacilities.execute,
    route: toolRegistry.calculateRoute.execute,
  }

  async function mocks() {
    toolRegistry.findFacilities.execute = async (args, context) => {
      if (args && args.serviceType === 'blood_bank') {
        return { facilities: SAMPLE_FACILITIES.slice(1) }
      }
      if (args && args.serviceType === 'pharmacy') {
        return EMPTY_FACILITIES
      }
      return FACILITIES
    }
    toolRegistry.calculateRoute.execute = async (args, context) => SAMPLE_ROUTE
  }

  try {
    await connectDB()
    await mocks()

    assert(capabilityNames().includes('find_emergency_facility'), 'manifest declares find_emergency_facility')
    assert(capabilityNames().includes('find_healthcare_service'), 'manifest declares find_healthcare_service')
    assert(capabilityNames().includes('find_pharmacy'), 'manifest declares find_pharmacy')
    assert(capabilityNames().includes('find_blood_bank'), 'manifest declares find_blood_bank')
    assert(capabilityNames().includes('calculate_route'), 'manifest declares calculate_route')
    assert(capabilityNames().includes('find_emergency_facility_and_route'), 'manifest declares find_emergency_facility_and_route')
    assert(isCapability('find_pharmacy') && !isCapability('drop_database'), 'capability allow-list works')

    // 1. valid ACP request envelope (initialize)
    let rpc = await handleACPRequest({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
    assert(rpc.jsonrpc === '2.0' && rpc.id === 1 && !rpc.error, 'initialize returns a valid ACP success envelope')
    assert(rpc.result.agent.name === 'CrisisFlow', 'initialize returns agent name')
    assert(Array.isArray(rpc.result.capabilities) && rpc.result.capabilities.length >= 6, 'initialize returns capability manifest')
    assert(rpc.result.agent.id === 'crisisflow-agent', 'initialize returns configured agent id')

    // 2. invalid ACP request (wrong jsonrpc version)
    rpc = await handleACPRequest({ jsonrpc: '1.0', id: 2, method: 'initialize' })
    assert(rpc.error && rpc.error.code === -32600, 'invalid jsonrpc version yields INVALID_REQUEST error')

    // 3. unknown capability -> method not found
    rpc = await handleACPRequest({ jsonrpc: '2.0', id: 3, method: 'find_unsupported_thing', params: { location: { lat: 28.62, lng: 77.36 } } })
    assert(rpc.error && rpc.error.code === -32601, 'unknown capability yields METHOD_NOT_FOUND error')

    // 4. emergency facility request
    rpc = await handleACPRequest({ jsonrpc: '2.0', id: 4, method: 'find_emergency_facility', params: { location: { lat: 28.62, lng: 77.36 } } })
    assert(!rpc.error && rpc.result.facilityType === 'emergency', 'emergency facility request succeeds')
    assert(Array.isArray(rpc.result.facilities) && rpc.result.facilities.length > 0, 'emergency facility returns facilities')
    assert(rpc.result.facilities[0].name === 'CityCare Emergency Center', 'emergency facility returns real normalized facility')

    // 5. pharmacy request (empty result)
    rpc = await handleACPRequest({ jsonrpc: '2.0', id: 5, method: 'find_pharmacy', params: { location: { lat: 28.62, lng: 77.36 } } })
    assert(!rpc.error && rpc.result.facilityType === 'pharmacy', 'pharmacy request succeeds')
    assert(Array.isArray(rpc.result.facilities) && rpc.result.facilities.length === 0, 'pharmacy empty result is normalized')

    // 6. blood bank request
    rpc = await handleACPRequest({ jsonrpc: '2.0', id: 6, method: 'find_blood_bank', params: { location: { lat: 28.62, lng: 77.36 } } })
    assert(!rpc.error && rpc.result.facilities[0].types[0] === 'blood_bank', 'blood bank request filters to blood_bank')

    // 7. route request: without prior discovery the facility is not in
    //    context, so routing is safely rejected (never fabricated).
    rpc = await handleACPRequest({ jsonrpc: '2.0', id: 7, method: 'calculate_route', params: { origin: { lat: 28.62, lng: 77.36 }, facilityId: 'facility-1' } })
    assert(rpc.error && rpc.error.code === -32602, 'route request without discovered facility is rejected safely')
    assert(!JSON.stringify(rpc).includes('facility-1'), 'route rejection does not echo the facility payload')

    // 8. multi-step: facility + route
    rpc = await handleACPRequest({ jsonrpc: '2.0', id: 8, method: 'find_emergency_facility_and_route', params: { location: { lat: 28.62, lng: 77.36 } } })
    assert(!rpc.error, 'multi-step facility+route request succeeds')
    assert(rpc.result.selectedFacility && rpc.result.selectedFacility.name, 'multi-step selects a facility')
    assert(rpc.result.route && rpc.result.route.durationText === '8 min', 'multi-step returns a route')
    assert(rpc.result.facilities.length > 0 && rpc.result.route.distanceMeters === 2400, 'multi-step returns both facilities and route')

    // 9. invalid coordinates -> invalid params
    rpc = await handleACPRequest({ jsonrpc: '2.0', id: 9, method: 'find_emergency_facility', params: { location: { lat: 91, lng: 0 } } })
    assert(rpc.error && rpc.error.code === -32602, 'invalid latitude yields INVALID_PARAMS error')

    // 10. missing location -> invalid params
    rpc = await handleACPRequest({ jsonrpc: '2.0', id: 10, method: 'find_emergency_facility', params: {} })
    assert(rpc.error && rpc.error.code === -32602, 'missing location yields INVALID_PARAMS error')

    // 11. tool failure does not leak internal details
    toolRegistry.findFacilities.execute = async () => {
      throw new Error('Provider secret internal details')
    }
    rpc = await handleACPRequest({ jsonrpc: '2.0', id: 11, method: 'find_emergency_facility', params: { location: { lat: 28.62, lng: 77.36 } } })
    assert(rpc.error && rpc.error.code === -32603, 'tool failure yields INTERNAL_ERROR')
    assert(!JSON.stringify(rpc).includes('Provider secret internal'), 'tool failure does not leak internal error details')

    // 12. Google API failure mapped to safe error
    toolRegistry.findFacilities.execute = async () => {
      const { ApiError } = require('../src/utils/ApiError')
      throw ApiError.internal('Maps service is temporarily unavailable')
    }
    rpc = await handleACPRequest({ jsonrpc: '2.0', id: 12, method: 'find_emergency_facility', params: { location: { lat: 28.62, lng: 77.36 } } })
    assert(rpc.error && rpc.error.message.includes('unavailable'), 'Google API failure maps to safe message')
    assert(!JSON.stringify(rpc).includes('GOOGLE'), 'Google API failure never leaks provider details')

    // restore happy-path mocks for remaining tests
    await mocks()

    // 13. planner / unsupported service type rejected
    rpc = await handleACPRequest({ jsonrpc: '2.0', id: 13, method: 'find_healthcare_service', params: { location: { lat: 28.62, lng: 77.36 }, serviceType: 'drop_table' } })
    assert(rpc.error && rpc.error.code === -32602, 'invalid serviceType yields INVALID_PARAMS error')

    // 14. secret protection: input cannot carry keys into output
    rpc = await handleACPRequest({ jsonrpc: '2.0', id: 14, method: 'find_emergency_facility', params: { location: { lat: 28.62, lng: 77.36 }, apiKey: 'super-secret-123' } })
    assert(rpc.error && rpc.error.code === -32602, 'unknown params (e.g. apiKey) are rejected')
    assert(!JSON.stringify(rpc).includes('super-secret-123'), 'secrets cannot be echoed back')

    // 15. arbitrary tool rejection: unknown capability cannot invoke a tool
    rpc = await handleACPRequest({ jsonrpc: '2.0', id: 15, method: 'delete_all_records', params: {} })
    assert(rpc.error && rpc.error.code === -32601, 'arbitrary tool request is rejected')

    // arbitrary tool name inside params cannot execute
    rpc = await handleACPRequest({ jsonrpc: '2.0', id: 16, method: 'find_emergency_facility', params: { location: { lat: 28.62, lng: 77.36 }, tool: 'child_process' } })
    assert(rpc.error && rpc.error.code === -32602, 'arbitrary tool param is rejected')

    // 16. ACP response normalization
    rpc = await handleACPRequest({ jsonrpc: '2.0', id: 17, method: 'find_emergency_facility', params: { location: { lat: 28.62, lng: 77.36 } } })
    assert(rpc.jsonrpc === '2.0' && rpc.id === 17 && typeof rpc.result === 'object', 'ACP response envelope is normalized')
    assert(rpc.result.coordinationId, 'ACP response carries coordinationId')
    assert(!('polyline' in (rpc.result.facilities[0] || {})), 'ACP response does not expose provider-only fields')

    // --- MongoDB logging assertions ---
    const findExec = await ToolExecution.findOne({ toolName: 'findFacilities' }).sort({ createdAt: -1 })
    assert(findExec && findExec.status === 'completed', 'MongoDB logs findFacilities tool execution as completed')
    const coordination = await Coordination.findOne({ 'intent.type': 'find_emergency_facility' }).sort({ createdAt: -1 })
    assert(coordination && coordination.status === 'completed', 'MongoDB logs a completed coordination for the capability')
    assert(coordination && coordination.location.lat === 28.62, 'MongoDB logs the validated coordinates')

    // --- error handling for malformed body (non-object) ---
    rpc = await handleACPRequest('not an object')
    assert(rpc.error && rpc.error.code === -32600, 'non-object body yields INVALID_REQUEST error')

    console.log('\nAll Phase 8 CrisisFlow Agent + ACP tests passed.')
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
