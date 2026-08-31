import React from 'react'
import { Menu, Bell, CircleUserRound, MapPin, Siren } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AGENT_STATUS } from '../../data/mockData'

export function Topbar({ title, onMenu, notifications = 0 }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          aria-label="Open navigation menu"
          className="rounded-lg p-2 text-slate-300 hover:bg-white/[0.06] hover:text-white md:hidden"
        >
          <Menu size={20} />
        </button>
        <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 lg:flex">
          <MapPin size={14} className="text-blue-600" />
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-xs font-medium text-slate-600">Location ready · {AGENT_STATUS.label}</span>
        </div>

        <button
          aria-label={`Notifications${notifications ? `, ${notifications} unread` : ''}`}
          className="relative rounded-lg p-2 text-slate-300 hover:bg-white/[0.06] hover:text-white"
        >
          <Bell size={19} />
          {notifications > 0 && (
            <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
              {notifications}
            </span>
          )}
        </button>

        <Link to="/new" className="hidden items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold !text-white hover:bg-accent-soft sm:inline-flex">
          <Siren size={15} /> Emergency Help
        </Link>

        <button
          aria-label="Account menu"
          className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] p-1 pr-3 hover:bg-white/[0.06]"
        >
          <CircleUserRound size={28} className="text-accent-soft" />
          <span className="hidden text-xs font-medium text-slate-200 sm:block">
            Alex Chen
          </span>
        </button>
      </div>
    </header>
  )
}
