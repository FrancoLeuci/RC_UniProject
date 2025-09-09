const express = require('express')

const {edit, getAllInfo, getPortals} = require('../controller/portals/portalController')
const {newUser, addToPortal, removeFromPortal, editUser, getPortalMembers, createGroup, deleteGroup} = require('../controller/portals/adminController')

const {verifyToken} = require('../middleware/authMiddleware')
const {portalAdminCheck} = require('../middleware/p_adminMiddleware')

const router = express.Router()

//gestione del portale
router.get('/:portal', verifyToken, portalAdminCheck, getAllInfo)
router.put('/:portal/edit', verifyToken, portalAdminCheck, edit)

//gestione degli utenti del portale
router.post('/:portal/members/create', verifyToken, portalAdminCheck, newUser)
router.put('/:portal/members/:id', verifyToken, portalAdminCheck, addToPortal)
router.delete('/:portal/members/:id', verifyToken, portalAdminCheck, removeFromPortal)
router.put('/:portal/members/edit/:id', verifyToken, portalAdminCheck, editUser)
router.get('/:portal/members', verifyToken, portalAdminCheck, getPortalMembers)

//gestione dei gruppi del portale
router.post('/:portal/group/create', verifyToken, portalAdminCheck, createGroup)
//router.get('/:portal/groups', verifyToken, portalAdminCheck, getGroups)
router.delete('/:portal/group/:grId/delete', verifyToken, portalAdminCheck, deleteGroup)

//visualizzazione dei portali nel sito
router.get('/', getPortals);

module.exports = router