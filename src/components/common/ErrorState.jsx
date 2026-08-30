import React from 'react'

export function ErrorState({ title, message, onRetry, retryLabel = 'Try Again', children }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] px-6 py-10 text-center">
      <h3 className="text-sm font-semibold text-rose-200">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-400">{message}</p>}
      {(onRetry || children) && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 rounded-xl bg-white/[0.06] px-4 py-2 text-sm font-medium text-slate-100 border border-white/10 hover:bg-white/[0.1]"
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}
