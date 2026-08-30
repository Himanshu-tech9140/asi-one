// ============================================================
// CrisisFlow AI — Mock Data
// All data here is realistic-but-fake, intended to be replaced
// by real backend / API responses in a later phase.
//
// IMPORTANT: Mock only. No real hospital availability or live
// routing is claimed anywhere in the UI.
// ============================================================

export const AGENT_STATUS = {
  state: 'online',
  label: 'Agent Online',
  asiLabel: 'ASI:One Connected',
}

// ------------------------------------------------------------
// Agent execution timeline (high-level steps only — no
// hidden chain-of-thought)
// ------------------------------------------------------------
export const EXECUTION_STEPS = [
  {
    id: 'received',
    label: 'Request received',
    description: 'Coordination request captured',
    duration: 700, // ms run time
  },
  {
    id: 'understood',
    label: 'Intent understood',
    description: 'Goal identified from request',
    duration: 900,
  },
  {
    id: 'located',
    label: 'Location identified',
    description: 'User location resolved',
    duration: 900,
  },
  {
    id: 'searched',
    label: 'Facility search completed',
    description: 'Nearby services discovered',
    duration: 1200,
  },
  {
    id: 'compared',
    label: 'Comparing available options',
    description: 'Scoring candidate facilities',
    duration: 1300,
  },
  {
    id: 'routing',
    label: 'Calculating routes',
    description: 'Estimating distance and travel time',
    duration: 1100,
  },
  {
    id: 'ready',
    label: 'Final recommendation',
    description: 'Actionable result produced',
    duration: 0,
  },
]

// Map execution step ids to the visual activity list shown in
// the AgentActivity card.
export const AGENT_ACTIVITY_ITEMS = [
  { id: 'received', label: 'Request received', description: 'Coordination request captured' },
  { id: 'understood', label: 'Intent understood', description: 'Goal identified from request' },
  { id: 'located', label: 'Location identified', description: 'User location resolved' },
  { id: 'searched', label: 'Facility search completed', description: 'Nearby services discovered' },
  { id: 'compared', label: 'Comparing available options', description: 'Scoring candidate facilities' },
  { id: 'routing', label: 'Calculating routes', description: 'Estimating distance and travel time' },
  { id: 'ready', label: 'Final recommendation', description: 'Actionable result produced' },
]

// ------------------------------------------------------------
// Facilities
// ------------------------------------------------------------
export const FACILITIES = [
  {
    id: 'f1',
    name: 'CityCare Emergency Center',
    distanceKm: 2.4,
    etaMin: 8,
    service: 'Emergency Services',
    status: 'Recommended',
    match: 96,
    lat: 51.5058,
    lng: -0.0525,
    address: '221 Skyline Avenue',
    phone: '+1 555 010 2210',
    open: 'Open 24h',
    details: 'Full-service emergency department with trauma and cardiac care units.',
    decisionFactors: [
      'Relevant service information',
      'Short estimated travel time',
      'Suitable location',
      'Reliable available information',
    ],
  },
  {
    id: 'f2',
    name: 'MetroCare Hospital',
    distanceKm: 3.1,
    etaMin: 10,
    service: 'Emergency Services',
    status: 'Alternative',
    match: 88,
    lat: 51.5102,
    lng: -0.0595,
    address: '184 Northgate Boulevard',
    phone: '+1 555 010 1820',
    open: 'Open 24h',
    details: 'General hospital with 24/7 urgent care and emergency intake.',
    decisionFactors: [
      'Relevant service information',
      'Moderate estimated travel time',
      'Suitable location',
      'Reliable available information',
    ],
  },
  {
    id: 'f3',
    name: 'Summit Regional Medical',
    distanceKm: 4.7,
    etaMin: 14,
    service: 'Emergency Services',
    status: 'Alternative',
    match: 79,
    lat: 51.5021,
    lng: -0.0455,
    address: '39 Eastfield Crescent',
    phone: '+1 555 010 3900',
    open: 'Open 24h',
    details: 'Regional medical center serving surrounding districts.',
    decisionFactors: [
      'Relevant service information',
      'Longer estimated travel time',
      'Suitable location',
      'Reliable available information',
    ],
  },
]

export const ROUTE = {
  from: 'Your Location',
  to: 'CityCare Emergency Center',
  distanceKm: 2.4,
  etaMin: 8,
  path: 'M20,80 L60,60 L90,66 L150,42 L210,50 L240,26',
}

// ------------------------------------------------------------
// Tool executions
// ------------------------------------------------------------
export const TOOL_EXECUTIONS = [
  { id: 't1', name: 'Facility Search', status: 'completed', detail: '8 results returned' },
  { id: 't2', name: 'Route Calculation', status: 'completed', detail: '3 routes evaluated' },
  { id: 't3', name: 'Web Search', status: 'completed', detail: 'Service info verified' },
]

