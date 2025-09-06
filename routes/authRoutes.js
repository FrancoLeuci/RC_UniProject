const express = require('express');
const {register, accountVerify, login, logout, resetPasswordRequest, resetPassword, requestToBecomePortalMember} = require('../controller/userController')
const {getProfile, editProfile, editPassword, getAllUsers, getUserView, getUserWithPublic} = require('../controller/profileController')
const {verifyToken} = require('../middleware/authMiddleware')

const router = express.Router();

router.post('/register', register)
router.put('/verification/:id', accountVerify)
router.post('/login', login)
router.post('/logout', logout)

router.put('/reset', resetPasswordRequest)
router.put('/reset/:key', resetPassword)

router.get('/profile', verifyToken, getProfile)
router.put('/edit', verifyToken, editProfile)
router.put('/editPassword', verifyToken, editPassword)

router.put('/portalRequest/:portalId', verifyToken, requestToBecomePortalMember)

// presi da pageRoutes
router.get('/users', getAllUsers);
router.post("/profile/:id", getUserView);
router.get('/users/publicObject=1', getUserWithPublic);

module.exports = router;