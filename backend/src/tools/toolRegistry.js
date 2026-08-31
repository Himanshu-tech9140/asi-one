const { findFacilities, MAX_RADIUS_METRES } = require('./findFacilities.tool')
const { findAmbulances } = require('./findAmbulances.tool')
const { calculateRoute } = require('./calculateRoute.tool')
const { ApiError } = require('../utils/ApiError')

const SERVICE_TYPES = ['emergency', 'hospital', 'clinic', 'pharmacy', 'blood_bank', 'specialist', 'ambulance']

function validateServiceType(value) {
  if (value === undefined || value === null) return 'emergency'
  if (typeof value !== 'string') return 'emergency'
  const lower = value.trim().toLowerCase().replaceAll(' ', '_').replaceAll('-', '_')
  if (lower.includes('ambulan')) return 'ambulance'
  if (lower.includes('pharm') || lower.includes('chemist') || lower.includes('medicin')) return 'pharmacy'
  if (lower.includes('blood')) return 'blood_bank'
  if (lower.includes('clinic')) return 'clinic'
  if (lower.includes('emerg') || lower.includes('hosp') || lower.includes('urgent')) return 'emergency'
  if (lower.includes('special')) return 'specialist'
  if (SERVICE_TYPES.includes(lower)) return lower
  return 'emergency'
}

function validateRadius(value) {
  if (value === undefined || value === null) return 5000
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > MAX_RADIUS_METRES) {
    return 5000
  }
  return value
}

const toolRegistry = {
  findFacilities: {
    description: 'Find nearby real healthcare facilities for the supplied user location.',
    inputSchema: {
      type: 'object', properties: {
        serviceType: { type: 'string', enum: SERVICE_TYPES },
        radius: { type: 'number', minimum: 1, maximum: MAX_RADIUS_METRES },
      }, additionalProperties: false,
    },
    async execute(arguments_ = {}, context = {}) {
      if (!context.location) throw ApiError.badRequest('Location is required')
      return findFacilities({
        latitude: context.location.lat,
        longitude: context.location.lng,
        serviceType: validateServiceType(arguments_.serviceType),
        radius: validateRadius(arguments_.radius),
      })
    },
  },
  findAmbulances: {
    description: 'Find nearby real ambulance services and emergency transport providers for the supplied user location.',
    inputSchema: {
      type: 'object', properties: {
        radius: { type: 'number', minimum: 1, maximum: MAX_RADIUS_METRES },
      }, additionalProperties: false,
    },
    async execute(arguments_ = {}, context = {}) {
      if (!context.location) throw ApiError.badRequest('Location is required')
      return findAmbulances({
        latitude: context.location.lat,
        longitude: context.location.lng,
        radius: validateRadius(arguments_.radius),
      })
    },
  },
  calculateRoute: {
    description: 'Calculate a route to a facility or ambulance service returned by findFacilities or findAmbulances. Use its facilityId only.',
    inputSchema: {
      type: 'object', properties: { facilityId: { type: 'string' } },
      required: ['facilityId'], additionalProperties: false,
    },
    async execute(arguments_ = {}, context = {}) {
      if (!context.location) throw ApiError.badRequest('Location is required')
      const allTargets = (context.facilities || []).concat(context.ambulances || [])
      let facility = null
      if (arguments_ && typeof arguments_.facilityId === 'string') {
        facility = allTargets.find((item) => item.id === arguments_.facilityId || item.placeId === arguments_.facilityId)
      }
      if (!facility && allTargets.length > 0) {
        facility = allTargets[0]
      }
      if (!facility || !facility.location) throw ApiError.badRequest('Selected facility is not available for routing')
      return calculateRoute({ origin: context.location, destination: facility.location })
    },
  },
}

function plannerTools() {
  return Object.entries(toolRegistry).map(([name, tool]) => ({ type: 'function', function: { name, description: tool.description, parameters: tool.inputSchema } }))
}

module.exports = { toolRegistry, plannerTools, SERVICE_TYPES }
