import React from 'react'
import { Link } from 'react-router-dom'

const variants = {
  primary:
    'bg-accent text-white hover:bg-accent-soft focus-visible:ring-accent shadow-glow disabled:opacity-40',
  secondary:
    'bg-white/[0.06] text-slate-100 border border-white/10 hover:bg-white/[0.1]',
  ghost: 'text-slate-300 hover:bg-white/[0.06] hover:text-white',
  danger: 'bg-rose-600/90 text-white hover:bg-rose-500',
}

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  to,
  className = '',
  children,
  ...props
}) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`

  if (to) {
    return (
      <Link to={to} className={cls} {...props}>
        {children}
      </Link>
    )
  }
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  )
}
