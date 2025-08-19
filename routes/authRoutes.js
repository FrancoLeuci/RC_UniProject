const express = require('express');
const {register, accountVerify, login} = require('../controller/userController')

const router = express.Router();

router.post('/register', register)
router.put('/verification/:id', accountVerify)
router.post('/login', login)

module.exports = router;