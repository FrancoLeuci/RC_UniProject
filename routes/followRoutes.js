const express = require('express')

const {getFollowedUsers, getFollowedPortals, addFollowed} = require('../controller/followController')
const {verifyToken} = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/users', verifyToken, getFollowedUsers)
router.get('/portals', verifyToken, getFollowedPortals)
router.post('/add/:id', verifyToken, addFollowed)

module.exports = router