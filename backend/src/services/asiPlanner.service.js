const Coordination = require('../models/Coordination')
const ToolExecution = require('../models/ToolExecution')
const asiOne = require('./asiOne.service')
const { toolRegistry, plannerTools } = require('../tools/toolRegistry')
const { ApiError } = require('../utils/ApiError')

const MAX_AGENT_STEPS = 5
const PLANNER_PROMPT = `You are CrisisFlow's healthcare coordination planner. Use only the provided tools. Never invent coordinates, availability, treatment, diagnoses, prescriptions, or medical advice. For facility discovery use findFacilities; for travel to a returned facility use calculateRoute with its exact facilityId. When enough data is available, return a concise, factual final answer with no tool call. Do not reveal reasoning.`

function validateLocation(location) {
  if (!location) return null
  if (!location || typeof location.lat !== 'number' || !Number.isFinite(location.lat) || location.lat < -90 || location.lat > 90 || typeof location.lng !== 'number' || !Number.isFinite(location.lng) || location.lng < -180 || location.lng > 180) {
    throw ApiError.badRequest('location must contain valid lat and lng coordinates')
  }
  return { lat: location.lat, lng: location.lng }
}

function safeToolResult(name, result) {
  if (name === 'findFacilities') return { facilities: (result.facilities || []).slice(0, 10).map(({ id, placeId, name, address, location, types, rating, userRatingsTotal }) => ({ id, placeId, name, address, location, types, rating, userRatingsTotal })) }
  if (name === 'calculateRoute') {
    const { distanceMeters, durationSeconds, distanceText, durationText } = result
    return { distanceMeters, durationSeconds, distanceText, durationText }
  }
  return {}
}

function parseArguments(toolCall) {
  try { return JSON.parse(toolCall.function.arguments || '{}') } catch { throw ApiError.badRequest('Invalid AI tool arguments') }
}

function facilityForRoute(arguments_, context) {
  return (context.facilities || []).find((facility) => facility.id === arguments_.facilityId || facility.placeId === arguments_.facilityId) || null
}

// The planner may choose tools, but it is not allowed to narrate a facility
// that was not selected by the verified tool execution.  Final user-facing
// facility/route facts are therefore rendered from normalized tool output.
function buildGroundedFinalResponse({ modelResponse, facilities, facilitySearchAttempted, selectedFacility, route }) {
  if (selectedFacility) {
    const address = selectedFacility.address ? `\nAddress: ${selectedFacility.address}` : ''
    const routeSummary = route && (route.distanceText || route.durationText)
      ? `\nFastest route: ${route.distanceText || 'Distance unavailable'}${route.durationText ? ` (${route.durationText})` : ''}.`
      : ''
    return `Confirmed facility: ${selectedFacility.name}.${address}${routeSummary}`
  }
  if (facilities.length > 0) {
    const facility = facilities[0]
    return `Nearby facility found: ${facility.name}.${facility.address ? `\nAddress: ${facility.address}` : ''}`
  }
  if (facilitySearchAttempted) return 'No facility was confirmed for this request.'
  return modelResponse || 'The requested information was retrieved.'
}

