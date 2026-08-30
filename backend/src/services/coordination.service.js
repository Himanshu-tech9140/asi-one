// ============================================================
// Coordination Service — business logic for coordination runs.
//
// This is the orchestrator. In this phase it produces a MOCK
// result, but it is structured so the real pipeline can replace
// the mock planner cleanly:
//
//   createCoordination()
//        ↓
//   ASI:One Planner          (future)
//        ↓
//   Tool execution           (future)
//        ↓
//   ASI:One final response   (future)
//        ↓
//   MongoDB
//        ↓
//   Frontend
//
// The mock functions live at the bottom so they can be swapped
// out individually without touching the rest of the flow.
// ============================================================

const Coordination = require('../models/Coordination')
const ToolExecution = require('../models/ToolExecution')
const { ApiError } = require('../utils/ApiError')
const { isConnected } = require('../config/db')

// --- Mock planning (to be replaced by ASI:One in a future phase) ---
// Understands a basic facility-search style request and returns a
// mock intent + execution steps.

function mockUnderstandIntent(request) {
  const lowered = request.toLowerCase()

  if (/blood bank|bloodbank|blood donation/.test(lowered)) {
    return { type: 'blood_bank_search', confidence: 0.96 }
  }

  if (/pharmacy|medicine|medication/.test(lowered)) {
    return { type: 'pharmacy_search', confidence: 0.96 }
  }

  if (/fastest route|route to.*(hospital|facility)|directions.*(hospital|facility)/.test(lowered)) {
    return { type: 'fastest_route', confidence: 0.95 }
  }

  if (/healthcare service|healthcare|clinic|urgent care|medical service/.test(lowered)) {
    return { type: 'healthcare_service', confidence: 0.94 }
  }

  if (/best emergency facility|facility near me|nearby facility|find the.*facility/.test(lowered)) {
    return { type: 'facility_search', confidence: 0.95 }
  }

  if (/emergency facility|emergency|nearest hospital|urgent care|trauma|accident/.test(lowered)) {
    return { type: 'emergency_facility', confidence: 0.97 }
  }

  if (/facility|hospital|clinic/.test(lowered)) {
    return { type: 'facility_search', confidence: 0.9 }
  }

  return { type: 'facility_search', confidence: 0.75 }
}

function buildMockSteps(intent) {
  const base = [
    { name: 'Request received', status: 'completed', description: 'Coordination request captured' },
    {
      name: 'Intent understood',
      status: 'completed',
      description: `Identified intent: ${intent.type}`,
    },
  ]

  const executionSteps = {
    emergency_facility: [
      { name: 'Location identified', status: 'completed', description: 'Current location checked' },
      { name: 'Facility search', status: 'completed', description: 'Nearby emergency facilities identified' },
      { name: 'Recommendation ready', status: 'completed', description: 'Actionable emergency option prepared' },
    ],
    healthcare_service: [
      { name: 'Service search', status: 'completed', description: 'Healthcare services near the user located' },
      { name: 'Comparison review', status: 'completed', description: 'Services compared for relevance' },
      { name: 'Recommendation ready', status: 'completed', description: 'Best healthcare option prepared' },
    ],
    pharmacy_search: [
      { name: 'Pharmacy search', status: 'completed', description: 'Nearby pharmacies identified' },
      { name: 'Coverage review', status: 'completed', description: 'Accessibility and service fit checked' },
      { name: 'Recommendation ready', status: 'completed', description: 'Nearest option prepared' },
    ],
    blood_bank_search: [
      { name: 'Blood bank search', status: 'completed', description: 'Nearby blood support sources identified' },
      { name: 'Support review', status: 'completed', description: 'Urgent response fit checked' },
      { name: 'Recommendation ready', status: 'completed', description: 'Actionable blood support suggestion prepared' },
    ],
    fastest_route: [
      { name: 'Route planning', status: 'completed', description: 'Fastest route to suitable care estimated' },
      { name: 'Travel comparison', status: 'completed', description: 'Route and ETA reviewed' },
      { name: 'Recommendation ready', status: 'completed', description: 'Route guidance prepared' },
    ],
    facility_search: [
      { name: 'Location identified', status: 'completed', description: 'User location resolved' },
      { name: 'Facility search', status: 'completed', description: 'Nearby services discovered' },
      { name: 'Recommendation ready', status: 'completed', description: 'Actionable result produced' },
    ],
  }

  return base.concat(executionSteps[intent.type] || executionSteps.facility_search)
}

function mockBuildRecommendation() {
  return {
    facilityId: 'facility-001',
    name: 'CityCare Emergency Center',
    address: '221 Skyline Avenue, Sector 62',
    distance: 2.4,
    distanceUnit: 'km',
    estimatedTime: 8,
    estimatedTimeUnit: 'min',
    services: ['Emergency Services', 'Trauma Care', 'Cardiac Care'],
    match: 96,
  }
}

