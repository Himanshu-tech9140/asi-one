// ============================================================
// CrisisFlow ACP handler.
//
// Central handler for inbound ACP capability requests. It:
//   1. Validates the request and capability arguments.
//   2. Dispatches only to allow-listed CrisisFlow capabilities.
//   3. Converts an ACP request into an internal normalized request.
//   4. Invokes the existing tool registry (findFacilities /
//      calculateRoute) — never Google APIs directly.
//   5. Normalizes tool output into a safe, ACP-compatible result.
//   6. Logs each tool execution to MongoDB (ToolExecution).
//   7. Returns the normalized result.
//
// SECURITY:
//   - Only capabilities from the manifest may be invoked.
//   - Coordinates, serviceType and radius are strictly validated.
//   - ACP input can never execute arbitrary functions/URLs/shell.
// ============================================================

const Coordination = require('../../models/Coordination')
const ToolExecution = require('../../models/ToolExecution')
const { ApiError } = require('../../utils/ApiError')
const { toolRegistry } = require('../../tools/toolRegistry')
const { isCapability, CAPABILITY_SERVICE_TYPES } = require('./crisisflow.manifest')

const DEFAULT_RADIUS_META = 5000
const MAX_RADIUS_META = 50000

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v)
}

// --- validation helpers -----------------------------------------

function validateLocation(location, label = 'location') {
  if (!location || typeof location !== 'object' || Array.isArray(location)) {
    throw ApiError.badRequest(`${label} is required and must be an object with lat/lng`)
  }
  const { lat, lng } = location
  if (!isFiniteNumber(lat) || lat < -90 || lat > 90) {
    throw ApiError.badRequest(`${label}.lat must be a valid number between -90 and 90`)
  }
  if (!isFiniteNumber(lng) || lng < -180 || lng > 180) {
    throw ApiError.badRequest(`${label}.lng must be a valid number between -180 and 180`)
  }
  return { lat, lng }
}

function validateRadius(radius) {
  if (radius === undefined || radius === null) return DEFAULT_RADIUS_META
  if (!isFiniteNumber(radius) || radius <= 0) {
    throw ApiError.badRequest('radius must be a positive number (metres)')
  }
  if (radius > MAX_RADIUS_META) {
    throw ApiError.badRequest(`radius must not exceed ${MAX_RADIUS_META} metres`)
  }
  return radius
}

function validateServiceType(serviceType) {
  if (!CAPABILITY_SERVICE_TYPES.includes(serviceType)) {
    throw ApiError.badRequest('Invalid facility service type')
  }
  return serviceType
}

// Ensure the params object contains no unexpected keys and required ones.
function requireKeys(params, required) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw ApiError.badRequest('Request parameters are required')
  }
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(params, key) || params[key] === undefined) {
      throw ApiError.badRequest(`Missing required field: ${key}`)
    }
  }
}

function rejectUnknownKeys(params, allowed) {
  if (params && typeof params === 'object' && !Array.isArray(params)) {
    for (const key of Object.keys(params)) {
      if (!allowed.includes(key)) {
        throw ApiError.badRequest(`Unsupported field: ${key}`)
      }
    }
  }
}

// --- tool execution + logging -----------------------------------

// Execute a registered tool through the tool registry and record the
// execution in MongoDB. Returns { output, safeOutput }.
async function executeTool(coordinationId, toolName, args, context) {
  const tool = toolRegistry[toolName]
  if (!tool) throw ApiError.badRequest('Unsupported tool')
  const execution = await ToolExecution.create({
    coordinationId,
    toolName,
    status: 'running',
    input: args && typeof args === 'object' ? args : {},
    startedAt: new Date(),
  })
  try {
    const output = await tool.execute(args || {}, context)
    const safeOutput = safeToolResult(toolName, output)
    execution.status = 'completed'
    execution.output = safeOutput
    execution.completedAt = new Date()
    await execution.save()
    return { output, safeOutput }
  } catch (error) {
    execution.status = 'failed'
    execution.error = 'Tool execution failed'
    execution.completedAt = new Date()
    await execution.save()
    throw error
  }
}

// Strip provider-specific / unnecessary fields from a tool result
// before returning it over ACP. This keeps the surface minimal and
// avoids ever echoing provider credentials or raw payloads.
function safeToolResult(name, result) {
  if (name === 'findFacilities') {
    return {
      facilities: (result.facilities || [])
        .slice(0, 10)
        .map(({ id, placeId, name: fname, address, location, types, rating, userRatingsTotal }) => ({
          id,
          placeId,
          name: fname,
          address,
          location,
          types,
          rating,
          userRatingsTotal,
        })),
    }
  }
  if (name === 'findAmbulances') {
    return {
      ambulances: (result.ambulances || [])
        .slice(0, 10)
        .map(({ id, placeId, name: fname, address, location, types, rating, userRatingsTotal, phone, website, distanceMeters, distanceText }) => ({
          id,
          placeId,
          name: fname,
          address,
          location,
          types,
          rating,
          userRatingsTotal,
          phone,
          website,
          distanceMeters,
          distanceText,
        })),
    }
  }
  if (name === 'calculateRoute') {
    const { distanceMeters, durationSeconds, distanceText, durationText } = result
    return { distanceMeters, durationSeconds, distanceText, durationText }
  }
  return {}
}

// --- capability implementations ---------------------------------

