const express = require('express');

const {groupEdit, addAdmin, addMember, getGroup, removeMember, groupAdminGroupDelete} = require('../controller/groupController');

const {verifyToken} = require('../middleware/authMiddleware');
const {groupAdminCheck} = require('../middleware/g_adminMiddleware');

const router = express.Router()

router.get('/:grId', verifyToken, getGroup)
router.post('/:grId/edit', verifyToken, groupAdminCheck, groupEdit)
router.post('/:grId/addAdmin/:id', verifyToken, groupAdminCheck, addAdmin)
router.post('/:grId/addMember/:id', verifyToken, groupAdminCheck, addMember)
router.put('/:grId/removeMember/:id', verifyToken, groupAdminCheck, removeMember)
router.delete('/:grId/delete',verifyToken,groupAdminCheck,groupAdminGroupDelete)

module.exports = router