function mockBuildAlternatives() {
  return [
    {
      facilityId: 'facility-002',
      name: 'MetroCare Hospital',
      distance: 3.1,
      distanceUnit: 'km',
      estimatedTime: 10,
      estimatedTimeUnit: 'min',
      services: ['Emergency Services', 'Urgent Care'],
      match: 88,
      status: 'Alternative',
    },
    {
      facilityId: 'facility-003',
      name: 'Summit Regional Medical',
      distance: 4.7,
      distanceUnit: 'km',
      estimatedTime: 14,
      estimatedTimeUnit: 'min',
      services: ['Emergency Services', 'Regional Medical'],
      match: 79,
      status: 'Alternative',
    },
  ]
}

// --- Public service API ---

// High-level pipeline that a future ASI:One planner would replace.
async function runCoordinationPipeline(data) {
  const { request, location, preferences } = data

  const intent = mockUnderstandIntent(request)
  const steps = buildMockSteps(intent).map((s) => ({
    ...s,
    timestamp: new Date(),
  }))

  const recommendation =
    intent.type === 'facility_search' ||
    intent.type === 'emergency_facility' ||
    intent.type === 'healthcare_service' ||
    intent.type === 'pharmacy_search' ||
    intent.type === 'blood_bank_search' ||
    intent.type === 'fastest_route'
      ? mockBuildRecommendation()
      : null

  const alternatives =
    intent.type === 'facility_search' ||
    intent.type === 'emergency_facility' ||
    intent.type === 'healthcare_service' ||
    intent.type === 'pharmacy_search' ||
    intent.type === 'blood_bank_search' ||
    intent.type === 'fastest_route'
      ? mockBuildAlternatives()
      : []

  const toolsUsed = [
    { toolName: 'findFacilities', status: 'completed' },
    { toolName: 'calculateRoute', status: 'completed' },
    { toolName: 'searchWeb', status: 'completed' },
  ]

  return {
    status: 'completed',
    intent,
    steps,
    toolsUsed,
    recommendation,
    alternatives,
    location,
    preferences,
  }
}

async function createCoordination({ request, location, preferences }) {
  if (!request || typeof request !== 'string' || request.trim().length === 0) {
    throw ApiError.badRequest('message is required and must be a non-empty string')
  }

  const doc = await Coordination.create({
    request,
    status: 'planning',
    location: location || undefined,
    preferences: preferences || undefined,
  })

  const result = await runCoordinationPipeline({ request, location, preferences })

  doc.status = result.status
  doc.intent = result.intent
  doc.steps = result.steps
  doc.toolsUsed = result.toolsUsed
  doc.recommendation = result.recommendation
  doc.alternatives = result.alternatives
  await doc.save()

  const toolNames = ['findFacilities', 'calculateRoute', 'searchWeb']
  await ToolExecution.insertMany(
    toolNames.map((name) => ({
      coordinationId: doc._id,
      toolName: name,
      status: 'completed',
      input: { request, location: location || null },
      output: name === 'findFacilities' ? { count: 3 } : { ok: true },
      startedAt: new Date(),
      completedAt: new Date(),
    })),
  )

  const payload = doc.toJSON()
  payload.coordinationId = payload.id
  return payload
}

async function getCoordinationById(id) {
  // Invalid ObjectId -> 400 (malformed identifier). We validate explicitly
  // so a bad id never falls through to a DB query.
  if (!/^[a-fA-F0-9]{24}$/.test(String(id))) {
    throw ApiError.badRequest('Invalid coordination id format')
  }

  const doc = await Coordination.findById(id)
  if (!doc) {
    throw ApiError.notFound('Coordination not found')
  }
  return doc.toJSON()
}

async function listCoordination({ page = 1, limit = 10, status } = {}) {
  const filter = {}
  if (status && status !== 'All') {
    filter.status = status
  }

  const p = Math.max(1, parseInt(page, 10) || 1)
  const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 10))

  const conditions = isConnected() ? filter : {}
  const total = await Coordination.countDocuments(conditions)
  const docs = await Coordination.find(conditions)
    .sort({ createdAt: -1 })
    .skip((p - 1) * l)
    .limit(l)

  return {
    items: docs.map((d) => d.toJSON()),
    pagination: {
      page: p,
      limit: l,
      total,
      pages: Math.ceil(total / l),
    },
  }
}

module.exports = {
  createCoordination,
  getCoordinationById,
  listCoordination,
  // exposed for potential testing / reuse
  _internals: { mockUnderstandIntent },
}
