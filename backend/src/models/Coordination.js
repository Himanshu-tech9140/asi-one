const mongoose = require('mongoose')

// A single coordination run produced by the CrisisFlow agent.
//
// This schema is intentionally shaped around the future pipeline:
//   request -> plan (intent + steps) -> tool execution -> recommendation
// It is generic enough to store both mock results today and real
// ASI:One-driven results later without schema changes.

const stepSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'failed'],
      default: 'pending',
    },
    description: { type: String, default: '' },
    timestamp: { type: Date },
  },
  { _id: false },
)

const toolRefSchema = new mongoose.Schema(
  {
    toolName: { type: String },
    status: { type: String },
  },
  { _id: false },
)

const coordinationSchema = new mongoose.Schema(
  {
    request: {
      type: String,
      required: [true, 'request is required'],
      trim: true,
      maxlength: [4000, 'request must be at most 4000 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'planning', 'executing', 'completed', 'failed'],
      default: 'pending',
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    preferences: {
      maxDistance: { type: Number },
      serviceType: { type: String },
      travelPreference: { type: String },
    },
    intent: {
      type: { type: String },
      confidence: { type: Number },
    },
    steps: {
      type: [stepSchema],
      default: [],
    },
    toolsUsed: {
      type: [toolRefSchema],
      default: [],
    },
    recommendation: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    alternatives: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

// Serialize the sub-document id/_id so the client receives a stable
// coordination id. We opt to expose the Mongo _id string as "id".
coordinationSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(doc, ret) {
    ret.id = ret._id.toString()
    ret.coordinationId = ret.id
    delete ret._id
    return ret
  },
})

// Database indexes (Phase 4): support the common "newest first" and
// "filter by status" queries used by history. Created automatically by
// Mongoose on model init; unique _id index comes built-in.
coordinationSchema.index({ createdAt: -1 })
coordinationSchema.index({ status: 1 })

module.exports = mongoose.model('Coordination', coordinationSchema)
