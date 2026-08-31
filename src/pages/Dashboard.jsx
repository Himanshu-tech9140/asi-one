import React, { useState, useMemo, useRef, useEffect } from 'react'
import { ShieldCheck, AlertCircle } from 'lucide-react'
import { TaskInput } from '../components/dashboard/TaskInput'
import { AgentActivity } from '../components/dashboard/AgentActivity'
import { MockMap } from '../components/dashboard/MockMap'
import { RecommendationCard } from '../components/dashboard/RecommendationCard'
import { FacilityCard } from '../components/dashboard/FacilityCard'
import { QuickActions } from '../components/dashboard/QuickActions'
import { AgentNetworkPreview } from '../components/dashboard/AgentNetworkPreview'
import { LiveNavigationPanel } from '../components/dashboard/LiveNavigationPanel'
import { useBrowserLocation } from '../hooks/useBrowserLocation'
import { useLiveNavigation } from '../hooks/useLiveNavigation'
import { QUICK_ACTIONS, FACILITIES } from '../data/mockData'
import { Badge } from '../components/common/Badge'
import { streamPlan, normalizeFacility, normalizeAmbulance } from '../services/api'
import { decodePolyline } from '../utils/geo'

const INITIAL_STEPS = [
  { id: 'received', label: 'Request received', description: 'Waiting for coordination request', completed: false, active: false },
  { id: 'understood', label: 'Intent analysis', description: 'Analyze request and service requirements', completed: false, active: false },
  { id: 'searched', label: 'Discovery & tool execution', description: 'Query Google Places for facilities/ambulances', completed: false, active: false },
  { id: 'routing', label: 'Route calculation', description: 'Calculate optimal path and travel time', completed: false, active: false },
  { id: 'ready', label: 'Coordination complete', description: 'Ready with verified recommendation', completed: false, active: false },
]

