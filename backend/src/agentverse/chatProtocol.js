// ============================================================
// Internal Chat Protocol-shaped mapper.
//
// The public Agentverse transport is agentverse_adapter/main.py, which uses
// the documented FastAPI + uagents_core integration. Agentverse currently
// does not document a Node/Express SDK integration. This module only maps
// messages inside the private CrisisFlow service:
//   - GET  /status  -> health check returning {"status":"OK"}
//   - POST /chat    -> receives a Chat Protocol message and replies
//
// Agentverse wraps chat messages in a uAgents Envelope carrying a
// payload (base64 JSON) that decodes to a ChatMessage whose `content`
// is a list of content items, e.g. [ {type:"text", text:"..."} ].
//
// This mapper is transport-tolerant: it accepts either a full
// envelope or a ChatMessage, and always produces a ChatMessage reply.
// It deliberately reuses the existing CrisisFlow ACP agent — never
// touching /api/acp or calling provider APIs directly.
//
// SECURITY:
//   - Only `type:"text"` content is read; other content is ignored.
//   - No credentials are ever parsed, echoed or logged.
//   - Malformed input yields a safe, generic reply.
// ============================================================

const crypto = require('crypto')

// Decode the envelope payload (base64-encoded JSON) -> ChatMessage.
function decodePayload(payload) {
  if (typeof payload !== 'string') return null
  try {
    const json = Buffer.from(payload, 'base64').toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

// Extract free-text from a ChatMessage (content items of type "text").
function extractText(chatMessage) {
  if (!chatMessage || typeof chatMessage !== 'object') return ''
  const content = Array.isArray(chatMessage.content) ? chatMessage.content : []
  const texts = content
    .filter((item) => item && item.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text)
  return texts.join(' ').trim()
}

// Normalize any inbound /chat body into { text, sender }.
function parseInbound(body) {
  if (!body || typeof body !== 'object') return { text: '', sender: null }
  // Could be a full envelope with a payload, or a bare ChatMessage.
  if (typeof body.payload === 'string') {
    const msg = decodePayload(body.payload)
    return { text: extractText(msg), sender: body.sender || null }
  }
  return { text: extractText(body), sender: body.sender || null }
}

// Build a ChatMessage reply with the given text.
function buildChatMessage(text) {
  return {
    timestamp: new Date().toISOString(),
    msg_id: crypto.randomUUID(),
    content: [{ type: 'text', text }],
  }
}

// Serialize a ChatMessage for return to Agentverse.
function serializeReply(chatMessage) {
  return chatMessage
}

module.exports = {
  parseInbound,
  buildChatMessage,
  serializeReply,
  extractText,
  _internals: { decodePayload },
}
