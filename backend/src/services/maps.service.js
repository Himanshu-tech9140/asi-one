// ============================================================
// Maps Service — the ONLY module that talks to Google Maps APIs.
//
// All Google-specific request/response handling is isolated here so
// that controllers, services and tools never know about Google's HTTP
// details. It exposes:
//
//   searchNearbyFacilities({ latitude, longitude, radius, serviceType })
//   getPlaceDetails(placeId)
//   calculateRoute(origin, destination)
//
// All methods use async/await and return a NORMALIZED internal format.
//
// SECURITY:
//   - The API key is read from env only and is NEVER logged or returned
//     to the client. It is only ever sent in the Google request headers.
//   - Internal Google error details are logged server-side but replaced
//     with safe, generic messages before they reach the client.
//
// Docs:
//   Places API (New):  https://developers.google.com/maps/documentation/places/web-service/places
//   Routes API:        https://developers.google.com/maps/documentation/routes
// ============================================================

const { env } = require('../config/env')
const { ApiError } = require('../utils/ApiError')

const PLACES_BASE = 'https://places.googleapis.com/v1'
const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes'

const REQUEST_TIMEOUT_MS = 8000

// Maps user-facing service types to Google Places (New) includedTypes.
// Only known-valid types are listed; unknown/mixed phrases (e.g.
// "emergency hospital", "walk-in clinic") fall back to Text Search.
const PLACE_TYPE_MAP = {
  hospital: ['hospital'],
  emergency: ['hospital'],
  'emergency hospital': ['hospital'],
  clinic: ['medical_clinic'],
  'medical clinic': ['medical_clinic'],
  'urgent care': ['hospital', 'medical_clinic'],
  pharmacy: ['pharmacy'],
  'blood bank': ['blood_bank'],
  ambulance: ['hospital', 'medical_clinic'],
}

// The only fields we ever request from Google. Everything else (bed
// availability, doctor availability, etc.) is intentionally NOT
// requested; we must never present Places data as real-time medical
// availability.
const NEARBY_FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  'places.rating',
  'places.userRatingCount',
  'places.internationalPhoneNumber',
  'places.nationalPhoneNumber',
  'places.websiteUri',
].join(',')

const DETAIL_FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'types',
  'rating',
  'userRatingCount',
  'internationalPhoneNumber',
  'websiteUri',
].join(',')

const ROUTE_FIELDS = ['routes.distanceMeters', 'routes.duration', 'routes.polyline.encodedPolyline'].join(
  ',',
)

// --- helpers -------------------------------------------------------

function requireApiKey() {
  const key = env.googleMapsApiKey
  if (!key) {
    // Safe, generic message — do NOT expose config details.
    throw ApiError.internal('Maps service is not configured')
  }
  return key
}

// Safely log the Google error server-side without leaking the key.
function logGoogleFailure(context, err) {
  const status = err && err.response ? err.response.status : undefined
  const googleMessage =
    err && err.response && err.response.data && err.response.data.error
      ? err.response.data.error.message
      : err && err.message
      ? err.message
      : 'unknown error'
  console.error(`[maps] ${context} failed (status=${status}): ${googleMessage}`)
}

// Map a Google API non-2xx response to a safe ApiError for the client.
function toSafeError(context, status, googleMessage) {
  if (status === 403) {
    // Typically invalid/missing/restricted key, or quota policy violation.
    return ApiError.internal('Maps service is not configured')
  }
  if (status === 429) {
    return ApiError.internal('Maps service is temporarily unavailable, please try again later')
  }
  if (status === 400 || status === 404 || status === 422) {
    if (context === 'place_details' && status === 404) {
      return ApiError.notFound('Facility not found')
    }
    return ApiError.badRequest('Invalid maps request parameters')
  }
  // 5xx and anything else — generic, safe message.
  return ApiError.internal('Unable to retrieve facility information')
}

async function googleFetch(url, options) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// --- normalization -------------------------------------------------

