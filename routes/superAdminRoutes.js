const express = require('express');

const {addSuperAdmin, portalDeletionResponse, createPortalResponse, userDeletionResponse, fullAccountResponse} = require('../controller/superAdminController');

const {verifyToken} = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/add/:id', verifyToken, addSuperAdmin)
router.delete('/deletePortal/:rqId', verifyToken, portalDeletionResponse)
router.put('/createPortal/:rqId', verifyToken, createPortalResponse)
router.delete('/deleteUser/:rqId', verifyToken, userDeletionResponse)
router.post('/fullAccount/:rqId', verifyToken, fullAccountResponse)

module.exports = router