import React, { useState } from 'react'
import { Moon, Sun, Bell, MapPin, SlidersHorizontal, Check } from 'lucide-react'
import { Card } from '../components/common/Card'

function Toggle({ checked, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-accent' : 'bg-white/10'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function ToggleRow({ icon: Icon, title, description, checked, onChange, label }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-start gap-3 min-w-0">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-accent-soft">
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-100">{title}</div>
          <div className="text-xs text-slate-500">{description}</div>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  )
}

export default function Settings() {
  const [darkMode, setDarkMode] = useState(true)
  const [notifyCompleted, setNotifyCompleted] = useState(true)
  const [notifyFailed, setNotifyFailed] = useState(true)
  const [shareLocation, setShareLocation] = useState(false)
  const [localRadius, setLocalRadius] = useState('5 km')
  const [autoReplan, setAutoReplan] = useState(true)
  const [toolConfirm, setToolConfirm] = useState(false)

  const radiusOptions = ['2 km', '5 km', '10 km']

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Appearance, notifications and agent behavior preferences.
        </p>
      </div>

      {/* Appearance */}
      <Card title="Appearance">
        <div className="flex items-center justify-between gap-3 py-1">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-accent-soft">
              {darkMode ? <Moon size={17} /> : <Sun size={17} />}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-100">Dark interface</div>
              <div className="text-xs text-slate-500">Always-on dark theme</div>
            </div>
          </div>
          <Toggle checked={darkMode} onChange={setDarkMode} label="Toggle dark interface" />
        </div>
      </Card>

      {/* Notifications */}
      <Card title="Notifications">
        <div className="divide-y divide-white/[0.05]">
          <ToggleRow
            icon={Bell}
            title="Task completed"
            description="Notify when a coordination finishes"
            checked={notifyCompleted}
            onChange={setNotifyCompleted}
            label="Notify on task completed"
          />
          <ToggleRow
            icon={Bell}
            title="Task failed"
            description="Notify when a coordination fails"
            checked={notifyFailed}
            onChange={setNotifyFailed}
            label="Notify on task failed"
          />
        </div>
      </Card>

      {/* Location preferences */}
      <Card title="Location preferences">
        <div className="divide-y divide-white/[0.05]">
          <div className="flex items-start justify-between gap-3 py-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-accent-soft">
                <MapPin size={17} />
              </span>
              <div>
                <div className="text-sm font-medium text-slate-100">Default search radius</div>
                <div className="text-xs text-slate-500">Preferred distance for facility searches</div>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-1">
              {radiusOptions.map((r) => (
                <button
                  key={r}
                  onClick={() => setLocalRadius(r)}
                  aria-pressed={localRadius === r}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                    localRadius === r
                      ? 'bg-accent/15 text-accent-soft ring-1 ring-inset ring-accent/30'
                      : 'text-slate-400 hover:bg-white/[0.05]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <ToggleRow
            icon={MapPin}
            title="Auto-detect location"
            description="Resolve your current location for each request"
            checked={shareLocation}
            onChange={setShareLocation}
            label="Toggle auto-detect location"
          />
        </div>
      </Card>

      {/* Agent preferences */}
      <Card title="Agent preferences">
        <div className="divide-y divide-white/[0.05]">
          <ToggleRow
            icon={SlidersHorizontal}
            title="Replan automatically"
            description="Re-plan the coordination if a step changes"
            checked={autoReplan}
            onChange={setAutoReplan}
            label="Toggle automatic replanning"
          />
          <ToggleRow
            icon={SlidersHorizontal}
            title="Confirm before tool execution"
            description="Ask before invoking external tools"
            checked={toolConfirm}
            onChange={setToolConfirm}
            label="Toggle tool confirmation"
          />
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-xs text-slate-400">
          <Check size={14} className="text-emerald-400" />
          Settings are stored locally for this demo. No authentication or cloud sync is
          implemented.
        </div>
      </Card>
    </div>
  )
}