function haversineMeters(p1, p2) {
  if (!p1 || !p2 || typeof p1.lat !== 'number' || typeof p2.lat !== 'number') return 0
  const R = 6371000
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function normalizePlace(place, { withDetails = false, origin = null } = {}) {
  const normalized = {
    id: place.id || null,
    name: place.displayName && place.displayName.text ? place.displayName.text : 'Unknown',
    address:
      place.formattedAddress || (place.addressComponents ? composeAddress(place) : null),
    location:
      place.location && typeof place.location.latitude === 'number'
        ? { lat: place.location.latitude, lng: place.location.longitude }
        : null,
    placeId: place.id || null,
    types: Array.isArray(place.types) ? place.types : [],
    rating: typeof place.rating === 'number' ? place.rating : null,
    userRatingsTotal: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
  }

  const phone = place.internationalPhoneNumber || place.nationalPhoneNumber
  if (phone) normalized.phone = phone
  if (place.websiteUri) normalized.website = place.websiteUri

  if (origin && normalized.location) {
    const distMeters = Math.round(haversineMeters(origin, normalized.location))
    normalized.distanceMeters = distMeters
    normalized.distance = Number((distMeters / 1000).toFixed(1))
    normalized.distanceText = formatDistanceText(distMeters)
  }

  // Only include fields Google actually returned.
  Object.keys(normalized).forEach((k) => {
    if (normalized[k] === null || normalized[k] === undefined) delete normalized[k]
  })
  return normalized
}

function composeAddress(addressComponents) {
  return addressComponents
    .map((c) => c.longText || c.shortText)
    .filter(Boolean)
    .join(', ')
}

function normalizeRoute(route) {
  const durationSeconds = parseDurationSeconds(route.duration)
  const distanceMeters = typeof route.distanceMeters === 'number' ? route.distanceMeters : 0
  return {
    distanceMeters,
    durationSeconds,
    distanceText: formatDistanceText(distanceMeters),
    durationText: formatDurationText(durationSeconds),
    polyline:
      route.polyline && route.polyline.encodedPolyline ? route.polyline.encodedPolyline : '',
  }
}

function parseDurationSeconds(duration) {
  if (typeof duration !== 'string') return 0
  const match = /^(\d+(\.\d+)?)s$/.exec(duration.trim())
  return match ? Math.round(parseFloat(match[1])) : 0
}

function formatDistanceText(meters) {
  if (!meters) return '0 m'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function formatDurationText(seconds) {
  if (!seconds) return '0 min'
  if (seconds < 60) return `${seconds} sec`
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  return remMins ? `${hours} hr ${remMins} min` : `${hours} hr`
}

// --- Place search --------------------------------------------------

async function searchNearbyFacilities({ latitude, longitude, radius, serviceType }) {
  const key = requireApiKey()
  const types = lookupTypes(serviceType)

  let data
  if (types) {
    data = await nearbySearch(key, { latitude, longitude, radius, types })
  } else {
    data = await textSearch(key, { latitude, longitude, radius, query: serviceType })
  }

  if (!Array.isArray(data.places)) return []
  return data.places.map((p) => normalizePlace(p))
}

function lookupTypes(serviceType) {
  if (!serviceType) return ['hospital']
  const key = String(serviceType).trim().toLowerCase()
  return PLACE_TYPE_MAP[key] || null
}

async function nearbySearch(key, { latitude, longitude, radius, types }) {
  const res = await googleFetch(`${PLACES_BASE}/places:searchNearby`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': NEARBY_FIELDS,
    },
    body: JSON.stringify({
      includedTypes: types,
      maxResultCount: 10,
      locationRestriction: {
        circle: {
          center: { latitude, longitude },
          radius: radius,
        },
      },
    }),
  })

  if (!res.ok) {
    const body = await safeJson(res)
    logGoogleFailure('searchNearby', { response: { status: res.status, data: body } })
    throw toSafeError('nearby_search', res.status, body && body.error && body.error.message)
  }

  return await res.json()
}

async function textSearch(key, { latitude, longitude, radius, query }) {
  const textQuery = (query && query.trim()) || 'hospital'
  const res = await googleFetch(`${PLACES_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': NEARBY_FIELDS,
    },
    body: JSON.stringify({
      textQuery,
      maxResultCount: 10,
      locationBias: {
        circle: {
          center: { latitude, longitude },
          radius: radius,
        },
      },
    }),
  })

  if (!res.ok) {
    const body = await safeJson(res)
    logGoogleFailure('searchText', { response: { status: res.status, data: body } })
    throw toSafeError('text_search', res.status, body && body.error && body.error.message)
  }

  return await res.json()
}

// --- Place details -------------------------------------------------

async function getPlaceDetails(placeId) {
  const key = requireApiKey()
  const res = await googleFetch(
    `${PLACES_BASE}/places/${encodeURIComponent(placeId)}?fields=${DETAIL_FIELDS}`,
    {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': key,
      },
    },
  )

  if (!res.ok) {
    const body = await safeJson(res)
    logGoogleFailure('place_details', { response: { status: res.status, data: body } })
    throw toSafeError('place_details', res.status, body && body.error && body.error.message)
  }

  const place = await res.json()
  if (!place || (!place.id && !place.displayName)) {
    throw ApiError.notFound('Facility not found')
  }
  return normalizePlace(place, { withDetails: true })
}

// --- Route calculation ---------------------------------------------

async function calculateRoute(origin, destination) {
  const key = requireApiKey()
  const res = await googleFetch(ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': ROUTE_FIELDS,
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: {
        location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE',
    }),
  })

  if (!res.ok) {
    const body = await safeJson(res)
    logGoogleFailure('calculateRoute', { response: { status: res.status, data: body } })
    throw toSafeError('route', res.status, body && body.error && body.error.message)
  }

  const data = await res.json()
  if (!data.routes || data.routes.length === 0) {
    throw ApiError.internal('Unable to calculate the route')
  }
  return normalizeRoute(data.routes[0])
}

async function safeJson(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

async function findAmbulances({ latitude, longitude, radius = 10000 }) {
  const key = requireApiKey()
  const data = await textSearch(key, {
    latitude,
    longitude,
    radius,
    query: 'ambulance service',
  })

  if (!Array.isArray(data.places)) return []
  const origin = { lat: latitude, lng: longitude }
  const ambulances = data.places.map((p) => {
    const norm = normalizePlace(p, { origin })
    if (!norm.types || norm.types.length === 0) {
      norm.types = ['ambulance', 'emergency_service']
    } else if (!norm.types.includes('ambulance')) {
      norm.types = ['ambulance', ...norm.types]
    }
    return norm
  })

  // Rank nearest first
  ambulances.sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
  return ambulances
}

module.exports = {
  searchNearbyFacilities,
  findAmbulances,
  getPlaceDetails,
  calculateRoute,
  // exposed for tests
  _internals: { normalizePlace, normalizeRoute, parseDurationSeconds, haversineMeters },
}
