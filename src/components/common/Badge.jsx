import React from 'react'

const tones = {
  green: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20',
  blue: 'text-accent-soft bg-accent/10 border-accent/20',
  amber: 'text-amber-300 bg-amber-500/10 border-amber-400/20',
  red: 'text-rose-300 bg-rose-500/10 border-rose-400/20',
  violet: 'text-violet-300 bg-violet-500/10 border-violet-400/20',
  slate: 'text-slate-300 bg-white/[0.05] border-white/10',
}

export function Badge({ tone = 'slate', dot = false, children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${tones[tone]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
