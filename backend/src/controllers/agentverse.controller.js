// Agentverse controllers — self-hosted Chat Protocol endpoints.
//
//   GET  /api/agent/status  -> {"status":"OK"} health probe
//   POST /api/agent/chat    -> Chat Protocol message handler that
//                              routes text to the CrisisFlow agent
//                              through the Phase 8 bridge.
//
// The bridge reuses the existing CrisisFlow ACP agent/tool registry;
// provider APIs are never called directly here.

const chatProtocol = require('../agentverse/chatProtocol')
const { handleChatText } = require('../agentverse/crisisflow.bridge')
const { identitySummary } = require('../agentverse/agentverse.identity')
const { asyncHandler } = require('../utils/asyncHandler')
// GET /status — used by Agentverse to verify the agent is online.
const status = (req, res) => {
  return res.json({ status: 'OK - Agent is running' })
}

// GET /api/agent/identity — development helper, no secret material.
const identity = (req, res) => {
  res.json({ success: true, data: identitySummary() })
}

// POST /chat — accept a Chat Protocol message and reply.
const chat = asyncHandler(async (req, res) => {
  const { text } = chatProtocol.parseInbound(req.body)
  if (!text) {
    return res.status(200).json(chatProtocol.serializeReply(chatProtocol.buildChatMessage('I received an empty request. Please send a healthcare coordination request.')))
  }
  const replyText = await handleChatText(text)
  return res.status(200).json(chatProtocol.serializeReply(chatProtocol.buildChatMessage(replyText)))
})

module.exports = {
  status,
  identity,
  chat,
}
