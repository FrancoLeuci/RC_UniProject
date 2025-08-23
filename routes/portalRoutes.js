const express = require('express')
const {edit, getAllInfo} = require('../controller/portals/portalController')
const {newUser, addToPortal, removeFromPortal, editUser, getPortalMembers} = require('../controller/portals/adminController')
const {verifyToken} = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/:portal', verifyToken, getAllInfo)
router.put('/:portal/edit', verifyToken, edit)

router.post('/:portal/members/create', verifyToken, newUser)
router.put('/:portal/members/:id', verifyToken, addToPortal)
router.delete('/:portal/members/:id', verifyToken, removeFromPortal)
router.put('/:portal/members/edit/:id', verifyToken, editUser)
router.get('/:portal/members/:id', verifyToken, getPortalMembers)

module.exports = router