import { useCallback, useEffect, useState } from 'react'

const DEFAULT_LOCATION = { lat: 28.6280, lng: 77.3649 }

function messageFor(error) {
  if (error?.code === 1) return 'Location permission was denied. Using default location; you can also enter coordinates manually.'
  if (error?.code === 2) return 'Your location is unavailable. Using default location; you can also enter coordinates manually.'
  if (error?.code === 3) return 'Location request timed out. Using default location; you can also enter coordinates manually.'
  return 'Unable to determine your location. Enter coordinates manually.'
}

export function parseCoordinates(value) {
  const parts = String(value || '').split(',').map((part) => Number(part.trim()))
  if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1]) || parts[0] < -90 || parts[0] > 90 || parts[1] < -180 || parts[1] > 180) return null
  return { lat: parts[0], lng: parts[1] }
}

export function useBrowserLocation() {
  const [location, setLocation] = useState(DEFAULT_LOCATION)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      return
    }
    setLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setLocation({ lat, lng })
        }
        setLoading(false)
      },
      (reason) => {
        setError(messageFor(reason))
        setLoading(false)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  }, [])

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  const setManualLocation = useCallback((value) => {
    const parsed = parseCoordinates(value)
    if (!parsed) {
      setError('Enter valid coordinates as latitude, longitude (for example: 28.62, 77.36).')
      return false
    }
    setError('')
    setLocation(parsed)
    return true
  }, [])

  return { location, loading, error, requestLocation, setManualLocation }
}
