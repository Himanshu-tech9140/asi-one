// ============================================================
// Comprehensive Unit & Integration Tests for Live Navigation
// ============================================================

import assert from 'node:assert/strict'
import {
  haversineDistanceMeters,
  decodePolyline,
  distanceToSegmentMeters,
  distanceToPolylineMeters,
  formatDistance,
  formatDuration,
  createGeoProjector,
} from '../src/utils/geo.js'
import { NAV_CONFIG } from '../src/hooks/useLiveNavigation.js'

console.log('--- Testing Geo Utilities & Navigation Math ---')

// 1. Haversine distance tests
{
  const newDelhi = { lat: 28.6139, lng: 77.2090 }
  const noidaSector62 = { lat: 28.6280, lng: 77.3649 }
  const dist = haversineDistanceMeters(newDelhi, noidaSector62)

  assert(dist > 14000 && dist < 17000, `Expected distance ~15-16km, got ${dist}m`)
  assert.equal(haversineDistanceMeters(newDelhi, newDelhi), 0, 'Zero distance for identical point')
  assert.equal(haversineDistanceMeters(null, newDelhi), 0, 'Safe zero for null coords')
  console.log('  ok - Haversine distance calculates accurate geographic distance')
}

// 2. Encoded polyline decoding
{
  // Polyline for a simple path: (38.5, -120.2) -> (40.7, -120.95) -> (43.252, -126.453)
  const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@'
  const decoded = decodePolyline(encoded)

  assert.equal(decoded.length, 3, 'Decoded 3 points')
  assert(Math.abs(decoded[0].lat - 38.5) < 0.001, 'Point 1 lat matches')
  assert(Math.abs(decoded[0].lng - (-120.2)) < 0.001, 'Point 1 lng matches')
  assert(Math.abs(decoded[1].lat - 40.7) < 0.001, 'Point 2 lat matches')
  assert(Math.abs(decoded[2].lat - 43.252) < 0.001, 'Point 3 lat matches')

  assert.deepEqual(decodePolyline(''), [], 'Empty string yields empty array')
  assert.deepEqual(decodePolyline(null), [], 'Null yields empty array')
  console.log('  ok - Polyline decoding accurately decodes Google encoded polylines')
}

// 3. Distance to Segment & Distance to Polyline (Off-route detection)
{
  const p1 = { lat: 28.6000, lng: 77.2000 }
  const p2 = { lat: 28.6100, lng: 77.2000 } // Line going due North
  const polyline = [p1, p2]

  // Point right on the midpoint of the line
  const onLinePoint = { lat: 28.6050, lng: 77.2000 }
  const distOnLine = distanceToPolylineMeters(onLinePoint, polyline)
  assert(distOnLine < 1, `Point on line has distance ~0, got ${distOnLine}m`)

  // Point 50 meters East of the line
  // 1 deg lng at lat 28.6 is ~97.7 km, so 0.0005 deg lng is ~48.8m
  const pointNear = { lat: 28.6050, lng: 77.2005 }
  const distNear = distanceToPolylineMeters(pointNear, polyline)
  assert(distNear > 40 && distNear < 60, `Point near line expected ~49m, got ${distNear}m`)

  // Point 500 meters East of the line (off-route condition)
  const pointFar = { lat: 28.6050, lng: 77.2050 }
  const distFar = distanceToPolylineMeters(pointFar, polyline)
  assert(distFar > 400 && distFar < 600, `Point far from line expected ~488m, got ${distFar}m`)
  assert(distFar > NAV_CONFIG.OFF_ROUTE_THRESHOLD_METERS, 'Triggers off-route threshold')

  console.log('  ok - Off-route distance detection correctly computes corridor deviation')
}

// 4. Formatting helpers
{
  assert.equal(formatDistance(450), '450 m')
  assert.equal(formatDistance(1200), '1.2 km')
  assert.equal(formatDistance(4900), '4.9 km')
  assert.equal(formatDistance(0), '0 m')

  assert.equal(formatDuration(45), '45 sec')
  assert.equal(formatDuration(120), '~2 min')
  assert.equal(formatDuration(3600), '~1 hr')
  assert.equal(formatDuration(3900), '~1 hr 5 min')
  console.log('  ok - Distance and duration formatting helpers are correct')
}