async function runPlan({ message, location, onEvent }) {
  const emit = (type, payload = {}) => {
    if (typeof onEvent !== 'function') return
    try { onEvent(type, payload) } catch (_) { /* client may have disconnected */ }
  }
  const normalizedLocation = validateLocation(location)
  if (!message || typeof message !== 'string' || !message.trim()) throw ApiError.badRequest('Message is required')
  const coordination = await Coordination.create({ request: message.trim(), status: 'planning', location: normalizedLocation || undefined })
  const coordinationId = coordination.id
  emit('agent_started', { coordinationId, message: 'CrisisFlow agent started' })
  let intent
  try {
    intent = await asiOne.understandIntent(message)
    coordination.intent = { type: intent.intent, confidence: intent.confidence }
    await coordination.save()
    emit('intent_detected', { coordinationId, message: 'Request intent detected' })
  } catch (error) {
    coordination.status = 'failed'; await coordination.save()
    emit('error', { coordinationId, message: 'CrisisFlow could not understand the request.' })
    throw error
  }
  if (intent.locationRequired && !normalizedLocation) {
    coordination.status = 'failed'; await coordination.save()
    const finalResponse = 'I need your location or a starting location to find nearby facilities or calculate a route.'
    emit('error', { coordinationId, message: finalResponse })
    return { status: 'location_required', coordinationId, intent, steps: [], result: null, finalResponse }
  }
  emit('planning_started', { coordinationId, message: 'Creating execution plan' })
  const context = { location: normalizedLocation, facilities: [] }
  const steps = []
  const results = {}
  let selectedFacility = null
  const messages = [
    { role: 'system', content: PLANNER_PROMPT },
    { role: 'user', content: `${message.trim()}\nVerified user location: ${normalizedLocation ? JSON.stringify(normalizedLocation) : 'not supplied'}` },
  ]
  let finalResponse = ''

  try {
    for (let step = 0; step < MAX_AGENT_STEPS; step += 1) {
      const assistantMessage = await asiOne.createChatCompletion({ messages, tools: plannerTools() })
      if (step === 0) emit('planning_completed', { coordinationId, message: 'Execution plan ready' })
      messages.push({ role: 'assistant', content: assistantMessage.content || null, tool_calls: assistantMessage.tool_calls || [] })
      const calls = Array.isArray(assistantMessage.tool_calls) ? assistantMessage.tool_calls : []
      if (calls.length === 0) { finalResponse = typeof assistantMessage.content === 'string' ? assistantMessage.content.trim() : ''; break }
      const call = calls[0]
      const toolName = call && call.function && call.function.name
      const tool = toolRegistry[toolName]
      if (!tool) throw ApiError.badRequest('AI selected an unsupported tool')
      const args = parseArguments(call)
      const execution = await ToolExecution.create({ coordinationId: coordination._id, toolName, status: 'running', input: args, startedAt: new Date() })
      emit('tool_started', { coordinationId, tool: toolName, message: toolName === 'findFacilities' ? 'Finding nearby healthcare facilities' : 'Calculating fastest route' })
      try {
        const output = await tool.execute(args, context)
        const safeOutput = safeToolResult(toolName, output)
        if (toolName === 'findFacilities') context.facilities = output.facilities || []
        if (toolName === 'calculateRoute') selectedFacility = facilityForRoute(args, context)
        results[toolName] = safeOutput
        execution.status = 'completed'; execution.output = safeOutput; execution.completedAt = new Date(); await execution.save()
        steps.push({ tool: toolName, status: 'completed' })
        emit('tool_completed', { coordinationId, tool: toolName, message: toolName === 'findFacilities' ? 'Healthcare facilities found' : 'Fastest route calculated' })
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(safeOutput) })
      } catch (error) {
        execution.status = 'failed'; execution.error = 'Tool execution failed'; execution.completedAt = new Date(); await execution.save()
        steps.push({ tool: toolName, status: 'failed' })
        emit('tool_failed', { coordinationId, tool: toolName, message: 'Unable to complete this step' })
        throw error
      }
    }
    if (!finalResponse) {
      if (steps.length >= MAX_AGENT_STEPS) throw ApiError.internal('Maximum agent steps reached')
      finalResponse = 'The requested information was retrieved.'
    }
    finalResponse = buildGroundedFinalResponse({
      modelResponse: finalResponse,
      facilities: results.findFacilities?.facilities || [],
      facilitySearchAttempted: Boolean(results.findFacilities),
      selectedFacility,
      route: results.calculateRoute,
    })
    coordination.status = 'completed'
    coordination.steps = steps.map((step) => ({ name: step.tool, status: step.status, description: 'Executed by the approved tool registry', timestamp: new Date() }))
    coordination.toolsUsed = steps.map((step) => ({ toolName: step.tool, status: step.status }))
    coordination.recommendation = results.findFacilities ? { facilities: results.findFacilities.facilities } : null
    await coordination.save()
    const data = { status: 'completed', coordinationId, intent, steps, result: results, finalResponse }
    emit('final_response', { coordinationId, response: finalResponse, data })
    emit('agent_completed', { coordinationId, status: 'completed' })
    return data
  } catch (error) {
    coordination.status = 'failed'; await coordination.save()
    emit('error', { coordinationId, message: 'CrisisFlow could not complete the coordination.' })
    throw error
  }
}

module.exports = { runPlan, MAX_AGENT_STEPS, _internals: { validateLocation, parseArguments, safeToolResult, facilityForRoute, buildGroundedFinalResponse } }
