const express = require('express');

const {groupEdit, addAdmin, addMember, getGroup, removeMember} = require('../controller/groupController');

const {verifyToken} = require('../middleware/authMiddleware');

const router = express.Router()

router.get('/:grId', getGroup)
router.post('/:grId/edit', verifyToken, groupEdit)
router.post('/:grId/addAdmin/:id', verifyToken, addAdmin)
router.post('/:grId/addMember/:id', verifyToken, addMember)
router.delete('/:grId/removeMember/:id', verifyToken, removeMember)

module.exports = router