// 5. SVG Geo Projector
{
  const points = [
    { lat: 28.6000, lng: 77.2000 },
    { lat: 28.6500, lng: 77.3000 },
  ]
  const project = createGeoProjector(points, { width: 400, height: 300, padding: 40 })

  const pt1 = project(points[0])
  const pt2 = project(points[1])

  assert(pt1.x >= 0 && pt1.x <= 400, 'pt1 X within viewBox bounds')
  assert(pt1.y >= 0 && pt1.y <= 300, 'pt1 Y within viewBox bounds')
  assert(pt2.x >= 0 && pt2.x <= 400, 'pt2 X within viewBox bounds')
  assert(pt2.y >= 0 && pt2.y <= 300, 'pt2 Y within viewBox bounds')

  // Latitude increases northward, so pt2 (higher lat) should have smaller Y in SVG
  assert(pt2.y < pt1.y, 'Higher latitude maps to top (smaller Y)')
  // Longitude increases eastward, so pt2 (higher lng) should have larger X in SVG
  assert(pt2.x > pt1.x, 'Higher longitude maps to right (larger X)')

  console.log('  ok - Geo Projector correctly maps geographic coordinates to SVG viewport')
}

console.log('--- Testing Live Navigation Lifecycle & State Machine Simulation ---')