const handlers = {
  find_emergency_facility: async ({ params, context }) => {
    const { location } = params
    const radius = validateRadius(params.radius)
    const result = await executeTool(context.coordinationId, 'findFacilities', { serviceType: 'emergency', radius }, context)
    return { facilityType: 'emergency', facilities: result.safeOutput.facilities, radius }
  },

  find_ambulance: async ({ params, context }) => {
    const { location } = params
    const radius = validateRadius(params.radius)
    const result = await executeTool(context.coordinationId, 'findAmbulances', { radius }, context)
    return { facilityType: 'ambulance', ambulances: result.safeOutput.ambulances, radius }
  },

  find_healthcare_service: async ({ params, context }) => {
    const serviceType = validateServiceType(params.serviceType)
    const radius = validateRadius(params.radius)
    const result = await executeTool(context.coordinationId, 'findFacilities', { serviceType, radius }, context)
    return { facilityType: serviceType, facilities: result.safeOutput.facilities, radius }
  },

  find_pharmacy: async ({ params, context }) => {
    const radius = validateRadius(params.radius)
    const result = await executeTool(context.coordinationId, 'findFacilities', { serviceType: 'pharmacy', radius }, context)
    return { facilityType: 'pharmacy', facilities: result.safeOutput.facilities, radius }
  },

  find_blood_bank: async ({ params, context }) => {
    const radius = validateRadius(params.radius)
    const result = await executeTool(context.coordinationId, 'findFacilities', { serviceType: 'blood_bank', radius }, context)
    return { facilityType: 'blood_bank', facilities: result.safeOutput.facilities, radius }
  },

  calculate_route: async ({ params, context }) => {
    const allTargets = (context.facilities || []).concat(context.ambulances || [])
    const facility = allTargets.find(
      (item) => item.id === params.facilityId || item.placeId === params.facilityId,
    )
    if (!facility || !facility.location) {
      throw ApiError.badRequest('Selected facility is not available for routing')
    }
    const result = await executeTool(context.coordinationId, 'calculateRoute', { facilityId: params.facilityId }, context)
    return { facility: safeFacility(facility), route: result.safeOutput }
  },

  find_emergency_facility_and_route: async ({ params, context }) => {
    const radius = validateRadius(params.radius)
    const first = await executeTool(context.coordinationId, 'findFacilities', { serviceType: 'emergency', radius }, context)
    const facilities = first.safeOutput.facilities
    if (!facilities || facilities.length === 0) {
      return { facilityType: 'emergency', facilities: [], route: null, radius, note: 'No emergency facility found nearby' }
    }
    // Select the nearest returned facility (first result) for routing.
    const selected = facilities[0]
    context.facilities = facilities
    const routeResult = await executeTool(context.coordinationId, 'calculateRoute', { facilityId: selected.id || selected.placeId }, context)
    return { facilityType: 'emergency', facilities, selectedFacility: safeFacility(selected), route: routeResult.safeOutput, radius }
  },
}

function safeFacility(facility) {
  if (!facility) return null
  const { id, placeId, name, address, location, types, rating, userRatingsTotal, phone, website, distanceMeters, distanceText } = facility
  return { id, placeId, name, address, location, types, rating, userRatingsTotal, phone, website, distanceMeters, distanceText }
}

// Extract & validate allowed keys per capability. This is the strict
// allow-list gate for inbound ACP parameters.
function decodeParams(name, params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw ApiError.badRequest('Request parameters are required')
  }
  switch (name) {
    case 'find_emergency_facility':
    case 'find_ambulance':
    case 'find_pharmacy':
    case 'find_blood_bank':
    case 'find_emergency_facility_and_route': {
      requireKeys(params, ['location'])
      rejectUnknownKeys(params, ['location', 'radius'])
      const location = validateLocation(params.location, 'location')
      const radius = validateRadius(params.radius)
      return { location, radius }
    }
    case 'find_healthcare_service': {
      requireKeys(params, ['location', 'serviceType'])
      rejectUnknownKeys(params, ['location', 'serviceType', 'radius'])
      const location = validateLocation(params.location, 'location')
      validateServiceType(params.serviceType)
      const radius = validateRadius(params.radius)
      return { location, serviceType: params.serviceType, radius }
    }
    case 'calculate_route': {
      requireKeys(params, ['origin', 'facilityId'])
      rejectUnknownKeys(params, ['origin', 'facilityId'])
      const origin = validateLocation(params.origin, 'origin')
      if (typeof params.facilityId !== 'string' || params.facilityId.trim() === '') {
        throw ApiError.badRequest('facilityId is required and must be a string')
      }
      return { origin, facilityId: params.facilityId }
    }
    default:
      throw ApiError.badRequest('Unsupported capability')
  }
}

// --- ACP entry point --------------------------------------------

// Handles one ACP capability request.
// Returns a normalized result object (or throws an ApiError on failure).
async function handleCapability(name, params) {
  if (!isCapability(name) || !handlers[name]) {
    throw ApiError.badRequest('Unsupported capability')
  }
  const decoded = decodeParams(name, params)
  const location = decoded.location || decoded.origin || null

  const coordination = await Coordination.create({
    request: `ACP capability: ${name}`,
    status: 'executing',
    location: location ? { lat: location.lat, lng: location.lng } : undefined,
    intent: { type: name, confidence: 1 },
  })

  const context = { location, coordinationId: coordination._id, facilities: [] }

  try {
    const result = await handlers[name]({ params: decoded, context })
    coordination.status = 'completed'
    coordination.recommendation = result
    coordination.toolsUsed = [{ toolName: 'ACP', status: 'completed' }]
    coordination.steps = [
      {
        name: 'ACP capability executed',
        status: 'completed',
        description: `Executed by the allow-listed CrisisFlow capability ${name}`,
        timestamp: new Date(),
      },
    ]
    await coordination.save()
    return { ...result, coordinationId: coordination.id }
  } catch (error) {
    coordination.status = 'failed'
    await coordination.save()
    throw error
  }
}

module.exports = {
  handleCapability,
  _internals: {
    validateLocation,
    validateRadius,
    validateServiceType,
    decodeParams,
    safeFacility,
    handlers,
  },
}
