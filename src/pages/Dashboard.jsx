import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { TaskInput } from '../components/dashboard/TaskInput'
import { AgentActivity } from '../components/dashboard/AgentActivity'
import { MockMap } from '../components/dashboard/MockMap'
import { RecommendationCard } from '../components/dashboard/RecommendationCard'
import { FacilityCard } from '../components/dashboard/FacilityCard'
import { QuickActions } from '../components/dashboard/QuickActions'
import { AgentNetworkPreview } from '../components/dashboard/AgentNetworkPreview'
import { LiveNavigationPanel } from '../components/dashboard/LiveNavigationPanel'
import { useAgentSimulation } from '../hooks/useAgentSimulation'
import { useLiveNavigation } from '../hooks/useLiveNavigation'
import { FACILITIES, QUICK_ACTIONS } from '../data/mockData'
import { Badge } from '../components/common/Badge'

export default function Dashboard() {
  const [input, setInput] = useState('')
  const [location, setLocation] = useState(null)
  const simulation = useAgentSimulation()
  const liveNav = useLiveNavigation()
  const navigate = useNavigate()

  const startCoordination = () => {
    const request = input.trim()
    if (request) navigate('/new', { state: { request } })
  }

  const onQuickAction = (action) => {
    const request =
      {
        smartAmbulance: 'Find the nearest emergency ambulance service and contact details',
        emergencyFacility: 'Find an emergency facility near my current location',
        healthcareService: 'Find a healthcare service near my current location',
        pharmacy: 'Find a pharmacy near my current location',
        bloodBank: 'Find a blood bank near my current location',
        fastestRoute: 'Find the fastest route to a suitable healthcare facility',
      }[action.id] || ''

    setInput(request)
    navigate('/new', { state: { request } })
  }

  const recommended = FACILITIES[0]
  const alternatives = FACILITIES.slice(1)

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-green-700">
            ASI:One coordination online
          </span>
        </div>

        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
            How can we help you <span className="text-gradient">today?</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400 sm:text-base">
            Describe your healthcare need and ASI:One will coordinate the right services for you.
          </p>
        </div>
      </section>

      {/* Task input */}
      <TaskInput
        value={input}
        onChange={setInput}
        onSubmit={startCoordination}
        onUseLocation={() => setLocation('Sector 62')}
        running={simulation.isRunning}
      />

      {/* Live Navigation HUD if active */}
      {liveNav.isNavigating && (
        <LiveNavigationPanel
          destination={liveNav.destination || recommended}
          currentLocation={liveNav.currentLocation}
          distanceText={liveNav.liveDistanceText}
          durationText={liveNav.liveDurationText}
          statusMessage={liveNav.statusMessage}
          isArrived={liveNav.isArrived}
          isRecalculating={liveNav.isRecalculating}
          error={liveNav.error}
          onStop={liveNav.stopNavigation}
          onRecalculate={liveNav.recalculateRouteNow}
        />
      )}

      {/* Main 3-column agent area */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: activity timeline */}
        <div className="lg:col-span-1">
          <AgentActivity
            steps={simulation.steps}
            isRunning={simulation.isRunning}
            isComplete={simulation.isComplete}
            onReset={simulation.reset}
          />
        </div>

        {/* Center: map */}
        <div className="lg:col-span-2">
          {location && (
            <div className="mb-3 flex items-center gap-2">
              <Badge tone="blue" dot>
                {location}
              </Badge>
              <span className="text-xs text-slate-500">— user location resolved</span>
            </div>
          )}
          <MockMap
            showRoute={simulation.isComplete || simulation.isRunning || liveNav.isNavigating}
            selectedFacility={liveNav.destination || recommended}
            facilities={FACILITIES}
            userLocation={liveNav.currentLocation}
            route={liveNav.route}
            routePoints={liveNav.routePoints}
            isLiveNavigating={liveNav.isNavigating}
          />
        </div>
      </div>

      {/* Recommendation + alternatives */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <RecommendationCard
            facility={simulation.isComplete ? recommended : null}
            empty={!simulation.isComplete}
            onLiveNavigation={() => liveNav.startNavigation(recommended, { lat: 51.505, lng: -0.055 })}
            isNavigating={liveNav.isNavigating}
          />
        </div>
        <div className="lg:col-span-2">
          <section aria-label="Alternative facilities">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-slate-100">
                Nearby healthcare facilities
              </h2>
              <span className="text-xs text-slate-400">
                {simulation.isComplete ? `${alternatives.length} near you` : 'Run a coordination to see results'}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(simulation.isComplete ? alternatives : []).map((f) => (
                <FacilityCard key={f.id} facility={f} />
              ))}
              {!simulation.isComplete && (
                <div className="col-span-full flex items-center justify-center rounded-2xl border border-dashed border-white/10 py-10 text-sm text-slate-500">
                  Alternative options will appear here after coordination completes.
                </div>
              )}
            </div>
            {simulation.isComplete && (
              <button className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent-soft hover:text-accent">
                Compare options
              </button>
            )}
          </section>
        </div>
      </div>

      {/* Quick actions */}
      <QuickActions actions={QUICK_ACTIONS} onAction={onQuickAction} />

      {/* Agent network preview */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AgentNetworkPreview />
        </div>
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <ShieldCheck size={16} className="text-emerald-400" />
                Emergency assistance
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                CrisisFlow plans before acting. Every request moves from goal → plan → action →
                result, keeping you informed at each high-level step.
              </p>
            </div>
            <div className="mt-4 rounded-xl border border-accent/20 bg-accent/[0.06] px-3 py-2 text-[11px] text-accent-soft">
              Goal → Plan → Action → Result
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
