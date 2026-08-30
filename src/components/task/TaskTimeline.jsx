import React from 'react'
import { Check, Loader2, Circle, Radar } from 'lucide-react'
import { AGENT_ACTIVITY_ITEMS } from '../../data/mockData'

export function TaskTimeline({ steps }) {
  return (
    <ol className="relative space-y-1" aria-label="Agent activity timeline">
      {AGENT_ACTIVITY_ITEMS.map((item, i) => {
        const step = steps?.find((s) => s.id === item.id)
        const completed = Boolean(step?.completed)
        const active = Boolean(step?.active)
        return (
          <li key={item.id} className="relative flex gap-3 pb-1">
            {i < AGENT_ACTIVITY_ITEMS.length - 1 && (
              <span
                className={`absolute left-[15px] top-7 h-[calc(100%-8px)] w-px ${
                  completed ? 'bg-accent/40' : 'bg-white/10'
                }`}
              />
            )}
            <span
              className={`relative z-10 mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                completed
                  ? 'border-accent/40 bg-accent/15 text-accent-soft'
                  : active
                    ? 'border-accent/50 bg-accent/20 text-accent-soft'
                    : 'border-white/10 bg-base-900 text-slate-500'
              }`}
            >
              {completed ? (
                <Check size={14} />
              ) : active ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Circle size={9} />
              )}
            </span>
            <div
              className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 ${active ? 'bg-white/[0.04]' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-xs font-medium ${
                    completed ? 'text-slate-100' : active ? 'text-white' : 'text-slate-500'
                  }`}
                >
                  {item.label}
                </span>
                {step?.timestamp && (
                  <span className="font-mono text-[10px] text-slate-500">{step.timestamp}</span>
                )}
              </div>
              <p className="truncate text-[11px] text-slate-500">{item.description}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function TaskTimelineStatic() {
  return (
    <ol className="relative space-y-1" aria-label="Agent activity timeline">
      {AGENT_ACTIVITY_ITEMS.map((item, i) => (
        <li key={item.id} className="relative flex gap-3 pb-1">
          {i < AGENT_ACTIVITY_ITEMS.length - 1 && (
            <span className="absolute left-[15px] top-7 h-[calc(100%-8px)] w-px bg-accent/40" />
          )}
          <span className="relative z-10 mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/15 text-accent-soft">
            <Check size={14} />
          </span>
          <div className="min-w-0 flex-1 rounded-lg px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-100">{item.label}</span>
              <span className="font-mono text-[10px] text-slate-500">
                {String(i).padStart(2, '0')}s
              </span>
            </div>
            <p className="truncate text-[11px] text-slate-500">{item.description}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
