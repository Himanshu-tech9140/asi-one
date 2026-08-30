import React, { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Navigation } from 'lucide-react'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { EmptyState } from '../components/common/EmptyState'
import { MockMap } from '../components/dashboard/MockMap'
import { RecommendationCard } from '../components/dashboard/RecommendationCard'
import { FacilityCard } from '../components/dashboard/FacilityCard'
import { api, normalizeFacility } from '../services/api'

export default function TaskDetails() {
  const { id } = useParams()
  const [task, setTask] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.coordination(id).then((data) => { if (active) setTask(data) }).catch((reason) => { if (active) setError(reason.message || 'Coordination could not be loaded.') })
    return () => { active = false }
  }, [id])

  const facilities = useMemo(() => (task?.recommendation?.facilities || []).map(normalizeFacility), [task])
  if (error) return <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-200">{error}</div>
  if (!task) return <div className="card-surface p-6 text-sm text-slate-400">Loading coordination…</div>
  const recommended = facilities[0]

  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Link to="/history" aria-label="Back to history" className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white"><ArrowLeft size={18} /></Link><div><h1 className="text-lg font-bold tracking-tight text-white">Coordination #{task.id}</h1><p className="text-xs text-slate-400">{task.createdAt ? new Date(task.createdAt).toLocaleString() : '—'}</p></div></div><Badge tone={task.status === 'completed' ? 'green' : task.status === 'failed' ? 'red' : 'amber'} dot>{task.status}</Badge></div><Card title="User Request"><p className="text-sm text-slate-200">{task.request}</p></Card><Card title="Agent Activity" subtitle="Recorded backend coordination steps">{task.steps?.length ? <ol className="space-y-2">{task.steps.map((step, index) => <li key={`${step.name}-${index}`} className="rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-slate-300">{step.name} <span className="text-slate-500">— {step.status}</span></li>)}</ol> : <p className="text-sm text-slate-500">No recorded tool steps.</p>}</Card>{recommended ? <><div className="grid gap-5 lg:grid-cols-3"><RecommendationCard facility={recommended} /><div className="lg:col-span-2"><MockMap facilities={facilities} selectedFacility={recommended} showRoute={false} /></div></div><Card title="Facilities" subtitle="Returned by the saved coordination"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{facilities.map((facility) => <FacilityCard key={facility.id || facility.placeId} facility={facility} />)}</div></Card></> : <EmptyState title="No facility result saved" message="This coordination did not return facility data." icon={Navigation} />}</div>
}
