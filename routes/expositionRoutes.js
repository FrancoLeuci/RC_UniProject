const express = require('express')

const {createExposition,setExpoPublic,editExpoMetadata,addAuthor,removeAuthor,connectToPortal,editExposition} = require('../controller/expositionController')
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

module.exports = router