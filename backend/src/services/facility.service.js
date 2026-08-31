// ============================================================
// Facility Service — mock facility discovery for Phase 3/4.
//
// This layer intentionally uses local demo data rather than real
// place APIs. It is structured to be replaced later by Google
// Places in Phase 5 without changing the external service contract.
// ============================================================

const mapsService = require('./maps.service')
const { mockFacilities } = require('../data/mockFacilities')
const { env } = require('../config/env')
const { ApiError } = require('../utils/ApiError')

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180
  const earthRadiusKm = 6371

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

function normalizeFacility(facility) {
  return {
    id: facility.id,
    name: facility.name,
    category: facility.category,
    address: facility.address,
    phone: facility.phone,
    location: facility.location,
    services: facility.services,
    source: facility.source || 'mock',
    open: facility.open,
    match: facility.match,
    distance: facility.distance,
    distanceUnit: facility.distanceUnit || 'km',
    estimatedTime: facility.estimatedTime,
    estimatedTimeUnit: facility.estimatedTimeUnit || 'min',
  }
}

function parseServiceType(serviceType) {
  if (!serviceType) return null
  const normalized = String(serviceType).trim().toLowerCase()
  if (!normalized) return null
  const aliases = {
    emergency: 'emergency',
    hospital: 'hospital',
    clinic: 'clinic',
    pharmacy: 'pharmacy',
    blood_bank: 'blood_bank',
    bloodbank: 'blood_bank',
    blood: 'blood_bank',
    specialist: 'specialist',
  }
  return aliases[normalized] || normalized
}

function validateLatLng(lat, lng) {
  if (!isFiniteNumber(lat) || lat < -90 || lat > 90) {
    throw ApiError.badRequest('lat must be a valid number between -90 and 90')
  }
  if (!isFiniteNumber(lng) || lng < -180 || lng > 180) {
    throw ApiError.badRequest('lng must be a valid number between -180 and 180')
  }
}

async function findFacilities({ lat, lng, radius = 10000, serviceType } = {}) {
  if (lat !== undefined || lng !== undefined) {
    validateLatLng(lat, lng)
  }

  if (env.googleMapsApiKey) {
    return mapsService.searchNearbyFacilities({
      latitude: lat,
      longitude: lng,
      radius,
      serviceType,
    })
  }

  // Production must never silently fall back to mock facility data when the
  // Google Maps API key is not configured. Fail clearly instead.
  if (env.isProduction) {
    throw ApiError.internal('Facility search is not configured')
  }

  const radiusM = isFiniteNumber(radius) && radius > 0 ? radius : 10000
  const normalizedType = parseServiceType(serviceType)

  let filtered = mockFacilities
  if (normalizedType) {
    filtered = filtered.filter((facility) => facility.category === normalizedType)
  }

  if (lat !== undefined && lng !== undefined) {
    filtered = filtered
      .map((facility) => {
        const distanceKm = haversineKm(lat, lng, facility.location.lat, facility.location.lng)
        return {
          ...facility,
          distance: Number(distanceKm.toFixed(1)),
          distanceUnit: 'km',
          estimatedTime: Math.max(3, Math.round(distanceKm * 3.5)),
          estimatedTimeUnit: 'min',
        }
      })
      .filter((facility) => facility.distance <= radiusM / 1000)
  }

  return filtered.map(normalizeFacility)
}

async function getFacilityById(id) {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw ApiError.badRequest('Facility id is required')
  }

  if (env.googleMapsApiKey) {
    return mapsService.getPlaceDetails(id.trim())
  }

  // Production must never silently fall back to mock facility data when the
  // Google Maps API key is not configured. Fail clearly instead.
  if (env.isProduction) {
    throw ApiError.internal('Facility search is not configured')
  }

  const facility = mockFacilities.find((item) => item.id === id.trim())
  if (!facility) throw ApiError.notFound('Facility not found')

  return normalizeFacility(facility)
}

async function findAmbulances({ lat, lng, radius = 10000 } = {}) {
  if (lat !== undefined || lng !== undefined) {
    validateLatLng(lat, lng)
  }

  if (env.googleMapsApiKey) {
    return mapsService.findAmbulances({
      latitude: lat,
      longitude: lng,
      radius,
    })
  }

  if (env.isProduction) {
    throw ApiError.internal('Ambulance search is not configured')
  }

  const radiusM = isFiniteNumber(radius) && radius > 0 ? radius : 10000
  let filtered = mockFacilities.filter(
    (f) =>
      f.category === 'emergency' ||
      (f.services && f.services.some((s) => s.toLowerCase().includes('ambulance') || s.toLowerCase().includes('emergency'))),
  )
  if (filtered.length === 0) filtered = mockFacilities.slice(0, 3)

  if (lat !== undefined && lng !== undefined) {
    filtered = filtered
      .map((facility) => {
        const distanceKm = haversineKm(lat, lng, facility.location.lat, facility.location.lng)
        const distMeters = Math.round(distanceKm * 1000)
        return {
          ...facility,
          name: facility.name.includes('Ambulance') ? facility.name : `${facility.name} Ambulance Care`,
          types: ['ambulance', 'emergency_service'],
          distanceMeters: distMeters,
          distance: Number(distanceKm.toFixed(1)),
          distanceText: distanceKm < 1 ? `${distMeters} m` : `${distanceKm.toFixed(1)} km`,
          distanceUnit: 'km',
          estimatedTime: Math.max(3, Math.round(distanceKm * 3.5)),
          estimatedTimeUnit: 'min',
        }
      })
      .filter((facility) => facility.distance <= radiusM / 1000)
  }

  return filtered.map(normalizeFacility)
}

module.exports = {
  findFacilities,
  findAmbulances,
  getFacilityById,
  searchFacilities: findFacilities,
}
