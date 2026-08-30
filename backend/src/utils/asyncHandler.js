// Wraps an async route/controller handler so that rejected promises
// are forwarded to the central error handler instead of requiring
// try/catch in every controller.

function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    return Promise.resolve(fn(req, res, next)).catch(next)
  }
}

module.exports = { asyncHandler }
