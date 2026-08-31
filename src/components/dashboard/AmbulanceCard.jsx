import React from 'react'
import {
  Siren,
  MapPin,
  Star,
  Phone,
  Navigation,
  Globe,
  Compass,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '../common/Button'

/**
 * Premium Smart Ambulance Service Card.
 * Designed with a clean healthcare medical-red (#DC2626) and slate palette.
 * Strictly avoids fake booking or fake availability claims.
 */
export function AmbulanceCard({
  ambulance,
  isNearest = false,
  onSelect,
  onRoute,
  onLiveNavigation,
  isNavigating = false,
  selected = false,
  className = '',
}) {
  if (!ambulance) return null

  const {
    name = 'Ambulance Service',
    address,
    phone,
    website,
    rating,
    userRatingsTotal,
    distance,
    distanceText,
    distanceKm,
    location,
  } = ambulance

  const displayDistance =
    distanceText ||
    (typeof distance === 'number'
      ? `${distance} km away`
      : typeof distanceKm === 'number'
      ? `${distanceKm} km away`
      : null)

  const hasContact = Boolean(phone && String(phone).trim().length > 0)
  const phoneClean = hasContact ? String(phone).replace(/[^\d+]/g, '') : null

  return (
    <article
      aria-label={`Ambulance service: ${name}`}
      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 ${
        selected
          ? 'border-red-500/60 bg-red-500/[0.04] shadow-lg shadow-red-500/10 ring-1 ring-red-500/40'
          : isNearest
          ? 'border-red-500/30 bg-base-900/80 shadow-md shadow-red-500/5 hover:border-red-500/50'
          : 'border-white/10 bg-base-900/60 hover:border-white/20'
      } p-4 sm:p-5 ${className}`}
    >
      {/* Top Header Badge */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 text-red-600 ring-1 ring-inset ring-red-500/20">
              <Siren size={18} className="animate-pulse" />
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                Smart Ambulance
              </span>
              {isNearest && (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 ring-1 ring-inset ring-red-500/30">
                    <ShieldAlert size={11} className="text-red-600" />
                    Nearest Ambulance Service
                  </span>
                </div>
              )}
            </div>
          </div>

          {rating && (
            <div className="flex items-center gap-1 rounded-lg bg-amber-400/10 px-2 py-1 text-xs font-semibold text-amber-300">
              <Star size={13} className="fill-amber-400 text-amber-400" />
              <span>{rating}</span>
              {userRatingsTotal && (
                <span className="text-[10px] text-amber-300/70">({userRatingsTotal})</span>
              )}
            </div>
          )}
        </div>

        {/* Title & Address */}
        <div className="mt-3">
          <h3 className="text-base font-bold text-slate-100 sm:text-lg leading-snug">
            {name}
          </h3>
          {address && (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-400 leading-relaxed">
              <MapPin size={14} className="mt-0.5 shrink-0 text-slate-500" />
              <span className="line-clamp-2">{address}</span>
            </p>
          )}
        </div>

        {/* Metrics Row */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06]">
          {displayDistance && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-slate-200">
              <Compass size={13} className="text-red-400" />
              {displayDistance}
            </span>
          )}

          {hasContact ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/[0.08] px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
              <Phone size={12} />
              Contact available
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.02] px-2.5 py-1 text-xs text-slate-400">
              Direct dispatch coordinates only
            </span>
          )}

          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <Globe size={12} />
              Website
            </a>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 space-y-2 pt-3 border-t border-white/10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {onRoute && (
            <Button
              variant={selected ? 'primary' : 'secondary'}
              size="sm"
              onClick={onRoute}
              className="w-full justify-center text-xs"
            >
              <Navigation size={13} />
              Get Route
            </Button>
          )}

          {onLiveNavigation && (
            <Button
              variant="primary"
              size="sm"
              onClick={onLiveNavigation}
              className="w-full justify-center text-xs bg-red-600 hover:bg-red-500 text-white"
            >
              <Siren size={13} />
              {isNavigating ? 'Live Active' : 'Start Live Nav'}
            </Button>
          )}
        </div>

        {hasContact && (
          <a
            href={`tel:${phoneClean}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition-all duration-150 active:scale-[0.98]"
          >
            <Phone size={14} className="fill-white" />
            Contact Ambulance ({phone})
          </a>
        )}

        {onSelect && !onRoute && !onLiveNavigation && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onSelect}
            className="w-full justify-center text-xs"
          >
            Select Service
            <ArrowRight size={13} />
          </Button>
        )}
      </div>
    </article>
  )
}

