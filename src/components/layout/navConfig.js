import {
  LayoutDashboard,
  Sparkles,
  Clock,
  Workflow,
  Settings,
} from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/new', label: 'New Coordination', icon: Sparkles },
  { to: '/history', label: 'History', icon: Clock },
  { to: '/agents', label: 'Agent Network', icon: Workflow },
  { to: '/settings', label: 'Settings', icon: Settings },
]
