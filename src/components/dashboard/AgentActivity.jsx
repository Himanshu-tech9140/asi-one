import React from 'react'
import { Check, Loader2, Circle, Radar, Play, RotateCcw } from 'lucide-react'
import { Card } from '../common/Card'

const STEP_ICONS = {
  received: Radar,
  understood: Radar,
  located: Radar,
  searched: Radar,
  compared: Radar,
  routing: Radar,
  ready: Check,
}

export function AgentActivity({ steps, isRunning, isComplete, onReset }) {
  const doneCount = steps.filter((s) => s.completed).length

  return (
    <Card
      title="ASI:One Coordination Activity"
      subtitle={
        isRunning
          ? `Executing… ${doneCount}/${steps.length} steps`
          : isComplete
            ? `Execution complete · ${steps.length} steps`
          : 'Healthcare coordination status'
      }
      action={
        isComplete ? (
          <button
            onClick={onReset}
            aria-label="Reset execution"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:bg-white/[0.06] hover:text-white"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        ) : null
      }
      className="h-full"
    >
      <ol className="relative space-y-1" aria-label="Execution timeline">
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[step.id] || Radar
          return (
            <li key={step.id} className="relative flex gap-3 pb-1">
              {/* connector line */}
              {i < steps.length - 1 && (
                <span
                  className={`absolute left-[15px] top-7 h-[calc(100%-8px)] w-px ${
                    step.completed ? 'bg-accent/40' : 'bg-white/10'
                  }`}
                  aria-hidden="true"
                />
              )}

              <span
                className={`relative z-10 mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  step.completed
                    ? 'border-accent/40 bg-accent/15 text-accent-soft'
                    : step.active
                      ? 'border-accent/50 bg-accent/20 text-accent-soft'
                      : 'border-white/10 bg-base-900 text-slate-500'
                }`}
              >
                {step.completed ? (
                  <Check size={14} />
                ) : step.active ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Circle size={9} />
                )}
              </span>

              <div
                className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 transition-all ${
                  step.active ? 'bg-white/[0.04]' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-medium ${
                      step.completed
                        ? 'text-slate-100'
                        : step.active
                          ? 'text-white'
                          : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.timestamp && (
                    <span className="shrink-0 font-mono text-[10px] text-slate-500">
                      {step.timestamp}
                    </span>
                  )}
                </div>
                <p className="truncate text-[11px] text-slate-500">{step.description}</p>
              </div>
            </li>
          )
        })}
      </ol>

      {!isRunning && !isComplete && !doneCount && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs text-slate-400">
          <Play size={12} className="text-accent-soft" />
          Press “Start Coordination” to watch the agent work.
        </div>
      )}
    </Card>
  )
}
