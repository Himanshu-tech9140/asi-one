const mongoose = require('mongoose')

// A record of a single tool/agent execution (e.g. findFacilities,
// calculateRoute, searchWeb).
//
// Tools are NOT executed in this phase — this model structures the
// data that will be written by the real tool layer later.

const toolExecutionSchema = new mongoose.Schema(
  {
    coordinationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coordination',
      required: true,
      index: true,
    },
    toolName: {
      type: String,
      required: [true, 'toolName is required'],
      enum: ['findFacilities', 'calculateRoute', 'searchWeb', 'externalAgent'],
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    output: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    error: { type: String, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

toolExecutionSchema.index({ coordinationId: 1, toolName: 1 })

module.exports = mongoose.model('ToolExecution', toolExecutionSchema)
