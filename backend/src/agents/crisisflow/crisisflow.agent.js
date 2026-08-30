// ============================================================
// CrisisFlow Agent — ACP-compatible agent interface.
//
// `handleACPRequest` is the single entry point for inbound ACP
// messages. It:
//   1. Parses the JSON-RPC 2.0 envelope (jsonrpc/id/method/params).
//   2. Validates the request.
//   3. Identifies the requested capability (method).
//   4. Dispatches to the allow-listed CrisisFlow handler.
//   5. Executes existing backend tools via the tool registry.
//   6. Normalizes the result.
//   7. Returns an ACP-compatible response envelope.
//
// Two kinds of methods are supported:
//   - `initialize`          -> agent capability manifest + version
//   - capability names       -> find_emergency_facility, calculate_route,
//                               find_emergency_facility_and_route, etc.
//
// SECURITY:
//   - parseRequest enforces the envelope; decodeParams enforces the
//     per-capability param allow-list.
//   - Unknown methods return an ACP METHOD_NOT_FOUND error.
//   - Failures never leak stack traces, keys or provider details.
// ============================================================

const { handleCapability } = require('./crisisflow.handler')
const {
  publicCapabilities,
  manifest,
  capabilityNames,
} = require('./crisisflow.manifest')
const acp = require('../../utils/acp')
const { ApiError } = require('../../utils/ApiError')
const { env } = require('../../config/env')

const AGENT_NAME = manifest.name
const AGENT_ID = env.acpAgentId || 'crisisflow-agent'

// Map any thrown error into a safe ACP (JSON-RPC) error envelope.
function toRpcError(id, error) {
  if (error instanceof ApiError) {
    return acp.buildErrorResponse(id, {
      code: acp.statusToRpcCode(error.statusCode),
      message: error.message,
    })
  }
  return acp.buildErrorResponse(id, {
    code: acp.ACP_ERROR_CODES.INTERNAL_ERROR,
    message: 'Internal error',
  })
}

// Handle the `initialize` method: return the agent + capabilities.
function initialize(id) {
  return acp.buildSuccessResponse(id, {
    agent: {
      id: AGENT_ID,
      name: AGENT_NAME,
      description: manifest.description,
      protocolVersion: manifest.protocolVersion,
    },
    capabilities: publicCapabilities(),
  })
}

async function dispatch(name, params, id) {
  if (name === 'initialize') return initialize(id)
  if (!capabilityNames().includes(name)) {
    return acp.methodNotFound(id, `Unknown capability: ${name}`)
  }
  try {
    const result = await handleCapability(name, params)
    return acp.buildSuccessResponse(id, result)
  } catch (error) {
    return toRpcError(id, error)
  }
}

// --- ACP entry point --------------------------------------------

// Accepts a raw inbound ACP request body and returns an ACP response
// envelope. Never throws: always returns a valid JSON-RPC response.
async function handleACPRequest(body) {
  const parsed = acp.parseRequest(body)
  if (!parsed.ok) {
    return acp.invalidRequest(body && body.id, parsed.message)
  }
  const { id, method } = parsed.value
  if (typeof id !== 'string' && typeof id !== 'number') {
    return acp.invalidRequest(id, 'id must be a string or number')
  }
  return dispatch(method, parsed.value.params, id)
}

module.exports = {
  handleACPRequest,
  AGENT_NAME,
  _internals: {
    dispatch,
    initialize,
    toRpcError,
  },
}
