const FullUser = require("../model/FullUser");
const BasicUser = require('../model/BasicUser');
const Exposition=require("../model/Exposition");
const Request = require("../model/Request");
const Portal = require("../model/Portal");
const Notification = require("../model/Notification");

const {HttpError} = require("../middleware/errorMiddleware")

async function createExposition(req,res,next){
    const userId = req.user.id;
    //servono nella richiesta nel body (minimo indisp)
    const {title,abstract,copyright,licence}=req.body;
    
    try{
        const isFull = await FullUser.findOne({basicCorrespondent: userId});
        if(!isFull){
            throw new HttpError("You are not a Full User, so you can't create an Exposition.",403)
        }

        if(!title||!abstract||!copyright||!licence) throw new HttpError("All data specified are required.",400)

        const newExpo=await Exposition.create({
            title,
            abstract,
            copyright,
            licence,
            authors:{
                role:"creator",
                userId: isFull._id
            }
        })

        isFull.expositions.push(newExpo._id)
        await isFull.save()

        res.status(201).send("Exposition created successfully.")
    }catch(err){
        next(err)
    }
}

async function setExpoPublic(req,res,next){
    const expo=req.expo
    const fullAccount=req.full

    try{
        const creator=expo.authors.find(a=>a.role==="creator")

        if(!creator.userId.equals(fullAccount._id)){
            throw new HttpError('You are not the creator',401)
        }

        if(expo.portal){
            const existingRequest = await Request.findOne({
                sender: fullAccount._id,
                receiver: expo.portal,
                type: "portal.requestToLinkExposition",
                extra: expo._id
            })

            if(existingRequest) throw new HttpError('Request already made to the portal',409)

            if(!expo.reviewer.flag){
                await Request.create({
                    sender: fullAccount._id,
                    receiver: expo.portal,
                    type: "portal.requestToLinkExposition",
                    content: `${creator.realName} want to publish the exposition ${expo.title}.`,
                    extra: expo._id
                })
            }else{
                throw new HttpError('Exposition already in reviewing phase. ',401)
            }

            expo.status="reviewing"
            await expo.save()

            return res.status(200).json({ok: true, message:'Request sent successfully.'})
        }
        expo.published=true;
        await expo.save()

        res.status(200).json({ok: true, message:'Exposition publishing successfully.'})
    }catch(err){
        next(err)
    }
}


async function editExpoMetadata(req,res,next){
    const user=req.full;
    const expo=req.expo;
    const {title,shareStatus,abstract,licence,copyright} = req.body
    try{
        if(expo.published){throw new HttpError("Cannot modify this exposition's metadata since it has been published already.",403)}
        if(expo.shareStatus==="reviewing"){throw new HttpError("Cannot modify this exposition's metadata since it is in status of reviewing.",403)}

        const isAuthor=expo.authors.find(a=>a.userId.equals(user._id))

        if(!isAuthor){
            throw new HttpError("You can't edit this exposition's metadata.",403)
        }
        if(title){
            expo.title=title
        }


        if(abstract){
            expo.abstract=abstract;
        }

        expo.shareStatus=shareStatus;
        expo.licence=licence;
        expo.copyright=copyright;

        await expo.save();
        res.status(201).send("Exposition edited correctly.")
    }catch(err){
        next(err)

    }
}

//solo il creatore dell'esposizione può fare richiesta ad altri utenti di partecipare
async function addAuthor(req,res,next){
    const user = req.full;
    const expo = req.expo;
    //id di un full
    const authorToAddId = req.params.id
    try{
        if(expo.published||expo.shareStatus==="reviewing")throw new HttpError('Exposition already published or undergoing review process, can\'t remove an Author.',400)

        const isCreator = expo.authors.find(a=>a.role==="creator")
        if(!isCreator.userId.equals(user._id)){
            console.log("errore in addAuthor - isCreator? ")
            throw new HttpError('You are not the creator of the exposition.',401)
        }

        const authorToAdd = await FullUser.findById(authorToAddId)

        if(!authorToAdd) throw new HttpError ('User that you want to add does not have a full account',400)

        if(expo.authors.find(a=>String(a.userId)===authorToAddId)){
            throw new HttpError("User already is an Author in this exposition.",409)
        }

        const requestExists = await Request.findOne({
            sender: user.basicCorrespondent,
            receiver: authorToAdd.basicCorrespondent,
            type: "collaboration.addUser",
            extra: expo._id
        })

        if(requestExists) throw new HttpError('You already made the request',409)

        const expoCreator = await BasicUser.findById(user.basicCorrespondent)
        //author To Add Id è del full. Mi serve il basicCorrespondent
        const authorToAddBasic = await BasicUser.findById(authorToAdd.basicCorrespondent)

        await Request.create({
            sender: user.basicCorrespondent,
            receiver: authorToAdd.basicCorrespondent,
            type: "collaboration.addUser",
            content: `${expoCreator.realName} invited ${authorToAddBasic.realName} to be an Author.`,
            extra: expo._id
        })

        res.status(200).send('Request sent successfully.')
    }catch(err){
        next(err)
    }
}

