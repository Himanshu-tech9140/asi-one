// Phase 5 — Maps/Facility tool tests.
//
// These tests NEVER call the real Google API. Available Google API
// responses are simulated via a mocked global fetch, and the missing-key
// / error paths are exercised without any network traffic.

// Control env BEFORE loading any config module (dotenv won't override).
process.env.GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'TEST_KEY'

const mapsService = require('../src/services/maps.service')
const { findFacilities } = require('../src/tools/findFacilities.tool')
const { calculateRoute } = require('../src/tools/calculateRoute.tool')
const facilityService = require('../src/services/facility.service')
const { ApiError } = require('../src/utils/ApiError')
const envModule = require('../src/config/env')

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`)
  console.log(`  ok - ${msg}`)
}

function samplePlaceResponse() {
  return {
    places: [
      {
        id: 'ChIJTEST123',
        displayName: { text: 'CityCare Emergency Center' },
        formattedAddress: '221 Skyline Avenue',
        location: { latitude: 28.625, longitude: 77.36 },
        types: ['hospital', 'health'],
        rating: 4.5,
        userRatingCount: 120,
      },
      {
        id: 'ChIJTEST456',
        displayName: { text: 'MetroCare Pharmacy' },
        formattedAddress: '184 Northgate Boulevard',
        location: { latitude: 28.61, longitude: 77.31 },
        types: ['pharmacy'],
        rating: 4.1,
        userRatingCount: 40,
      },
    ],
  }
}

function samplePlaceDetailsResponse() {
  return {
    id: 'ChIJTEST123',
    displayName: { text: 'CityCare Emergency Center' },
    formattedAddress: '221 Skyline Avenue, Sector 62',
    location: { latitude: 28.625, longitude: 77.36 },
    types: ['hospital', 'health'],
    rating: 4.5,
    userRatingCount: 120,
    internationalPhoneNumber: '+1 555 010 2210',
    websiteUri: 'https://citycare.example',
  }
}

function sampleRouteResponse() {
  return {
    routes: [
      {
        distanceMeters: 2400,
        duration: '480s',
        polyline: { encodedPolyline: 'enc:testpolyline' },
      },
    ],
  }
}

let originalFetch = null

function withMockFetch(handler, fn) {
  originalFetch = global.fetch
  global.fetch = handler
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      global.fetch = originalFetch
      originalFetch = null
    })
}

function jsonResponse(ok, status, body) {
  return { ok, status, json: async () => body }
}

function isApiErrorWithStatus(err, status) {
  return err instanceof ApiError && err.statusCode === status
}

async function main() {
  try {
    console.log('Phase 5 — Maps/Facility tool tests')

    // --- findFacilities validation ---
    let threw = false
    try {
      await findFacilities({ latitude: 91, longitude: 0 })
    } catch (e) {
      threw = isApiErrorWithStatus(e, 400)
    }
    assert(threw, 'findFacilities rejects invalid latitude (>90) with 400')

    threw = false
    try {
      await findFacilities({ latitude: 0, longitude: -181 })
    } catch (e) {
      threw = isApiErrorWithStatus(e, 400)
    }
    assert(threw, 'findFacilities rejects invalid longitude (<-180) with 400')

    threw = false
    try {
      await findFacilities({ latitude: 28.62, longitude: 77.36, radius: -5 })
    } catch (e) {
      threw = isApiErrorWithStatus(e, 400)
    }
    assert(threw, 'findFacilities rejects non-positive radius with 400')

    threw = false
    try {
      await findFacilities({ latitude: 28.62, longitude: 77.36, radius: 200000 })
    } catch (e) {
      threw = isApiErrorWithStatus(e, 400)
    }
    assert(threw, 'findFacilities rejects radius above max with 400')

    // --- valid facility search (normalized output) ---
    const searchResult = await withMockFetch(
      () => jsonResponse(true, 200, samplePlaceResponse()),
      () =>
        findFacilities({
          latitude: 28.62,
          longitude: 77.36,
          radius: 5000,
          serviceType: 'hospital',
        }),
    )
    assert(searchResult.facilities.length === 2, 'findFacilities returns both simulated places')
    const f0 = searchResult.facilities[0]
    assert(f0.name === 'CityCare Emergency Center', 'facility name normalized')
    assert(f0.placeId === 'ChIJTEST123', 'facility placeId set')
    assert(f0.location.lat === 28.625 && f0.location.lng === 77.36, 'facility location normalized')
    assert(Array.isArray(f0.types), 'facility types is an array')
    assert(f0.rating === 4.5, 'facility rating normalized')

    // --- empty facility results ---
    const emptyResult = await withMockFetch(
      () => jsonResponse(true, 200, { places: [] }),
      () => findFacilities({ latitude: 28.62, longitude: 77.36 }),
    )
    assert(emptyResult.facilities.length === 0, 'empty facility results return empty array')

    // --- Google API error mapping ---
    threw = false
    try {
      await withMockFetch(
        () => jsonResponse(false, 429, { error: { message: 'Quota exceeded' } }),
        () => findFacilities({ latitude: 28.62, longitude: 77.36 }),
      )
    } catch (e) {
      threw = isApiErrorWithStatus(e, 500)
    }
    assert(threw, 'Google 429 maps to a safe 500 error')

    // --- missing API key -> safe "not configured" error ---
    const savedKey = envModule.env.googleMapsApiKey
    envModule.env.googleMapsApiKey = ''
    threw = false
    let missingKeyMessage = ''
    try {
      await mapsService.searchNearbyFacilities({ latitude: 28.62, longitude: 77.36 })
    } catch (e) {
      threw = isApiErrorWithStatus(e, 500)
      missingKeyMessage = e.message
    } finally {
      envModule.env.googleMapsApiKey = savedKey
    }
    assert(threw, 'missing API key maps to a 500 error')
    assert(
      missingKeyMessage === 'Maps service is not configured',
      'missing API key returns a safe generic message',
    )

    // --- single place still normalized ---
    const single = mapsService._internals.normalizePlace(samplePlaceResponse().places[0])
    assert(single.name === 'CityCare Emergency Center', 'normalizePlace handles a single place')

    // --- facility details via service (mocked) ---
    const detailFacility = await withMockFetch(
      () => jsonResponse(true, 200, samplePlaceDetailsResponse()),
      () => facilityService.getFacilityById('ChIJTEST123'),
    )
    assert(detailFacility.phone === '+1 555 010 2210', 'place details include phone')
    assert(detailFacility.website === 'https://citycare.example', 'place details include website')
    assert(detailFacility.name === 'CityCare Emergency Center', 'place details normalize name')

    // --- calculateRoute validation ---
    threw = false
    try {
      await calculateRoute({ origin: { lat: 91, lng: 0 }, destination: { lat: 0, lng: 0 } })
    } catch (e) {
      threw = isApiErrorWithStatus(e, 400)
    }
    assert(threw, 'calculateRoute rejects invalid origin latitude with 400')

    threw = false
    try {
      await calculateRoute({ origin: { lat: 0, lng: 0 }, destination: { lat: 0, lng: 181 } })
    } catch (e) {
      threw = isApiErrorWithStatus(e, 400)
    }
    assert(threw, 'calculateRoute rejects invalid destination longitude with 400')

    // --- valid route (normalized output) ---
    const routeResult = await withMockFetch(
      () => jsonResponse(true, 200, sampleRouteResponse()),
      () =>
        calculateRoute({
          origin: { lat: 28.62, lng: 77.36 },
          destination: { lat: 28.63, lng: 77.37 },
        }),
    )
    assert(routeResult.distanceMeters === 2400, 'route distanceMeters normalized')
    assert(routeResult.durationSeconds === 480, 'route durationSeconds parsed from "480s"')
    assert(routeResult.distanceText === '2.4 km', 'route distanceText formatted')
    assert(routeResult.durationText === '8 min', 'route durationText formatted')
    assert(routeResult.polyline === 'enc:testpolyline', 'route polyline preserved')

    console.log('\nAll Phase 5 Maps/Facility tool tests passed.')
  } finally {
    if (originalFetch !== null) global.fetch = originalFetch
    originalFetch = null
  }
}

main().catch((err) => {
  console.error('\nTest failed:', err.message)
  process.exit(1)
})
