import React from 'react'
import { Link } from 'react-router-dom'
import { Activity, Building2, Route, Search, ArrowRight } from 'lucide-react'
import { AGENT_NETWORK_PREVIEW } from '../../data/mockData'

const NODE_ICONS = {
  facility: Building2,
  route: Route,
  search: Search,
}

export function AgentNetworkPreview() {
  return (
    <section
      aria-label="Agent network preview"
      className="card-surface relative overflow-hidden p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-100">
            <Activity size={15} className="text-accent-soft" />
            Agent Network
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Healthcare capabilities ASI:One can activate for your request.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center">
        {/* Center node */}
        <div className="relative z-10 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 shadow-glow">
          <Activity size={15} className="text-accent-soft" />
          <span className="text-sm font-semibold text-white">ASI:One Healthcare Agent</span>
        </div>

        {/* Connectors */}
        <div className="relative my-2 flex h-4 w-full items-center justify-center">
          <div className="flex w-full justify-center gap-2" aria-hidden="true">
            <span className="h-px flex-1 max-w-16 bg-gradient-to-r from-transparent via-accent/40 to-accent/40" />
            <span className="h-px flex-1 max-w-16 bg-gradient-to-r from-accent/40 to-accent/40" />
            <span className="h-px flex-1 max-w-16 bg-gradient-to-r from-accent/40 via-accent/40 to-transparent" />
          </div>
        </div>

        {/* Nodes */}
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
          {AGENT_NETWORK_PREVIEW.map((node) => {
            const Icon = NODE_ICONS[node.id] || Search
            return (
              <div
                key={node.id}
                className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-base-900/60 p-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-accent-soft">
                  <Icon size={15} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-slate-200">{node.name}</div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {node.status}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <Link
          to="/agents"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-accent-soft hover:text-accent"
        >
          View Agent Network
          <ArrowRight size={13} />
        </Link>
      </div>
    </section>
  )
}
