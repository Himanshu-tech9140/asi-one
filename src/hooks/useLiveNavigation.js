import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../services/api.js'
import {
  decodePolyline,
  distanceToPolylineMeters,
  formatDistance,
  formatDuration,
  haversineDistanceMeters,
} from '../utils/geo.js'

// Navigation thresholds (configurable defaults)
export const NAV_CONFIG = {
  RECALCULATE_DISTANCE_THRESHOLD_METERS: 150, // Trigger recalculation if user moved 150m+ from last route origin
  OFF_ROUTE_THRESHOLD_METERS: 100, // Trigger off-route recalculation if > 100m from route corridor
  ARRIVAL_THRESHOLD_METERS: 50, // Mark arrived when within 50m of destination
  MIN_RECALCULATION_INTERVAL_MS: 10000, // Minimum 10s between Google Routes API calls (cost control)
  GEOLOCATION_OPTIONS: {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 3000,
  },
}

function getErrorMessage(error) {
  if (error?.code === 1) {
    return 'Location access is required for live navigation.'
  }
  if (error?.code === 2) {
    return 'Your location is unavailable. Check GPS/network connectivity.'
  }
  if (error?.code === 3) {
    return 'Location request timed out. Retrying…'
  }
  return 'Unable to determine your location for live navigation.'
}

