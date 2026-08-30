import React from 'react'
import { Star, MapPin, Clock, HeartPulse, ChevronRight, Navigation } from 'lucide-react'
import { Button } from '../common/Button'

export function RecommendationCard({ facility = {}, empty = false, onRoute, onDetails }) {
  if (empty) {
    return (
      <section
        aria-label="Agent recommendation"
        className="card-surface flex h-full min-h-[260px] flex-col items-center justify-center p-6 text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05] text-slate-500">
          <Star size={22} />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-slate-200">No recommendation yet</h3>
        <p className="mt-1 max-w-xs text-sm text-slate-500">
          Start a coordination request to see the agent’s recommended option.
        </p>
      </section>
    )
  }

  return (
    <section aria-label="Agent recommendation" className="card-surface relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative">
        <header className="flex items-center gap-2">
          <span className="text-amber-300">
            <Star size={15} fill="currentColor" />
          </span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">
            Agent Recommendation
          </h3>
        </header>

        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold text-white">{facility.name}</h4>
            <p className="mt-0.5 text-xs text-slate-400">{facility.open}</p>
          </div>
          <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent-soft ring-1 ring-inset ring-accent/30">
            {facility.match ? `${facility.match}% match` : 'Result'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat icon={MapPin} value={facility.address || 'Available'} label="Address" />
          <Stat icon={Clock} value={facility.rating ? String(facility.rating) : '—'} label="Rating" />
          <Stat icon={HeartPulse} value={facility.service || 'Healthcare'} label="Service" />
        </div>

        <div className="mt-4 border-t border-white/[0.06] pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Why this option?
          </p>
          <ul className="mt-2 space-y-1.5">
            {facility.decisionFactors?.map((f) => (
              <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
                <span className="text-emerald-400">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={onRoute} disabled={!onRoute}>
            <Navigation size={15} />
            Open Route
          </Button>
          <Button variant="secondary" className="flex-1" onClick={onDetails} disabled={!onDetails}>
            View Details
            <ChevronRight size={15} />
          </Button>
        </div>
      </div>
    </section>
  )
}

function Stat({ icon: Icon, value, label }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <Icon size={12} className="text-accent-soft" />
        {label}
      </div>
      <div className="mt-1 font-mono text-sm font-semibold text-white">{value}</div>
    </div>
  )
}
