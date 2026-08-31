// ============================================================
// Geographic calculation utilities for Live Navigation
// ============================================================

/**
 * Calculates the great-circle distance between two points on Earth using the Haversine formula.
 * @param {{ lat: number, lng: number }} coord1
 * @param {{ lat: number, lng: number }} coord2
 * @returns {number} Distance in meters
 */
export function haversineDistanceMeters(coord1, coord2) {
  if (
    !coord1 ||
    !coord2 ||
    typeof coord1.lat !== 'number' ||
    typeof coord1.lng !== 'number' ||
    typeof coord2.lat !== 'number' ||
    typeof coord2.lng !== 'number'
  ) {
    return 0
  }

  const R = 6371000 // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180

  const dLat = toRad(coord2.lat - coord1.lat)
  const dLng = toRad(coord2.lng - coord1.lng)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) *
      Math.cos(toRad(coord2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Decodes a Google Encoded Polyline string into an array of { lat, lng } points.
 * @param {string} encoded
 * @returns {Array<{ lat: number, lng: number }>}
 */
export function decodePolyline(encoded) {
  if (!encoded || typeof encoded !== 'string') return []

  const poly = []
  let index = 0
  const len = encoded.length
  let lat = 0
  let lng = 0

  while (index < len) {
    let b
    let shift = 0
    let result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lat += dlat

    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lng += dlng

    poly.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }

  return poly
}

/**
 * Calculates perpendicular distance from a point to a line segment in meters.
 * @param {{ lat: number, lng: number }} p
 * @param {{ lat: number, lng: number }} v
 * @param {{ lat: number, lng: number }} w
 * @returns {number} Distance in meters
 */
export function distanceToSegmentMeters(p, v, w) {
  if (!p || !v || !w) return Infinity
  const l2 = (w.lat - v.lat) ** 2 + (w.lng - v.lng) ** 2
  if (l2 === 0) return haversineDistanceMeters(p, v)

  let t = ((p.lat - v.lat) * (w.lat - v.lat) + (p.lng - v.lng) * (w.lng - v.lng)) / l2
  t = Math.max(0, Math.min(1, t))

  const projection = {
    lat: v.lat + t * (w.lat - v.lat),
    lng: v.lng + t * (w.lng - v.lng),
  }

  return haversineDistanceMeters(p, projection)
}

/**
 * Calculates minimum distance from a point to an entire polyline in meters.
 * @param {{ lat: number, lng: number }} point
 * @param {Array<{ lat: number, lng: number }>} polylinePoints
 * @returns {number} Minimum distance in meters
 */
export function distanceToPolylineMeters(point, polylinePoints) {
  if (!point || !Array.isArray(polylinePoints) || polylinePoints.length === 0) return Infinity
  if (polylinePoints.length === 1) return haversineDistanceMeters(point, polylinePoints[0])

  let minDistance = Infinity
  for (let i = 0; i < polylinePoints.length - 1; i++) {
    const d = distanceToSegmentMeters(point, polylinePoints[i], polylinePoints[i + 1])
    if (d < minDistance) minDistance = d
  }
  return minDistance
}

/**
 * Formats distance in meters to a human-readable string.
 * @param {number} meters
 * @returns {string}
 */
export function formatDistance(meters) {
  if (!Number.isFinite(meters) || meters <= 0) return '0 m'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

/**
 * Formats duration in seconds to a human-readable string.
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 min'
  if (seconds < 60) return `${Math.round(seconds)} sec`
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `~${mins} min`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  return remMins ? `~${hours} hr ${remMins} min` : `~${hours} hr`
}

/**
 * Creates a projector function that maps lat/lng points to SVG coordinates (0..viewBoxWidth, 0..viewBoxHeight).
 * @param {Array<{ lat: number, lng: number }>} points
 * @param {{ width: number, height: number, padding: number }} options
 * @returns {(coord: { lat: number, lng: number }) => { x: number, y: number }}
 */
export function createGeoProjector(
  points = [],
  { width = 400, height = 300, padding = 40 } = {},
) {
  const validPoints = points.filter(
    (p) => p && typeof p.lat === 'number' && typeof p.lng === 'number',
  )

  if (validPoints.length === 0) {
    // Default fallback center
    return () => ({ x: width / 2, y: height / 2 })
  }

  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity

  for (const p of validPoints) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }

  // Prevent division by zero if single point or all points identical
  const latSpan = Math.max(maxLat - minLat, 0.005)
  const lngSpan = Math.max(maxLng - minLng, 0.005)

  const drawWidth = width - padding * 2
  const drawHeight = height - padding * 2

  return (coord) => {
    if (!coord || typeof coord.lat !== 'number' || typeof coord.lng !== 'number') {
      return { x: width / 2, y: height / 2 }
    }
    // Note: latitude increases northwards (up), but SVG Y increases downwards (down)
    const normalizedX = (coord.lng - minLng) / lngSpan
    const normalizedY = (maxLat - coord.lat) / latSpan

    const x = padding + normalizedX * drawWidth
    const y = padding + normalizedY * drawHeight

    return {
      x: Math.max(10, Math.min(width - 10, x)),
      y: Math.max(10, Math.min(height - 10, y)),
    }
  }
}

