const express = require('express');

const {addSuperAdmin, portalDeletionResponse, createPortalRequest, userDeletionResponse} = require('../controller/superAdminController');

const {verifyToken} = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/add/:id', verifyToken, addSuperAdmin)
router.put('/deletePortal/:rqId', verifyToken, portalDeletionResponse)
router.post('/createPortal', verifyToken, createPortalRequest)
router.put('/deleteUser/:rqId', verifyToken, userDeletionResponse)

module.exports = router