export default function Dashboard() {
  const [input, setInput] = useState('')
  const browserLocation = useBrowserLocation()
  const liveNav = useLiveNavigation()
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [steps, setSteps] = useState(INITIAL_STEPS)
  const [resultData, setResultData] = useState(null)
  const [error, setError] = useState('')
  const streamCloseRef = useRef(null)

  useEffect(() => () => { streamCloseRef.current?.() }, [])

  const userLocation = browserLocation.location || { lat: 28.6280, lng: 77.3649 }

  const facilities = useMemo(() => {
    const rawFacs = resultData?.result?.findFacilities?.facilities || []
    return rawFacs.map((f, i) => normalizeFacility(f, i))
  }, [resultData])

  const ambulances = useMemo(() => {
    const rawAmbs = resultData?.result?.findAmbulances?.ambulances || []
    return rawAmbs.map((a, i) => normalizeAmbulance(a, i))
  }, [resultData])

  const allDestinations = useMemo(() => {
    if (ambulances.length > 0 || facilities.length > 0) {
      return [...ambulances, ...facilities]
    }
    return FACILITIES
  }, [ambulances, facilities])

  const recommended = allDestinations[0] || null
  const alternatives = allDestinations.slice(1)

  const calculatedRoute = resultData?.result?.calculateRoute || null
  const routePoints = useMemo(() => {
    if (calculatedRoute?.polyline) {
      return decodePolyline(calculatedRoute.polyline)
    }
    return null
  }, [calculatedRoute])

  const handleStartCoordination = (promptToUse) => {
    const requestText = (promptToUse || input || '').trim()
    if (!requestText) return

    setIsRunning(true)
    setIsComplete(false)
    setError('')
    setResultData(null)
    liveNav.stopNavigation()
    streamCloseRef.current?.()

    const nowStr = () => new Date().toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' })

    setSteps([
      { id: 'received', label: 'Request received', description: requestText, completed: true, active: false, timestamp: nowStr() },
      { id: 'understood', label: 'Intent analysis', description: 'Analyzing intent with CrisisFlow agent...', completed: false, active: true },
      { id: 'searched', label: 'Discovery & tool execution', description: 'Querying verified healthcare providers...', completed: false, active: false },
      { id: 'routing', label: 'Route calculation', description: 'Calculating fastest travel route...', completed: false, active: false },
      { id: 'ready', label: 'Coordination complete', description: 'Compiling grounded recommendations...', completed: false, active: false },
    ])

    let finished = false
    const close = streamPlan(requestText, userLocation, {
      onEvent: (event) => {
        const time = nowStr()
        if (event.type === 'intent_detected') {
          setSteps((prev) => prev.map((s) => (s.id === 'understood' ? { ...s, completed: true, active: false, timestamp: time } : s.id === 'searched' ? { ...s, active: true } : s)))
        }
        if (event.type === 'tool_started') {
          setSteps((prev) => prev.map((s) => (s.id === 'searched' ? { ...s, active: true, description: event.message || 'Executing discovery tool...' } : s)))
        }
        if (event.type === 'tool_completed') {
          if (event.tool === 'calculateRoute') {
            setSteps((prev) => prev.map((s) => (s.id === 'routing' ? { ...s, completed: true, active: false, timestamp: time, description: 'Route calculated' } : s)))
          } else {
            setSteps((prev) => prev.map((s) => (s.id === 'searched' ? { ...s, completed: true, active: false, timestamp: time, description: event.message || 'Facilities found' } : s.id === 'routing' ? { ...s, active: true } : s)))
          }
        }
        if (event.type === 'final_response') {
          const data = event.result ? event : event.data || { coordinationId: event.coordinationId, finalResponse: event.response || event.finalResponse }
          setResultData(data)
          setSteps((prev) => prev.map((s) => ({ ...s, completed: true, active: false, timestamp: s.timestamp || time })))
        }
        if (event.type === 'agent_completed') {
          finished = true
          setIsRunning(false)
          setIsComplete(true)
          setSteps((prev) => prev.map((s) => ({ ...s, completed: true, active: false })))
          streamCloseRef.current = null
        }
        if (event.type === 'error') {
          setError(event.message || 'CrisisFlow could not complete the coordination.')
          setIsRunning(false)
          streamCloseRef.current = null
        }
      },
      onError: (reason) => {
        if (!finished) {
          setError(reason.message || 'Network issue during coordination.')
          setIsRunning(false)
          streamCloseRef.current = null
        }
      },
    })
    streamCloseRef.current = close
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
    handleStartCoordination(request)
  }

  const handleReset = () => {
    streamCloseRef.current?.()
    setIsRunning(false)
    setIsComplete(false)
    setResultData(null)
    setError('')
    setSteps(INITIAL_STEPS)
    liveNav.stopNavigation()
  }

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
            Describe your healthcare need and ASI:One will coordinate real emergency facilities, ambulances, and routes for you.
          </p>
        </div>
      </section>

      {/* Task input */}
      <TaskInput
        value={input}
        onChange={setInput}
        onSubmit={() => handleStartCoordination(input)}
        onUseLocation={() => browserLocation.requestLocation()}
        running={isRunning}
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-400">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
            steps={steps}
            isRunning={isRunning}
            isComplete={isComplete}
            onReset={handleReset}
          />
        </div>

        {/* Center: map */}
        <div className="lg:col-span-2">
          {userLocation && (
            <div className="mb-3 flex items-center gap-2">
              <Badge tone="blue" dot>
                {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </Badge>
              <span className="text-xs text-slate-500">— user location resolved</span>
            </div>
          )}
          <MockMap
            showRoute={isComplete || isRunning || liveNav.isNavigating}
            selectedFacility={liveNav.destination || recommended}
            facilities={allDestinations}
            userLocation={liveNav.currentLocation || userLocation}
            route={calculatedRoute || liveNav.route}
            routePoints={routePoints || liveNav.routePoints}
            isLiveNavigating={liveNav.isNavigating}
          />
        </div>
      </div>

      {/* Recommendation + alternatives */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <RecommendationCard
            facility={isComplete ? recommended : null}
            empty={!isComplete}
            onLiveNavigation={() => recommended && liveNav.startNavigation(recommended, userLocation)}
            isNavigating={liveNav.isNavigating}
          />
        </div>
        <div className="lg:col-span-2">
          <section aria-label="Alternative facilities">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-slate-100">
                Nearby healthcare facilities & ambulances
              </h2>
              <span className="text-xs text-slate-400">
                {isComplete ? `${alternatives.length} verified options near you` : 'Run a coordination to see results'}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(isComplete ? alternatives : []).map((f) => (
                <FacilityCard key={f.id || f.placeId} facility={f} />
              ))}
              {!isComplete && (
                <div className="col-span-full flex items-center justify-center rounded-2xl border border-dashed border-white/10 py-10 text-sm text-slate-500">
                  Real facility & ambulance options will appear here as soon as coordination completes.
                </div>
              )}
            </div>
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
