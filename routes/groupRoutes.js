const express = require('express');

const {groupEdit, addAdmin, addMember, getPortal} = require('../controller/groupController');

const {verifyToken} = require('../middleware/authMiddleware');

const router = express.Router()

router.get('/:grId', getPortal)
router.post('/:grId/edit', verifyToken, groupEdit)
router.post('/:grId/addAdmin/:id', verifyToken, addAdmin)
router.post('/:grId/addMember/:id', verifyToken, addMember)

module.exports = router