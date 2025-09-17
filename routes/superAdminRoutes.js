const express = require('express');

const {addSuperAdmin, portalDeletionResponse, createPortalRequest, userDeletionResponse} = require('../controller/superAdminController');

const {verifyToken} = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/add/:id', verifyToken, addSuperAdmin)
router.delete('/deletePortal/:rqId', verifyToken, portalDeletionResponse)
router.post('/createPortal', verifyToken, createPortalRequest)
router.delete('/deleteUser/:rqId', verifyToken, userDeletionResponse)

module.exports = router