export function useLiveNavigation({
  recalculateDistanceThreshold = NAV_CONFIG.RECALCULATE_DISTANCE_THRESHOLD_METERS,
  offRouteThreshold = NAV_CONFIG.OFF_ROUTE_THRESHOLD_METERS,
  arrivalThreshold = NAV_CONFIG.ARRIVAL_THRESHOLD_METERS,
  minRecalculationInterval = NAV_CONFIG.MIN_RECALCULATION_INTERVAL_MS,
} = {}) {
  const [isNavigating, setIsNavigating] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [destination, setDestination] = useState(null)
  const [route, setRoute] = useState(null)
  const [routePoints, setRoutePoints] = useState([])
  const [liveDistanceText, setLiveDistanceText] = useState('')
  const [liveDurationText, setLiveDurationText] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isArrived, setIsArrived] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [error, setError] = useState('')
  const [routeCallCount, setRouteCallCount] = useState(0)

  // Refs for stable access inside geolocation callback without re-binding watcher
  const watchIdRef = useRef(null)
  const isNavigatingRef = useRef(false)
  const destinationRef = useRef(null)
  const lastRouteOriginRef = useRef(null)
  const lastRouteCallTimeRef = useRef(0)
  const routePointsRef = useRef([])
  const routeRef = useRef(null)
  const isRecalculatingRef = useRef(false)
  const currentLocationRef = useRef(null)

  // Sync refs with state
  isNavigatingRef.current = isNavigating
  destinationRef.current = destination
  routePointsRef.current = routePoints
  routeRef.current = route
  isRecalculatingRef.current = isRecalculating
  currentLocationRef.current = currentLocation

  /**
   * Internal function to fetch/recalculate route to destination facility.
   * Throttles API calls and guarantees the destination is preserved.
   */
  const requestRoute = useCallback(
    async (originCoord, destFacility, { isOffRoute = false, force = false } = {}) => {
      if (!originCoord || !destFacility?.location) return null

      const now = Date.now()
      if (!force && now - lastRouteCallTimeRef.current < minRecalculationInterval) {
        // Cooldown active: skip API call, will check again on next position update
        return null
      }

      if (isRecalculatingRef.current) return null
      isRecalculatingRef.current = true
      setIsRecalculating(true)

      if (isOffRoute) {
        setStatusMessage('Route changed — recalculating...')
      }

      try {
        lastRouteCallTimeRef.current = now
        setRouteCallCount((count) => count + 1)

        const destCoord = destFacility.location
        const newRoute = await api.calculateRoute(originCoord, destCoord)

        lastRouteOriginRef.current = { lat: originCoord.lat, lng: originCoord.lng }
        setRoute(newRoute)
        routeRef.current = newRoute

        const points = newRoute.polyline ? decodePolyline(newRoute.polyline) : []
        setRoutePoints(points)
        routePointsRef.current = points

        setLiveDistanceText(newRoute.distanceText || '')
        setLiveDurationText(newRoute.durationText || '')
        setStatusMessage(isOffRoute ? 'New route calculated' : 'Route updated')
        setError('')
        return newRoute
      } catch (err) {
        console.error('[LiveNavigation] Failed to calculate route:', err)
        setStatusMessage('Unable to update route')
      } finally {
        isRecalculatingRef.current = false
        setIsRecalculating(false)
      }
      return null
    },
    [minRecalculationInterval],
  )

  /**
   * Handler for incoming GPS position updates.
   */
  const handlePositionUpdate = useCallback(
    (position) => {
      const { latitude: lat, longitude: lng, heading, speed, accuracy } = position.coords
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

      const newPos = {
        lat,
        lng,
        heading: typeof heading === 'number' ? heading : null,
        speed: typeof speed === 'number' ? speed : null,
        accuracy: typeof accuracy === 'number' ? accuracy : null,
        timestamp: position.timestamp || Date.now(),
      }

      setCurrentLocation(newPos)
      currentLocationRef.current = newPos

      const currentDest = destinationRef.current
      if (!currentDest || !currentDest.location) return

      // 1. Check Arrival
      const distanceToDestination = haversineDistanceMeters(newPos, currentDest.location)
      if (distanceToDestination <= arrivalThreshold) {
        setIsArrived(true)
        setStatusMessage('Arrived near destination')
        setLiveDistanceText(formatDistance(distanceToDestination))
        setLiveDurationText('0 min')
        return
      }
      setIsArrived(false)

      // 2. Estimate live distance directly between recalculations
      if (routeRef.current?.durationSeconds) {
        setLiveDistanceText(formatDistance(distanceToDestination))
      }

      // 3. Off-route detection
      const activePoints = routePointsRef.current
      if (activePoints.length > 1) {
        const offRouteDist = distanceToPolylineMeters(newPos, activePoints)
        if (offRouteDist > offRouteThreshold) {
          setStatusMessage('Route changed — recalculating...')
          requestRoute(newPos, currentDest, { isOffRoute: true })
          return
        }
      }

      // 4. Distance threshold check from last route origin
      const lastOrigin = lastRouteOriginRef.current
      if (lastOrigin) {
        const movedSinceLastRoute = haversineDistanceMeters(newPos, lastOrigin)
        if (movedSinceLastRoute >= recalculateDistanceThreshold) {
          requestRoute(newPos, currentDest, { isOffRoute: false })
          return
        }
      } else {
        // Initial route if not already fetched
        requestRoute(newPos, currentDest, { isOffRoute: false, force: true })
      }

      setStatusMessage('Updating your location...')
    },
    [
      arrivalThreshold,
      offRouteThreshold,
      recalculateDistanceThreshold,
      requestRoute,
    ],
  )

  /**
   * Handler for geolocation errors.
   */
  const handlePositionError = useCallback((posError) => {
    const msg = getErrorMessage(posError)
    setError(msg)
    setStatusMessage(msg)
  }, [])

  /**
   * Start Live Navigation to a selected facility.
   * @param {object} targetFacility - The facility object containing id and location {lat, lng}
   * @param {{ lat: number, lng: number }} [initialLocation] - Optional initial coordinates
   */
  const startNavigation = useCallback(
    async (targetFacility, initialLocation = null) => {
      const normalizedFacility = targetFacility
        ? {
            ...targetFacility,
            location:
              targetFacility.location && typeof targetFacility.location.lat === 'number'
                ? targetFacility.location
                : typeof targetFacility.lat === 'number' && typeof targetFacility.lng === 'number'
                ? { lat: targetFacility.lat, lng: targetFacility.lng }
                : null,
          }
        : null

      if (!normalizedFacility || !normalizedFacility.location) {
        setError('Please select a healthcare facility to begin navigation.')
        return false
      }

      if (!navigator.geolocation) {
        setError('Browser geolocation is not supported on this device.')
        return false
      }

      // Reset navigation state
      setError('')
      setIsArrived(false)
      setDestination(normalizedFacility)
      destinationRef.current = normalizedFacility
      setIsNavigating(true)
      setStatusMessage('Locating… starting live navigation')

      // Clear existing watch if active
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }

      // If initial location provided, set it and fetch immediate initial route
      if (initialLocation && Number.isFinite(initialLocation.lat) && Number.isFinite(initialLocation.lng)) {
        setCurrentLocation(initialLocation)
        currentLocationRef.current = initialLocation
        requestRoute(initialLocation, normalizedFacility, { force: true })
      }

      // Start continuous watching
      try {
        const id = navigator.geolocation.watchPosition(
          handlePositionUpdate,
          handlePositionError,
          NAV_CONFIG.GEOLOCATION_OPTIONS,
        )
        watchIdRef.current = id
        return true
      } catch (err) {
        setError(err.message || 'Failed to start GPS location tracking.')
        setIsNavigating(false)
        return false
      }
    },
    [handlePositionError, handlePositionUpdate, requestRoute],
  )

  /**
   * Stop Live Navigation and clean up browser GPS watcher.
   */
  const stopNavigation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsNavigating(false)
    setIsRecalculating(false)
    setIsArrived(false)
    setStatusMessage('')
  }, [])

  /**
   * Manually trigger route recalculation.
   */
  const recalculateRouteNow = useCallback(() => {
    const loc = currentLocationRef.current
    const dest = destinationRef.current
    if (loc && dest) {
      return requestRoute(loc, dest, { force: true })
    }
    return Promise.resolve(null)
  }, [requestRoute])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [])

  return {
    isNavigating,
    currentLocation,
    destination,
    route,
    routePoints,
    liveDistanceText: liveDistanceText || route?.distanceText || '—',
    liveDurationText: liveDurationText || route?.durationText || '—',
    statusMessage,
    isArrived,
    isRecalculating,
    error,
    routeCallCount,
    startNavigation,
    stopNavigation,
    recalculateRouteNow,
  }
}
