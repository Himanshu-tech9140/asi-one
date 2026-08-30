import React from 'react'
import { Mic, MapPin, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '../common/Button'
import { QUICK_ACTIONS } from '../../data/mockData'

const EXAMPLE_CHIPS = [
  'Find emergency facility near me',
  'Find fastest route',
  'Find nearby emergency services',
]

export function TaskInput({ value, onChange, onSubmit, onUseLocation, running }) {
  return (
    <section
      aria-label="Task input"
      className="card-surface relative overflow-hidden p-5 sm:p-6"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-100">
          <Sparkles size={16} className="text-accent-soft" />
          New Coordination
        </h2>

        <label htmlFor="task-input" className="mt-4 block text-sm font-medium text-slate-300">
          What do you need help coordinating?
        </label>

        <textarea
          id="task-input"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Example: Find the best emergency facility near my current location..."
          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-base-900/60 p-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/50 focus:ring-1 focus:ring-accent/40"
          aria-label="Describe your coordination request"
        />

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Use voice input"
              className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white"
            >
              <Mic size={18} />
            </button>
            <button
              type="button"
              onClick={onUseLocation}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white"
            >
              <MapPin size={16} className="text-accent-soft" />
              Current location
            </button>
          </div>
          <Button onClick={onSubmit} disabled={running || !value.trim()} size="lg">
            {running ? 'Coordinating…' : 'Start Coordination'}
            <ArrowRight size={16} />
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLE_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => onChange(chip)}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-accent/30 hover:text-slate-200"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
