// ============================================================
// History Service — paginated retrieval of stored coordination
// records for the Coordination History view.
// ============================================================

const Coordination = require('../models/Coordination')
const { isConnected } = require('../config/db')

async function getHistory({ page = 1, limit = 10, status } = {}) {
  const filter = {}
  if (status && status !== 'All') {
    filter.status = status
  }

  const p = Math.max(1, parseInt(page, 10) || 1)
  const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 10))

  const total = await Coordination.countDocuments(filter)
  const docs = await Coordination.find(filter)
    .sort({ createdAt: -1 })
    .skip((p - 1) * l)
    .limit(l)

  return {
    items: docs.map((d) => ({
      id: d.id,
      coordinationId: d.id,
      request: d.request,
      status: d.status,
      createdAt: d.createdAt,
      recommendation: d.recommendation?.name || null,
      facilitiesFound: Array.isArray(d.alternatives) ? d.alternatives.length + 1 : 1,
    })),
    pagination: {
      page: p,
      limit: l,
      total,
      pages: Math.ceil(total / l),
    },
  }
}

async function getCoordinationHistory(options) {
  return getHistory(options)
}

module.exports = {
  getHistory,
  getCoordinationHistory,
  _isConnected: isConnected,
}
