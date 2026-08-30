// History controllers — thin HTTP layer over history.service.js.

const historyService = require('../services/history.service')
const { asyncHandler } = require('../utils/asyncHandler')

const getHistory = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query
  const data = await historyService.getHistory({ page, limit, status })
  res.json({ success: true, data })
})

module.exports = { getHistory }
