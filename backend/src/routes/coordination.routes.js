const express = require('express')
const coordinationController = require('../controllers/coordination.controller')

const router = express.Router()

router.post('/', coordinationController.createCoordination)
router.get('/:id', coordinationController.getCoordination)

module.exports = router
