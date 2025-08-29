const express = require('express')

const {createSet, modifySet, addFiles, removeFiles,deleteSet,getSet} = require("../controller/setController")
const {verifyToken} = require("../middleware/authMiddleware")

const router = express.Router()

router.post("/create", verifyToken, createSet)
router.put("/edit/:setId", verifyToken, modifySet)
router.put("/:setId/add/:mediaId",verifyToken,addFiles)
router.delete("/:setId/remove/:mediaId",verifyToken,removeFiles)
router.delete("/:setId/deleteset",verifyToken,deleteSet)
router.get("/:setId", verifyToken, getSet)

module.exports = router