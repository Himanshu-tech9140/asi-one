// ============================================================
// findFacilities tool.
//
// Pure input/output contract for a future tool-execution layer
// (Phase 6/7 will expose this to the ASI:One planner). It validates
// its arguments, then delegates to the facility service which uses
// the Google Places API via maps.service.js.
//
// Output contract (stable):
//   {
//     "facilities": [
//       {
//         "id": "...",
//         "name": "...",
//         "address": "...",
//         "location": { "lat": 0, "lng": 0 },
//         "placeId": "...",
//         "types": [],
//         "rating": null,
//         "userRatingsTotal": null
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

function validateServiceType(serviceType) {
  if (serviceType === undefined || serviceType === null) return undefined
  if (typeof serviceType !== 'string' || serviceType.trim().length === 0) {
    throw ApiError.badRequest('serviceType must be a non-empty string')
  }
  return serviceType.trim()
}

// Returns { facilities: [...] }
async function findFacilities({ latitude, longitude, radius, serviceType } = {}) {
  validateLatitude(latitude, 'latitude')
  validateLongitude(longitude, 'longitude')
  const resolvedRadius = validateRadius(radius)
  const resolvedType = validateServiceType(serviceType)

  const facilities = await facilityService.searchFacilities({
    lat: latitude,
    lng: longitude,
    radius: resolvedRadius,
    serviceType: resolvedType,
  })

  return { facilities }
}

module.exports = {
  findFacilities,
  MAX_RADIUS_METRES,
}
