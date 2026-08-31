// ============================================================
// CrisisFlow Chat Protocol bridge.
//
// Maps an Agentverse Chat Protocol message (free-text) to the correct
// CrisisFlow capability and returns a natural-language reply that
// summarizes the real result. This bridge:
//   1. Classifies the message text into a CrisisFlow capability
//      (deterministic allow-listed mapping; no arbitrary execution).
//   2. Extracts coordinates from the text, or falls back to the
//      configured base location (never fabricates a specific place
//      the user did not provide).
//   3. Invokes the existing Phase 8 handler (handleCapability) which
//      goes through the tool registry -> Google Places/Routes.
//   4. Formats a factual reply with normalized facility/route data.
//
// SECURITY:
//   - Only allow-listed capabilities can be invoked.
//   - No credentials, paths, or provider internals are returned.
//   - No fabricated facilities/availability claims.
// ============================================================

const { handleCapability } = require('../agents/crisisflow/crisisflow.handler')
const { env } = require('../config/env')

// Maps capability names to the human phrasing used in replies.
const LABELS = {
  find_emergency_facility: 'emergency healthcare facility',
  find_ambulance: 'emergency ambulance service',
  find_healthcare_service: 'healthcare facility',
  find_pharmacy: 'pharmacy',
  find_blood_bank: 'blood bank',
  find_emergency_facility_and_route: 'emergency healthcare facility and route',
  calculate_route: 'route',
}

// Deterministic text -> capability classifier. Kept conservative and
// allow-listed: it never triggers arbitrary execution, and unknown
// text falls back to a generic healthcare facility search.
function classifyCapability(text) {
  const t = (text || '').toLowerCase()
  if (/\bambulance\b|\bparamedic\b|\bmedevac\b|\bems\b/.test(t)) return 'find_ambulance'
  if (/\bblood\b|\bbank\b|\bdonor\b/.test(t)) return 'find_blood_bank'
  if (/\bpharmacy\b|\bchemist\b|\bdrugstore\b|\bmedicine\b/.test(t)) return 'find_pharmacy'
  if (/(route|direction|drive|navigate|how far|distance|travel|way\s+to)/.test(t)) {
    return /\bemergency\b/.test(t) ? 'find_emergency_facility_and_route' : 'find_emergency_facility_and_route'
  }
  if (/\bemergency\b|\burgent\b|\bER\b|\bemergency room\b/.test(t)) return 'find_emergency_facility'
  if (/(hospital|clinic|healthcare|medical|doctor|care)/.test(t)) return 'find_healthcare_service'
  return 'find_healthcare_service'
}

// Extract a numeric {lat,lng} from the text when explicitly present.
// Returns null when the user did not supply coordinates (so we never
// fabricate a location).
function extractLocation(text) {
  const t = text || ''
  const latMatch = /lat(?:itude)?\s*[:=]?\s*(-?\d+(?:\.\d+)?)/i.exec(t)
  const lngMatch = /(?:lng|lon|long(?:itude)?)\s*[:=]?\s*(-?\d+(?:\.\d+)?)/i.exec(t)
  if (latMatch && lngMatch) {
    const lat = parseFloat(latMatch[1])
    const lng = parseFloat(lngMatch[1])
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng }
    }
  }
  return null
}

function baseLocation() {
  const raw = env.agentverseBaseLocation
  if (raw && typeof raw === 'string' && raw.includes(',')) {
    const [latStr, lngStr] = raw.split(',')
    const lat = parseFloat(latStr)
    const lng = parseFloat(lngStr)
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng }
    }
  }
  return null
}

// Build capability params from text + location.
function buildParams(capability, location) {
  switch (capability) {
    case 'find_ambulance':
    case 'find_blood_bank':
    case 'find_pharmacy':
    case 'find_emergency_facility':
    case 'find_emergency_facility_and_route':
      return { location }
    case 'find_healthcare_service':
      return { location, serviceType: 'hospital' }
    default:
      return { location }
  }
}

function summarizeFacilities(capability, result) {
  const items = Array.isArray(result.ambulances)
    ? result.ambulances
    : Array.isArray(result.facilities)
    ? result.facilities
    : []
  if (items.length === 0) {
    return `No ${LABELS[capability] || 'healthcare facility'} found nearby.`
  }
  const top = items.slice(0, 5)
  const lines = top.map(
    (f, i) =>
      `${i + 1}. ${f.name || 'Unknown'}${f.address ? ` — ${f.address}` : ''}${
        f.phone ? ` (Tel: ${f.phone})` : ''
      }${f.rating ? ` (rating ${f.rating})` : ''}`,
  )
  return lines.join('\n')
}

// Handle one chat message and produce a reply string.
async function handleChatText(text) {
  const capability = classifyCapability(text)
  const location = extractLocation(text) || baseLocation()
  if (!location) {
    return 'I need your location (latitude and longitude) to find nearby facilities. Provide coordinates such as lat 28.62 lng 77.36.'
  }

  const params = buildParams(capability, location)
  const result = await handleCapability(capability, params)

  const facilitySummary = summarizeFacilities(capability, result)
  let reply = `Here are nearby ${LABELS[capability] || 'healthcare facilities'} for (${location.lat}, ${location.lng}):\n${facilitySummary}`

  if (capability === 'find_emergency_facility_and_route' && result.route) {
    reply += `\nClosest facility route: ${result.route.distanceText || ''} in ${result.route.durationText || ''}.`
  }
  return reply
}

module.exports = {
  handleChatText,
  classifyCapability,
  extractLocation,
  _internals: { buildParams, baseLocation, summarizeFacilities },
}
