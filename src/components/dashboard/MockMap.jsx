import React, { useMemo, useState } from 'react'
import { Plus, Minus, LocateFixed, User, HeartPulse, Navigation, Radio, Siren } from 'lucide-react'
import { FACILITIES } from '../../data/mockData'
import { createGeoProjector, decodePolyline } from '../../utils/geo'

function MapControl({ index, toggle }) {
  return (
    <button
      onClick={toggle}
      aria-label={`Map zoom level ${index === 0 ? 'out' : 'in'}`}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow hover:bg-slate-50"
    >
      {index === 0 ? <Minus size={16} /> : <Plus size={16} />}
    </button>
  )
}

export function MockMap({
  showRoute = true,
  facilities = FACILITIES,
  selectedFacility,
  route,
  origin,
  userLocation,
  routePoints: customRoutePoints,
  isLiveNavigating = false,
}) {
  const [zoom, setZoom] = useState(1)
  const [recenterOffset, setRecenterOffset] = useState({ x: 0, y: 0 })

  const recommended = selectedFacility || facilities[0] || FACILITIES[0]
  const alternates = facilities.filter((facility) => facility.id !== recommended.id).slice(0, 2)
  const isAmbulanceDest = Boolean(
    recommended?.isAmbulance ||
    recommended?.types?.includes('ambulance') ||
    recommended?.name?.toLowerCase().includes('ambulance')
  )

  // Determine user coordinates (live position > origin prop > fallback)
  const activeUserCoord = userLocation?.lat && userLocation?.lng ? userLocation : origin?.lat && origin?.lng ? origin : null
  const activeDestCoord = recommended?.location?.lat && recommended?.location?.lng ? recommended.location : null

  // Decoded polyline points if available
  const activeRoutePoints = useMemo(() => {
    if (Array.isArray(customRoutePoints) && customRoutePoints.length > 0) {
      return customRoutePoints
    }
    if (route?.polyline) {
      return decodePolyline(route.polyline)
    }
    return []
  }, [customRoutePoints, route?.polyline])

  // Compute SVG positions for markers & polyline
  const { userPos, recPos, altPositions, svgRoutePoints, hasRealCoords } = useMemo(() => {
    if (activeUserCoord && activeDestCoord) {
      const allGeoPoints = [
        activeUserCoord,
        activeDestCoord,
        ...alternates.map((f) => f.location).filter(Boolean),
        ...activeRoutePoints,
      ]

      const project = createGeoProjector(allGeoPoints, { width: 400, height: 300, padding: 55 })
      const uPos = project(activeUserCoord)
      const rPos = project(activeDestCoord)
      const aPos = alternates.map((f) => (f.location ? project(f.location) : null))

      let polyPointsStr = ''
      if (activeRoutePoints.length > 1) {
        polyPointsStr = activeRoutePoints
          .map((pt) => {
            const p = project(pt)
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
          })
          .join(' ')
      } else {
        // Curved line connecting user to destination
        const midX = uPos.x + (rPos.x - uPos.x) * 0.5 + (rPos.y > uPos.y ? -25 : 25)
        const midY = uPos.y + (rPos.y - uPos.y) * 0.5 + (rPos.x > uPos.x ? 25 : -25)
        polyPointsStr = `${uPos.x},${uPos.y} ${midX},${midY} ${rPos.x},${rPos.y}`
      }

      return {
        userPos: uPos,
        recPos: rPos,
        altPositions: aPos,
        svgRoutePoints: polyPointsStr,
        hasRealCoords: true,
      }
    }

    // Default illustrative layout
    const fallbackUserPos = { x: 60, y: 210 }
    const fallbackRecPos = { x: 300, y: 90 }
    return {
      userPos: fallbackUserPos,
      recPos: fallbackRecPos,
      altPositions: [{ x: 250, y: 200 }, { x: 340, y: 235 }],
      svgRoutePoints: `${fallbackUserPos.x},${fallbackUserPos.y} 150,180 225,135 ${fallbackRecPos.x},${fallbackRecPos.y}`,
      hasRealCoords: false,
    }
  }, [activeUserCoord, activeDestCoord, alternates, activeRoutePoints])

  const handleRecenter = () => {
    setZoom(1)
    setRecenterOffset({ x: 0, y: 0 })
  }

  return (
    <section
      aria-label="Map showing recommended route and live navigation"
      className="card-surface relative flex flex-col overflow-hidden"
    >
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-2">
          {isLiveNavigating ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-accent">
              <span className="h-2 w-2 animate-ping rounded-full bg-accent" />
              LIVE TRACKING
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
              <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-accent" />
              FASTEST ROUTE
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span className="font-mono">{route?.distanceText || 'Route pending'}</span>
          <span className="text-slate-600">·</span>
          <span className="font-mono">{route?.durationText || 'Select navigation'}</span>
        </div>
      </div>

      {/* Map surface */}
      <div
        className="relative flex-1 overflow-hidden bg-grid"
        style={{ background: '#F1F5F9', minHeight: 260, height: 'clamp(260px, 40vw, 360px)' }}
      >
        {/* decorative "roads" */}
        <svg
          viewBox="0 0 400 300"
          className="pointer-events-none absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <g stroke="rgba(148,163,184,0.35)" strokeWidth="10" fill="none">
            <path d="M-20 60 C 100 40, 300 90, 430 60" />
            <path d="M40 -20 C 80 100, 40 220, 80 330" />
            <path d="M-20 180 C 120 160, 250 210, 430 190" />
            <path d="M180 -20 C 200 90, 160 200, 190 330" />
          </g>
          <g stroke="rgba(37,99,235,0.16)" strokeWidth="4" fill="none" strokeDasharray="6 8">
            <path d="M-20 120 C 150 100, 220 160, 430 140" />
            <path d="M120 -20 C 160 90, 240 120, 390 80" />
          </g>
        </svg>

        {/* Route + markers layer with zoom / transform */}
        <div
          className="absolute inset-0 transition-transform duration-300"
          style={{
            transform: `scale(${zoom}) translate(${recenterOffset.x}px, ${recenterOffset.y}px)`,
            transformOrigin: `${(userPos.x / 400) * 100}% ${(userPos.y / 300) * 100}%`,
          }}
        >
          <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full pointer-events-none">
            {/* route line */}
            {showRoute && svgRoutePoints && (
              <>
                <polyline
                  points={svgRoutePoints}
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={svgRoutePoints}
                  fill="none"
                  stroke="rgba(220,38,38,0.24)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="2 10"
                />
              </>
            )}
          </svg>

          {/* User marker */}
          <div
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-500"
            style={{
              left: `${(userPos.x / 400) * 100}%`,
              top: `${(userPos.y / 300) * 100}%`,
            }}
            title="Your Location"
          >
            {isLiveNavigating ? (
              <span className="relative flex h-6 w-6 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white shadow-md">
                  <Radio size={12} className="!text-white animate-pulse" />
                </span>
                <span className="absolute left-6 top-0 whitespace-nowrap rounded bg-accent px-1.5 py-0.5 text-[9px] font-bold !text-white shadow">
                  LIVE YOU
                </span>
              </span>
            ) : (
              <span className="relative flex h-5 w-5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-600 opacity-50" />
                <span className="relative flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 !text-white shadow">
                  <User size={10} />
                </span>
                <span className="absolute left-5 top-0 whitespace-nowrap rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm border border-slate-200">
                  You
                </span>
              </span>
            )}
          </div>

          {/* Destination Marker */}
          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-300"
            style={{
              left: `${(recPos.x / 400) * 100}%`,
              top: `${(recPos.y / 300) * 100}%`,
            }}
            title={recommended?.name || (isAmbulanceDest ? 'Ambulance Service' : 'Destination Hospital')}
          >
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full ${
                isAmbulanceDest ? 'bg-red-600 ring-4 ring-red-300' : 'bg-accent ring-4 ring-red-200'
              } !text-white shadow-md`}
            >
              {isAmbulanceDest ? <Siren size={15} className="animate-pulse" /> : <HeartPulse size={15} />}
            </div>
            <span className="absolute left-1/2 top-8 -translate-x-1/2 max-w-[120px] truncate whitespace-nowrap rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold !text-white shadow">
              {recommended?.name || (isAmbulanceDest ? 'Ambulance' : 'Hospital')}
            </span>
          </div>

          {/* Alternative markers */}
          {alternates.map((f, i) => {
            const pos = altPositions[i] || (i === 0 ? { x: 250, y: 200 } : { x: 340, y: 235 })
            const isAltAmb = Boolean(f.isAmbulance || f.types?.includes('ambulance') || f.name?.toLowerCase().includes('ambulance'))
            return (
              <div
                key={f.id || f.placeId || `alt-${i}`}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 opacity-80 transition-[left,top] duration-300"
                style={{
                  left: `${(pos.x / 400) * 100}%`,
                  top: `${(pos.y / 300) * 100}%`,
                }}
                title={f.name}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow">
                  {isAltAmb ? <Siren size={12} className="text-red-500" /> : <HeartPulse size={13} />}
                </div>
              </div>
            )
          })}
        </div>

        {/* Map controls */}
        <div className="absolute right-3 top-3 flex flex-col gap-1.5 z-30">
          <MapControl index={0} toggle={() => setZoom((z) => Math.max(1, z - 0.15))} />
          <MapControl index={1} toggle={() => setZoom((z) => Math.min(1.8, z + 0.15))} />
        </div>

        {/* Recenter */}
        <button
          onClick={handleRecenter}
          aria-label="Recenter map"
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-accent shadow hover:bg-slate-50 z-30"
        >
          <LocateFixed size={16} />
        </button>

        {/* Legend */}
        <div className="absolute bottom-3 left-2 sm:left-3 flex max-w-[calc(100%-3rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/90 border border-slate-200 px-2.5 py-1.5 text-[10px] text-slate-600 backdrop-blur-sm z-30">
          <span className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${isLiveNavigating ? 'bg-accent animate-ping' : 'bg-blue-600'}`} />
            {isLiveNavigating ? 'Live You' : 'You'}
          </span>
          <span className="flex items-center gap-1">
            {isAmbulanceDest ? <Siren size={12} className="text-red-600" /> : <HeartPulse size={12} className="text-accent" />}
            {isAmbulanceDest ? 'Ambulance' : 'Destination'}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full border border-slate-400 bg-slate-100" /> Alternatives
          </span>
        </div>

        {/* Live Route status */}
        <span className="absolute right-3 top-14 font-mono text-[10px] uppercase tracking-widest text-accent z-20">
          <Navigation size={11} className="inline mr-1" /> {isLiveNavigating ? 'Live GPS Navigation' : 'Live Route'}
        </span>
      </div>
    </section>
  )
}
