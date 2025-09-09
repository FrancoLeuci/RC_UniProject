const BasicUser = require('../model/BasicUser');
const Portal = require('../model/Portal')

const {HttpError} = require("../middleware/errorMiddleware");

//lista utenti che segui
//lista portali che segui
//add follow

//passa da verifyToken
async function getFollowedUsers(req,res,next){
    const userId=req.user.id;

    try{
        const userAccount= await BasicUser.findById(userId);

        const userMap=await Promise.all(userAccount.followedResearchers.map(async (researcher,i)=> {
            const foundUser=await BasicUser.findById(researcher.followedUserId)
            if(!foundUser){
                //potrebbe essere tolto
                //rimuovo dalla lista di utenti che segue l'utente, il ricercatore che non ha più un profilo nel sito
                userAccount.followedResearchers.splice(i,1);
                //save
                await userAccount.save();
                return({
                    user:0,
                    flags:[]
                })
            }else{
                return ({
                    user:foundUser,
                    flags:researcher.options
                })
            }
        }
        ))
        const validFollowedUserMap=userMap.filter(followedUser=>followedUser.user!==0)

        res.status(200).json({ok:true,validFollowedUserMap})
    }catch(err){
        next(err)
        //console.log("Error during user fetch in DB.")
        //res.status(500).json({error: "Internal Server Error - followController - getFollowedUsers."});
    }
}

async function getFollowedPortals(req,res,next){
    const userId=req.user.id;

    try{
        const userAccount= await BasicUser.findById(userId);

        const portalMap=await Promise.all(userAccount.followedPortals.map(async (portal,i)=> {
            const foundPortal=await Portal.findById(portal.followedPortalId)
            if(!foundPortal){
                //rimuovo dalla lista di utenti che segue l'utente, il ricercatore che non ha più un profilo nel sito
                userAccount.followedPortals.splice(i,1);
                //save
                await userAccount.save();
                return({
                    //orcodiooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo
                    portal:0,
                    flags:[]
                })
            }else{
                return ({
                    portal:foundPortal,
                    flags:portal.options
                })
            }
        }
        ))

        const validFollowedPortalMap=portalMap.filter(followedPortal=>followedPortal.portal!==0)

        res.status(200).json({ok:true,validFollowedPortalMap})
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
        const user = await BasicUser.findById(userId)

        let follow = await BasicUser.findById(addId)
        if(!follow){
            follow = await Portal.findById(addId)
            if(!follow){
                throw new HttpError("Portal/User not found",404)
            }

            //controllo che il portale non venga già seguito dall'utente che fa la richiesta
            if(user.followedPortals.includes(follow._id)){
                throw new HttpError(`You already follow the portal: ${follow.name}`,409)
            }

            //aggiungo l'id del portale in followedPortals del BasicUser
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
        //aggiungo l'id dell'utente in followedPortals del BasicUser
        user.followedResearchers.push(follow._id)
        await user.save()
        console.log(user.followedResearchers)
        return res.status(200).json({ok:true, message:"Researcher followed successfully"})
    }catch(err){
        next(err)
    }
}

module.exports = {getFollowedUsers, getFollowedPortals, addFollowed}