const BasicUser = require('../model/BasicUser');
const FullUser = require('../model/FullUser');
const Portal = require('../model/Portal')

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

module.exports = {getAllUsers, getUserWithPublic, getPortals}