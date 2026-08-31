// Facility controllers — validate query params and delegate to the
// facility service. No business logic lives here.

const facilityService = require('../services/facility.service')
const { asyncHandler } = require('../utils/asyncHandler')
const { ApiError } = require('../utils/ApiError')

const parseNumber = (value) => {
  if (value === undefined || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : NaN
}

const getFacilities = asyncHandler(async (req, res) => {
  const { lat, lng, radius, serviceType } = req.query

  const latNum = parseNumber(lat)
  const lngNum = parseNumber(lng)

  if (lat !== undefined || lng !== undefined) {
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      throw ApiError.badRequest('lat must be a valid number between -90 and 90')
    }
    if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
      throw ApiError.badRequest('lng must be a valid number between -180 and 180')
    }
  }

  if (radius !== undefined) {
    const r = parseNumber(radius)
    if (!Number.isFinite(r) || r <= 0) {
      throw ApiError.badRequest('radius must be a positive number (metres)')
    }
  }

  const facilities = await facilityService.findFacilities({
    lat: latNum,
    lng: lngNum,
    radius: radius !== undefined ? parseNumber(radius) : undefined,
    serviceType,
  })

  res.json({ success: true, data: { facilities } })
})

const getAmbulances = asyncHandler(async (req, res) => {
  const { lat, lng, radius } = req.query

  const latNum = parseNumber(lat)
  const lngNum = parseNumber(lng)

  if (lat !== undefined || lng !== undefined) {
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      throw ApiError.badRequest('lat must be a valid number between -90 and 90')
    }
    if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
      throw ApiError.badRequest('lng must be a valid number between -180 and 180')
    }
  }

  if (radius !== undefined) {
    const r = parseNumber(radius)
    if (!Number.isFinite(r) || r <= 0) {
      throw ApiError.badRequest('radius must be a positive number (metres)')
    }
  }

  const ambulances = await facilityService.findAmbulances({
    lat: latNum,
    lng: lngNum,
    radius: radius !== undefined ? parseNumber(radius) : undefined,
  })

  res.json({ success: true, data: { ambulances } })
})

const getFacilityById = asyncHandler(async (req, res) => {
  const { id } = req.params
  const facility = await facilityService.getFacilityById(id)
  res.json({ success: true, data: { facility } })
})

module.exports = {
  getFacilities,
  getAmbulances,
  getFacilityById,
}
