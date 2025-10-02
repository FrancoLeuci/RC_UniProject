const Exposition = require('../model/Exposition')
const BasicUser=require('../model/BasicUser')
const FullUser = require('../model/FullUser')
const Portal = require('../model/Portal')
const Notification = require('../model/Notification')
const mongoose=require("mongoose")

const {HttpError} = require('../middleware/errorMiddleware')
//prendere la lista di revisioni del singolo reviewer
//approvazione/disapprovazione revisione(notifica)
//note (?)
//

//esiste una pagina a parte dove se l'utente è un reviewer di uno o più portali vede tutte le richieste in essa
async function expoToReviewList(req,res,next){
    const reviewer=req.user.id;

    try{
        const reviewerBasicAccount=await BasicUser.findById(reviewer).populate("portals")
        if(!reviewerBasicAccount){
            throw new HttpError("No user found. ",404)
        }

        if(reviewerBasicAccount.portals.length===0){
            throw new HttpError("User is not linked to any portal. ",404)
        }

        const portalsReviewer = reviewerBasicAccount.portals.filter(p=>{
            return p.reviewers.includes(reviewer)
        })

        if(portalsReviewer.length===0){ //se l'utente non appare in nessuna lista di reviewers non è un reviewer
            throw new HttpError("User is not a Reviewer. ",403)
        }
        
        const expositions = await Promise.all(portalsReviewer.map(async p=>{
            const a=await Exposition.find({portal:p._id,reviewer:{flag:true,user:reviewerBasicAccount._id}})
            return a
        }))

        res.status(200).json({ok:true, expositions})
    }catch(err){
        next(err)
    }
}

async function expoStatus(req, res, next){
    const reviewer = req.user.id
    const expoId = req.params.expoId
    //portalId nel caso non sia linkata a nessun portale e sia stata già pubblicata
    const {action,portalId} = req.body
    try{
        const expo = await Exposition.findById(expoId).populate("portal")
        if(!expo) throw new HttpError('Exposition not found',404)

        const portal=await Portal.findById(portalId)
        if(!portal)throw new HttpError('Portal not found',404)

        if(String(expo.reviewer.user)!==reviewer) throw new HttpError('You are not the reviewer.',401)

        const notificationReviewer = await Notification.findOne({receiver: new mongoose.Types.ObjectId(reviewer)})
        const creator = expo.authors.find(a => a.role==="creator")
        const creatorFullAccount=await FullUser.findById(creator.userId)
        const notificationCreator = await Notification.findOne({receiver: creatorFullAccount.basicCorrespondent})
        if(action==='rejected'){
            if(expo.published){
                let notification = await Notification.findOne({receiver: creator.userId})
                if(notification){
                    notification.feed.push(`A reviewer from portal ${portal.name} has rejected your publication request for ${expo.title}.`)
                    await notification.save() //sta qui
                } else {
                    await Notification.create({
                        receiver: creator.userId,
                        feed: `A reviewer from portal ${portal.name} has rejected your publication request for ${expo.title}.`
                    })
                }
                //torna semplicemente a public dopo essere stata rigettata dal reviewer del portale
                expo.shareStatus = 'public'
            }else{
                expo.shareStatus = 'private' 
                //lo stato cambia per permettere ai membri di editare
            }

        } else if(action==='accepted'){

            //chi segue il portale
            const userToShowNotificationPortal=await BasicUser.find({followedPortals:expo.portal._id})
            

            if(expo.published){
                portal.linkedExpositions.push(expo._id)
                await portal.save()
                expo.portal=portal._id
                expo.shareStatus="public";
                //salva alla fine di tutto

                //notifica a chi segue il portale del link avvenuto tra expo pubblicata e portale
                await Promise.all(userToShowNotificationPortal.map(async user => {
                let notification = await Notification.findOne({receiver: user._id})
                if(notification){
                    notification.feed.push(`Portal ${expo.portal.name} has a new published exposition: ${expo.title}, created by ${creatorFullAccount.alias}.`)
                    await notification.save() //sta qui
                } else {
                    await Notification.create({
                        receiver: user._id,
                        feed: `Portal ${expo.portal.name} has a new published exposition: ${expo.title}, created by ${creatorFullAccount.alias}.`
                    })
                }

            }))
            }else{
                //se non era mai stata published
                const userToShowNotificationCreator=await BasicUser.find({followedResearchers:creatorFullAccount.basicCorrespondent})
                
                await Promise.all(userToShowNotificationCreator.map(async user => {
                let notification = await Notification.findOne({receiver: user._id})
                if(notification){
                    notification.feed.push(`${creatorFullAccount.alias} has published the exposition ${expo.title}`)
                    await notification.save() //sta qui
                } else {
                    await Notification.create({
                        receiver: user._id,
                        feed: `${creatorFullAccount.alias} has published the exposition ${expo.title}`
                    })
                }

            }))

            await Promise.all(userToShowNotificationPortal.map(async user => {
                let notification = await Notification.findOne({receiver: user._id})
                if(notification){
                    notification.feed.push(`Portal ${expo.portal.name} has a new published exposition: ${expo.title}, created by ${creatorFullAccount.alias}.`)
                    await notification.save() //sta qui
                } else {
                    await Notification.create({
                        receiver: user._id,
                        feed: `Portal ${expo.portal.name} has a new published exposition: ${expo.title}, created by ${creatorFullAccount.alias}.`
                    })
                }
            }))
            expo.published=true;
        }

        } else {
            throw new HttpError('Action not valid',400)
        }

        expo.reviewer = {flag: false, user:null} //in ogni caso il reviewer "esce" dal ruolo nel contesto dell'esposizione
        await expo.save()

        if(!notificationReviewer){ //notifica al reviewer che ha accettato/rigettato la richiesta
            await Notification.create({
                receiver: reviewer,
                backlog: `You ${action} the reviewing request of ${expo.title} exposition`,
            })
        } else { 
            notificationReviewer.backlog.push(`You ${action} the reviewing request of ${expo.title} exposition`)
            await notificationReviewer.save()
        }

        if(!notificationCreator){ //notifica al creatore che la richiesta è stata accettata/rigettata
            await Notification.create({
                receiver: creator.userId,
                backlog: `The reviewing request of ${expo.title} exposition was ${action}`,
            })
        } else {
            notificationReviewer.backlog.push(`The reviewing request of ${expo.title} exposition was ${action}`)
            await notificationReviewer.save()
        }

        res.status(200).send('Exposition reviewing made successfully. ') //log
    }catch(err){
        next(err)
    }
}

module.exports = {expoToReviewList, expoStatus}