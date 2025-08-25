const BasicUser = require('../model/BasicUser');
const FullUser = require('../model/FullUser');
const Portal = require('../model/Portal')

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