import React from 'react'
import { Inbox, Loader2 } from 'lucide-react'

export function EmptyState({ title = 'No results', message, icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05] text-slate-400">
        <Icon size={22} />
      </div>
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      {message && <p className="mt-1 max-w-xs text-sm text-slate-400">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-10 text-sm text-slate-400"
    >
      <Loader2 size={18} className="animate-spin text-accent" />
      {label}
    </div>
  )
}
