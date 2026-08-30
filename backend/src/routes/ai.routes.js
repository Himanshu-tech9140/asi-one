const express = require('express')
const rateLimit = require('express-rate-limit')
const aiController = require('../controllers/ai.controller')

const router = express.Router()

// ASI:One is a metered external API.  Keep a separate, conservative limit
// in addition to the general API limiter so a browser/client bug cannot
// consume the AI quota quickly.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many AI requests, please try again later',
  },
})

// POST /api/ai/understand
// Accept a user message and return structured intent understanding
router.post('/understand', aiLimiter, aiController.understand)
router.post('/plan', aiLimiter, aiController.plan)
router.get('/stream', aiLimiter, aiController.stream)

module.exports = router
