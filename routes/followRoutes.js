const express = require('express')

const {getFollowedUsers, getFollowedPortals} = require('../controller/followController')
const {verifyToken} = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/users', verifyToken, getFollowedUsers)
router.get('/portals', verifyToken, getFollowedPortals)

module.exports = router