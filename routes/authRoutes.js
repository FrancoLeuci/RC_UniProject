const express = require('express');
const {register, accountVerify, login, logout, resetPasswordRequest, resetPassword} = require('../controller/userController')
const {getProfile, editProfile, editPassword} = require('../controller/profileController')
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

module.exports = router;