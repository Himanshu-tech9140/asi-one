const express = require('express')
const agentverseController = require('../controllers/agentverse.controller')

const router = express.Router()

// Private bridge endpoints consumed by agentverse_adapter/main.py.
// They are not the public Agentverse registration endpoints.
router.get('/status', agentverseController.status)
router.post('/chat', agentverseController.chat)
router.get('/identity', agentverseController.identity)

module.exports = router
