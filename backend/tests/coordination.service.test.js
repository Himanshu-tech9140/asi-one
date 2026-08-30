// Lightweight integration test for the DB-backed services.
// Runs against an in-memory MongoDB so it never touches any
// configured real database and leaves no residual data.
//
// Run: npm test
//
// NOTE: MONGODB_URI must be set BEFORE loading config modules
// (dotenv will not override an already-set variable).

const { MongoMemoryServer } = require('mongodb-memory-server')

async function main() {
  const mongod = await MongoMemoryServer.create()
  const memoryUri = mongod.getUri('crisisflow_test')

  // Override before any config module loads
  process.env.MONGODB_URI = memoryUri

  const mongoose = require('mongoose')
  const { connectDB, isConnected } = require('../src/config/db')
  const coordinationService = require('../src/services/coordination.service')
  const historyService = require('../src/services/history.service')
  const ToolExecution = require('../src/models/ToolExecution')

  function assert(cond, msg) {
    if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`)
    console.log(`  ok - ${msg}`)
  }

  try {
    await connectDB()
    console.log('Verifying DB-backed services...')
    assert(isConnected(), 'mongodb connected')

    // 1. create coordination
    const created = await coordinationService.createCoordination({
      request: 'Find the best emergency facility near me',
      location: { lat: 28.62, lng: 77.36 },
      preferences: { serviceType: 'emergency', maxDistance: 10000 },
    })
    assert(created.id, 'createCoordination returns an id')
    assert(created.status === 'completed', 'coordination status is completed')
    assert(Array.isArray(created.steps) && created.steps.length >= 3, 'coordination has steps')
    assert(
      created.intent && created.intent.type === 'facility_search',
      'intent understood as facility_search',
    )
    assert(
      created.recommendation && created.recommendation.name === 'CityCare Emergency Center',
      'recommendation built',
    )
    assert(created.alternatives.length === 2, 'has alternatives')

    // 2. tool executions persisted
    const tools = await ToolExecution.find({ coordinationId: created.id })
    assert(tools.length === 3, 'three tool execution records persisted')
    assert(tools.every((t) => t.status === 'completed'), 'tool executions completed')

    // 3. get by id
    const fetched = await coordinationService.getCoordinationById(created.id)
    assert(
      fetched.request === 'Find the best emergency facility near me',
      'getCoordinationById returns record',
    )

    // 4. history
    const hist = await historyService.getHistory({ page: 1, limit: 10 })
    assert(hist.items.length === 1, 'history has one item')
    assert(hist.pagination.total === 1, 'history pagination total correct')
    assert(
      hist.items[0].recommendation === 'CityCare Emergency Center',
      'history recommendation populated',
    )

    // 4b. history status filter (the created record is "completed")
    const completedHist = await historyService.getHistory({ page: 1, limit: 10, status: 'completed' })
    assert(completedHist.pagination.total === 1, 'history status filter (completed) returns the record')
    const pendingHist = await historyService.getHistory({ page: 1, limit: 10, status: 'pending' })
    assert(pendingHist.pagination.total === 0, 'history status filter (pending) excludes record')
    const allStatus = await historyService.getHistory({ page: 1, limit: 10, status: 'All' })
    assert(allStatus.pagination.total === 1, 'history status filter "All" returns all')

    // 5. 404 for unknown id (valid format, not present)
    let notFoundThrown = false
    try {
      await coordinationService.getCoordinationById('000000000000000000000000')
    } catch (e) {
      notFoundThrown = e.statusCode === 404
    }
    assert(notFoundThrown, 'unknown coordination (valid id) returns 404')

    // 5b. 400 for invalid id (malformed ObjectId)
    let badRequestThrown = false
    try {
      await coordinationService.getCoordinationById('not-a-valid-id')
    } catch (e) {
      badRequestThrown = e.statusCode === 400
    }
    assert(badRequestThrown, 'invalid coordination id returns 400')

    console.log('\nAll DB-backed service tests passed.')
  } finally {
    await mongoose.disconnect()
    await mongod.stop()
  }
}

main().catch((err) => {
  console.error('\nTest failed:', err.message)
  process.exit(1)
})
