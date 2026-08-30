const express = require('express')
const acpController = require('../controllers/acp.controller')

const router = express.Router()

// POST /api/acp
// Accepts an ACP (JSON-RPC 2.0) request for the CrisisFlow agent and
// returns an ACP-compatible response envelope. The external Google/ASI:One
// providers are never called directly from here — the agent dispatches
// capability requests to the registered backend tool registry.
router.post('/', acpController.acp)

module.exports = router
