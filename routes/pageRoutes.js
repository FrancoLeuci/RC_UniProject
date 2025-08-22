const express = require('express');
const {getAllUser, getUserWithPublic, getPortals} = require('../controller/pageController')

const router = express.Router();

app.get('/users', getAllUser);
app.get('/users/publicObject=1', getUserWithPublic);
app.get('/portals', getPortals);

module.exports = router