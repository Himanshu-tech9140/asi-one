import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar, MobileNav } from './Sidebar'
import { Topbar } from './Topbar'

const PAGE_TITLES = [
  { path: '/', title: 'Dashboard' },
  { path: '/new', title: 'New Coordination' },
  { path: '/history', title: 'Coordination History' },
  { path: '/agents', title: 'Agent Network' },
  { path: '/settings', title: 'Settings' },
]

function titleFor(pathname) {
  if (pathname.startsWith('/task/')) return 'Task Details'
  const match = PAGE_TITLES.find((p) => p.path === pathname)
  return match?.title || 'ASI:One Healthcare Coordination'
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      {/* Mobile nav */}
      {mobileOpen && <MobileNav onClose={() => setMobileOpen(false)} />}

      <div className={`flex flex-col transition-[padding] duration-300 ${collapsed ? 'md:pl-[72px]' : 'md:pl-64'}`}>
        <Topbar title={titleFor(location.pathname)} onMenu={() => setMobileOpen(true)} notifications={2} />

        <main className="flex-1 p-3 sm:p-6 lg:p-8" id="main-content">
          <div key={location.pathname} className="animate-fadeUp">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
