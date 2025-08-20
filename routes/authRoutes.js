const express = require('express');
const {register, accountVerify, login, resetPasswordRequest, resetPassword} = require('../controller/userController')
const {editProfile, editPassword} = require('../controller/profileController')

const router = express.Router();

router.post('/register', register)
router.put('/verification/:id', accountVerify)
router.post('/login', login)
router.put('/reset', resetPasswordRequest)
router.put('/reset/:key', resetPassword)
router.put('/edit', editProfile)
router.put('/editPassword', editPassword)

module.exports = router;