// Route controllers — validate the request body and delegate to the
// calculateRoute tool. The tool validates coordinates, and maps.service
// talks to the Google Routes API.

const { calculateRoute } = require('../tools/calculateRoute.tool')
const { asyncHandler } = require('../utils/asyncHandler')

const calculateRouteHandler = asyncHandler(async (req, res) => {
  const { origin, destination } = req.body || {}
  const route = await calculateRoute({ origin, destination })
  res.json({ success: true, data: route })
})

module.exports = {
  calculateRoute: calculateRouteHandler,
}