//pensato solo per il creatore dell'esposizione
async function removeAuthor(req,res,next){
    const user = req.full;
    const expo = req.expo;
    //authorToRemoveId è un fulluser id
    const authorToRemoveId = req.params.id
    try{
        if(expo.published||expo.shareStatus==="reviewing")throw new HttpError('Exposition already published or undergoing review process, can\'t remove an Author.',400)

        const authorToRemoveFull=await FullUser.findById(authorToRemoveId)
        if(!authorToRemoveFull) throw new HttpError ('User that you want to remove does not have a full account. ',400) //consistenza

        const isCreator = expo.authors.find(a=>a.role==="creator")
        //salvini
        if(!isCreator.userId.equals(user._id)){
            console.log("errore in addAuthor - isCreator? ")
            throw new HttpError('You are not the creator of the exposition ',401)
        }

        if(!expo.authors.find(a=> a.userId.equals(authorToRemoveFull._id))){
            throw new HttpError("User is not an Author in this exposition.",404)
        }


        expo.authors=expo.authors.filter(a=>!a.userId.equals(authorToRemoveFull._id))
        await expo.save();

        authorToRemoveFull.expositions=authorToRemoveFull.expositions.filter(e=>e!==expo);
        await authorToRemoveFull.save()


        //fase di creazione della notifica
        const expoCreator = await BasicUser.findById(user.basicCorrespondent)

        //notifica che avvisa l'autore rimosso
        //e c'hai ragione XD
        const notification = await Notification.findOne({receiver: authorToRemoveId})
        if(notification){
            notification.backlog.push(`You were removed by ${expoCreator.realName} from the exposition`)
            await notification.save() //sta qui
        } else {
            await Notification.create({
                receiver: authorToRemoveId,
                backlog: `You were removed by ${expoCreator.realName} from the exposition`
            })
        }

        res.status(200).send("Author removed from the exposition. Notification sent.")
    }catch(err){
        next(err)
    }
}

//una expo può essere connessa anche se non è ancora stata pubblicata
async function connectToPortal(req,res,next){

    const user = req.full;
    const expo = req.expo;
    const portalId = req.params.portal
    try{
        const isCreator = expo.authors.find(a=>a.role==="creator")
        if(!isCreator.userId.equals(user._id)){
            console.log("errore in addAuthor - isCreator? ")
            throw new HttpError('You are not the creator of the exposition.',401)
        }
        if(expo.portal){
            throw new HttpError("Expo is already connected to a Portal.",409)
        }

        const portal = await Portal.findById(portalId)
        if(!portal) throw new HttpError('Portal not found',404)

        const isMember=portal.members.includes(user.basicCorrespondent)
        const isAdmin=portal.admins.includes(user.basicCorrespondent)

        if(!(isMember||isAdmin)){
            throw new HttpError("User is not a member/admin of the portal. You can't forward the request.",403)
        }


        const requestExists = await Request.findOne({
            sender: user.basicCorrespondent,
            receiver: portalId,
            type: "collaboration.requestToPortal",
            extra: expo._id
        })

        if(requestExists) throw new HttpError('You already made the request.',409)

        const expoCreator = await BasicUser.findById(user.basicCorrespondent)

        await Request.create({
            sender: user.basicCorrespondent,
            receiver: portalId,
            type: "collaboration.requestToPortal",
            content: `${expoCreator.realName} wants to connect his exposition to ${portal.name}.`,
            extra: expo._id
        })

        res.status(200).send('Request sent successfully.')
    }catch(err){
        next(err)
    }
}


async function editExposition(req,res,next){
    const {HTMLString}=req.body;
    const user=req.full
    const expo=req.expo
    try{
        if(expo.published||expo.shareStatus==="reviewing")throw new HttpError("Can't edit the exposition when it has been published or it's undergoing a review.",403)

        if(!expo.authors.find(a=>a.userId.equals(user._id))){
            throw new HttpError("Can't save the changes unless you are an author. No changes saved.",403)
        }
        if(!HTMLString){
            throw new HttpError("Html string received was null. No changes saved.",400)
        }
        expo.HTMLString=HTMLString  
        await expo.save();
        res.status(201).send("Exposition was successfully edited and saved.")
    }catch(err){
        next(err)
    }
}
module.exports = {createExposition,setExpoPublic,editExpoMetadata,addAuthor,removeAuthor,connectToPortal,editExposition}