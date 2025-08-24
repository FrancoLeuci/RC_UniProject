const express = require('express');
const {getAllUsers, getUserWithPublic, getPortals} = require('../controller/pageController')

const router = express.Router();

router.get('/users', getAllUsers);
router.get('/users/publicObject=1', getUserWithPublic);
router.get('/portals', getPortals);

module.exports = router