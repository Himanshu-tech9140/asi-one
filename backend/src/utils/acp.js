// ============================================================
// ACP utilities — Agent Communication Protocol messaging.
//
// ACP is built on JSON-RPC 2.0. Every message uses the standard
// JSON-RPC envelope fields:
//   jsonrpc, id, method, params, result, error
// object property keys are camelCase; discriminator values
// (capability names) are snake_case.
//
// This module is transport-agnostic. The CrisisFlow agent uses it
// to build, parse and validate ACP-compatible request/response
// envelopes without coupling to a specific SDK or transport
// (stdio, HTTP, etc.). Per the ACP spec, custom transports MUST
// preserve the JSON-RPC message format defined by the protocol.
//
// SECURITY:
//   - No secrets are ever placed in an envelope.
//   - Error `data` fields are built only from safe, allow-listed
//     values; internal details are never serialized.
// ============================================================

const JSONRPC = '2.0'

// JSON-RPC 2.0 standard error codes (ACP inherits these).
const ACP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
}

// Map an internal HTTP-ish ApiError status to an ACP (JSON-RPC) code.
function statusToRpcCode(statusCode) {
  switch (statusCode) {
    case 400:
      return ACP_ERROR_CODES.INVALID_PARAMS
    case 404:
      return ACP_ERROR_CODES.METHOD_NOT_FOUND
    case 401:
    case 403:
      return -32001 // ACP-style: authentication/authorization denied
    default:
      return ACP_ERROR_CODES.INTERNAL_ERROR
  }
}

// Build a valid ACP request envelope. `method` is the capability
// (camelCase of the JSON-RPC method; snake_case of the capability).
function buildRequest({ id, method, params }) {
  const message = { jsonrpc: JSONRPC, method }
  if (id !== undefined && id !== null) message.id = id
  if (params !== undefined) message.params = params
  return message
}

// Build a valid ACP success response envelope.
function buildSuccessResponse(id, result) {
  return { jsonrpc: JSONRPC, id: id ?? null, result: result || {} }
}

// Build a valid ACP error response envelope from a safe code/message.
// `data` is optional and MUST only ever carry safe, allow-listed fields.
function buildErrorResponse(id, error) {
  const body = {
    jsonrpc: JSONRPC,
    id: id ?? null,
    error: {
      code: error.code,
      message: error.message,
    },
  }
  if (error.data !== undefined) body.error.data = error.data
  return body
}

// ACP-level "method not found" / "unknown capability" error envelope.
function methodNotFound(id, message = 'Unknown capability') {
  return buildErrorResponse(id, {
    code: ACP_ERROR_CODES.METHOD_NOT_FOUND,
    message,
  })
}

// ACP-level "invalid request" error envelope.
function invalidRequest(id, message = 'Invalid request') {
  return buildErrorResponse(id, {
    code: ACP_ERROR_CODES.INVALID_REQUEST,
    message,
  })
}

// ACP-level "invalid params" error envelope.
function invalidParams(id, message = 'Invalid parameters') {
  return buildErrorResponse(id, {
    code: ACP_ERROR_CODES.INVALID_PARAMS,
    message,
  })
}

// Validate the JSON-RPC envelope shape of an inbound ACP request.
// Returns { ok: true, value } or { ok: false, message }.
function parseRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, message: 'Request must be a JSON object' }
  }
  if (body.jsonrpc !== JSONRPC) {
    return { ok: false, message: 'Unsupported jsonrpc version' }
  }
  if (typeof body.method !== 'string' || body.method.trim() === '') {
    return { ok: false, message: 'method is required' }
  }
  // A notification has no `id`; CrisisFlow always replies, so require an id.
  if (body.id === undefined || body.id === null) {
    return { ok: false, message: 'id is required for a request' }
  }
  if (
    typeof body.params !== 'undefined' &&
    (body.params === null || typeof body.params !== 'object' || Array.isArray(body.params))
  ) {
    return { ok: false, message: 'params must be an object when present' }
  }
  return { ok: true, value: body }
}

module.exports = {
  JSONRPC,
  ACP_ERROR_CODES,
  buildRequest,
  buildSuccessResponse,
  buildErrorResponse,
  methodNotFound,
  invalidRequest,
  invalidParams,
  parseRequest,
  statusToRpcCode,
}
