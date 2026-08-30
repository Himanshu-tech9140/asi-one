const express = require('express')
const { isConnected } = require('../config/db')

const router = express.Router()

// Health check — should never throw even if MongoDB is down.
router.get('/', (req, res) => {
  const dbConnected = isConnected()
  res.json({
    success: true,
    message: 'CrisisFlow API is running',
    timestamp: new Date().toISOString(),
    services: {
      api: 'healthy',
      database: dbConnected ? 'connected' : 'disconnected',
    },
  })
})

module.exports = router
