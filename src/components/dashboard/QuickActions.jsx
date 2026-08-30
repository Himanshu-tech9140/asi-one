import React from 'react'
import {
  Building2,
  Route,
  Stethoscope,
  Pill,
  Droplets,
  ArrowUpRight,
} from 'lucide-react'

const ACTION_META = {
  emergencyFacility: { icon: Building2, accent: 'text-accent-soft bg-accent/10' },
  healthcareService: { icon: Stethoscope, accent: 'text-amber-300 bg-amber-500/10' },
  pharmacy: { icon: Pill, accent: 'text-emerald-300 bg-emerald-500/10' },
  bloodBank: { icon: Droplets, accent: 'text-rose-300 bg-rose-500/10' },
  fastestRoute: { icon: Route, accent: 'text-violet-300 bg-violet-500/10' },
}

export function QuickActions({ actions, onAction }) {
  return (
    <section aria-label="Quick actions">
      <h2 className="mb-3 text-sm font-semibold tracking-tight text-slate-100">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {actions.map((action) => {
          const meta = ACTION_META[action.id]
          const Icon = meta?.icon || Building2
          return (
            <button
              key={action.id}
              onClick={() => onAction?.(action)}
              className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 text-left transition-colors hover:border-accent/30 hover:bg-white/[0.04]"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta?.accent || 'bg-accent/10 text-accent-soft'}`}
              >
                <Icon size={17} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-100">
                  {action.label}
                </span>
                <span className="block truncate text-[11px] text-slate-500">
                  {action.description}
                </span>
              </span>
              <ArrowUpRight
                size={15}
                className="ml-auto shrink-0 text-slate-600 transition-colors group-hover:text-accent-soft"
              />
            </button>
          )
        })}
      </div>
    </section>
  )
}
