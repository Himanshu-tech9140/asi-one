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
  emergencyFacility: { icon: Building2, accent: 'text-red-700 bg-red-50' },
  healthcareService: { icon: Stethoscope, accent: 'text-red-700 bg-red-50' },
  pharmacy: { icon: Pill, accent: 'text-green-700 bg-green-50' },
  bloodBank: { icon: Droplets, accent: 'text-red-700 bg-red-50' },
  fastestRoute: { icon: Route, accent: 'text-blue-700 bg-blue-50' },
}

export function QuickActions({ actions, onAction }) {
  return (
    <section aria-label="Quick actions">
      <h2 className="mb-3 text-sm font-semibold tracking-tight text-slate-100">
        Healthcare services
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {actions.map((action) => {
          const meta = ACTION_META[action.id]
          const Icon = meta?.icon || Building2
          return (
            <button
              key={action.id}
              onClick={() => onAction?.(action)}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-card transition-colors hover:border-red-200 hover:bg-red-50/40"
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
