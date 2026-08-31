// ============================================================
// CrisisFlow capability manifest.
//
// Declares the capabilities the CrisisFlow agent exposes over ACP.
// Every capability is an ALLOW-LISTED entry in this manifest; ACP
// requests are only ever dispatched to capabilities declared here.
//
// Rule enforced throughout: a capability may ONLY invoke registered
// backend tools (findFacilities / calculateRoute) through the tool
// registry — never Google APIs directly, and never arbitrary
// functions, URLs or shell commands.
// ============================================================

const { toolRegistry, SERVICE_TYPES } = require('../../tools/toolRegistry')

// The stable value space for the coordinates part of a request.
function coordinateSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      lat: { type: 'number' },
      lng: { type: 'number' },
    },
    required: ['lat', 'lng'],
  }
}

// Service types CrisisFlow may discover. Mirrors the tool registry's
// allow-list so only real, known healthcare categories are accepted.
const CAPABILITY_SERVICE_TYPES = [...SERVICE_TYPES]

const manifest = {
  name: 'CrisisFlow',
  description:
    'Emergency healthcare coordination agent. Discovers real nearby healthcare facilities and calculates routes to them using verified backend tools.',
  protocolVersion: '1',
  capabilities: [
    {
      name: 'initialize',
      description: 'Return the agent capability manifest and protocol version.',
      params: {},
    },
    {
      name: 'find_emergency_facility',
      description: 'Find real emergency healthcare facilities near a location.',
      params: {
        type: 'object',
        additionalProperties: false,
        properties: {
          location: coordinateSchema(),
          radius: { type: 'number', minimum: 1, maximum: 50000 },
        },
        required: ['location'],
      },
    },
    {
      name: 'find_healthcare_service',
      description: 'Find a real healthcare facility of a given service type near a location.',
      params: {
        type: 'object',
        additionalProperties: false,
        properties: {
          location: coordinateSchema(),
          serviceType: { type: 'string', enum: CAPABILITY_SERVICE_TYPES },
          radius: { type: 'number', minimum: 1, maximum: 50000 },
        },
        required: ['location', 'serviceType'],
      },
    },
    {
      name: 'find_pharmacy',
      description: 'Find real pharmacy facilities near a location.',
      params: {
        type: 'object',
        additionalProperties: false,
        properties: {
          location: coordinateSchema(),
          radius: { type: 'number', minimum: 1, maximum: 50000 },
        },
        required: ['location'],
      },
    },
    {
      name: 'find_blood_bank',
      description: 'Find real blood bank facilities near a location.',
      params: {
        type: 'object',
        additionalProperties: false,
        properties: {
          location: coordinateSchema(),
          radius: { type: 'number', minimum: 1, maximum: 50000 },
        },
        required: ['location'],
      },
    },
    {
      name: 'find_ambulance',
      description: 'Find real emergency ambulance services and medical transport near a location.',
      params: {
        type: 'object',
        additionalProperties: false,
        properties: {
          location: coordinateSchema(),
          radius: { type: 'number', minimum: 1, maximum: 50000 },
        },
        required: ['location'],
      },
    },
    {
      name: 'calculate_route',
      description: 'Calculate a driving route from a location to a previously returned facility or ambulance service.',
      params: {
        type: 'object',
        additionalProperties: false,
        properties: {
          origin: coordinateSchema(),
          facilityId: { type: 'string' },
        },
        required: ['origin', 'facilityId'],
      },
    },
    {
      name: 'find_emergency_facility_and_route',
      description:
        'Find a real emergency facility near a location and calculate a route to the nearest one.',
      params: {
        type: 'object',
        additionalProperties: false,
        properties: {
          location: coordinateSchema(),
          radius: { type: 'number', minimum: 1, maximum: 50000 },
        },
        required: ['location'],
      },
    },
  ],
}

function capabilityNames() {
  return manifest.capabilities.map((c) => c.name)
}

function isCapability(name) {
  return typeof name === 'string' && capabilityNames().includes(name)
}

// Public capability list as { name, description, params }.
function publicCapabilities() {
  return manifest.capabilities.map((c) => ({
    name: c.name,
    description: c.description,
    params: c.params || {},
  }))
}

module.exports = {
  manifest,
  capabilityNames,
  isCapability,
  publicCapabilities,
  CAPABILITY_SERVICE_TYPES,
  agentTools: toolRegistry,
}
