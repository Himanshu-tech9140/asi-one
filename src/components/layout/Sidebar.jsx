import React from 'react'
import { NavLink } from 'react-router-dom'
import { Activity, ChevronsLeft, ChevronsRight, X } from 'lucide-react'
import { NAV_ITEMS } from './navConfig'
import { AGENT_STATUS } from '../../data/mockData'

function Logo({ collapsed }) {
  return (
    <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-violet-500 shadow-glow">
        <Activity size={18} className="text-white" />
      </div>
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[15px] font-bold tracking-tight text-white">
            CRISISFLOW
          </div>
          <div className="truncate text-[10px] font-medium uppercase tracking-widest text-slate-400">
            AI Coordination Agent
          </div>
        </div>
      )}
    </div>
  )
}

function SidebarLink({ item, collapsed }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={item.label}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          collapsed ? 'justify-center' : ''
        } ${
          isActive
            ? 'bg-accent/15 text-white ring-1 ring-inset ring-accent/30'
            : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100'
        }`
      }
    >
      <item.icon size={18} className="shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  )
}

export function Sidebar({ collapsed, onToggle, onNavigate }) {
  return (
    <aside
      className={`glass fixed inset-y-0 left-0 z-40 flex flex-col border-r transition-[width] duration-300 ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
      aria-label="Primary navigation"
    >
      <div className={`flex h-16 items-center ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <Logo collapsed={collapsed} />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 scrollbar-thin">
        {!collapsed && (
          <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Coordination
          </p>
        )}
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="mx-3 mb-2 hidden items-center justify-center gap-2 rounded-lg py-1.5 text-xs text-slate-500 hover:bg-white/[0.05] hover:text-slate-200 md:flex"
      >
        {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        {!collapsed && 'Collapse'}
      </button>

      <div className="border-t border-white/[0.06] p-3">
        <div className="rounded-xl bg-white/[0.03] p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-xs font-medium text-emerald-300">Agent Online</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            {AGENT_STATUS.asiLabel}
          </div>
        </div>
      </div>
    </aside>
  )
}

export function MobileNav({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-72 bg-base-900 shadow-2xl">
        <div className="flex h-16 items-center justify-between px-5">
          <Logo collapsed={false} />
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} item={item} collapsed={false} />
          ))}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-white/[0.06] p-3">
          <div className="rounded-xl bg-white/[0.03] p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Agent Online
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
