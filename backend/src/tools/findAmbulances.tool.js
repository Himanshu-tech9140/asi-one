// ============================================================
// findAmbulances tool.
//
// Pure input/output contract for ambulance discovery.
// Validates coordinates and radius, then queries Google Places
// via facilityService.findAmbulances / maps.service.js.
//
// Output contract:
//   {
//     "ambulances": [
//       {
//         "id": "...",
//         "name": "...",
//         "address": "...",
//         "location": { "lat": 0, "lng": 0 },
//         "placeId": "...",
//         "types": ["ambulance"],
//         "phone": "+1 ...",
//         "website": "https://...",
//         "rating": 4.8,
//         "userRatingsTotal": 120,
//         "distanceMeters": 2400,
//         "distanceText": "2.4 km"
//       }
//     ]
//   }
// ============================================================

const facilityService = require('../services/facility.service')
const { ApiError } = require('../utils/ApiError')

const MAX_RADIUS_METRES = 50000

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function validateLatitude(latitude, label = 'latitude') {
  if (!isFiniteNumber(latitude) || latitude < -90 || latitude > 90) {
    throw ApiError.badRequest(`${label} must be a valid number between -90 and 90`)
  }
}

function validateLongitude(longitude, label = 'longitude') {
  if (!isFiniteNumber(longitude) || longitude < -180 || longitude > 180) {
    throw ApiError.badRequest(`${label} must be a valid number between -180 and 180`)
  }
}

function validateRadius(radius) {
  if (radius === undefined || radius === null) return MAX_RADIUS_METRES
  if (!isFiniteNumber(radius) || radius <= 0) {
    throw ApiError.badRequest('radius must be a positive number (metres)')
  }
  if (radius > MAX_RADIUS_METRES) {
    throw ApiError.badRequest(`radius must not exceed ${MAX_RADIUS_METRES} metres`)
  }
  return radius
}

// Returns { ambulances: [...] }
async function findAmbulances({ latitude, longitude, radius } = {}) {
  validateLatitude(latitude, 'latitude')
  validateLongitude(longitude, 'longitude')
  const resolvedRadius = validateRadius(radius)

  const ambulances = await facilityService.findAmbulances({
    lat: latitude,
    lng: longitude,
    radius: resolvedRadius,
  })

  return { ambulances }
}

module.exports = {
  findAmbulances,
  MAX_RADIUS_METRES,
}

