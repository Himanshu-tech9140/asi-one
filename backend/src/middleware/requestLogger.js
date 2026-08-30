// Minimal structured request logger (attaches a request id for
// traceability). morgan handles the access-log lines in app.js.

const crypto = require('crypto')

function requestLogger(req, res, next) {
  req.id = req.headers['x-request-id'] || crypto.randomUUID()
  res.setHeader('X-Request-Id', req.id)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  next()
}

module.exports = { requestLogger }
