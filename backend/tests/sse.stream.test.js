const http = require('http')
const { MongoMemoryServer } = require('mongodb-memory-server')

function assert(value, message) { if (!value) throw new Error(`ASSERTION FAILED: ${message}`); console.log(`  ok - ${message}`) }

async function main() {
  const mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri('sse_test')
  process.env.ASI_ONE_API_KEY = 'TEST_KEY'
  const mongoose = require('mongoose')
  const { connectDB } = require('../src/config/db')
  const app = require('../src/app')
  const asiOne = require('../src/services/asiOne.service')
  const { toolRegistry } = require('../src/tools/toolRegistry')
  const original = { understand: asiOne.understandIntent, chat: asiOne.createChatCompletion, find: toolRegistry.findFacilities.execute }
  let server
  try {
    await connectDB()
    asiOne.understandIntent = async () => ({ intent: 'find_facility', confidence: 0.9, locationRequired: true })
    let call = 0
    asiOne.createChatCompletion = async () => (++call === 1 ? { tool_calls: [{ id: 'tool-1', function: { name: 'findFacilities', arguments: '{"serviceType":"hospital"}' } }] } : { content: 'A verified facility was found.' })
    toolRegistry.findFacilities.execute = async () => ({ facilities: [] })
    server = await new Promise((resolve) => { const instance = app.listen(0, () => resolve(instance)) })
    const port = server.address().port
    const result = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/ai/stream?message=Find%20hospital&location=${encodeURIComponent('{"lat":28.6,"lng":77.2}')}`, (res) => {
        let body = ''; res.setEncoding('utf8'); res.on('data', (chunk) => { body += chunk }); res.on('end', () => resolve({ headers: res.headers, body }))
      }).on('error', reject)
    })
    assert(result.headers['content-type'].startsWith('text/event-stream'), 'SSE endpoint returns event-stream headers')
    for (const type of ['agent_started', 'intent_detected', 'planning_started', 'planning_completed', 'tool_started', 'tool_completed', 'final_response', 'agent_completed']) assert(result.body.includes(`event: ${type}`), `${type} is emitted from actual planner execution`)
    assert(!result.body.includes('TEST_KEY') && !result.body.includes('MONGODB_URI'), 'stream never exposes secrets')
    await new Promise((resolve, reject) => {
      const request = http.get(`http://127.0.0.1:${port}/api/ai/stream?message=Find%20hospital&location=${encodeURIComponent('{"lat":28.6,"lng":77.2}')}`, (res) => {
        res.once('data', () => { res.destroy(); resolve() })
      })
      request.on('error', reject)
    })
    const health = await new Promise((resolve, reject) => http.get(`http://127.0.0.1:${port}/api/health`, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)) }).on('error', reject))
    assert(health === 200, 'client disconnect does not crash the backend')
    console.log('\nAll Phase 11 SSE Tests passed.')
  } finally {
    Object.assign(asiOne, { understandIntent: original.understand, createChatCompletion: original.chat })
    toolRegistry.findFacilities.execute = original.find
    if (server) await new Promise((resolve) => server.close(resolve))
    await mongoose.disconnect(); await mongod.stop()
  }
}
main().catch((error) => { console.error('\nTest failed:', error.message); process.exit(1) })
