// Coordination controllers — thin HTTP layer.
// Validation is done here (request-shape concerns); business logic
// lives in coordination.service.js.

const coordinationService = require('../services/coordination.service')
const { asyncHandler } = require('../utils/asyncHandler')
const { ApiError } = require('../utils/ApiError')

function isValidLatLng(value) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= -90 &&
    value <= 90
  )
}

function isValidLng(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180
}

function validateCreateBody(body) {
  // message
  if (!body || typeof body.message !== 'string') {
    throw ApiError.badRequest('message is required and must be a string')
  }
  const message = body.message.trim()
  if (message.length === 0) {
    throw ApiError.badRequest('message must not be empty')
  }
  if (message.length > 4000) {
    throw ApiError.badRequest('message must be at most 4000 characters')
  }

  // location (optional)
  let location
  if (body.location !== undefined && body.location !== null) {
    const { lat, lng } = body.location
    if (lat === undefined || lng === undefined) {
      throw ApiError.badRequest('both location.lat and location.lng are required')
    }
    if (!isValidLatLng(lat)) {
      throw ApiError.badRequest('location.lat must be a valid latitude between -90 and 90')
    }
    if (!isValidLng(lng)) {
      throw ApiError.badRequest('location.lng must be a valid longitude between -180 and 180')
    }
    location = { lat, lng }
  }

  // preferences (optional)
  let preferences
  if (body.preferences !== undefined && body.preferences !== null) {
    preferences = { ...body.preferences }
    if (
      preferences.maxDistance !== undefined &&
      (typeof preferences.maxDistance !== 'number' || preferences.maxDistance <= 0)
    ) {
      throw ApiError.badRequest('preferences.maxDistance must be a positive number')
    }
  }

  return { message, location, preferences }
}

const createCoordination = asyncHandler(async (req, res) => {
  const { message, location, preferences } = validateCreateBody(req.body)
  const coordination = await coordinationService.createCoordination({
    request: message,
    location,
    preferences,
  })
  res.status(201).json({ success: true, data: coordination })
})

const getCoordination = asyncHandler(async (req, res) => {
  const { id } = req.params
  const coordination = await coordinationService.getCoordinationById(id)
  res.json({ success: true, data: coordination })
})

module.exports = {
  createCoordination,
  getCoordination,
}
