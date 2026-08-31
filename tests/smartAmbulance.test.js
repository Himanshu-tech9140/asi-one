// ============================================================
// Smart Ambulance Finder — Frontend Unit & Integration Tests
// ============================================================

import assert from 'node:assert/strict'
import { normalizeFacility, normalizeAmbulance } from '../src/services/api.js'
import { QUICK_ACTIONS } from '../src/data/mockData.js'
import { createGeoProjector } from '../src/utils/geo.js'

console.log('--- Testing Smart Ambulance Frontend Logic & Normalization ---')

// 1. QUICK_ACTIONS verification
{
  const smartAmbAction = QUICK_ACTIONS.find((a) => a.id === 'smartAmbulance')
  assert(Boolean(smartAmbAction), 'QUICK_ACTIONS includes smartAmbulance')
  assert(smartAmbAction.label.includes('Ambulance'), 'Quick action label mentions Ambulance')
  console.log('  ok - QUICK_ACTIONS contains smartAmbulance action')
}

// 2. normalizeAmbulance test
{
  const rawAmbulance = {
    id: 'amb-1',
    name: 'RapidCare Emergency Ambulance',
    address: '100 Medical Way',
    location: { lat: 28.625, lng: 77.36 },
    phone: '+1 555 123 4567',
    website: 'https://rapidcare.example',
    rating: 4.8,
    userRatingsTotal: 95,
    distanceMeters: 1500,
    distanceText: '1.5 km',
  }

  const normalized = normalizeAmbulance(rawAmbulance, 0)
  assert.equal(normalized.isAmbulance, true, 'isAmbulance flag is true')
  assert.equal(normalized.isNearest, true, 'isNearest flag is true for index 0')
  assert.equal(normalized.status, 'Nearest Ambulance Service', 'Status reflects Nearest Ambulance Service')
  assert.equal(normalized.match, 96, 'Rating converts to match percentage (4.8 * 20 = 96)')
  assert(normalized.decisionFactors.some((f) => f.includes('Closest verified ambulance provider')), 'Includes verified ambulance decision factor')
  assert(normalized.decisionFactors.some((f) => f.includes('+1 555 123 4567')), 'Includes contact phone decision factor')

  // Alternative ambulance (index 1)
  const altAmbulance = normalizeAmbulance({ ...rawAmbulance, id: 'amb-2' }, 1)
  assert.equal(altAmbulance.isNearest, false, 'isNearest is false for index 1')
  assert.equal(altAmbulance.status, 'Alternative Service', 'Status is Alternative Service for index 1')

  console.log('  ok - normalizeAmbulance correctly tags nearest vs alternative ambulance')
}

// 3. normalizeFacility with ambulance types
{
  const facilityWithAmbulance = {
    id: 'fac-amb',
    name: 'City Trauma & Ambulance Center',
    types: ['ambulance', 'emergency_service'],
    rating: 4.5,
    location: { lat: 28.61, lng: 77.31 },
  }

  const normalized = normalizeFacility(facilityWithAmbulance, 0)
  assert.equal(normalized.isAmbulance, true, 'normalizeFacility recognizes ambulance type')
  assert.equal(normalized.status, 'Nearest Ambulance Service', 'Status reflects ambulance for index 0')
  console.log('  ok - normalizeFacility recognizes ambulance types')
}

// 4. Geo projection for ambulance and user coordinates
{
  const user = { lat: 28.6139, lng: 77.2090 }
  const ambulance = { lat: 28.6280, lng: 77.3649 }
  const project = createGeoProjector([user, ambulance], { width: 400, height: 300, padding: 50 })

  const userPoint = project(user)
  const ambPoint = project(ambulance)

  assert(userPoint.x >= 0 && userPoint.x <= 400, 'User point x is within SVG bounds')
  assert(userPoint.y >= 0 && userPoint.y <= 300, 'User point y is within SVG bounds')
  assert(ambPoint.x >= 0 && ambPoint.x <= 400, 'Ambulance point x is within SVG bounds')
  assert(ambPoint.y >= 0 && ambPoint.y <= 300, 'Ambulance point y is within SVG bounds')
  assert(userPoint.x !== ambPoint.x || userPoint.y !== ambPoint.y, 'Distinct coordinates produce distinct SVG points')
  console.log('  ok - Geo projection maps ambulance and user coordinates to SVG layout')
}

console.log('\nAll frontend Smart Ambulance tests passed successfully!')

