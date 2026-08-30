import React, { useState } from 'react'
import { Plus, Minus, LocateFixed, User, HeartPulse, Navigation } from 'lucide-react'
import { FACILITIES } from '../../data/mockData'

// Mock map panel. Renders a convincing illustrative map using SVG.
// The data / marker positions are entirely mock.
//
// STRUCTURED FOR REPLACEMENT: all map logic is self-contained here.
// A real provider (Google Maps / Mapbox) would swap only this
// component while the surrounding UI stays unchanged.

function MapControl({ index, toggle }) {
  return (
    <button
      onClick={toggle}
      aria-label={`Map zoom level ${index === 0 ? 'out' : 'in'}`}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-base-850/90 text-slate-300 shadow hover:bg-white/10"
    >
      {index === 0 ? <Minus size={16} /> : <Plus size={16} />}
    </button>
  )
}

export function MockMap({ showRoute = true, facilities = FACILITIES, selectedFacility, route }) {
  const [zoom, setZoom] = useState(1)
  const [recenter, setRecenter] = useState(0)

  const recommended = selectedFacility || facilities[0] || FACILITIES[0]
  const alternates = facilities.filter((facility) => facility.id !== recommended.id).slice(0, 2)

  const scale = zoom

  // Place markers on the SVG surface (viewBox 0 0 400 300)
  const userPos = { x: 60, y: 210 }
  const recPos = { x: 300, y: 90 }
  const altAPos = { x: 250, y: 200 }
  const altBPos = { x: 340, y: 235 }

  const routePoints = `${userPos.x},${userPos.y} ${150},${180} ${225},${135} ${recPos.x},${recPos.y}`

  return (
    <section
      aria-label="Map showing recommended route"
      className="card-surface relative flex flex-col overflow-hidden"
    >
      {/* Header strip */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-soft">
          <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-accent" />
          LIVE ROUTE
        </span>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="font-mono">{route?.distanceText || 'Route pending'}</span>
          <span className="text-slate-600">·</span>
          <span className="font-mono">{route?.durationText || 'Select navigation'}</span>
        </div>
      </div>

      {/* Map surface */}
      <div
        className="relative flex-1 overflow-hidden bg-grid"
        style={{ background: '#0b0e14', minHeight: 320 }}
      >
        {/* decorative "roads" */}
        <svg
          viewBox="0 0 400 300"
          className="pointer-events-none absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <g stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="none">
            <path d="M-20 60 C 100 40, 300 90, 430 60" />
            <path d="M40 -20 C 80 100, 40 220, 80 330" />
            <path d="M-20 180 C 120 160, 250 210, 430 190" />
            <path d="M180 -20 C 200 90, 160 200, 190 330" />
          </g>
          <g stroke="rgba(79,140,255,0.05)" strokeWidth="4" fill="none" strokeDasharray="6 8">
            <path d="M-20 120 C 150 100, 220 160, 430 140" />
            <path d="M120 -20 C 160 90, 240 120, 390 80" />
          </g>
          <rect x="10" y="10" width="70" height="45" rx="6" fill="rgba(255,255,255,0.03)" />
          <text x="45" y="38" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.35)" fontFamily="Inter, sans-serif">
            Sector 62
          </text>
          <rect x="300" y="20" width="80" height="45" rx="6" fill="rgba(255,255,255,0.03)" />
          <text x="340" y="48" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.35)" fontFamily="Inter, sans-serif">
            Uptown
          </text>
        </svg>

        {/* Route + markers, offset by zoom */}
        <div
          className="absolute inset-0 transition-transform duration-500"
          style={{ transform: `scale(${scale})` }}
        >
          <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full">
            {/* route line */}
            {showRoute && (
              <>
                <polyline
                  points={routePoints}
                  fill="none"
                  stroke="rgba(79,140,255,0.85)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={routePoints}
                  fill="none"
                  stroke="rgba(79,140,255,0.35)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="1 12"
                />
              </>
            )}
          </svg>

          {/* User marker */}
          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${userPos.x / 400 * 100}%`, top: `${userPos.y / 300 * 100}%` }}
            title="Your location"
          >
            <span className="relative flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
              <span className="relative flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white">
                <User size={10} />
              </span>
            </span>
            <span className="absolute left-4 top-0 whitespace-nowrap rounded bg-base-900/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
              You
            </span>
          </div>

          {/* Recommended marker */}
          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${recPos.x / 400 * 100}%`, top: `${recPos.y / 300 * 100}%` }}
            title={recommended.name}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent shadow-glow ring-4 ring-accent/30 text-white">
              <HeartPulse size={15} />
            </div>
            <span className="absolute left-1/2 top-8 -translate-x-1/2 whitespace-nowrap rounded bg-accent/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              Recommended
            </span>
          </div>

          {/* Alternative markers */}
          {alternates.map((f, i) => {
            const pos = i === 0 ? altAPos : altBPos
            return (
              <div
                key={f.id}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pos.x / 400 * 100}%`, top: `${pos.y / 300 * 100}%` }}
                title={f.name}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/40 bg-base-800/90 text-slate-200 shadow">
                  <HeartPulse size={13} />
                </div>
              </div>
            )
          })}

          {/* Distance tag mid-route */}
          {showRoute && (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${(150 + 225) / 2 / 400 * 100}%`,
                top: `${(180 + 135) / 2 / 300 * 100}%`,
              }}
            >
              <span className="whitespace-nowrap rounded bg-base-900/90 px-1.5 py-0.5 font-mono text-[10px] text-accent-soft">
                {route?.distanceText || 'Route pending'} · {route?.durationText || '—'}
              </span>
            </div>
          )}
        </div>

        {/* Map controls */}
        <div className="absolute right-3 top-3 flex flex-col gap-1.5">
          <MapControl index={0} toggle={() => setZoom((z) => Math.max(1, z - 0.15))} />
          <MapControl index={1} toggle={() => setZoom((z) => Math.min(1.6, z + 0.15))} />
        </div>

        {/* Recenter */}
        <button
          onClick={() => setRecenter((r) => r + 1)}
          aria-label="Recenter map"
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-base-850/90 text-slate-300 shadow hover:bg-white/10"
        >
          <LocateFixed size={16} className="text-accent-soft" />
        </button>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-lg bg-base-900/80 px-2.5 py-1.5 text-[10px] text-slate-400 backdrop-blur-sm">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> You
          </span>
          <span className="flex items-center gap-1">
            <HeartPulse size={11} className="text-accent-soft" /> Recommended
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full border border-slate-300" /> Other
          </span>
        </div>

        {/* Route label */}
        <span className="absolute right-3 top-14 font-mono text-[10px] uppercase tracking-widest text-accent-soft/60">
          <Navigation size={11} className="inline" /> live route
        </span>
      </div>
    </section>
  )
}
