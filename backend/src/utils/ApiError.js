// Custom API error with an HTTP status code.
// Thrown by services/controllers and handled centrally by errorHandler.js

class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.isOperational = true
    if (details !== undefined) {
      this.details = details
    }
    Error.captureStackTrace(this, this.constructor)
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details)
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message)
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message)
  }
}

module.exports = { ApiError }
