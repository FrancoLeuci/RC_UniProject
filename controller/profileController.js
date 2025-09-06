// controller che presente le funzionalità di gestione del profilo da parte di un utente
const BasicUser = require('../model/BasicUser');
const Set = require("../model/Set");
const FullUser = require("../model/FullUser");
const Request = require("../model/Request");
const Portal = require("../model/Portal");

const {HttpError} = require("../middleware/errorMiddleware");

async function getProfile(req, res, next) {
    const userId = req.user.id;

    try{
        const user = await BasicUser.findById(userId)
        if(!user){
            throw new HttpError("User not found",404)
            //return res.status(404).json({error: 'User not found'});
        }

        res.json({ok: true, user});
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
        const user = await BasicUser.findById(userId);
        if(!user){
            throw new HttpError("User not found",404)
            //return res.status(404).json({error: 'User not found'});
        }

        //email
        if(!body.email){
            throw new HttpError("Email is required",400)
            //return res.status(404).json({message: "Missing email"})
        }
        if(body.email!==user.email){
            user.email = body.email;
        }


        //anno di nascita
        if(body.yearOfBirth!==user.yearOfBirth){
            user.yearOfBirth = body.yearOfBirth;
        }

        //nazione di residenza
        if(body.countryResidence!==user.countryResidence){
            user.countryResidence = body.countryResidence;
        }

        //nazione di cui si ha la cittadinanza
        if(body.countryCitizenship!==user.countryCitizenship){
            user.countryCitizenship = body.countryCitizenship;
        }

        //tagline
        if(body.tagLine!==user.tagLine){
            user.tagLine = body.tagLine;
        }

        //description
        if(body.description){
            for(const item of body.description){
                if(user.description.find(userItem=>userItem.lang===item.lang)){
                    user.description.find(userItem=>userItem.lang===item.lang).content = item.content;
                }else{
                    user.description.push(item)
                }
            }
        }

        await user.save()
        res.status(200).json({ok: true, message: 'Profile update'})

    }catch(err){
        next(err);
        //console.error(err.message);
        //res.status(500).json({error: "Internal Server Error"})
    }
}

//TODO: completare, vedere dove sono posizionati i campi per gli annunci, ecc...
async function editSettings(req, res){

}

async function editPassword(req, res, next){
    const {newPass, conNewPass} = req.body;
    const userId = req.user.id;

    try{
        const user = await BasicUser.findById(userId);
        if(!user){
            throw new HttpError("User not found",404)
        }

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

        res.status(200).json({ok: true, message: 'Password changed successfully. '})
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
        res.status(200).json({ok: true, userInfo, viewSets})

    }catch(err){
        next(err)
        //res.status(500).json({error: err, message: 'Internal Error Server'})
    }
}

async function getUserWithPublic(req, res, next){
    try{
        const fullUsers = await FullUser.find({hasPublicObjects: true})
        const basicUsers = await Promise.all(
            fullUsers.map(user => BasicUser.findById(user.basicCorrespondent))
        )

        res.json({ok: true, fullUsers, basicUsers})
    }catch(err){
        next(err)
        //console.error(err.message)
        //res.status(500).json({error: 'Internal Error Server'})
    }
}

module.exports = {getProfile, editProfile, editPassword, getAllUsers, getUserView, getUserWithPublic};