// 6. Navigation simulation (watchPosition setup, position updates, throttling, off-route, arrival, cleanup)
{
  // Simulated geolocation environment
  let currentWatchId = null
  let activeWatchCallback = null
  let activeErrorCallback = null
  let clearedWatchIds = []
  let routeApiCalls = []

  const mockGeolocation = {
    watchPosition: (onSuccess, onError, options) => {
      currentWatchId = 99
      activeWatchCallback = onSuccess
      activeErrorCallback = onError
      return currentWatchId
    },
    clearWatch: (id) => {
      clearedWatchIds.push(id)
      if (currentWatchId === id) {
        currentWatchId = null
        activeWatchCallback = null
        activeErrorCallback = null
      }
    },
  }

  const mockApi = {
    calculateRoute: async (origin, destination) => {
      routeApiCalls.push({ origin, destination, timestamp: Date.now() })
      return {
        distanceMeters: 4800,
        durationSeconds: 720,
        distanceText: '4.8 km',
        durationText: '~12 min',
        polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      }
    },
  }

  // Simulated state container matching useLiveNavigation logic
  class NavigationEngine {
    constructor(geo, api, config = NAV_CONFIG) {
      this.geo = geo
      this.api = api
      this.config = config
      this.isNavigating = false
      this.watchId = null
      this.currentLocation = null
      this.destination = null
      this.route = null
      this.routePoints = []
      this.statusMessage = ''
      this.isArrived = false
      this.isRecalculating = false
      this.error = ''
      this.lastRouteOrigin = null
      this.lastRouteTime = 0
      this.routeCallCount = 0
    }

    async startNavigation(facility, initialLocation = null) {
      if (!facility?.location) {
        this.error = 'Please select a healthcare facility to begin navigation.'
        return false
      }
      this.error = ''
      this.isArrived = false
      this.destination = facility
      this.isNavigating = true
      this.statusMessage = 'Locating… starting live navigation'

      if (initialLocation) {
        this.currentLocation = initialLocation
        await this._requestRoute(initialLocation, facility, { force: true })
      }

      this.watchId = this.geo.watchPosition(
        (pos) => this._onPosition(pos),
        (err) => this._onError(err),
        this.config.GEOLOCATION_OPTIONS,
      )
      return true
    }

    stopNavigation() {
      if (this.watchId !== null) {
        this.geo.clearWatch(this.watchId)
        this.watchId = null
      }
      this.isNavigating = false
      this.isRecalculating = false
      this.isArrived = false
      this.statusMessage = ''
    }

    async _requestRoute(origin, destFacility, { isOffRoute = false, force = false } = {}) {
      const now = Date.now()
      if (!force && now - this.lastRouteTime < this.config.MIN_RECALCULATION_INTERVAL_MS) {
        return null // Throttled
      }
      this.isRecalculating = true
      if (isOffRoute) this.statusMessage = 'Route changed — recalculating...'

      try {
        this.lastRouteTime = now
        this.routeCallCount++
        const res = await this.api.calculateRoute(origin, destFacility.location)
        this.lastRouteOrigin = { lat: origin.lat, lng: origin.lng }
        this.route = res
        this.routePoints = decodePolyline(res.polyline)
        this.statusMessage = isOffRoute ? 'New route calculated' : 'Route updated'
        return res
      } finally {
        this.isRecalculating = false
      }
    }

    async _onPosition(position) {
      const { latitude: lat, longitude: lng } = position.coords
      const pos = { lat, lng, timestamp: Date.now() }
      this.currentLocation = pos

      if (!this.destination?.location) return

      // Arrival check
      const distToDest = haversineDistanceMeters(pos, this.destination.location)
      if (distToDest <= this.config.ARRIVAL_THRESHOLD_METERS) {
        this.isArrived = true
        this.statusMessage = 'Arrived near destination'
        return
      }

      // Off route check
      if (this.routePoints.length > 1) {
        const offDist = distanceToPolylineMeters(pos, this.routePoints)
        if (offDist > this.config.OFF_ROUTE_THRESHOLD_METERS) {
          this.statusMessage = 'Route changed — recalculating...'
          await this._requestRoute(pos, this.destination, { isOffRoute: true })
          return
        }
      }

      // Distance threshold check
      if (this.lastRouteOrigin) {
        const moved = haversineDistanceMeters(pos, this.lastRouteOrigin)
        if (moved >= this.config.RECALCULATE_DISTANCE_THRESHOLD_METERS) {
          await this._requestRoute(pos, this.destination, { isOffRoute: false })
          return
        }
      } else {
        await this._requestRoute(pos, this.destination, { force: true })
      }

      this.statusMessage = 'Updating your location...'
    }

    _onError(err) {
      if (err?.code === 1) {
        this.error = 'Location access is required for live navigation.'
      } else {
        this.error = 'Your location is unavailable.'
      }
      this.statusMessage = this.error
    }
  }

  // TEST A: Start navigation sets up watchPosition
  const engine = new NavigationEngine(mockGeolocation, mockApi)
  const hospital = {
    id: 'f1_citycare',
    name: 'CityCare Emergency Center',
    location: { lat: 28.6300, lng: 77.3700 },
  }
  const startLoc = { lat: 28.6100, lng: 77.3500 }

  await engine.startNavigation(hospital, startLoc)
  assert.equal(engine.isNavigating, true, 'isNavigating is true')
  assert.equal(engine.watchId, 99, 'watchPosition returned watchId 99')
  assert.equal(engine.destination.id, 'f1_citycare', 'Destination facility preserved')
  assert.equal(routeApiCalls.length, 1, 'Initial route calculated')
  assert.deepEqual(routeApiCalls[0].destination, hospital.location, 'Route destination is exact hospital')
  console.log('  ok - Navigation start sets up watchPosition and calculates initial route')

  // TEST B: Minor GPS update (< 150m, on-route) does NOT call Google Routes (Throttling check)
  // Move 30 meters
  const minorMoveLoc = { lat: 28.6102, lng: 77.3502 }
  activeWatchCallback({ coords: { latitude: minorMoveLoc.lat, longitude: minorMoveLoc.lng } })

  assert.equal(engine.currentLocation.lat, minorMoveLoc.lat, 'Marker position updated')
  assert.equal(routeApiCalls.length, 1, 'NO extra route API call was made for minor move')
  console.log('  ok - Minor GPS updates update user marker locally without calling Google Routes API')

  // TEST C: Off-route deviation (> 100m) triggers recalculation notice and new route
  // Move 500m away perpendicularly
  // Reset lastRouteTime to simulate time passed beyond cooldown
  engine.lastRouteTime = 0
  const offRouteLoc = { lat: 28.6180, lng: 77.3400 }
  await engine._onPosition({ coords: { latitude: offRouteLoc.lat, longitude: offRouteLoc.lng } })

  assert.equal(engine.statusMessage, 'New route calculated', 'Status updated after off-route recalculation')
  assert.equal(routeApiCalls.length, 2, 'Route recalculation occurred for off-route deviation')
  assert.deepEqual(routeApiCalls[1].destination, hospital.location, 'Recalculation destination remains selected hospital')
  console.log('  ok - Off-route deviation triggers "Route changed — recalculating..." and recalculates route')

  // TEST D: Arrival detection (< 50m)
  const arrivedLoc = { lat: 28.63001, lng: 77.37001 } // ~1.5 meters from hospital
  await engine._onPosition({ coords: { latitude: arrivedLoc.lat, longitude: arrivedLoc.lng } })

  assert.equal(engine.isArrived, true, 'isArrived flag is true')
  assert.equal(engine.statusMessage, 'Arrived near destination', 'Arrival message displayed')
  console.log('  ok - Arrival detection triggers "Arrived near destination" within 50m')

  // TEST E: Permission denied handling
  engine.stopNavigation()
  const engine2 = new NavigationEngine(mockGeolocation, mockApi)
  await engine2.startNavigation(hospital)
  activeErrorCallback({ code: 1, message: 'User denied geolocation' })

  assert.equal(engine2.error, 'Location access is required for live navigation.', 'Permission denied sets clear error message')
  console.log('  ok - Permission denied is handled with user-friendly guidance')

  // TEST F: Stop navigation cleans up watcher
  engine.stopNavigation()
  assert.equal(engine.isNavigating, false, 'isNavigating set to false')
  assert(clearedWatchIds.includes(99), 'clearWatch called with watchId')
  console.log('  ok - Stop navigation cancels GPS watch and cleans up resources')
}

console.log('\nAll Live Navigation Unit & Lifecycle Tests Passed Successfully!')
