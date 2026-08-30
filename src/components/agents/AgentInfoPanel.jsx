import React from 'react'
import { Check } from 'lucide-react'
import { AGENT_NETWORK } from '../../data/mockData'

export function AgentInfoPanel() {
  return (
    <aside className="card-surface space-y-5 p-5 lg:sticky lg:top-20" aria-label="Agent status">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-100">Agent Status</h2>
        <div className="mt-3 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-sm font-medium text-emerald-300">Online</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {AGENT_NETWORK.center.type} agent ready to coordinate requests.
        </p>
      </div>

      <div className="space-y-3 border-t border-white/[0.06] pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Capabilities
        </h3>
        {AGENT_NETWORK.nodes.map((n) => (
          <div key={n.id} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
              <Check size={11} />
            </span>
            <div>
              <div className="text-sm text-slate-200">{n.name}</div>
              <div className="text-[11px] text-slate-500">{n.description}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-3">
        <p className="text-[11px] leading-relaxed text-amber-200/80">
          External agent connections are placeholders. The agent shown as “External” is mock
          data and is not actually connected to a live network.
        </p>
      </div>
    </aside>
  )
}
