const express = require('express')
const {edit, getAllInfo} = require('../controller/portals/portalController')
const {verifyToken} = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/:id', verifyToken, getAllInfo)
router.put('/edit/:id', verifyToken, edit)

module.exports = router