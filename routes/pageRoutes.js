const express = require('express');
const {getAllUsers, getUserWithPublic, getPortals, getUser, mySetRepository} = require('../controller/pageController')
const {verifyToken} = require('../middleware/authMiddleware');

const Portal = require('../model/Portal')

const router = express.Router();

router.get('/users', getAllUsers);
router.get('/users/publicObject=1', getUserWithPublic);
router.get('/portals', getPortals);
router.post("/profile/:id", getUser);
router.get("/sets", verifyToken, mySetRepository)

/*per testare le funzioni del portale
router.post('/create/portal', (req,res)=>{
    try{
        const portal = Portal.create({
            name: "Poliba",
            admins: "68ac44824e06e5b341165eed",
            "features.PROFILE": true
        })

        res.status(201).json({ok: true, portal})
    }catch(err){
        console.error(err.message)
        res.status(500).json({error: "Internal Server Error"})
    }
})*/

module.exports = router