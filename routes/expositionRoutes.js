const express = require('express')

const {createExposition,setExpoPublic,editExpoMetadata,addAuthor,removeAuthor,connectToPortal,editExposition,getPublicExpositions,getPortalExpositions,getExposition,leaveCollaboration,deleteExposition,removeFromPortal} = require('../controller/expositionController')
const {verifyToken} = require('../middleware/authMiddleware')
const expoCheck = require('../middleware/expoMiddleware')

const router = express.Router()

router.post('/create',verifyToken, createExposition)
router.put('/:expoId/setToPublic', verifyToken, expoCheck, setExpoPublic)
router.post('/:expoId/edit', verifyToken, expoCheck, editExpoMetadata)
router.put('/:expoId/addAuthor/:id', verifyToken, expoCheck, addAuthor)
router.delete('/:expoId/removeAuthor/:id', verifyToken, expoCheck, removeAuthor)
router.post('/:expoId/connectPortal/:portal', verifyToken, expoCheck, connectToPortal)
router.post('/:expoId/editExposition', verifyToken, expoCheck, editExposition)
router.get('/publicExpositions/:page', getPublicExpositions)
router.get('/portalExpositions/:portal/:page',verifyToken,getPortalExpositions)
router.post('/:expoId',getExposition)
router.put('/:expoId/leave',verifyToken, expoCheck, leaveCollaboration)
router.delete('/:expoId/delete',verifyToken,expoCheck,deleteExposition)
router.put('/:expoId/removeFromPortal',verifyToken, expoCheck, removeFromPortal)

module.exports = router