// ACP controllers — thin HTTP layer for the CrisisFlow agent.
//
// Accepts an ACP (JSON-RPC 2.0) request body, passes it to the
// CrisisFlow agent, and returns an ACP-compatible response envelope.
// All validation and dispatch happens inside the agent; the controller
// only bridges HTTP and the ACP interface.

const { handleACPRequest } = require('../agents/crisisflow/crisisflow.agent')

const handleAcpRequest = async (req, res) => {
  const response = await handleACPRequest(req.body)
  res.status(200).json(response)
}

module.exports = {
  acp: handleAcpRequest,
}
