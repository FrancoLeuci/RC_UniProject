const express = require('express')
const {edit, getAllInfo} = require('../controller/portals/portalController')
const {newUser, addToPortal, removeFromPortal, editUser, getPortalMembers} = require('../controller/portals/adminController')
const {verifyToken} = require('../middleware/authMiddleware')
const {portalAdminCheck} = require('../middleware/p_adminMiddleware')

const router = express.Router()

router.get('/:portal', verifyToken, portalAdminCheck, getAllInfo)
router.put('/:portal/edit', verifyToken, portalAdminCheck, edit)

router.post('/:portal/members/create', verifyToken, portalAdminCheck, newUser)
router.put('/:portal/members/:id', verifyToken, portalAdminCheck, addToPortal)
router.delete('/:portal/members/:id', verifyToken, portalAdminCheck, removeFromPortal)
router.put('/:portal/members/edit/:id', verifyToken, portalAdminCheck, editUser)
router.get('/:portal/members', verifyToken, portalAdminCheck, getPortalMembers)

module.exports = router