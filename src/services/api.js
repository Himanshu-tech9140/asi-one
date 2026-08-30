const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

export class ApiClientError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
}

function safeMessage(payload, fallback) {
  return typeof payload?.message === 'string' ? payload.message : fallback
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    })
  } catch {
    throw new ApiClientError('Unable to reach CrisisFlow. Check that the backend is running.', 0)
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.success) {
    throw new ApiClientError(safeMessage(payload, 'CrisisFlow could not complete that request.'), response.status)
  }
  return payload.data
}

export const api = {
  health: () => request('/health'),
  facilities: ({ lat, lng, radius, serviceType }) => {
    const query = new URLSearchParams({ lat: String(lat), lng: String(lng) })
    if (radius) query.set('radius', String(radius))
    if (serviceType) query.set('serviceType', serviceType)
    return request(`/facilities?${query.toString()}`)
  },
  facility: (id) => request(`/facilities/${encodeURIComponent(id)}`),
  calculateRoute: (origin, destination) =>
    request('/routes/calculate', { method: 'POST', body: JSON.stringify({ origin, destination }) }),
  plan: (message, location) =>
    request('/ai/plan', { method: 'POST', body: JSON.stringify({ message, location }) }),
  coordination: (id) => request(`/coordination/${encodeURIComponent(id)}`),
  history: ({ page = 1, limit = 20, status } = {}) => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (status && status !== 'All') query.set('status', status === 'In Progress' ? 'executing' : status.toLowerCase())
    return request(`/history?${query.toString()}`)
  },
}

// Centralized SSE client: this invokes the same backend planner as /ai/plan.
export function streamPlan(message, location, { onEvent, onError } = {}) {
  const query = new URLSearchParams({ message, location: JSON.stringify(location) })
  const source = new EventSource(`${baseUrl}/ai/stream?${query.toString()}`)
  const types = ['agent_started', 'intent_detected', 'planning_started', 'planning_completed', 'tool_started', 'tool_completed', 'tool_failed', 'final_response', 'agent_completed', 'error']
  let closed = false
  const close = () => { if (!closed) { closed = true; source.close() } }
  types.forEach((type) => source.addEventListener(type, (event) => {
    let data
    try { data = JSON.parse(event.data) } catch { data = { message: 'Received an invalid activity update.' } }
    onEvent?.({ type, ...data })
    if (type === 'agent_completed' || type === 'error') close()
  }))
  source.onerror = () => { if (!closed) { close(); onError?.(new ApiClientError('The live activity connection was interrupted. Please try again.', 0)) } }
  return close
}

export function normalizeFacility(facility, index = 0) {
  return {
    ...facility,
    status: index === 0 ? 'Recommended' : 'Alternative',
    match: facility.rating ? Math.round(facility.rating * 20) : null,
    service: Array.isArray(facility.types) ? facility.types[0]?.replaceAll('_', ' ') || 'Healthcare service' : 'Healthcare service',
    open: facility.rating ? `Rating ${facility.rating}` : 'Rating not available',
    decisionFactors: ['Returned by the healthcare facility search', 'Location and availability data may change'],
  }
}
