import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MapPin, LocateFixed, Check, ArrowRight, ChevronLeft, Navigation } from 'lucide-react'
import { Button } from '../components/common/Button'
import { EmptyState } from '../components/common/EmptyState'
import { FacilityCard } from '../components/dashboard/FacilityCard'
import { RecommendationCard } from '../components/dashboard/RecommendationCard'
import { MockMap } from '../components/dashboard/MockMap'
import { api, normalizeFacility, streamPlan } from '../services/api'
import { useBrowserLocation } from '../hooks/useBrowserLocation'

const STEPS = ['Describe', 'Location', 'Preferences', 'Coordinate', 'Result']
const SERVICE_OPTIONS = ['Emergency Facility', 'Healthcare Service', 'Pharmacy', 'Blood Bank']
const TRAVEL_PREFERENCES = ['Fastest', 'Shortest', 'Balanced']
const MAX_DISTANCES = ['2 km', '5 km', '10 km', 'Any distance']
const SERVICE_PROMPTS = {
  'Emergency Facility': 'emergency healthcare facility',
  'Healthcare Service': 'healthcare service',
  Pharmacy: 'pharmacy',
  'Blood Bank': 'blood bank',
}

export default function NewCoordination() {
  const routerLocation = useLocation()
  const navigate = useNavigate()
  const browserLocation = useBrowserLocation()
  const [request, setRequest] = useState(routerLocation.state?.request || '')
  const [locationMode, setLocationMode] = useState('current')
  const [manualLocation, setManualLocation] = useState('')
  const [service, setService] = useState(SERVICE_OPTIONS[0])
  const [travel, setTravel] = useState(TRAVEL_PREFERENCES[2])
  const [maxDistance, setMaxDistance] = useState(MAX_DISTANCES[1])
  const [stage, setStage] = useState(0)
  const [coordinating, setCoordinating] = useState(false)
  const [result, setResult] = useState(null)
  const [route, setRoute] = useState(null)
  const [selectedFacility, setSelectedFacility] = useState(null)
  const [details, setDetails] = useState(null)
  const [error, setError] = useState('')
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [activity, setActivity] = useState([])
  const streamCloseRef = useRef(null)

  useEffect(() => {
    if (routerLocation.state?.request) setRequest(routerLocation.state.request)
  }, [routerLocation.state])

  useEffect(() => () => { streamCloseRef.current?.() }, [])

  const facilities = useMemo(
    () => (result?.result?.findFacilities?.facilities || []).map(normalizeFacility),
    [result],
  )
  const location = browserLocation.location
  const requestWithPreference = `${request.trim()} Focus on finding a ${SERVICE_PROMPTS[service]}. Travel preference: ${travel}.`

  const startCoordination = () => {
    if (!location || !request.trim()) return
    setCoordinating(true)
    setError('')
    setResult(null)
    setRoute(null)
    setActivity([])
    streamCloseRef.current?.()
    let finished = false
    const close = streamPlan(requestWithPreference, location, {
      onEvent: (event) => {
        setActivity((current) => [...current, event])
        if (event.type === 'final_response') {
          const data = event.data || { coordinationId: event.coordinationId, finalResponse: event.response }
          setResult(data)
          const first = data?.result?.findFacilities?.facilities?.[0]
          if (first) setSelectedFacility(normalizeFacility(first))
        }
        if (event.type === 'agent_completed') { finished = true; setCoordinating(false); setStage(4); streamCloseRef.current = null }
        if (event.type === 'error') { setError(event.message || 'CrisisFlow could not complete the coordination.'); setCoordinating(false); streamCloseRef.current = null }
      },
      onError: (reason) => { if (!finished) { setError(reason.message); setCoordinating(false); streamCloseRef.current = null } },
    })
    streamCloseRef.current = close
  }

  const openDetails = async (facility) => {
    if (!facility?.id && !facility?.placeId) return
    setDetailsLoading(true)
    setError('')
    try {
      const data = await api.facility(facility.placeId || facility.id)
      setDetails(data.facility)
    } catch (reason) {
      setError(reason.message || 'Facility details could not be loaded.')
    } finally {
      setDetailsLoading(false)
    }
  }

  const getRoute = async () => {
    if (!location || !selectedFacility?.location) return
    setError('')
    try {
      const data = await api.calculateRoute(location, selectedFacility.location)
      setRoute(data)
    } catch (reason) {
      setError(reason.message || 'Route information could not be loaded.')
    }
  }

  const useManualLocation = () => browserLocation.setManualLocation(manualLocation)
  const next = () => setStage((current) => Math.min(3, current + 1))
  const locationError = browserLocation.error

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <nav aria-label="Coordination progress" className="card-surface p-4">
        <ol className="flex items-center justify-between gap-1">
          {STEPS.map((label, index) => (
            <li key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${index < stage ? 'bg-accent text-white' : index === stage ? 'bg-accent/20 text-accent-soft ring-1 ring-inset ring-accent/40' : 'bg-white/[0.04] text-slate-500'}`}>
                  {index < stage ? <Check size={14} /> : index + 1}
                </span>
                <span className={`text-[10px] font-medium ${index === stage ? 'text-slate-200' : 'text-slate-500'}`}>{label}</span>
              </div>
              {index < STEPS.length - 1 && <span className={`mx-1 mb-5 h-px flex-1 ${index < stage ? 'bg-accent/50' : 'bg-white/10'}`} />}
            </li>
          ))}
        </ol>
      </nav>

      {stage === 0 && <section className="card-surface p-5"><h2 className="text-sm font-semibold text-slate-100">What would you like CrisisFlow to coordinate?</h2><textarea value={request} onChange={(event) => setRequest(event.target.value)} rows={5} placeholder="e.g. Find the best emergency facility near my current location" className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-base-900/60 p-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/50" /></section>}

      {stage === 1 && <section className="card-surface p-5"><h2 className="text-sm font-semibold text-slate-100">Location</h2><p className="mt-1 text-xs text-slate-400">Use browser location or enter latitude and longitude. CrisisFlow does not substitute a fake location.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><button onClick={() => { setLocationMode('current'); browserLocation.requestLocation() }} className={`flex items-center gap-3 rounded-xl border p-4 text-left ${locationMode === 'current' ? 'border-accent/40 bg-accent/10' : 'border-white/10 bg-white/[0.02]'}`}><LocateFixed size={18} className="text-accent-soft" /><span><b className="block text-sm text-slate-100">Use Current Location</b><small className="text-slate-400">{browserLocation.loading ? 'Locating…' : 'Browser geolocation'}</small></span></button><button onClick={() => setLocationMode('manual')} className={`flex items-center gap-3 rounded-xl border p-4 text-left ${locationMode === 'manual' ? 'border-accent/40 bg-accent/10' : 'border-white/10 bg-white/[0.02]'}`}><MapPin size={18} className="text-accent-soft" /><span><b className="block text-sm text-slate-100">Enter Coordinates</b><small className="text-slate-400">Latitude, longitude</small></span></button></div>{locationMode === 'manual' && <div className="mt-3 flex gap-2"><input value={manualLocation} onChange={(event) => setManualLocation(event.target.value)} placeholder="28.62, 77.36" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-base-900/60 p-3 text-sm text-slate-100" /><Button variant="secondary" onClick={useManualLocation}>Use coordinates</Button></div>}{location && <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-300">Location resolved: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</div>}{locationError && <Alert>{locationError}</Alert>}</section>}

      {stage === 2 && <section className="card-surface space-y-5 p-5"><h2 className="text-sm font-semibold text-slate-100">Preferences</h2><PreferenceGroup label="Service type" options={SERVICE_OPTIONS} value={service} onSelect={setService} /><PreferenceGroup label="Travel preference" options={TRAVEL_PREFERENCES} value={travel} onSelect={setTravel} /><PreferenceGroup label="Maximum distance" options={MAX_DISTANCES} value={maxDistance} onSelect={setMaxDistance} /></section>}

      {stage === 3 && <section className="card-surface p-5"><h2 className="text-sm font-semibold text-slate-100">Ready to coordinate</h2><dl className="mt-4 space-y-2 text-sm"><Row label="Request" value={request.trim()} /><Row label="Coordinates" value={location ? `${location.lat}, ${location.lng}` : 'Not available'} /><Row label="Service" value={service} /><Row label="Travel" value={travel} /><Row label="Max distance" value={maxDistance} /></dl></section>}

      {(coordinating || activity.length > 0) && <AgentActivity events={activity} />}
      {stage === 4 && <section className="space-y-5"><div className="card-surface p-5"><h2 className="text-sm font-semibold text-slate-100">Coordination result</h2><p className="mt-1 text-sm text-slate-400">{result?.finalResponse || 'CrisisFlow completed the request.'}</p></div>{facilities.length === 0 ? <EmptyState title="No facilities returned" message="Try a different request, service type, or location." icon={MapPin} /> : <><div className="grid gap-5 lg:grid-cols-3"><RecommendationCard facility={selectedFacility || facilities[0]} empty={!selectedFacility} onRoute={getRoute} onDetails={() => openDetails(selectedFacility || facilities[0])} /><div className="lg:col-span-2"><MockMap facilities={facilities} selectedFacility={selectedFacility} origin={location} route={route} showRoute={Boolean(route)} /></div></div><div><h3 className="mb-3 text-sm font-semibold text-slate-100">Nearby facilities</h3><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{facilities.map((facility) => <FacilityCard key={facility.id || facility.placeId} facility={facility} onSelect={() => { setSelectedFacility(facility); setDetails(null) }} onDetails={() => openDetails(facility)} />)}</div></div></>}{route && <div className="card-surface p-4 text-sm text-slate-200"><Navigation size={15} className="mr-2 inline text-accent-soft" />Route: {route.distanceText || 'Distance unavailable'} · {route.durationText || 'Duration unavailable'}</div>}{detailsLoading && <div className="text-sm text-slate-400">Loading facility details…</div>}{details && <FacilityDetails facility={details} />}</section>}

      {error && <Alert>{error}</Alert>}
      <div className="flex items-center justify-between"><Button variant="ghost" onClick={() => setStage((current) => Math.max(0, current - 1))} disabled={stage === 0 || coordinating}><ChevronLeft size={16} />Back</Button>{stage < 3 && <Button onClick={next} disabled={(stage === 0 && !request.trim()) || (stage === 1 && !location)} size="lg">Continue<ArrowRight size={16} /></Button>}{stage === 3 && <Button onClick={startCoordination} disabled={!request.trim() || !location || coordinating} size="lg">{coordinating ? 'Coordinating…' : 'Start Coordination'}<ArrowRight size={16} /></Button>}{stage === 4 && <Button onClick={() => { setStage(0); setResult(null); setRoute(null); setDetails(null) }} size="lg">New Request<ArrowRight size={16} /></Button>}</div>
    </div>
  )
}

function PreferenceGroup({ label, options, value, onSelect }) { return <div><h3 className="text-xs font-medium text-slate-400">{label}</h3><div className="mt-2 flex flex-wrap gap-2">{options.map((option) => <button key={option} onClick={() => onSelect(option)} className={`rounded-full border px-3.5 py-1.5 text-xs font-medium ${value === option ? 'border-accent/50 bg-accent/15 text-accent-soft' : 'border-white/10 text-slate-300'}`}>{option}</button>)}</div></div> }
function Row({ label, value }) { return <div className="flex justify-between gap-4"><dt className="text-slate-400">{label}</dt><dd className="text-right text-slate-200">{value}</dd></div> }
function Alert({ children }) { return <div role="alert" className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-200">{children}</div> }
function AgentActivity({ events }) { return <section className="card-surface p-5"><h2 className="text-sm font-semibold text-slate-100">CrisisFlow Agent Activity</h2><ol className="mt-3 space-y-2">{events.map((event, index) => <li key={`${event.type}-${index}`} className={`rounded-lg px-3 py-2 text-sm ${event.type === 'error' || event.type === 'tool_failed' ? 'bg-rose-500/[0.08] text-rose-200' : event.type === 'agent_completed' ? 'bg-emerald-500/[0.08] text-emerald-200' : 'bg-white/[0.03] text-slate-300'}`}>{event.message || 'Agent update'}</li>)}</ol></section> }
function FacilityDetails({ facility }) { return <div className="card-surface p-5"><h3 className="text-sm font-semibold text-slate-100">{facility.name}</h3><p className="mt-1 text-sm text-slate-400">{facility.address || 'Address not available'}</p>{facility.phone && <p className="mt-2 text-sm text-slate-300">Phone: {facility.phone}</p>}{facility.website && <a className="mt-2 block text-sm text-accent-soft" href={facility.website} target="_blank" rel="noreferrer">Visit website</a>}</div> }
