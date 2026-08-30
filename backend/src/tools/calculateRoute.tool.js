// ============================================================
// calculateRoute tool.
//
// Pure input/output contract for a future tool-execution layer
// (Phase 6/7 will expose this to the ASI:One planner). It validates
// its arguments, then delegates to maps.service.js which talks to the
// Google Routes API.
//
// Output contract (stable):
//   {
//     "distanceMeters": 2400,
//     "durationSeconds": 480,
//     "distanceText": "2.4 km",
//     "durationText": "8 min",
//     "polyline": "enc:..."
//   }
// ============================================================

const mapsService = require('../services/maps.service')
const { ApiError } = require('../utils/ApiError')

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function validatePoint(point, label) {
  if (!point || typeof point !== 'object') {
    throw ApiError.badRequest(`${label} is required and must be an object with lat/lng`)
  }
  const { lat, lng } = point
  if (!isFiniteNumber(lat) || lat < -90 || lat > 90) {
    throw ApiError.badRequest(`${label}.lat must be a valid number between -90 and 90`)
  }
  if (!isFiniteNumber(lng) || lng < -180 || lng > 180) {
    throw ApiError.badRequest(`${label}.lng must be a valid number between -180 and 180`)
  }
  return { lat, lng }
}

async function calculateRoute({ origin, destination } = {}) {
  const resolvedOrigin = validatePoint(origin, 'origin')
  const resolvedDestination = validatePoint(destination, 'destination')

  return mapsService.calculateRoute(resolvedOrigin, resolvedDestination)
}

module.exports = {
  calculateRoute,
}
