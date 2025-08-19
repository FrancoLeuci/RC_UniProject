const express = require('express');
const {register, test} = require('../controller/userController')

const router = express.Router();

router.post('/register', register)
router.put('/verification/:id', test)

module.exports = router;