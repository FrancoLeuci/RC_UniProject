const express = require('express');
const {viewRequests, actionRequest, viewNotifications} = require('../controller/requestController')
const {verifyToken} = require('../middleware/authMiddleware')

const router = express.Router();

router.get('/', verifyToken, viewRequests);
router.put('/:reqId', verifyToken, actionRequest);
router.get('/:extra', verifyToken, viewNotifications);

module.exports = router