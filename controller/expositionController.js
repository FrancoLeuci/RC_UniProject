const FullUser = require("../model/FullUser");
const BasicUser = require('../model/BasicUser');
const Exposition=require("../model/Exposition");
const Request = require("../model/Request");
const Portal = require("../model/Portal");
const Notification = require("../model/Notification");

const {HttpError} = require("../middleware/errorMiddleware")

//get Exposition

async function createExposition(req,res,next){
    const userId = req.user.id;
    //servono nella richiesta nel body (minimo indisp)
    const {title,abstract,copyright,licence}=req.body;
    
    try{
        const isFull = await FullUser.findOne({basicCorrespondent: userId});
        if(!isFull){
            throw new HttpError("You are not a Full User, you can't create an Exposition.",403)
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

        //Voglio tutti gli utenti di BasicUser che, nell'array followedResearchers,
        //abbiano l'id contenuto nella variabile creator._id
        const userToShowNotification=await BasicUser.find({followedResearchers:creator.userId})

        await Promise.all(userToShowNotification.map(async user => {
            const notification = await Notification.findOne({receiver: user._id})
            if(notification){
                notification.feed.push(`${creator.realName} has published the exposition ${expo.title}`)
                await notification.save() //sta qui
            } else {
                await Notification.create({
                    receiver: user._id,
                    feed: `${creator.realName} has published the exposition ${expo.title}`
                })
            }
        }))

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

        if(expo.shareStatus==='public'){
            const creator=expo.authors.find(a=>a.role==="creator")
            const creatorFullAccount=await FullUser.findById(creator.userId)
            const userToShowNotification=await BasicUser.find({followedResearchers:creatorFullAccount.basicCorrespondent})

            await Promise.all(userToShowNotification.map(async user => {
                const notification = await Notification.findOne({receiver: user._id})
                if(notification){
                    notification.feed.push(`${creatorFullAccount.alias} has created the exposition ${expo.title}`)
                    await notification.save()
                } else {
                    await Notification.create({
                        receiver: user._id,
                        feed: `${creatorFullAccount.alias} has created the exposition ${expo.title}`
                    })
                }
            }))
            
        }

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

        if(isAdmin) {
            expo.portal = portalId
            await expo.save()

            portal.linkedExpositions.push(expo._id)
            await portal.save()

            res.send('Exposition connected successfully to the portal')
        } else {
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
        }
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
//pensata come funzione che mostra le esposizioni pubbliche in una sorta di Home
async function getPublicExpositions(req,res,next){
    try{
        const expos=await Exposition.find({shareStatus:"public"})
        //nella response solo la lista, ziopera
        res.status(200).json({expos})
    }catch(err){
        next(err)
    }
}

//pensata invece per mostrare tutte le expo di un certo portale (pubbliche o pubbliche+portale)
async function getPortalExpositions(req,res,next){
    const userId=req.user.id
    const portalId=req.params.portal
    try{
        const portal=await Portal.findById(portalId).populate("linkedExpositions")
        if(!portal)throw new HttpError("Portal not found.",404)
        const userBasicAccount=await BasicUser.findById(userId)
        if(!userBasicAccount)throw new HttpError("User not found.",404)
        //controllo che utente che fa la richiesta sia admin o membro del portale

        let expositions = portal.linkedExpositions.filter(e=>e.shareStatus==="public")

        const isMember=portal.members.includes(userId)
        const isAdmin=portal.admins.includes(userId)
        if(!(isMember||isAdmin||userBasicAccount.role==="super-admin")){
            return res.status(200).json({expositions})
        }else{ //se è membro/admin/superadmin
            expositions = expositions.concat(portal.linkedExpositions.filter(e=>e.shareStatus==="portal"))
            //pubbliche+di portale
            return res.status(200).json({expositions})
        }
    }catch(err){
        next(err)
    }
}

async function getExposition(req,res,next){
    const {userId} = req.body
    const expoId = req.params.expoId
    try{
        //ho dovuto togliere il populate('portal'), perchè nei dati restituiva anche le informazioni del portale
        const expo = await Exposition.findById(expoId)//.populate('portal')
        if(!expo) throw new HttpError('Exposition not found',404)

        if(expo.shareStatus!=="public"){
            if(!userId) throw new HttpError('User Id required',400)
            const user = await BasicUser.findById(userId)
            if(!user) throw new HttpError('User not found',404)

            if(user.role==='super-admin') return res.status(200).json({expo})

            const userFull = await FullUser.findOne({basicCorrespondent: userId})
            const isAuthor = expo.authors.find(a => a.userId.equals(userFull._id))
            if(expo.shareStatus==="private"&&isAuthor){
                return res.status(200).json({expo})
            } else if(expo.shareStatus==="portal"){
                const portal = await Portal.findById(expo.portal)
                if(portal.admins.includes(userId)||portal.members.includes(userId)||isAuthor)
                return res.status(200).json({expo})
            } else if(expo.shareStatus==="reviewing"&&(expo.reviewer.user?.equals(user._id)||isAuthor)){
                return res.status(200).json({expo})
            }else{
                throw new HttpError("Not Authorized. ",403)
            }
        }
        res.status(200).json({expo})
    }catch(err){
        next(err)
    }
}

//funzione per lasciare la collaborazione
//passa per expoMiddleware, da req.full e req.expo
async function leaveCollaboration(req,res,next){
    const userFullAccount=req.full;
    const exposition=req.expo;
    try{
        const creator=exposition.authors.find(a=>a.role==="creator");
        if(creator.userId.equals(userFullAccount._id)){
            throw new HttpError("You are the creator, you can't leave the collaboration. If you wish you can delete your exposition. The collab will end if you do so.",400)
        }else if(exposition.authors.find(a=>a.userId.equals(userFullAccount._id))){
            //togliere co autore da lista autori
            exposition.authors.splice(exposition.authors.indexOf({role: 'co-author', userId: userFullAccount._id}),1)
            //togliere expo da lista expos dell'utente in questione
            userFullAccount.expositions.splice(userFullAccount.expositions.indexOf(exposition._id),1)
            await exposition.save()
            await userFullAccount.save()
        }else{
            throw new HttpError("User is not collaborating in this exposition. ",400)
        }
        //notifica al creatore dell'expo (e quindi della collab)

        const notification = await Notification.findOne({receiver: creator.userId})
        if(notification){
            notification.backlog.push(`${userFullAccount.alias} has left the collaboration for you exposition ${exposition.title}.`)
            await notification.save() //sta qui
        } else {
            await Notification.create({
                receiver: creator.userId,
                backlog: `${userFullAccount.alias} has left the collaboration for you exposition ${exposition.title}.`
            })
        }

        res.status(200).send(`You have left ${exposition.title} collaboration.`)

    }catch(err){
        next(err)
    }
}


//funzione per cancellare un'esposizione
//il creatore (full) decide di cancellare l'esposizione..
//rimuovere dagli autori l'esposizione
//rimuovere dal portale, dall'linkedExpositions
//dal gruppo?
//rimuovere l'expo


async function deleteExposition(req,res,next){
    const userFull=req.full;
    const expo=req.expo;
    try{
        const creator=expo.authors.find(a=>a.role==="creator");
        if(!creator.userId.equals(userFull._id)) throw new HttpError("You are not the creator, you can't delete this exposition.",403)
        userFull.expositions.splice(userFull.expositions.indexOf(expo._id),1)
        await userFull.save();
        await expo.populate([
            {path:"authors.userId"},
            {path:"portal"}
        ])
        await Promise.all(expo.authors.map(async a=>{
            if(a.role!=="creator"){
                a.userId.expositions.splice(a.userId.expositions.indexOf(expo._id),1)
                const notification = await Notification.findOne({receiver: a.userId.basicCorrespondent})
                if(notification){
                    notification.backlog.push(`${userFull.alias} has deleted the exposition ${expo.title}.`)
                    await notification.save() //sta qui
                } else {
                    await Notification.create({
                        receiver: a.userId.basicCorrespondent,
                        backlog: `${userFull.alias} has deleted the exposition ${expo.title}.`
                    })
                }
            }
            await a.userId.save()
        }))

        if(expo.portal){
            expo.portal.linkedExpositions.splice(expo.portal.linkedExpositions.indexOf(expo._id),1);
            await expo.portal.save();
            const notification = await Notification.findOne({receiver: expo.portal._id})
            if(notification){
                notification.backlog.push(`${userFull.alias} has deleted the exposition ${expo.title}.`)
                await notification.save() //sta qui
            } else {
                await Notification.create({
                    receiver: expo.portal._id,
                    backlog: `${userFull.alias} has deleted the exposition ${expo.title}.`
                })
            }
        }

        await Exposition.findByIdAndDelete(expo._id)

        res.status(200).send('Exposition delete successfully')
    }catch(err){
        next(err)
    }
}

async function removeFromPortal(req, res, next){
    const expo = req.expo
    const userFull = req.full
    try{
        const isCreator = expo.authors.find(a => a.role==='creator')
        if(!isCreator.userId.equals(userFull._id)) throw new HttpError('You aren\'t the creator',401)

        await expo.populate("portal")
        if(expo.portal){
            expo.portal.linkedExpositions.splice(expo.portal.linkedExpositions.indexOf(expo._id),1)
            await expo.portal.save()

            const notification = await Notification.findOne({receiver: expo.portal._id})
            if(notification){
                notification.backlog.push(`${userFull.alias} has removed the exposition ${expo.title} from the portal.`)
                await notification.save() //sta qui
            } else {
                await Notification.create({
                    receiver: expo.portal._id,
                    backlog: `${userFull.alias} has removed the exposition ${expo.title} from the portal.`
                })
            }

            expo.portal = null
            if(expo.shareStatus==='reviewing'){
                expo.shareStatus='private'
                expo.reviewer={flag:false, user:null}

                const notification = await Notification.findOne({receiver: expo.reviewer.user})
                if(notification){
                    notification.backlog.push(`You're not a reviewer of ${expo.title} anymore, because the exposition left the portal. `)
                    await notification.save() //sta qui
                } else {
                    await Notification.create({
                        receiver: expo.reviewer.user,
                        backlog: `You're not a reviewer of ${expo.title} anymore, because the exposition left the portal. `
                    })
                }
            }
            await expo.save();
        } else {
            throw new HttpError('The exposition is not linked to any portal',400)
        }

        res.status(200).json(`${expo.title} removed from ${expo.portal.name} portal`)
    }catch(err){
        next(err)
    }
}


module.exports = {createExposition,setExpoPublic,editExpoMetadata,addAuthor,removeAuthor,connectToPortal,editExposition,getPublicExpositions,
    getPortalExpositions,getExposition,leaveCollaboration,deleteExposition,removeFromPortal}