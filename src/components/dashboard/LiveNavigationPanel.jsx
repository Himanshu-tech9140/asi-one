import React from 'react'
import {
  Navigation,
  Square,
  MapPin,
  HeartPulse,
  Clock,
  Compass,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '../common/Button'

export function LiveNavigationPanel({
  destination,
  currentLocation,
  distanceText,
  durationText,
  statusMessage,
  isArrived,
  isRecalculating,
  error,
  onStop,
  onRecalculate,
}) {
  if (!destination) return null

  return (
    <div
      aria-label="Live navigation active"
      className="card-surface relative overflow-hidden border-accent/40 bg-white p-4 shadow-soft sm:p-5"
    >
      {/* Top red indicator bar */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-red-500 to-rose-600" />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-accent">
            Live Navigation
          </span>
          {isRecalculating && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              <RefreshCw size={10} className="animate-spin" /> Recalculating
            </span>
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onStop}
          className="border-red-200 text-accent hover:bg-red-50"
        >
          <Square size={13} fill="currentColor" /> Stop Navigation
        </Button>
      </div>

      {/* Destination and stats grid */}
      <div className="mt-3 grid gap-3 sm:grid-cols-12 sm:items-center">
        {/* Destination Hospital */}
        <div className="sm:col-span-6">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-accent ring-1 ring-inset ring-red-200">
              <HeartPulse size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Destination
              </div>
              <div className="truncate text-base font-bold text-slate-900">
                {destination.name || 'Healthcare Facility'}
              </div>
              <div className="truncate text-xs text-slate-500">
                {destination.address || 'Address available'}
              </div>
            </div>
          </div>
        </div>

        {/* Distance & ETA */}
        <div className="flex items-center gap-2 sm:col-span-6 sm:justify-end">
          {/* Distance */}
          <div className="flex-1 rounded-xl bg-slate-50 border border-slate-100 p-2.5 sm:flex-none sm:min-w-[110px] text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
              <Compass size={12} className="text-accent" />
              <span>Distance</span>
            </div>
            <div className="mt-0.5 font-mono text-base font-bold text-slate-900">
              {distanceText || '—'}
            </div>
          </div>

          {/* ETA */}
          <div className="flex-1 rounded-xl bg-slate-50 border border-slate-100 p-2.5 sm:flex-none sm:min-w-[110px] text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
              <Clock size={12} className="text-accent" />
              <span>Est. Time</span>
            </div>
            <div className="mt-0.5 font-mono text-base font-bold text-slate-900">
              {durationText || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Live Status & Coordinates Banner */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          {isArrived ? (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Arrived near destination
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} className="text-accent" />
              <span>{statusMessage || 'Updating your location...'}</span>
            </span>
          )}
        </div>

        {currentLocation && (
          <div className="font-mono text-[11px] text-slate-400">
            📍 {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
            {typeof currentLocation.accuracy === 'number' && ` (±${Math.round(currentLocation.accuracy)}m)`}
          </div>
        )}
      </div>

      {/* Error message if any */}
      {error && (
        <div
          role="alert"
          className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700"
        >
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

