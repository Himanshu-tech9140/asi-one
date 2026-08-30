// Centralized error handler. All errors (operational and unknown)
// funnel through here and are returned in a consistent envelope.
//
// Success:   { success: true,  data }
// Error:     { success: false, message, error? }

const { ApiError } = require('../utils/ApiError')
const mongoose = require('mongoose')

function errorHandler(err, req, res, _next) {
  let statusCode = 500
  let message = 'Something went wrong'
  let error = null

  if (err instanceof ApiError) {
    statusCode = err.statusCode
    message = err.message
    if (err.details !== undefined) error = err.details
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400
    message = 'Validation error'
    error = Object.values(err.errors).map((e) => e.message)
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400
    message = 'Invalid identifier format'
  } else if (err.type === 'entity.too.large') {
    statusCode = 413
    message = 'Request body too large'
  } else if (err.name === 'SyntaxError' && err.type === 'entity.parse.failed') {
    statusCode = 400
    message = 'Invalid JSON payload'
  } else {
    // Never expose implementation details (including development stack traces)
    // through the API.  They can contain filesystem paths or provider details.
    message = 'Something went wrong'
  }

  if (statusCode === 500) {
    // Log the full error server-side, but hide details from client
    console.error('[error]', err)
  }

  const body = { success: false, message }
  if (error !== null) body.error = error

  res.status(statusCode).json(body)
}

module.exports = { errorHandler }
