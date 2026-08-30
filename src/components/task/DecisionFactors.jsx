import React from 'react'
import { DECISION_FACTORS } from '../../data/mockData'

export function DecisionFactors() {
  return (
    <ul className="space-y-3" aria-label="Decision factors">
      {DECISION_FACTORS.map((f) => (
        <li key={f.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-200">{f.label}</span>
            <span className="text-slate-400">{f.value}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-violet-400"
              style={{ width: `${f.score}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
