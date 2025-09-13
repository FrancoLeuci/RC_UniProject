const BasicUser = require("../model/BasicUser");
const FullUser = require("../model/FullUser");
const Portal = require("../model/Portal");
const Group = require("../model/Group");
const Exposition = require("../model/Exposition")
const Request = require("../model/Request");
const Notification = require("../model/Notification");

const {HttpError} = require("../middleware/errorMiddleware");


// Richiesta HTTP svolta quando il destinatario della richiesta clicca su Accept
async function actionRequest(req, res, next) {
    const userId = req.user.id
    const requestId = req.params.reqId
    const {action} = req.body //action può essere accepted, rejected o canceled
    try{
        //controllo sul body
        if(!action||!["accepted", "rejected", "canceled"].includes(action)) throw new HttpError('Action not valid!',400)

        //controllo sulla richiesta
        const request = await Request.findById(requestId)
        if(!request) throw new HttpError('Request not found',404)

        const user = await BasicUser.findById(userId)
        //controllo sull'utente
        if(action==="canceled"){ //cancellazione della richiesta
            if(String(request.sender)!==String(user._id)) throw new HttpError('Not Authorized to cancel the request',401)
        }else{ //accettare o rigettare la richiesta
            if(request.type.includes('addMember')){
                if(!request.receiver.equals(user._id)) throw new HttpError('Not Authorized to accept/reject the request',401)
            }
        }

        //gestione richieste portali
        if(request.type==="portal.addMember"){
            if(action==="accepted"){
                const portal = await Portal.findById(request.extra)
                portal.members.push(user._id)
                await portal.save()

                user.portals.push(portal._id)
                await user.save()
            }
        } else if(request.type==="portal.requestToAccess"){
            const portal = await Portal.findById(request.extra)
            //verifico che colui che compie l'azione sia un admin del portale
            if(!portal.admins.includes(user._id)) throw new HttpError('You are Not Authorized',401)
            if(action==="accepted"){
                portal.members.push(request.sender)
                await portal.save()

                const user2 = await BasicUser.findById(request.sender)
                user2.portals.push(portal._id)
                await user2.save()
            }
        }

        //gestione delle collaborazioni delle esposizioni
        if(request.type==='collaboration.addUse'){
            if(action==="accepted"){
                const expo = await Exposition.findById(request.extra)
                const receiverFull = await FullUser.findOne({basicCorrespondent: request.receiver})
                expo.authors.push({
                    role: 'co-author',
                    userId: receiverFull._id
                })
                await expo.save()
                
                receiverFull.expositions.push(request.extra)
                await receiverFull.save()
            }
        } else if(request.type==='collaboration.requestToPortal'){
            const portal = await Portal.findById(request.receiver)
            //verifico che colui che compie l'azione sia un admin del portale
            if(!portal.admins.includes(user._id)) throw new HttpError('You are Not Authorized',401)
            if(action==="accepted"){
                portal.expositionsLinked.push(request.extra)
                await portal.save()

                const expo = await Exposition.findById(request.extra)
                expo.portal=portal._id
                await expo.save()
            }
        }

        //gestione richieste gruppi
        if(request.type==="group.addMember"){
            if(action==="accepted"){
                const group = await Group.findById(request.extra)
                group.members.push(user._id)
                await group.save()

                const fullUser = await FullUser.findOne({basicCorrespondent: user._id})
                fullUser.groups.push(group._id)
                await fullUser.save()
            }
        } else if(request.type==="group.requestToAccess"){
            const group = await Group.findById(request.extra)
            //verifico che l'azione sia compiuta da un admin del gruppo
            if(!group.admins.includes(user._id)) throw new HttpError('You are Not Authorized',401)

            if(action==="accepted"){
                group.members.push(request.sender)
                await group.save()

                const fullUser = await FullUser.findOne({basicCorrespondent: request.sender})
                fullUser.groups.push(group._id)
                await fullUser.save()
            }
        }

        if(action!=="canceled"){
            //controllo se esiste già un oggetto Notification relazionato all'utente
            //creo la notifica per il mittente
            let notification = await Notification.findOne({receiver: request.sender})
            if(notification){
                notification.backlog.push(`${user.realName} has ${action} the request: ${request.content}`)
                await notification.save()
            } else {
                await Notification.create({
                    receiver: request.sender,
                    backlog: `${user.realName} has ${action} the request: ${request.content}`
                })
            }

            //creo la notifica per il destinatario
            if(!request.receiver.equals(request.extra)){
                notification = await Notification.findOne({receiver: request.receiver})
                if(notification){
                    notification.backlog.push(`You have ${action} the request: ${request.content}`)
                    await notification.save()
                } else {
                    await Notification.create({
                        receiver: request.receiver,
                        backlog: `You have ${action} the request: ${request.content}`
                    })
                }
            }

            //creo la notifica visibile nel portale/gruppo se serve
            if((request.type.includes("portal")||(request.type.includes("group")))&&action!=="rejected"){
                notification = await Notification.findOne({receiver: request.extra})
                if(notification){
                    notification.backlog.push(`${user.realName} has ${action} the request: ${request.content}`)
                    await notification.save()
                } else {
                    await Notification.create({
                        receiver: request.extra,
                        backlog: `${user.realName} has ${action} the request: ${request.content}`
                    })
                }
            }
        }

        //elimino la richiesta dal DB
        await Request.findByIdAndDelete(request._id)

        res.status(200).json({ok: true, message: `Request has been ${action}`})
    }catch(err){
        next(err);
    }
}

//Visualizzazione delle richieste
async function viewRequests(req, res, next){
    const userId = req.user.id
    try{
        const user = await BasicUser.findById(userId)

        const sendedRequests = await Request.find({sender: user._id}) //verrà mostrato solo il pulsante di Cancel/Delete della richiesta
        const receivedRequests = await Request.find({receiver: user._id}) //verranno mostrati i pulsanti di Accept e Reject per la richiesta

        res.status(200).json({ok: true, send_requests: sendedRequests, rec_requests: receivedRequests})
    }catch(err){
        next(err)
    }
}

//Visualizzazione delle Notifiche
async function viewNotifications(req, res, next){
    const userId = req.user.id
    const {extraId} = req.body
    try{
        if(extraId){
            const notifications = await Notification.findOne({receiver: extraId})
            const portal = await Portal.findById(extraId)
            const group = await Group.findById(extraId)
            if((portal && portal.admins.includes(userId))||(group && group.admins.includes(userId))){
                //controllo se l'utente che ha fatto la richiesta è un admin del portale
                return res.status(200).json({ok: true, data: notifications})
            } else {
                throw new HttpError("You are Not Authorized to access", 401);
            }
        } else {
            const notifications = await Notification.findOne({receiver: userId})
            res.status(200).json({ok: true, data: notifications})
        }
    }catch(err){
        next(err);
    }
}

module.exports = {viewRequests, actionRequest, viewNotifications}