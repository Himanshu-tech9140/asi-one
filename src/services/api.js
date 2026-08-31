const baseUrl = (
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  '/api'
).replace(/\/$/, '')

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
  ambulances: ({ lat, lng, radius }) => {
    const query = new URLSearchParams({ lat: String(lat), lng: String(lng) })
    if (radius) query.set('radius', String(radius))
    return request(`/facilities/ambulances?${query.toString()}`)
  },
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
    let data = {}
    if (event.data) {
      try {
        data = JSON.parse(event.data)
      } catch {
        data = { message: 'Coordination update received' }
      }
    }
    if (!data.message) {
      if (type === 'agent_started') data.message = 'CrisisFlow agent started'
      else if (type === 'intent_detected') data.message = 'Request intent detected'
      else if (type === 'planning_started') data.message = 'Creating execution plan'
      else if (type === 'planning_completed') data.message = 'Execution plan ready'
      else if (type === 'tool_started') data.message = 'Executing tool...'
      else if (type === 'tool_completed') data.message = 'Tool execution completed'
      else if (type === 'final_response') data.message = 'Coordination result ready'
      else if (type === 'agent_completed') data.message = 'Coordination complete'
    }
    onEvent?.({ type, ...data })
    if (type === 'agent_completed' || type === 'error') close()
  }))
  source.onerror = () => { if (!closed) { close(); onError?.(new ApiClientError('The live activity connection was interrupted. Please try again.', 0)) } }
  return close
}

export function normalizeFacility(facility, index = 0) {
  const isAmb = facility.types?.includes('ambulance') || facility.name?.toLowerCase().includes('ambulance')
  return {
    ...facility,
    isAmbulance: isAmb,
    status: index === 0 ? (isAmb ? 'Nearest Ambulance Service' : 'Recommended') : 'Alternative',
    match: facility.rating ? Math.round(facility.rating * 20) : null,
    service: Array.isArray(facility.types)
      ? facility.types[0]?.replaceAll('_', ' ') || (isAmb ? 'Ambulance service' : 'Healthcare service')
      : (isAmb ? 'Ambulance service' : 'Healthcare service'),
    open: facility.rating ? `Rating ${facility.rating}` : 'Rating not available',
    decisionFactors: [
      isAmb ? 'Verified ambulance service provider' : 'Returned by the healthcare facility search',
      facility.phone ? `Direct contact: ${facility.phone}` : 'Location and availability data may change',
    ],
  }
}

export function normalizeAmbulance(ambulance, index = 0) {
  const isNearest = index === 0
  return {
    ...ambulance,
    isAmbulance: true,
    isNearest,
    status: isNearest ? 'Nearest Ambulance Service' : 'Alternative Service',
    match: ambulance.rating ? Math.round(ambulance.rating * 20) : null,
    service: 'Emergency Ambulance & Medical Transport',
    open: ambulance.rating ? `Rating ${ambulance.rating}` : 'Rating not available',
    decisionFactors: [
      isNearest ? 'Closest verified ambulance provider' : 'Verified ambulance service provider',
      ambulance.phone ? `Direct contact available (${ambulance.phone})` : 'Location verified via Google Places',
      'Real-time transit route available',
    ],
  }
}
