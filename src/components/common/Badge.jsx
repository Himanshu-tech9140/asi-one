import React from 'react'

const tones = {
  green: 'text-green-700 bg-green-50 border-green-200',
  blue: 'text-blue-700 bg-blue-50 border-blue-200',
  amber: 'text-amber-700 bg-amber-50 border-amber-200',
  red: 'text-red-700 bg-red-50 border-red-200',
  violet: 'text-slate-700 bg-slate-100 border-slate-200',
  slate: 'text-slate-600 bg-slate-50 border-slate-200',
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
