import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, ChevronRight, Inbox } from 'lucide-react'
import { Badge } from '../components/common/Badge'
import { EmptyState } from '../components/common/EmptyState'
import { api } from '../services/api'

const HISTORY_STATUSES = ['All', 'Completed', 'Failed', 'In Progress']

const statusTone = {
  Completed: 'green',
  Failed: 'red',
  'In Progress': 'amber',
}

export default function History() {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    api.history({ status: statusFilter })
      .then((data) => { if (active) setItems(data.items || []) })
      .catch((reason) => { if (active) setError(reason.message || 'History could not be loaded.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [statusFilter])

  const filtered = items.filter((h) => {
    const matchesQuery =
      !query ||
      h.request.toLowerCase().includes(query.toLowerCase()) ||
      (h.recommendation || '').toLowerCase().includes(query.toLowerCase())
    const matchesStatus = statusFilter === 'All' || (statusFilter === 'In Progress' ? !['completed', 'failed'].includes(h.status) : h.status === statusFilter.toLowerCase())
    return matchesQuery && matchesStatus
  })

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Coordination History</h2>
        <p className="mt-1 text-sm text-slate-500">Review past healthcare requests, facilities, and routes.</p>
      </div>
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search requests or recommendations…"
            aria-label="Search coordination history"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/50"
          />
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <Filter size={15} className="shrink-0 text-slate-500" />
          <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1">
            {HISTORY_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                aria-pressed={statusFilter === s}
                className={`rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-accent/15 text-accent-soft ring-1 ring-inset ring-accent/30'
                    : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {error ? <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-200">{error}</div> : loading ? <div className="card-surface p-6 text-sm text-slate-400">Loading coordination history…</div> : filtered.length === 0 ? (
        <EmptyState
          title="No coordination history found"
          message="Try adjusting your search or status filter."
          icon={Inbox}
        />
      ) : (
        <div className="card-surface overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-medium">Request</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Facilities Found</th>
                  <th className="px-4 py-3 font-medium">Recommendation</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((h) => (
                  <tr
                    key={h.id}
                    onClick={() => navigate(`/task/${h.id}`)}
                    className="cursor-pointer border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-100">{h.request}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-slate-500">#{h.id}</div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-400">{h.createdAt ? new Date(h.createdAt).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3.5">
                      <Badge tone={statusTone[h.status === 'completed' ? 'Completed' : h.status === 'failed' ? 'Failed' : 'In Progress'] || 'slate'} dot>
                        {h.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-300">{h.facilitiesFound}</td>
                    <td className="px-4 py-3.5 text-slate-300">{h.recommendation || '—'}</td>
                    <td className="px-4 py-3.5">
                      <ChevronRight size={16} className="text-slate-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-white/[0.05] md:hidden">
            {filtered.map((h) => (
              <button
                key={h.id}
                onClick={() => navigate(`/task/${h.id}`)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-100">{h.request}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-mono">#{h.id}</span>
                    <span>·</span>
                    <span>{h.createdAt ? new Date(h.createdAt).toLocaleString() : '—'}</span>
                    <span>·</span>
                    <span>{h.recommendation || '—'}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge tone={statusTone[h.status === 'completed' ? 'Completed' : h.status === 'failed' ? 'Failed' : 'In Progress'] || 'slate'}>{h.status}</Badge>
                  <span className="font-mono text-[11px] text-slate-500">{h.facilitiesFound}</span>
                </div>
                <ChevronRight size={16} className="shrink-0 text-slate-500" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
