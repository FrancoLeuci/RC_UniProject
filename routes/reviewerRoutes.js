const express = require('express');

const {expoToReviewList, expoStatus} = require('../controller/reviewerController');
const {verifyToken} = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/list/:page', verifyToken, expoToReviewList)
router.put('/:expoId', verifyToken, expoStatus)

module.exports = router;