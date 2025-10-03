const User = require('../model/User');
const Portal = require('../model/Portal')

const {HttpError} = require("../middleware/errorMiddleware");

//lista utenti che segui
//lista portali che segui
//add follow

//passa da verifyToken
async function getFollowedUsers(req,res,next){
    const userId=req.user.id;
    const page=req.params.page;
    try{
        const userAccount= await User.findById(userId).populate({
            path:"followedReasearchers",
            options:{
                skip:(page-1)*7,
                limit:7
            }
        });
        res.status(200).json({ok:true,userAccount})
    }catch(err){
        next(err)
        //console.log("Error during user fetch in DB.")
        //res.status(500).json({error: "Internal Server Error - followController - getFollowedUsers."});
    }
}

async function getFollowedPortals(req,res,next){
    const userId=req.user.id;
    const page=req.params.page
    try{
        const userAccount= await User.findByI(userId).select("followedPortals");
        //trova tutti i portali che hanno un id uguale a uno degli id in userAccount.followedPortals
        const portals=await Portal.find({_id:{$in:userAccount.followedPortals}}).skip((page-1)*7).limit(7)
        
        res.status(200).json({ok:true,portals})
    }catch(err){
        next(err)
        //console.log("Error during user fetch in DB.")
        //res.status(500).json({error: "Internal Server Error - followController - getFollowedPortals."});
    }
}

// valida sia per i portali che per gli utenti
async function addFollowed(req, res, next){

    const userId = req.user.id
    const addId = req.params.id;
    try{
        const user = await User.findById(userId)

        let follow = await User.findById(addId)
        if(!follow){
            follow = await Portal.findById(addId)
            if(!follow){
                throw new HttpError("Portal/User not found",404)
            }

            //controllo che il portale non venga già seguito dall'utente che fa la richiesta
            if(user.followedPortals.includes(follow._id)){
                throw new HttpError(`You already follow the portal: ${follow.name}`,409)
            }

            //aggiungo l'id del portale in followedPortals del User
            console.log(user.followedPortals)
            user.followedPortals.push(follow._id)
            await user.save()
            console.log(user.followedPortals)
            return res.status(200).json({ok:true, message:"Portal followed successfully"})
        }

        //controllo che l'utente non venga già seguito dall'utente che fa la richiesta
        if(user.followedResearchers.includes(follow._id)){
            throw new HttpError(`You already follow the user: ${follow.realName}`,409)
        }
        console.log(user.followedResearchers)
        //aggiungo l'id dell'utente in followedPortals del User
        user.followedResearchers.push(follow._id)
        await user.save()
        console.log(user.followedResearchers)
        return res.status(200).json({ok:true, message:"Researcher followed successfully"})
    }catch(err){
        next(err)
    }
}

module.exports = {getFollowedUsers, getFollowedPortals, addFollowed}