const express = require('express')

const {edit, getAllInfo, getPortals} = require('../controller/portals/portalController')
const {addToPortal, removeFromPortal, getPortalMembers, addReviewer,
    removeReviewer, selectReviewer, requestToRemovePortal, removeLinkedExposition} = require('../controller/portals/adminController')

const {verifyToken} = require('../middleware/authMiddleware')
const {portalAdminCheck} = require('../middleware/p_adminMiddleware')

const router = express.Router()

//gestione del portale
router.get('/:portal', verifyToken, portalAdminCheck, getAllInfo)
router.put('/:portal/edit', verifyToken, portalAdminCheck, edit)
router.put('/:portal/delete', verifyToken, portalAdminCheck, requestToRemovePortal)

//gestione degli utenti del portale
//router.post('/:portal/members/create', verifyToken, portalAdminCheck, newUser)
router.put('/:portal/members/:id', verifyToken, portalAdminCheck, addToPortal)
router.delete('/:portal/member/:id', verifyToken, portalAdminCheck, removeFromPortal)
router.get('/:portal/members', verifyToken, portalAdminCheck, getPortalMembers)

//gestione dei reviewer del portale
router.put('/:portal/addReviewer/:id', verifyToken, portalAdminCheck, addReviewer)
router.put('/:portal/removeReviewer/:id', verifyToken, portalAdminCheck, removeReviewer)
router.post('/:portal/selectReviewer/:reqId', verifyToken, portalAdminCheck, selectReviewer)
router.put('/:portal/removeExposition/:expo', verifyToken, portalAdminCheck, removeLinkedExposition)


module.exports = router