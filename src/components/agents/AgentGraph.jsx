import React from 'react'
import { Building2, Route, Search, Plug, Activity, Wrench } from 'lucide-react'
import { AGENT_NETWORK } from '../../data/mockData'

const NODE_ICONS = {
  facility: Building2,
  route: Route,
  search: Search,
  external: Plug,
}

const NODE_ACCENT = {
  facility: 'from-accent/25 to-transparent text-accent-soft',
  route: 'from-emerald-500/25 to-transparent text-emerald-300',
  search: 'from-amber-500/25 to-transparent text-amber-300',
  external: 'from-blue-500/15 to-transparent text-blue-700',
}

export function AgentNode({ node, dimmed = false }) {
  const Icon = NODE_ICONS[node.id] || Wrench
  const isExternal = node.type === 'External'
  return (
    <div
      className={`relative flex flex-col items-center rounded-2xl border p-4 text-center transition-all ${
        node.online
          ? 'border-white/10 bg-base-850/80'
          : 'border-dashed border-white/10 bg-base-900/40'
      } ${dimmed ? 'opacity-40' : ''}`}
      aria-label={`${node.name} — ${node.status.toLowerCase()}`}
    >
      <div
        className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${NODE_ACCENT[node.id] || NODE_ACCENT.facility}`}
      >
        <Icon size={22} />
      </div>
      <div className="text-sm font-semibold text-slate-100">{node.name}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-500">{node.type}</div>
      <div
        className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
          node.online
            ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20'
            : 'bg-white/[0.04] text-slate-400 ring-white/10'
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${node.online ? 'bg-emerald-400' : 'bg-slate-500'}`}
        />
        {node.status}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{node.description}</p>
      {isExternal && (
        <span className="mt-2 rounded bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">
          Mock · not connected
        </span>
      )}
    </div>
  )
}

export function AgentGraph({ activeId = null }) {
  const { center, nodes } = AGENT_NETWORK
  return (
    <div
      className="relative flex flex-col items-center rounded-3xl border border-white/[0.07] bg-base-900/40 bg-grid p-6 sm:p-10"
      aria-label="Agent network graph"
    >
      {/* Center agent */}
      <div className="relative z-10 flex max-w-full items-center gap-2.5 rounded-2xl border border-accent/40 bg-accent/10 px-4 sm:px-5 py-3 shadow-glow">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent">
          <Activity size={18} className="text-white" />
        </span>
        <div className="text-left leading-tight">
          <div className="truncate text-sm font-bold text-white">{center.name}</div>
          <div className="text-[11px] text-accent-soft">
            {center.type} · <span className="text-emerald-300">Online</span>
          </div>
        </div>
      </div>

      {/* Connectors */}
      <div className="relative my-4 hidden h-6 w-full sm:block" aria-hidden="true">
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          {nodes.map((_, i) => {
            const x = (i + 0.5) / nodes.length * 100
            return (
              <path
                key={i}
                d={`M ${x},0 C ${x},50 ${x},50 ${x},100`}
                stroke="rgba(79,140,255,0.3)"
                strokeWidth="1.5"
                fill="none"
                className={activeId && activeId === nodes[i]?.id ? 'animate-pulse' : ''}
              />
            )
          })}
        </svg>
      </div>

      {/* Node row */}
      <div className="relative z-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {nodes.map((node) => (
          <AgentNode
            key={node.id}
            node={node}
            dimmed={activeId !== null && activeId !== node.id}
          />
        ))}
      </div>
    </div>
  )
}
