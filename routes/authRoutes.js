const express = require('express');
const {register, accountVerify, login, logout, resetPasswordRequest, resetPassword, requestToBecomePortalMember,
    requestToBecomeGroupMember, findUserByName, deleteSelfRequest, fullAccountRequest, leavePortal, leaveGroup,
    requestToCreatePortal,requestToCreateGroup} = require('../controller/userController')
const {getProfile, editProfile, editPassword, getAllUsers, getUserView, getUserWithPublic, getGroups} = require('../controller/profileController')
const {verifyToken} = require('../middleware/authMiddleware')

const router = express.Router();

router.post('/register', register)
router.put('/verification/:id', accountVerify)
router.post('/login', login)
router.post('/logout', logout)

router.put('/upgrade',verifyToken, fullAccountRequest)
router.put('/leavePortal/:portal', verifyToken, leavePortal)
router.put('/leaveGroup/:groupId', verifyToken, leaveGroup)
router.put('/delete', verifyToken, deleteSelfRequest)

router.put('/reset', resetPasswordRequest)
router.put('/reset/:key', resetPassword)

router.get('/profile', verifyToken, getProfile)
router.put('/edit', verifyToken, editProfile)
router.put('/editPassword', verifyToken, editPassword)

router.put('/portalRequest/:portalId', verifyToken, requestToBecomePortalMember)
router.put('/portalRequest/create', verifyToken, requestToCreatePortal)

router.get('/groups', verifyToken, getGroups)
router.put('/groupRequest/:grId', verifyToken, requestToBecomeGroupMember)
router.put('/groupRequest/create/:portal', verifyToken, requestToCreatePortal)

// presi da pageRoutes
router.get('/users', getAllUsers);
router.get("/profile/:id", getUserView);
router.get('/users/publicObject=1', getUserWithPublic);
router.get('/users/search', findUserByName)

module.exports = router;