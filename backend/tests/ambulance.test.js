// ============================================================
// Smart Ambulance Finder — Comprehensive Test Suite
//
// Tests ambulance discovery, ranking, routing, tool integration,
// planner grounding, and ACP / Agentverse classification.
// ============================================================

process.env.GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'TEST_KEY'

const mapsService = require('../src/services/maps.service')
const facilityService = require('../src/services/facility.service')
const { findAmbulances } = require('../src/tools/findAmbulances.tool')
const { toolRegistry, SERVICE_TYPES } = require('../src/tools/toolRegistry')
const { _internals: plannerInternals } = require('../src/services/asiPlanner.service')
const { handleCapability } = require('../src/agents/crisisflow/crisisflow.handler')
const { manifest, isCapability } = require('../src/agents/crisisflow/crisisflow.manifest')
const { classifyCapability } = require('../src/agentverse/crisisflow.bridge')
const { ApiError } = require('../src/utils/ApiError')

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`)
  console.log(`  ok - ${msg}`)
}

function sampleAmbulanceResponse() {
  return {
    places: [
      {
        id: 'ChIJAMB1',
        displayName: { text: 'Metro Life Support Ambulance' },
        formattedAddress: '45 Emergency Road, Sector 62',
        location: { latitude: 28.628, longitude: 77.365 },
        types: ['ambulance', 'emergency_service'],
        rating: 4.9,
        userRatingCount: 88,
        internationalPhoneNumber: '+1 555 999 1122',
        websiteUri: 'https://metrolifesupport.example',
      },
      {
        id: 'ChIJAMB2',
        displayName: { text: 'RapidCare Paramedic Service' },
        formattedAddress: '12 Highway Express',
        location: { latitude: 28.61, longitude: 77.31 },
        types: ['ambulance'],
        rating: 4.4,
        userRatingCount: 30,
        internationalPhoneNumber: '+1 555 888 3344',
      },
    ],
  }
}

async function run() {
  console.log('\n--- Smart Ambulance Feature Test Suite ---')

  const originalFetch = global.fetch
  global.fetch = async (url, options) => {
    const urlStr = String(url)
    if (urlStr.includes('places:searchText')) {
      return {
        ok: true,
        status: 200,
        json: async () => sampleAmbulanceResponse(),
      }
    }
    if (urlStr.includes('routes.googleapis.com')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          routes: [
            {
              distanceMeters: 1800,
              duration: '320s',
              polyline: { encodedPolyline: 'mock_poly_amb' },
            },
          ],
        }),
      }
    }
    return { ok: false, status: 404, json: async () => ({}) }
  }

  try {
    // 1. SERVICE_TYPES check
    console.log('\n1. SERVICE_TYPES Registry Check:')
    assert(SERVICE_TYPES.includes('ambulance'), 'SERVICE_TYPES contains "ambulance"')
    assert(Boolean(toolRegistry.findAmbulances), 'toolRegistry contains "findAmbulances"')

    // 2. mapsService.findAmbulances
    console.log('\n2. mapsService.findAmbulances:')
    const ambulances = await mapsService.findAmbulances({
      latitude: 28.625,
      longitude: 77.36,
      radius: 10000,
    })
    assert(Array.isArray(ambulances), 'findAmbulances returns an array')
    assert(ambulances.length === 2, 'findAmbulances returns 2 places')
    assert(ambulances[0].name === 'Metro Life Support Ambulance', 'Closest ambulance is first')
    assert(ambulances[0].phone === '+1 555 999 1122', 'Ambulance preserves real phone number')
    assert(typeof ambulances[0].distanceMeters === 'number', 'Ambulance includes computed distanceMeters')
    assert(ambulances[0].distanceMeters < ambulances[1].distanceMeters, 'Ambulances sorted by distance ascending')

    // 3. findAmbulances.tool validation
    console.log('\n3. findAmbulances tool input validation:')
    let caught = false
    try {
      await findAmbulances({ latitude: 'invalid', longitude: 77.36 })
    } catch (e) {
      caught = e instanceof ApiError
    }
    assert(caught, 'Rejects invalid latitude')

    const toolResult = await findAmbulances({
      latitude: 28.625,
      longitude: 77.36,
      radius: 5000,
    })
    assert(Array.isArray(toolResult.ambulances), 'findAmbulances tool returns { ambulances: [...] }')
    assert(toolResult.ambulances.length === 2, 'Tool result has 2 ambulances')

    // 4. calculateRoute tool to an ambulance
    console.log('\n4. ToolRegistry routing to an ambulance:')
    const routeRes = await toolRegistry.calculateRoute.execute(
      { facilityId: 'ChIJAMB1' },
      {
        location: { lat: 28.625, lng: 77.36 },
        ambulances: toolResult.ambulances,
      },
    )
    assert(routeRes.distanceMeters === 1800, 'Calculated route distance is 1800m')
    assert(routeRes.durationSeconds === 320, 'Calculated route duration is 320s')

    // 5. Planner Grounded Final Response
    console.log('\n5. ASI Planner Grounded Final Response for Ambulance:')
    const groundedAmb = plannerInternals.buildGroundedFinalResponse({
      modelResponse: 'Here are some ambulances.',
      ambulances: toolResult.ambulances,
      selectedFacility: toolResult.ambulances[0],
      route: routeRes,
    })
    assert(groundedAmb.includes('Confirmed ambulance service: Metro Life Support Ambulance'), 'Grounded response acknowledges confirmed ambulance')
    assert(groundedAmb.includes('Contact: +1 555 999 1122'), 'Grounded response includes direct contact')

    // Combined ambulance + hospital search
    const groundedCombined = plannerInternals.buildGroundedFinalResponse({
      modelResponse: 'Combined emergency response.',
      ambulances: toolResult.ambulances,
      facilities: [{ name: 'City Hospital', address: '123 Main St' }],
    })
    assert(groundedCombined.includes('Nearest ambulance service: Metro Life Support Ambulance'), 'Grounds combined nearest ambulance')
    assert(groundedCombined.includes('Nearest emergency facility: City Hospital'), 'Grounds combined nearest hospital')

    // 6. ACP capability: find_ambulance
    console.log('\n6. ACP Manifest and Capability:')
    assert(isCapability('find_ambulance'), 'ACP manifest includes find_ambulance')

    // 7. Agentverse Bridge classification
    console.log('\n7. Agentverse Bridge Ambulance Text Classification:')
    const ambBridgeClass = classifyCapability('I need an emergency ambulance right away')
    assert(ambBridgeClass === 'find_ambulance', 'Classifies "ambulance" query to find_ambulance capability')

    console.log('\nAll 15 ambulance tests passed successfully!')
  } finally {
    global.fetch = originalFetch
  }
}

run().catch((err) => {
  console.error('Test run failed:', err)
  process.exit(1)
})
