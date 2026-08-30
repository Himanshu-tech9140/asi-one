const mongoose = require('mongoose')
const { env } = require('./env')

// MongoDB connection manager.
//
// Design decision: the app must not crash if MongoDB is temporarily
// unavailable (e.g. during local dev without a running mongod).
// We attempt to connect, log the outcome, and expose a helper
// `isConnected()` used by the health endpoint so callers can see
// connection state instead of the server dying.
//
// SECURITY: The full connection string (which may contain credentials)
// is NEVER printed to the logs. We only log a redacted host/name.

// Strip any userinfo (and password) from a mongodb URI before logging,
// e.g.  mongodb+srv://user:pass@cluster -> mongodb+srv://...@cluster
function redactUri(uri) {
  if (!uri || typeof uri !== 'string') return ''
  try {
    return uri.replace(/^(mongodb(\+srv)?:\/\/)([^@/]+)@/, '$1***@')
  } catch {
    return '<uri>'
  }
}

const state = {
  connected: false,
  lastError: null,
}

async function connectDB() {
  try {
    mongoose.set('strictQuery', true)
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    })
    state.connected = true
    state.lastError = null
    console.log(`[db] MongoDB connected: ${redactUri(env.mongoUri)}`)
  } catch (err) {
    state.connected = false
    state.lastError = err.message
    console.error(`[db] MongoDB connection failed: ${err.message}`)
  }
  return state
}

mongoose.connection.on('disconnected', () => {
  state.connected = false
  console.warn('[db] MongoDB disconnected')
})

mongoose.connection.on('error', (err) => {
  state.connected = false
  state.lastError = err.message
  console.error('[db] MongoDB error:', err.message)
})

async function disconnectDB() {
  try {
    await mongoose.connection.close()
    state.connected = false
    console.log('[db] MongoDB connection closed')
  } catch (err) {
    console.error('[db] Error closing MongoDB connection:', err.message)
  }
}

function isConnected() {
  return (
    state.connected &&
    mongoose.connection.readyState === 1
  )
}

module.exports = {
  connectDB,
  disconnectDB,
  isConnected,
  getDbState: () => ({
    connected: isConnected(),
    lastError: state.lastError,
  }),
}
