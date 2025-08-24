const BasicUser = require('../model/BasicUser');
const FullUser = require('../model/FullUser');
const Portal = require('../model/Portal')

async function getAllUsers(req, res){
    try{
        const users = await BasicUser.find({})

        res.json(users)
    }catch(err){
        console.error(err.message)
        res.status(500).send('Internal Error Server')
    }
}

async function getUserWithPublic(req, res){
    try{
        const users = await FullUser.find({hasPublicObjects: true})

        res.json(users)
    }catch(err){
        console.error(err.message)
        res.status(500).send('Internal Error Server')
    }
}

async function getPortals(req, res){
    try{
        const portals = await Portal.find({})

        res.json(portals)
    }catch(err){
        console.error(err.message)
        res.status(500).send('Internal Error Server')
    }
}

module.exports = {getAllUsers, getUserWithPublic, getPortals}