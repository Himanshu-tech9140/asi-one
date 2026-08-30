// ============================================================
// ASI:One Service — the ONLY module that talks to ASI:One API.
//
// ASI:One exposes an OpenAI-compatible Chat Completions endpoint:
//   POST {ASI_ONE_BASE_URL}/chat/completions
//   (default base URL: https://api.asi1.ai/v1)
//
// Responsibilities:
//   - Send the user message to ASI:One for intent understanding
//   - Parse the model reply (choices[0].message.content) as JSON
//   - Extract structured intent (intent, serviceType, needsRoute,
//     locationRequired)
//   - Handle timeout, network, HTTP and malformed-response errors
//   - Never expose the API key
//
// SECURITY:
//   - The API key is read from env only and is NEVER logged or
//     returned to the client. It only ever travels in the
//     Authorization header.
//   - ASI:One errors are logged server-side, but the client only
//     ever receives safe, generic messages.
//   - The provider endpoint is configurable via env and never
//     leaked to the frontend.
//
// Docs: https://docs.asi1.ai/documentation/build-with-asi-one/chat-completions
// ============================================================

const { env } = require('../config/env')
const { ApiError } = require('../utils/ApiError')

const REQUEST_TIMEOUT_MS = 15000

// Supported healthcare service types ASI:One should map to.
const SUPPORTED_SERVICE_TYPES = [
  'emergency',
  'hospital',
  'clinic',
  'pharmacy',
  'blood_bank',
  'specialist',
]

// Supported intent types.
const SUPPORTED_INTENTS = [
  'find_facility',
  'find_route',
  'healthcare_search',
  'emergency_help',
  'general_healthcare_query',
  'unsupported',
]

// Keep the provider response constrained to the small, safe contract that
// this phase needs.  This is deliberately not a tool schema: Phase 6 only
// understands a request and never asks ASI:One to execute anything.
const INTENT_RESPONSE_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'crisisflow_intent',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        intent: { type: 'string', enum: SUPPORTED_INTENTS },
        serviceType: {
          anyOf: [
            { type: 'string', enum: SUPPORTED_SERVICE_TYPES },
            { type: 'null' },
          ],
        },
        needsRoute: { type: 'boolean' },
        locationRequired: { type: 'boolean' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
      required: ['intent', 'serviceType', 'needsRoute', 'locationRequired', 'confidence'],
    },
  },
}

// Intents that clearly need a location to be actionable.
const LOCATION_REQUIRING_INTENTS = [
  'find_facility',
  'find_route',
  'healthcare_search',
  'emergency_help',
]

// System prompt. It constrains ASI:One to intent *understanding*
// only and carries the healthcare safety boundary. ASI:One must
// never diagnose, prescribe, or invent availability guarantees.
const SYSTEM_PROMPT = `You are the intent-understanding component of CrisisFlow, a healthcare facility discovery and coordination system.

Your ONLY job is to classify the user's message into a structured intent. You MUST NOT diagnose diseases, prescribe medication, recommend treatment, claim any emergency is safe, or guarantee facility/service availability.

Map the message to exactly one of these intents:
- find_facility: the user wants to find a healthcare facility (hospital, clinic, pharmacy, blood bank, specialist, etc.)
- find_route: the user wants travel/direction information to a facility
- healthcare_search: the user wants broader healthcare-related information or searches
- emergency_help: the user describes an emergency and needs urgent care directions
- general_healthcare_query: a general question about healthcare (not a facility/route request)
- unsupported: anything not related to healthcare coordination

Map the facility type (when relevant) to exactly one of these service types:
- emergency, hospital, clinic, pharmacy, blood_bank, specialist
Use null when the message does not refer to a specific facility type.

Set needsRoute to true when the user asks for directions, travel time, distance, or how to reach a facility.
Set locationRequired to true when fulfilling the request requires the user's location (nearly always for facility/route requests); false only for general informational queries that need no coordinates.

Respond with a single JSON object and nothing else, in exactly this shape:
{"intent":"<intent>","serviceType":"<service_type>","needsRoute":true|false,"locationRequired":true|false,"confidence":0.0}

confidence is a number between 0 and 1 reflecting how sure you are of the classification.`

// --- helpers -------------------------------------------------------

function requireApiKey() {
  const key = env.asiOneApiKey
  if (!key) {
    throw ApiError.internal('AI service is not configured')
  }
  return key
}

function logAsiOneFailure(context, err) {
  const status = err && err.response ? err.response.status : undefined
  // Do not print provider bodies or transport errors: either might contain
  // request details.  The operation and HTTP status are enough for safe
  // server-side troubleshooting.
  console.error(`[asi-one] ${context} failed (status=${status ?? 'unknown'})`)
}

function toSafeError(status) {
  if (status === 401 || status === 403) {
    return ApiError.internal('AI service is not configured')
  }
  if (status === 429) {
    return ApiError.internal(
      'AI service is temporarily unavailable, please try again later',
    )
  }
  if (status === 400 || status === 422) {
    return ApiError.internal('Unable to understand the request')
  }
  if (status === 408 || status >= 500) {
    return ApiError.internal('AI service is temporarily unavailable')
  }
  return ApiError.internal('Unable to understand the request')
}