export const DECISION_FACTORS = [
  { label: 'Location relevance', value: 'High', score: 92 },
  { label: 'Travel time', value: 'Low', score: 86 },
  { label: 'Service relevance', value: 'High', score: 95 },
  { label: 'Available information', value: 'Reliable', score: 90 },
]

// ------------------------------------------------------------
// History
// ------------------------------------------------------------
export const HISTORY = [
  {
    id: 'CF-1024',
    request: 'Emergency facility near Sector 62',
    date: 'Today, 12:04',
    status: 'Completed',
    facilitiesFound: 8,
    recommendation: 'CityCare Emergency Center',
  },
  {
    id: 'CF-1023',
    request: 'Route to emergency facility',
    date: 'Today, 11:42',
    status: 'Completed',
    facilitiesFound: 3,
    recommendation: 'MetroCare Hospital',
  },
  {
    id: 'CF-1022',
    request: 'Find nearby emergency services',
    date: 'Yesterday, 18:20',
    status: 'Completed',
    facilitiesFound: 12,
    recommendation: 'CityCare Emergency Center',
  },
  {
    id: 'CF-1021',
    request: 'Nearest urgent care for minor injury',
    date: 'Yesterday, 09:15',
    status: 'Completed',
    facilitiesFound: 6,
    recommendation: 'Summit Regional Medical',
  },
  {
    id: 'CF-1020',
    request: 'Coordinate pickup location for medical transport',
    date: 'Aug 26, 16:05',
    status: 'Failed',
    facilitiesFound: 0,
    recommendation: '—',
  },
  {
    id: 'CF-1019',
    request: 'Fastest route to CityCare Emergency Center',
    date: 'Aug 25, 13:33',
    status: 'Completed',
    facilitiesFound: 4,
    recommendation: 'CityCare Emergency Center',
  },
  {
    id: 'CF-1018',
    request: 'Find 24h pharmacy nearby',
    date: 'Aug 24, 21:48',
    status: 'Completed',
    facilitiesFound: 5,
    recommendation: 'CarePlus Pharmacy',
  },
]

export const HISTORY_STATUSES = ['All', 'Completed', 'Failed', 'In Progress']

// ------------------------------------------------------------
// Agent network
// ------------------------------------------------------------
export const AGENT_NETWORK = {
  center: {
    id: 'crisisflow',
    name: 'CrisisFlow Agent',
    type: 'Coordinator',
    status: 'online',
    description: 'Orchestrates the plan, invokes tools, and produces an actionable result.',
  },
  nodes: [
    {
      id: 'facility',
      name: 'Facility Discovery',
      type: 'Tool',
      status: 'Ready',
      online: true,
      description: 'Searches and scores nearby emergency facilities.',
    },
    {
      id: 'route',
      name: 'Route Planning',
      type: 'Tool',
      status: 'Ready',
      online: true,
      description: 'Calculates distances, routes and travel times.',
    },
    {
      id: 'search',
      name: 'Web Search',
      type: 'Tool',
      status: 'Ready',
      online: true,
      description: 'Verifies service information and details.',
    },
    {
      id: 'external',
      name: 'External Agent',
      type: 'External',
      status: 'Available',
      online: false,
      description: 'Placeholder for future Agentverse agent connection (not connected).',
    },
  ],
}

export const AGENT_CAPABILITIES = [
  'Facility discovery',
  'Route planning',
  'Information search',
  'Task coordination',
]

// ------------------------------------------------------------
// Quick actions
// ------------------------------------------------------------
export const QUICK_ACTIONS = [
  {
    id: 'emergencyFacility',
    label: '🏥 Find Emergency Facility',
    description: 'Locate nearby emergency care',
  },
  {
    id: 'healthcareService',
    label: '👨‍⚕️ Find Healthcare Service',
    description: 'Search nearby medical services',
  },
  {
    id: 'pharmacy',
    label: '💊 Find Pharmacy',
    description: 'Nearest pharmacy support',
  },
  {
    id: 'bloodBank',
    label: '🩸 Find Blood Bank',
    description: 'Locate urgent blood assistance',
  },
  {
    id: 'fastestRoute',
    label: '🚑 Find Fastest Route',
    description: 'Get the quickest path to care',
  },
]

export const AGENT_NETWORK_PREVIEW = [
  { id: 'facility', name: 'Facility Tool', status: 'Ready' },
  { id: 'route', name: 'Route Tool', status: 'Ready' },
  { id: 'search', name: 'Web Search', status: 'Ready' },
]
