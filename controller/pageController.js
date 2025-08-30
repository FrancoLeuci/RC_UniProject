const BasicUser = require('../model/BasicUser');
const FullUser = require('../model/FullUser');
const Portal = require('../model/Portal')
const Set = require("../model/Set")

//TODO: creare get del profilo dove sono visibili solo i set che l'utente ha creato e la cui visibilità è public o website

async function getAllUsers(req, res){
    try{
        const users = await BasicUser.find({verified: true})

        /* per testare getUserWithPublic
        const test = await Promise.all(
            users.map(user => {
                return FullUser.create({
                    basicCorrespondent: user._id,
                    hasPublicObjects: true
                })
            })
        )*/

        /*per testare followController
        const user = await BasicUser.findById("68ac44824e06e5b341165eed")
        console.log(user)
        console.log(user.followedResearchers)
        user.followedResearchers.push({
            followedUserId: "68ac8991b68737160f81d781"
        })
        user.followedResearchers.push({
            followedUserId: "68aca2114fcbb44f6ee7f011"
        })
        await user.save()*/

        res.status(200).json({ok: true, users})
    }catch(err){
        console.error(err.message)
        res.status(500).json({error: 'Internal Error Server'})
    }
}

async function getUserWithPublic(req, res){
    try{
        const fullUsers = await FullUser.find({hasPublicObjects: true})
        const basicUsers = await Promise.all(
            fullUsers.map(user => BasicUser.findById(user.basicCorrespondent))
        )

        res.json({ok: true, fullUsers, basicUsers})
    }catch(err){
        console.error(err.message)
        res.status(500).json({error: 'Internal Error Server'})
    }
}

async function getPortals(req, res){
    try{
        const portals = await Portal.find({"features.PROFILE": true})

        res.status(200).json({ok: true, portals})
    }catch(err){
        console.error(err.message)
        res.status(500).json({error: 'Internal Error Server'})
    }
}

async function getUser(req, res){
    //nella richiesta ci deve essere lo userId di chi fa la richiesta
    //cioè di chi vuole vedere l'account dell'utente con id=profileId
    const {userId} = req.body
    const profileId = req.params.id

    try{
        const userInfo = await BasicUser.findById(profileId)

        const userSets = await Set.find({creator: userInfo._id})

        let viewSets = await Promise.all(userSets.map(async set => {
            console.log(set.visibility)
            if (set.visibility === "public") {
                return set
            } else if (set.visibility === "website" && userId) {
                const viewer = await BasicUser.findById(userId)
                if (viewer) {
                    return set
                } else {
                    return null
                }
            } else {
                return null
            }
        }))

        console.log(viewSets)

        viewSets = viewSets.filter(set => set!==null)
        //gg

        /*
        if(userInfo.approved){
            const userExp = await FullUser.find({basicCorrespondent: userInfo._id})
            return res.status(200).json({ok: true, userInfo, userExp, viewSets})
        }*/

        res.status(200).json({ok: true, userInfo, viewSets})

    }catch(err){
        res.status(500).json({error: err, message: 'Internal Error Server'})
    }
}

async function mySetRepository(req,res){
    const userId = req.user.id
    try{

        let mySets = await Set.find({})
        let setsSharedWithMe = []

        console.log(mySets)

        mySets=mySets.map(set => {
            console.log(set)
            if(String(set.creator) === userId){
                return set._id
            } else if(set.otherUsersPermissions.some(obj=>String(obj.user)===userId)){
                setsSharedWithMe.push(set._id)
                return null
            }
        })
        mySets=mySets.filter(set=>set!==null);

        res.status(200).json({ok: true, mySets, setsSharedWithMe})
    }catch(err){
        console.log(err.message)

    }
}

module.exports = {getAllUsers, getUserWithPublic, getPortals, getUser, mySetRepository}