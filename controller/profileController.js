// controller che presente le funzionalità di gestione del profilo da parte di un utente
const BasicUser = require('../model/BasicUser');
const Set = require("../model/Set");
const FullUser = require("../model/FullUser");
const Request = require("../model/Request");
const Portal = require("../model/Portal");
const Group = require("../model/Group");

const {HttpError} = require("../middleware/errorMiddleware");

async function getProfile(req, res, next) {
    const userId = req.user.id;

    try{
        const user = await BasicUser.findById(userId)

        res.status(200).json({ok: true, data: user});
    }catch(err){
        next(err);
        //console.log(err);
        //return res.status(500).json({error: 'Internal server error'});
    }
}

async function editProfile(req, res, next){
    const body = req.body;
    const userId = req.user.id //ottenuto da verifyToken

    try{
        const user = await BasicUser.findById(userId)

        //email
        if(body.email){
            user.email = body.email;
        }

        //anno di nascita
        user.yearOfBirth = body.yearOfBirth;

        //nazione di residenza
        user.countryResidence = body.countryResidence;

        //nazione di cui si ha la cittadinanza
        user.countryCitizenship = body.countryCitizenship;

        //tagline
        user.tagLine = body.tagLine;

        //description
        if(body.description){
            user.description=body.description;
        }

        if(body.hide){
            user.hide = body.hide
        }

        await user.save()
        res.status(200).json({ok: true, message: 'Profile update'})

    }catch(err){
        next(err);
        //console.error(err.message);
        //res.status(500).json({error: "Internal Server Error"})
    }
}

async function editSettings(req,res,next){
    //settings è un oggetto che contiene language, theme,announcements, digest, collabNotification,messageNotification e uploadNotification
    const {settings} = req.body;
    const userId = req.user.id //ottenuto da verifyToken

    try{
        const user = await BasicUser.findById(userId)
        if(settings.language!==this.language){
            user.settings.language=settings.language;
        }
        if(settings.theme!==this.theme){
            user.settings.theme=settings.theme;
        }

        user.settings.announcement=settings.announcement
        user.settings.digest=settings.digest
        user.settings.uploadNotification=setting.uploadNotification
        user.settings.messageNotification=setting.messageNotification
        user.settings.collabNotification=settings.collabNotification

        await user.save()
        res.status(200).send("Settings updated.");


    }catch(err){
        next(err)
        //console.error(err.message);
        //res.status(500).json({error: "Internal Server Error"})
    }

}


async function editPassword(req, res, next){
    const {newPass, conNewPass} = req.body;
    const userId = req.user.id;

    try{
        const user = await BasicUser.findById(userId);

        if(!newPass){
            throw new HttpError("Password is required",400)
            //return res.status(400).json({message: 'Missing new password.'})
        }
        if(!conNewPass){
            throw new HttpError("Confirm Password is required",400)
            //return res.status(400).json({message: 'Missing confirm password.'})
        }

        if(newPass!==conNewPass){
            throw new HttpError("Confirm Password doesn't match.",400)
            //return res.status(400).json({error: "Confirm password doesn't match."})
        }

        user.password = newPass;

        await user.save()

        res.status(200).json({ok: true, message: 'Password changed successfully.'})
    } catch(err){
        next(err)
        //console.error(err.message);
        //res.status(500).json({error: "Internal Server Error. "})
    }
}

async function getAllUsers(req, res, next){
    try{
        const users = await BasicUser.find({verified: true})

        res.status(200).json({ok: true, users})
    }catch(err){
        next(err)
        //console.error(err.message)
        //res.status(500).json({error: 'Internal Error Server'})
    }
}

async function getUserView(req, res, next){
    //nella richiesta ci deve essere lo userId di chi fa la richiesta
    //cioè di chi vuole vedere l'account dell'utente con id=profileId
    const {userId} = req.body
    const profileId = req.params.id

    try{
        const userInfo = await BasicUser.findById(profileId)
        if(!userInfo){
            throw new HttpError("User not found",404)
        }
        if(userInfo.hide) throw new HttpError("You are Not Authorized",401)

        const userSets = await Set.find({creator: userInfo._id})

        let viewSets = await Promise.all(userSets.map(async set => {
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

        viewSets = viewSets.filter(set => set!==null)
        res.status(200).json({ok: true, userInfo, viewSets})
    }catch(err){
        next(err)
        //res.status(500).json({error: err, message: 'Internal Error Server'})
    }
}

async function getUserWithPublic(req, res, next){
    try{
        const fullUsers = await FullUser.find({hasPublicObjects: true})
        let basicUsers = await Promise.all(
            fullUsers.map(async user => {
                await BasicUser.findById(user.basicCorrespondent)
            })
        )

        res.json({ok: true, basicUsers})
    }catch(err){
        next(err)
        //console.error(err.message)
        //res.status(500).json({error: 'Internal Error Server'})
    }
}

//sono i gruppi a cui appartiene l'utente
async function getGroups(req, res, next){
    const userId = req.user.id
    try{
        const fullAccount = await FullUser.findOne({basicCorrespondent: userId})
        if(!fullAccount){
            throw new HttpError("User is not a full account",409)
        }

        const groups = await Promise.all(fullAccount.groups.map(async group => await Group.findById(group)))

        res.status(200).json({ok: true, data: groups})
    }catch(err){
        next(err)
    }
}

module.exports = {getProfile, editProfile, editPassword, getAllUsers, getUserView, getUserWithPublic, getGroups};