const express = require('express')
const rateLimit = require('express-rate-limit')
const facilityController = require('../controllers/facility.controller')

const router = express.Router()

// Facility search/details call the paid Google Places API, so they get
// a stricter rate limit than the global /api limit.
const facilityLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many facility requests, please try again later',
  },
})

router.get('/', facilityLimiter, facilityController.getFacilities)
router.get('/ambulances', facilityLimiter, facilityController.getAmbulances)
router.get('/:id', facilityLimiter, facilityController.getFacilityById)

module.exports = router
