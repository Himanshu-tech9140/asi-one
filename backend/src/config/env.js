require('dotenv').config()

// Environment configuration with validation of required variables.
// No secrets are hard-coded anywhere in the codebase.

// NODE_ENV must be known before the other values are validated.
const nodeEnv = (process.env.NODE_ENV || 'development').trim().toLowerCase() || 'development'
const isProduction = nodeEnv === 'production'

function required(name) {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    // Safe, generic message — never prints the value of the variable.
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function optional(name) {
  const value = process.env[name]
  if (value === undefined || value === '') return ''
  return value
}

function requiredFromDefault(name, fallback) {
  const value = process.env[name]
  return value && value.trim() !== '' ? value : fallback
}

function normalizeMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return uri

  try {
    const parsed = new URL(uri)
    const rawPath = parsed.pathname || '/'
    const dbName = (rawPath.startsWith('/') ? rawPath.slice(1) : rawPath).split('?')[0]
    const safeDbName = decodeURIComponent(dbName || '').replace(/\s+/g, '').replace(/[^a-zA-Z0-9_.-]+/g, '')

    if (safeDbName && safeDbName !== dbName) {
      parsed.pathname = `/${safeDbName}`
      return parsed.toString()
    }

    return uri
  } catch {
    return uri
  }
}

const portRaw = (process.env.PORT || '').trim()
const port = portRaw ? parseInt(portRaw, 10) : 5000

// Validate that a configured CORS/frontend URL is a well-formed http(s) URL.
// Rejects wildcards and throws a clear, safe error on invalid values. The
// returned URL never contains credentials.
function validateHttpUrl(raw, name) {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new RangeError('unsupported protocol')
    }
    if (url.username || url.password) {
      throw new RangeError('must not contain credentials')
    }
    return url.origin
  } catch {
    throw new Error(`${name} must be a valid http(s) URL (no wildcards or credentials)`)
  }
}

// --- MongoDB ---
// Production REQUIRES an explicitly configured MONGODB_URI. There is no
// localhost fallback in production: if the variable is missing the process
// fails startup with a clear, safe error (and never prints the URI).
const mongoUri = normalizeMongoUri(
  isProduction
    ? required('MONGODB_URI')
    : requiredFromDefault('MONGODB_URI', 'mongodb://localhost:27017/crisisflow'),
)

// --- CORS / frontend origin ---
// Production REQUIRES an explicitly configured FRONTEND_URL. localhost is
// only ever used as a development default. The value is validated to be a
// well-formed http(s) URL and is never a wildcard.
const frontendUrlRaw = isProduction
  ? required('FRONTEND_URL')
  : requiredFromDefault('FRONTEND_URL', 'http://localhost:5173')
const frontendUrl = validateHttpUrl(frontendUrlRaw, 'FRONTEND_URL')

// Server-side Google Maps API key. In production a missing key is a
// deployment blocker: it must never silently fall back to mock facilities.
const googleMapsApiKey = optional('GOOGLE_MAPS_API_KEY')
// Server-side ASI:One API key. In production a missing key is a
// deployment blocker: it must never silently simulate ASI:One responses.
const asiOneApiKey = optional('ASI_ONE_API_KEY')
// ASI:One OpenAI-compatible base URL and model. Configurable so the
// provider endpoint can be adjusted without code changes.
const asiOneBaseUrl = optional('ASI_ONE_BASE_URL') || 'https://api.asi1.ai/v1'
const asiOneModel = optional('ASI_ONE_MODEL') || 'asi1'
// Stable identifier presented by the CrisisFlow agent over ACP.
// Optional; no credentials. Used only for agent identity/metadata.
const acpAgentId = optional('ACP_AGENT_ID') || 'crisisflow-agent'

// --- Agentverse (Phase 9) ---
// Credentials and identity for Agentverse registration/discovery.
// All optional: the backend still boots without them and the Chat
// Protocol bridge simply reports not-registered.
const agentverseApiKey = optional('AGENTVERSE_API_KEY')
const agentUri = optional('AGENT_URI')
const agentSeedPhrase = optional('AGENT_SEED_PHRASE')
// The public URL of the *ACP adapter*, not this Express service.  The
// adapter is a small FastAPI/uagents_core process because Agentverse does
// not currently publish a Node/Express SDK integration.
const agentExternalEndpoint = optional('AGENT_EXTERNAL_ENDPOINT')
// Internal URL used by the adapter to call the existing Phase 8 endpoint.
// Keep this private; it is not an Agentverse-facing URL.
const crisisflowBackendUrl = optional('CRISISFLOW_BACKEND_URL') || 'http://127.0.0.1:5000'
// Fallback coordinates used by the Chat Protocol bridge only when the
// incoming message contains no explicit coordinates (never fabricated
// from nothing). Format: "<lat>,<lng>". Optional.
const agentverseBaseLocation = optional('AGENTVERSE_BASE_LOCATION')

const env = {
  port: Number.isFinite(port) && port > 0 ? port : 5000,
  nodeEnv,
  mongoUri,
  frontendUrl,
  googleMapsApiKey,
  asiOneApiKey,
  asiOneBaseUrl,
  asiOneModel,
  acpAgentId,
  agentverseApiKey,
  agentUri,
  agentSeedPhrase,
  agentExternalEndpoint,
  crisisflowBackendUrl,
  agentverseBaseLocation,
  isProduction,
  corsOrigin: frontendUrl,
}

module.exports = {
  env,
  required,
  optional,
}
