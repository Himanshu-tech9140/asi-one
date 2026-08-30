const { findFacilities, MAX_RADIUS_METRES } = require('./findFacilities.tool')
const { calculateRoute } = require('./calculateRoute.tool')
const { ApiError } = require('../utils/ApiError')

const SERVICE_TYPES = ['emergency', 'hospital', 'clinic', 'pharmacy', 'blood_bank', 'specialist']

function validateServiceType(value) {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || !SERVICE_TYPES.includes(value)) {
    throw ApiError.badRequest('Invalid facility service type')
  }
  return value
}

function validateRadius(value) {
  if (value === undefined || value === null) return 5000
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > MAX_RADIUS_METRES) {
    throw ApiError.badRequest('Invalid search radius')
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
    async execute(arguments_, context) {
      if (!context.location) throw ApiError.badRequest('Location is required')
      return findFacilities({
        latitude: context.location.lat,
        longitude: context.location.lng,
        serviceType: validateServiceType(arguments_.serviceType),
        radius: validateRadius(arguments_.radius),
      })
    },
  },
  calculateRoute: {
    description: 'Calculate a route to a facility returned by findFacilities. Use its facilityId only.',
    inputSchema: {
      type: 'object', properties: { facilityId: { type: 'string' } },
      required: ['facilityId'], additionalProperties: false,
    },
    async execute(arguments_, context) {
      if (!context.location) throw ApiError.badRequest('Location is required')
      if (!arguments_ || typeof arguments_.facilityId !== 'string') throw ApiError.badRequest('facilityId is required')
      const facility = (context.facilities || []).find((item) => item.id === arguments_.facilityId || item.placeId === arguments_.facilityId)
      if (!facility || !facility.location) throw ApiError.badRequest('Selected facility is not available for routing')
      return calculateRoute({ origin: context.location, destination: facility.location })
    },
  },
}

function plannerTools() {
  return Object.entries(toolRegistry).map(([name, tool]) => ({ type: 'function', function: { name, description: tool.description, parameters: tool.inputSchema } }))
}

module.exports = { toolRegistry, plannerTools, SERVICE_TYPES }
