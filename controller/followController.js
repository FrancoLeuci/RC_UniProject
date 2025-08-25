const BasicUser = require('../model/BasicUser');
const Portal = require('../model/Portal')

//lista utenti che segui
//lista portali che segui
//visualizzazione in base alle 4 flag
//edit campi delle flag
//add follow


//passa da verifyToken
async function getFollowedUsers(req,res){
    const userId=req.user.id;

    try{
        const userAccount= await BasicUser.findById(userId);
        if(!userAccount){
            res.status(404).send("User Not Found.")
        }

        const userMap=await Promise.all(followedResearchers.map(async (researcher,i)=> {
                const foundUser=await BasicUser.findById(researcher.followedUserId)
                if(!foundUser){
                    //rimuovo dalla lista di utenti che segue l'utente, il ricercatore che non ha più un profilo nel sito
                    userAccount.followedReaserchers.splice(i,1);
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
        console.log("Error during user fetch in DB.")
        res.status(500).send("Internal Server Error - followController - getFollowedUsers.");
    }

}

async function getFollowedPortals(req,res){
    const userId=req.user.id;

    try{
        const userAccount= await BasicUser.findById(userId);
        if(!userAccount){
            res.status(404).send("User Not Found.")
        }

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
        console.log("Error during user fetch in DB.")
        res.status(500).send("Internal Server Error - followController - getFollowedPortals.");
    }
}



module.exports = {getFollowedUsers, getFollowedPortals}