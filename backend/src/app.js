const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')

const { env } = require('./config/env')
const { requestLogger } = require('./middleware/requestLogger')
const { errorHandler } = require('./middleware/errorHandler')
const { notFound } = require('./middleware/notFound')

// Routes
const healthRoutes = require('./routes/health.routes')
const coordinationRoutes = require('./routes/coordination.routes')
const facilityRoutes = require('./routes/facility.routes')
const historyRoutes = require('./routes/history.routes')
const routeRoutes = require('./routes/route.routes')
const aiRoutes = require('./routes/ai.routes')
const acpRoutes = require('./routes/acp.routes')
const agentverseRoutes = require('./routes/agentverse.routes')

const app = express()

app.set('trust proxy', 1)

// Security headers
app.use(helmet())

// CORS — allow the configured frontend origin
app.use(
  cors({
    origin: env.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    credentials: true,
  }),
)

// Body parsing with size limit
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: true, limit: '100kb' }))

// Request logging (dev: concise, prod: combined-style via morgan)
if (env.isProduction) {
  app.use(morgan('combined'))
} else {
  app.use(morgan('dev'))
}

// Request id + basic headers
app.use(requestLogger)

// Global rate limiting (apply to all /api routes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
})

app.use('/api', apiLimiter)

// Routes
app.use('/api/health', healthRoutes)
app.use('/api/coordination', coordinationRoutes)
app.use('/api/facilities', facilityRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/routes', routeRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/acp', acpRoutes)
app.use('/api/agent', agentverseRoutes)

// 404 for unknown routes
app.use(notFound)

// Centralized error handling — must be last
app.use(errorHandler)

module.exports = app
