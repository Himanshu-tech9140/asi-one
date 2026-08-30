import React from 'react'
import { MapPin, Clock, HeartPulse, ChevronRight } from 'lucide-react'
import { Badge } from '../common/Badge'
import { badgeToneForStatus } from './facilityStatus'

export function FacilityCard({ facility, onSelect, onDetails }) {
  const tone = badgeToneForStatus(facility.status)
  return (
    <button
      onClick={onSelect}
      className="group w-full rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-left transition-colors hover:border-accent/30 hover:bg-white/[0.04]"
      aria-label={facility.name}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-100">{facility.name}</h4>
        <ChevronRight
          size={16}
          className="mt-0.5 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-accent-soft"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <MapPin size={12} className="text-accent-soft" />
          {facility.address || 'Address unavailable'}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} className="text-accent-soft" />
          {facility.rating ? `Rating ${facility.rating}` : 'Rating unavailable'}
        </span>
        <span className="flex items-center gap-1">
          <HeartPulse size={12} className="text-accent-soft" />
          {facility.service}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
        <Badge tone={tone} dot={facility.status === 'Recommended'}>
          {facility.status || 'Result'}
        </Badge>
        <span className="font-mono text-xs font-semibold text-accent-soft">
          {facility.match ? `${facility.match}%` : '—'}
        </span>
      </div>
      {onDetails && <span onClick={(event) => { event.stopPropagation(); onDetails() }} className="mt-3 inline-block text-xs font-medium text-accent-soft">View details</span>}
    </button>
  )
}
