const express = require('express')
const rateLimit = require('express-rate-limit')
const routeController = require('../controllers/route.controller')

const router = express.Router()

// Route calculations call the paid Google Routes API, so they get a
// stricter rate limit than the global /api limit.
const routeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many route requests, please try again later',
  },
})

router.post('/calculate', routeLimiter, routeController.calculateRoute)

module.exports = router
