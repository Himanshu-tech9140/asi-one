// AI controllers — thin HTTP layer for intent understanding.
// Validation is done here (request-shape concerns); business logic
// lives in asiOne.service.js.

const asiOneService = require('../services/asiOne.service')
const asiPlannerService = require('../services/asiPlanner.service')
const { asyncHandler } = require('../utils/asyncHandler')
const { ApiError } = require('../utils/ApiError')

function validateUnderstandBody(body) {
  // message
  if (!body || typeof body.message !== 'string') {
    throw ApiError.badRequest('Message is required')
  }
  const message = body.message.trim()
  if (message.length === 0) {
    throw ApiError.badRequest('Message is required')
  }
  if (message.length > 2000) {
    throw ApiError.badRequest('Message must be at most 2000 characters')
  }

  return { message }
}

const understandHandler = asyncHandler(async (req, res) => {
  const { message } = validateUnderstandBody(req.body)

  // Call ASI:One service to understand intent
  const intent = await asiOneService.understandIntent(message)

  res.json({
    success: true,
    data: {
      intent: intent.intent,
      serviceType: intent.serviceType,
      needsRoute: intent.needsRoute,
      locationRequired: intent.locationRequired,
      confidence: intent.confidence,
      originalMessage: message,
    },
  })
})

const planHandler = asyncHandler(async (req, res) => {
  const { message } = validateUnderstandBody(req.body)
  const data = await asiPlannerService.runPlan({ message, location: req.body.location })
  res.json({ success: true, data })
})

const streamHandler = async (req, res) => {
  let disconnected = false
  let errorSent = false
  const send = (type, data) => {
    if (type === 'error') errorSent = true
    if (!disconnected && !res.writableEnded) res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)
  }
  res.status(200).set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
  res.flushHeaders()
  req.on('close', () => { disconnected = true })
  try {
    const message = typeof req.query.message === 'string' ? req.query.message : ''
    let location
    if (req.query.location) {
      try { location = JSON.parse(req.query.location) } catch { throw ApiError.badRequest('Invalid location') }
    }
    validateUnderstandBody({ message })
    await asiPlannerService.runPlan({ message, location, onEvent: send })
  } catch (error) {
    if (!errorSent) {
      send('error', { message: error instanceof ApiError ? error.message : 'CrisisFlow could not complete the coordination.' })
    }
  } finally {
    if (!disconnected && !res.writableEnded) res.end()
  }
}

module.exports = {
  understand: understandHandler,
  plan: planHandler,
  stream: streamHandler,
}
