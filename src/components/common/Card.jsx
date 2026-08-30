import React from 'react'

export function Card({ title, subtitle, action, children, className = '', pad = true, id }) {
  return (
    <section
      id={id}
      className={`card-surface ${pad ? 'p-5' : ''} ${className}`}
      aria-label={title}
    >
      {(title || action) && (
        <header className={`flex items-start justify-between gap-3 ${pad ? 'mb-4' : 'p-5 pb-0'}`}>
          <div>
            {title && (
              <h2 className="text-sm font-semibold tracking-tight text-slate-100">{title}</h2>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