async function asiOneFetch(url, options) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function safeJson(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

// Shared provider primitive for the Phase 7 planner.  Provider-specific
// authentication and error mapping remain in this service.
async function createChatCompletion({ messages, tools } = {}) {
  const key = requireApiKey()
  if (!Array.isArray(messages) || messages.length === 0) {
    throw ApiError.internal('Unable to understand the request')
  }

  let res
  try {
    res = await asiOneFetch(buildUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: env.asiOneModel || 'asi1',
        messages,
        ...(Array.isArray(tools) ? { tools, tool_choice: 'auto', parallel_tool_calls: false } : {}),
        temperature: 0,
      }),
    })
  } catch (err) {
    logAsiOneFailure('createChatCompletion', err)
    if (err && (err.name === 'AbortError' || err.type === 'aborted')) {
      throw ApiError.internal('AI service request timed out')
    }
    throw ApiError.internal('AI service is temporarily unavailable')
  }
  if (!res.ok) {
    const body = await safeJson(res)
    logAsiOneFailure('createChatCompletion', { response: { status: res.status, data: body } })
    throw toSafeError(res.status)
  }
  const data = await safeJson(res)
  const choice = data && Array.isArray(data.choices) ? data.choices[0] : null
  if (!choice || !choice.message || typeof choice.message !== 'object') {
    throw ApiError.internal('Unable to understand the request')
  }
  return choice.message
}

// --- intent normalization ------------------------------------------

function normalizeIntent(parsed) {
  if (!parsed || typeof parsed !== 'object') return null

  const intent = typeof parsed.intent === 'string' ? parsed.intent.trim().toLowerCase() : null
  const serviceType =
    typeof parsed.serviceType === 'string' ? parsed.serviceType.trim().toLowerCase() : parsed.serviceType
  const needsRoute = parsed.needsRoute
  const locationRequired = parsed.locationRequired
  const confidence = parsed.confidence

  // Treat missing or wrongly typed model fields as a malformed provider reply,
  // rather than coercing strings such as "false" to true.
  if (
    !intent ||
    !Object.prototype.hasOwnProperty.call(parsed, 'serviceType') ||
    typeof needsRoute !== 'boolean' ||
    typeof locationRequired !== 'boolean' ||
    typeof confidence !== 'number' ||
    !Number.isFinite(confidence)
  ) {
    return null
  }

  const validIntent = SUPPORTED_INTENTS.includes(intent) ? intent : 'unsupported'

  const validServiceType =
    serviceType && SUPPORTED_SERVICE_TYPES.includes(serviceType) ? serviceType : null

  // An actionable request must never be marked as not needing a location.
  // This conservative normalization prevents later phases from fabricating
  // coordinates if the model returns an inconsistent value.
  const resolvedLocationRequired =
    LOCATION_REQUIRING_INTENTS.includes(validIntent) ? true : locationRequired

  return {
    intent: validIntent,
    serviceType: validServiceType,
    needsRoute,
    locationRequired: resolvedLocationRequired,
    confidence: Math.min(1, Math.max(0, confidence)),
  }
}

// --- ASI:One communication -----------------------------------------

function buildUrl() {
  const base = (env.asiOneBaseUrl || 'https://api.asi1.ai/v1').replace(/\/+$/, '')
  return `${base}/chat/completions`
}

async function understandIntent(message) {
  const key = requireApiKey()

  const model = env.asiOneModel || 'asi1'

  let res
  try {
    res = await asiOneFetch(buildUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message.trim() },
        ],
        response_format: INTENT_RESPONSE_SCHEMA,
        temperature: 0,
      }),
    })
  } catch (err) {
    // AbortError-ish (timeout) vs network failure
    if (err && (err.name === 'AbortError' || err.type === 'aborted')) {
      logAsiOneFailure('understandIntent', err)
      throw ApiError.internal('AI service request timed out')
    }
    logAsiOneFailure('understandIntent', err)
    throw ApiError.internal('AI service is temporarily unavailable')
  }

  if (!res.ok) {
    const body = await safeJson(res)
    logAsiOneFailure('understandIntent', {
      response: { status: res.status, data: body },
    })
    throw toSafeError(res.status)
  }

  const data = await safeJson(res)
  if (!data || typeof data !== 'object' || !Array.isArray(data.choices)) {
    throw ApiError.internal('Unable to understand the request')
  }

  const firstChoice = data.choices[0]
  const content =
    firstChoice && firstChoice.message && typeof firstChoice.message.content === 'string'
      ? firstChoice.message.content
      : null

  let parsed = null
  if (content) {
    // The model is told to reply with a bare JSON object. The reply
    // may occasionally carry stray backticks or prose — try to recover
    // the JSON object in that case.
    parsed = parseJsonResponse(content)
  }

  const normalized = normalizeIntent(parsed)
  if (!normalized) {
    throw ApiError.internal('Unable to understand the request')
  }

  return normalized
}

// Parse a model reply into a JSON object. Tries the raw string first,
// then falls back to the first balanced {...} block found in the text.
function parseJsonResponse(content) {
  try {
    const parsed = JSON.parse(content)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch {
    // fall through to block extraction
  }

  const start = content.indexOf('{')
  const end = content.lastIndexOf('}')
  if (start !== -1 && end > start) {
    const slice = content.slice(start, end + 1)
    try {
      const parsed = JSON.parse(slice)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch {
      return null
    }
  }
  return null
}

module.exports = {
  understandIntent,
  createChatCompletion,
  // exposed for tests
  _internals: {
    normalizeIntent,
    parseJsonResponse,
    SYSTEM_PROMPT,
    INTENT_RESPONSE_SCHEMA,
    SUPPORTED_INTENTS,
    SUPPORTED_SERVICE_TYPES,
  },
}
