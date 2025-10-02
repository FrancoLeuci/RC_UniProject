const express = require('express');
const {register, accountVerify, login, logout, resetPasswordRequest, resetPassword, requestToBecomePortalMember, findUserByName, deleteSelfRequest, fullAccountRequest, leavePortal,
    requestToCreatePortal} = require('../controller/userController')
const {getMyProfile, editProfile, editPassword, getAllUsers, getUserView, getUserWithPublic, getProfile} = require('../controller/profileController')
const {verifyToken} = require('../middleware/authMiddleware')

const router = express.Router();

router.post('/register', register)
router.put('/verification/:id', accountVerify)
router.post('/login', login)
router.post('/logout', logout)

router.put('/upgrade',verifyToken, fullAccountRequest)
router.put('/leavePortal/:portal', verifyToken, leavePortal)
router.put('/delete', verifyToken, deleteSelfRequest)

router.put('/reset', resetPasswordRequest)
router.put('/reset/:key', resetPassword)

router.get('/profile', verifyToken, getMyProfile)
router.put('/edit', verifyToken, editProfile)
router.put('/editPassword', verifyToken, editPassword)
router.get('/profile/:id', getProfile)

router.put('/portalRequest/:portalId', verifyToken, requestToBecomePortalMember)
router.put('/create/portalRequest', verifyToken, requestToCreatePortal)

// presi da pageRoutes
router.get('/users', getAllUsers);
router.get("/profile/:id", getUserView);
router.get('/users/publicObject=1', getUserWithPublic);
router.get('/users/search', findUserByName)

module.exports = router;