const express = require('express');
const {getAllUser, getUserWithPublic, getPortals} = require('../controller/pageController')

const router = express.Router();

router.get('/users', getAllUser);
router.get('/users/publicObject=1', getUserWithPublic);
router.get('/portals', getPortals);

module.exports = router