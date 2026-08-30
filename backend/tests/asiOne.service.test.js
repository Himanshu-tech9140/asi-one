// Phase 6 — ASI:One Service Tests
//
// These tests NEVER call the real ASI:One API. All ASI:One responses
// are simulated via a mocked global fetch that returns the real
// Chat Completions response shape:
//   { choices: [{ message: { content: "<json>" } }] }

// Control env BEFORE loading any config module (dotenv won't override).
process.env.ASI_ONE_API_KEY = process.env.ASI_ONE_API_KEY || 'TEST_KEY'
process.env.ASI_ONE_BASE_URL = 'https://api.asi1.ai/v1'
process.env.ASI_ONE_MODEL = 'asi1'

const asiOneService = require('../src/services/asiOne.service')
const aiController = require('../src/controllers/ai.controller')
const { ApiError } = require('../src/utils/ApiError')
const envModule = require('../src/config/env')

// Sanitize so dotenv does not leak a real .env key into assertions.
let TEST_KEY
try {
  TEST_KEY = process.env.ASI_ONE_API_KEY
} catch {
  TEST_KEY = 'TEST_KEY'
}

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`)
  console.log(`  ok - ${msg}`)
}

function intentJson(overrides) {
  return JSON.stringify({
    intent: 'find_facility',
    serviceType: 'hospital',
    needsRoute: false,
    locationRequired: true,
    confidence: 0.95,
    ...overrides,
  })
}

function chatCompletion(content) {
  return { choices: [{ message: { content } }] }
}

function withMockFetch(handler, fn) {
  const originalFetch = global.fetch
  global.fetch = handler
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      global.fetch = originalFetch
    })
}

function jsonResponse(ok, status, body) {
  return { ok, status, json: async () => body }
}

function isApiError(err, status, message) {
  if (!(err instanceof ApiError)) return false
  if (err.statusCode !== status) return false
  if (message && err.message !== message) return false
  return true
}

async function main() {
  try {
    console.log('Phase 6 — ASI:One Service + Controller Tests')

    // --- Intent normalization (pure, no API call) ---

    const normalized = asiOneService._internals.normalizeIntent({
      intent: 'find_facility',
      serviceType: 'hospital',
      needsRoute: false,
      locationRequired: true,
      confidence: 0.95,
    })
    assert(normalized.intent === 'find_facility', 'intent normalized')
    assert(normalized.serviceType === 'hospital', 'service type normalized')
    assert(normalized.needsRoute === false, 'needsRoute normalized')
    assert(normalized.locationRequired === true, 'locationRequired normalized')
    assert(normalized.confidence === 0.95, 'confidence normalized')

    // Test: unsupported intent type
    const unsupported = asiOneService._internals.normalizeIntent({
      intent: 'unknown_intent',
      serviceType: 'hospital',
      needsRoute: false,
      locationRequired: false,
      confidence: 0.2,
    })
    assert(unsupported.intent === 'unsupported', 'unknown intent marked as unsupported')

    // Test: unsupported service type
    const unsupportedService = asiOneService._internals.normalizeIntent({
      intent: 'find_facility',
      serviceType: 'unknown_service',
      needsRoute: false,
      locationRequired: true,
      confidence: 0.2,
    })
    assert(unsupportedService.serviceType === null, 'unknown service type set to null')

    // Malformed provider output is rejected rather than guessed/coerced.
    const incompleteIntent = asiOneService._internals.normalizeIntent({
      intent: 'find_facility',
      serviceType: 'clinic',
    })
    assert(incompleteIntent === null, 'incomplete provider intent is rejected')

    // Test: locationRequired false for general query
    const general = asiOneService._internals.normalizeIntent(JSON.parse(intentJson({
      intent: 'general_healthcare_query',
      serviceType: null,
      locationRequired: false,
    })))
    assert(general.locationRequired === false, 'general query does not require location')

    // Test: supported intents list
    const supportedIntents = asiOneService._internals.SUPPORTED_INTENTS
    assert(supportedIntents.includes('find_facility'), 'find_facility in supported list')
    assert(supportedIntents.includes('find_route'), 'find_route in supported list')
    assert(supportedIntents.includes('emergency_help'), 'emergency_help in supported list')

    // Test: supported service types list
    const supportedTypes = asiOneService._internals.SUPPORTED_SERVICE_TYPES
    assert(supportedTypes.includes('hospital'), 'hospital in supported list')
    assert(supportedTypes.includes('pharmacy'), 'pharmacy in supported list')
    assert(supportedTypes.includes('emergency'), 'emergency in supported list')
    assert(supportedTypes.includes('blood_bank'), 'blood_bank in supported list')

    // --- Validation (controller, no API call) ---

    function callUnderstand(body) {
      return new Promise((resolve) => {
        let captured = null
        const req = { body }
        const res = { json: (payload) => resolve(payload) }
        const next = (err) => resolve({ error: err })
        aiController.understand(req, res, next).catch((err) => resolve({ error: err }))
      })
    }

    // Test: missing message
    let result = await callUnderstand({})
    assert(result.error instanceof ApiError && result.error.statusCode === 400, 'missing message returns 400')

    // Test: empty message
    result = await callUnderstand({ message: '   ' })
    assert(result.error instanceof ApiError && result.error.statusCode === 400, 'empty message returns 400')

    // Test: invalid message type
    result = await callUnderstand({ message: 12345 })
    assert(result.error instanceof ApiError && result.error.statusCode === 400, 'non-string message returns 400')

    // Test: too-long message
    result = await callUnderstand({ message: 'a'.repeat(2001) })
    assert(result.error instanceof ApiError && result.error.statusCode === 400, 'over-length message returns 400')

    // Test: valid body passes through to service (via mock fetch)
    const happyFetch = (url, options) => {
      const parsed = JSON.parse(options.body)
      assert(parsed.model === 'asi1', 'request uses configured model')
      assert(parsed.response_format.type === 'json_schema', 'request asks for strict JSON schema')
      assert(parsed.response_format.json_schema.strict === true, 'response schema is strict')
      assert(
        Array.isArray(parsed.messages) && parsed.messages[0].role === 'system',
        'request includes system prompt',
      )
      assert(options.headers.Authorization === `Bearer ${TEST_KEY}`, 'request carries Bearer API key')
      return Promise.resolve(jsonResponse(true, 200, chatCompletion(intentJson())))
    }
    result = await withMockFetch(happyFetch, () => callUnderstand({ message: 'Find hospitals near me' }))
    assert(result && result.success === true, 'valid request returns success envelope')
    assert(result.data.intent === 'find_facility', 'valid request returns hospital intent')
    assert(result.data.originalMessage === 'Find hospitals near me', 'response echoes originalMessage')
    assert(
      JSON.stringify(result).indexOf(process.env.ASI_ONE_API_KEY) === -1,
      'API key never appears in success response',
    )

    // --- Service: missing API key ---

    const savedKey = envModule.env.asiOneApiKey
    envModule.env.asiOneApiKey = ''
    let threw = false
    let missingKeyError = null
    try {
      await withMockFetch(
        () => jsonResponse(true, 200, chatCompletion(intentJson())),
        () => asiOneService.understandIntent('Find a hospital'),
      )
    } catch (e) {
      threw = isApiError(e, 500, 'AI service is not configured')
      missingKeyError = e
    } finally {
      envModule.env.asiOneApiKey = savedKey
    }
    assert(threw, 'missing API key maps to 500 / AI service is not configured')
    assert(
      !JSON.stringify(missingKeyError).includes(process.env.ASI_ONE_API_KEY || ''),
      'key never present in error payload when missing',
    )

    // --- Service: intent understanding ---

    // Hospital intent
    const hospitalIntent = await withMockFetch(
      () => jsonResponse(true, 200, chatCompletion(intentJson())),
      () => asiOneService.understandIntent('Find hospitals near me'),
    )
    assert(hospitalIntent.intent === 'find_facility', 'hospital intent recognized')
    assert(hospitalIntent.serviceType === 'hospital', 'hospital service type mapped')
    assert(hospitalIntent.needsRoute === false, 'hospital route not needed')
    assert(hospitalIntent.locationRequired === true, 'hospital location required')
    assert(hospitalIntent.confidence >= 0.9, 'confidence score returned')

    // Pharmacy intent
    const pharmacyIntent = await withMockFetch(
      () =>
        jsonResponse(
          true,
          200,
          chatCompletion(intentJson({ serviceType: 'pharmacy' })),
        ),
      () => asiOneService.understandIntent('Find nearest pharmacy'),
    )
    assert(pharmacyIntent.intent === 'find_facility', 'pharmacy intent recognized')
    assert(pharmacyIntent.serviceType === 'pharmacy', 'pharmacy service type mapped')

    // Emergency intent with route
    const emergencyIntent = await withMockFetch(
      () =>
        jsonResponse(
          true,
          200,
          chatCompletion(
            intentJson({ serviceType: 'emergency', needsRoute: true, confidence: 0.92 }),
          ),
        ),
      () =>
        asiOneService.understandIntent('Find emergency hospital and tell me how to reach it'),
    )
    assert(emergencyIntent.intent === 'find_facility', 'emergency intent recognized')
    assert(emergencyIntent.serviceType === 'emergency', 'emergency service type mapped')
    assert(emergencyIntent.needsRoute === true, 'emergency route needed')

    // Route-required intent
    const routeIntent = await withMockFetch(
      () =>
        jsonResponse(
          true,
          200,
          chatCompletion(intentJson({ intent: 'find_route', needsRoute: true })),
        ),
      () => asiOneService.understandIntent('How far is the nearest hospital?'),
    )
    assert(routeIntent.intent === 'find_route', 'route intent recognized')
    assert(routeIntent.needsRoute === true, 'route intent flags needsRoute')

    // Unsupported intent
    const unsupportedIntent = await withMockFetch(
      () =>
        jsonResponse(
          true,
          200,
          chatCompletion(intentJson({ intent: 'unsupported', serviceType: null })),
        ),
      () => asiOneService.understandIntent('Play some music'),
    )
    assert(unsupportedIntent.intent === 'unsupported', 'unsupported intent passed through')

    // --- Service: malformed / invalid responses ---

    // No choices array
    threw = false
    try {
      await withMockFetch(
        () => jsonResponse(true, 200, { object: 'chat.completion' }),
        () => asiOneService.understandIntent('Find a hospital'),
      )
    } catch (e) {
      threw = isApiError(e, 500, 'Unable to understand the request')
    }
    assert(threw, 'missing choices maps to unable to understand')

    // Non-JSON model content
    threw = false
    try {
      await withMockFetch(
        () => jsonResponse(true, 200, chatCompletion('I am not JSON at all')),
        () => asiOneService.understandIntent('Find a hospital'),
      )
    } catch (e) {
      threw = isApiError(e, 500, 'Unable to understand the request')
    }
    assert(threw, 'non-JSON model reply maps to unable to understand')

    // JSON with missing required fields is malformed too.
    threw = false
    try {
      await withMockFetch(
        () => jsonResponse(true, 200, chatCompletion('{"intent":"find_facility"}')),
        () => asiOneService.understandIntent('Find a hospital'),
      )
    } catch (e) {
      threw = isApiError(e, 500, 'Unable to understand the request')
    }
    assert(threw, 'incomplete JSON model reply maps to unable to understand')

    // null body
    threw = false
    try {
      await withMockFetch(
        () => jsonResponse(true, 200, null),
        () => asiOneService.understandIntent('Find a hospital'),
      )
    } catch (e) {
      threw = isApiError(e, 500)
    }
    assert(threw, 'null body maps to 500 error')

    // --- Service: HTTP error mapping ---

    threw = false
    try {
      await withMockFetch(
        () => jsonResponse(false, 429, { error: 'Rate limit exceeded' }),
        () => asiOneService.understandIntent('Find a hospital'),
      )
    } catch (e) {
      threw = isApiError(e, 500) && /temporarily unavailable/.test(e.message)
    }
    assert(threw, '429 maps to temporarily unavailable')

    threw = false
    try {
      await withMockFetch(
        () => jsonResponse(false, 403, { error: 'Forbidden' }),
        () => asiOneService.understandIntent('Find a hospital'),
      )
    } catch (e) {
      threw = isApiError(e, 500, 'AI service is not configured')
    }
    assert(threw, '403 maps to not configured')

    threw = false
    try {
      await withMockFetch(
        () => jsonResponse(false, 500, { error: 'Internal' }),
        () => asiOneService.understandIntent('Find a hospital'),
      )
    } catch (e) {
      threw = isApiError(e, 500, 'AI service is temporarily unavailable')
    }
    assert(threw, '500 maps to temporarily unavailable')

    // --- Service: timeout handling ---

    threw = false
    let timeoutMessage = null
    try {
      const abortError = Object.assign(new Error('The operation was aborted'), {
        name: 'AbortError',
      })
      await withMockFetch(
        () => Promise.reject(abortError),
        () => asiOneService.understandIntent('Find a hospital'),
      )
    } catch (e) {
      threw = isApiError(e, 500, 'AI service request timed out')
      timeoutMessage = e.message
    }
    assert(threw, 'timeout maps to AI service request timed out')
    assert(
      timeoutMessage.indexOf(process.env.ASI_ONE_API_KEY) === -1,
      'timeout message never leaks the API key',
    )

    // --- Service: network failure ---

    threw = false
    try {
      await withMockFetch(
        () => Promise.reject(new TypeError('fetch failed')),
        () => asiOneService.understandIntent('Find a hospital'),
      )
    } catch (e) {
      threw = isApiError(e, 500, 'AI service is temporarily unavailable')
    }
    assert(threw, 'network failure maps to temporarily unavailable')

    // --- API key never exposed in errors ---

    const key = process.env.ASI_ONE_API_KEY
    let keyLeak = false

    async function scanError(fn) {
      try {
        await fn()
      } catch (e) {
        if (String(e.message).includes(key)) keyLeak = true
      }
    }

    // 429 provider error
    await scanError(() =>
      withMockFetch(
        () => jsonResponse(false, 429, { error: 'Rate limit exceeded' }),
        () => asiOneService.understandIntent('Find a hospital'),
      ),
    )
    // malformed
    await scanError(() =>
      withMockFetch(
        () => jsonResponse(true, 200, null),
        () => asiOneService.understandIntent('Find a hospital'),
      ),
    )
    // network failure
    await scanError(() =>
      withMockFetch(
        () => Promise.reject(new TypeError('fetch failed')),
        () => asiOneService.understandIntent('Find a hospital'),
      ),
    )
    assert(!keyLeak, 'API key never appears in any error message')

    // Response body never returns raw provider output as-is
    let rawLeak = false
    const weirdContent = `So sorry here is your answer.\n\n${intentJson()}`
    const recovered = await withMockFetch(
      () => jsonResponse(true, 200, chatCompletion(weirdContent)),
      () => asiOneService.understandIntent('Find a hospital'),
    )
    if (String(recovered).indexOf('So sorry') !== -1) rawLeak = true
    assert(!rawLeak, 'raw provider reply is not returned verbatim')
    assert(recovered.intent === 'find_facility', 'JSON recovered from wrapped provider reply')

    console.log('\nAll Phase 6 ASI:One Service Tests passed.')
  } finally {
    if (global.fetch && global.fetch !== originalGlobalFetch) {
      global.fetch = originalGlobalFetch
    }
  }
}

// guard so restore logic is simple
const originalGlobalFetch = global.fetch

main().catch((err) => {
  console.error('\nTest failed:', err.message)
  process.exit(1)
})
