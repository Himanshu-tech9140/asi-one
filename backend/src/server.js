const app = require('./app')
const { env } = require('./config/env')
const { connectDB, disconnectDB, getDbState } = require('./config/db')

// --- Process-level safety nets (no unhandled rejections) ---
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason)
  // Log and continue; the process should not crash for a stray rejection.
})

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err)
  process.exit(1)
})

async function startServer() {
  // Connect to MongoDB. The db module never throws on failure, so the
  // app can still boot (health endpoint reports "disconnected").
  await connectDB()

  const server = app.listen(env.port, () => {
    const dbState = getDbState()
    console.log(`[server] CrisisFlow API running on port ${env.port}`)
    console.log(`[server] Environment: ${env.nodeEnv}`)
    console.log(`[server] CORS origin: ${env.corsOrigin}`)
    console.log(
      `[server] Database: ${dbState.connected ? 'connected' : 'disconnected'}`,
    )
  })

  // Graceful shutdown: close the HTTP server and the MongoDB connection.
  const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} received, shutting down gracefully...`)
    server.close(async () => {
      try {
        await disconnectDB()
      } finally {
        console.log('[server] HTTP server closed')
        process.exit(0)
      }
    })
    // Force exit if connections hang
    setTimeout(() => process.exit(1), 5000).unref()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

startServer()
