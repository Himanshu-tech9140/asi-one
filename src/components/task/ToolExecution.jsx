import React from 'react'
import { Check, Loader2, Wrench, Clock } from 'lucide-react'
import { TOOL_EXECUTIONS } from '../../data/mockData'

export function ToolExecution({ statuses }) {
  return (
    <ul className="space-y-2.5" aria-label="Tools used">
      {TOOL_EXECUTIONS.map((tool) => {
        const status = statuses?.[tool.name] || 'completed'
        return (
          <li
            key={tool.id}
            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-accent-soft">
              <Wrench size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-100">{tool.name}</span>
                {status === 'completed' && <Check size={16} className="text-emerald-400" />}
                {status === 'running' && (
                  <Loader2 size={16} className="animate-spin text-accent-soft" />
                )}
                {status === 'idle' && <Clock size={15} className="text-slate-500" />}
              </div>
              <p className="truncate text-[11px] text-slate-500">{tool.detail}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
