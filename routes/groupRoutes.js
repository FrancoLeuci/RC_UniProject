const express = require('express');

const {groupEdit, addAdmin, addMember, getGroup, removeMember} = require('../controller/groupController');

const {verifyToken} = require('../middleware/authMiddleware');
const {groupAdminCheck} = require('../middleware/g_adminMiddleware');

const router = express.Router()

router.get('/:grId', verifyToken, getGroup)
router.post('/:grId/edit', verifyToken, groupAdminCheck, groupEdit)
router.post('/:grId/addAdmin/:id', verifyToken, groupAdminCheck, addAdmin)
router.post('/:grId/addMember/:id', verifyToken, groupAdminCheck, addMember)
router.delete('/:grId/removeMember/:id', verifyToken, groupAdminCheck, removeMember)

module.exports = router