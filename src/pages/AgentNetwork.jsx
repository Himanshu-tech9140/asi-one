import React, { useState } from 'react'
import { AgentGraph } from '../components/agents/AgentGraph'
import { AgentInfoPanel } from '../components/agents/AgentInfoPanel'

export default function AgentNetwork() {
  const [activeId, setActiveId] = useState(null)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Agent Network</h1>
        <p className="mt-1 text-sm text-slate-400">Healthcare coordination capabilities available to ASI:One</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
              <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-emerald-400" />
              Live visualization — hover a node
            </span>
          </div>
          <div onMouseLeave={() => setActiveId(null)}>
            <AgentGraph activeId={activeId} />
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            The central agent routes each request through the connected tools. Connection lines
            animate when the corresponding tool is active during a coordination run. External
            agent nodes are placeholders and are not connected to a live network.
          </p>
        </div>

        <div className="lg:col-span-1">
          <AgentInfoPanel />
        </div>
      </div>
    </div>
  )
}
