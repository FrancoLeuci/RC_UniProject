const express = require('express');
const {viewRequests, actionRequest} = require('../controller/requestController')
const {verifyToken} = require('../middleware/authMiddleware')

const router = express.Router();

router.get('/', verifyToken, viewRequests);
router.put('/:reqId', verifyToken, actionRequest);

module.exports = router