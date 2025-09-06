const BasicUser = require("../model/BasicUser");
const Portal = require("../model/Portal");
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
            if(String(request.receiver) !== String(user._id)) throw new HttpError(`Not Authorized to accept/reject the request`,401)
        }

        if(request.type==="portal.addMember"){
            if(action==="accepted"){
                const portal = await Portal.findById(request.extra)
                portal.members.push(user._id)
                await portal.save()

                user.portals.push(portal._id)
                await user.save()
            }
        } else if(request.type==="portal.requestToAccess"){
            if(action==="accepted"){
                const portal = await Portal.findById(request.extra)
                portal.members.push(request.sender)
                await portal.save()

                const user2 = await BasicUser.findById(request.sender)
                user.portals.push(portal._id)
                await user.save()
            }
        }

        if(action!=="canceled"){
            //controllo se esiste già un oggetto Notification relazionato all'utente
            //creo la notifica per il mittente
            let notification = await Notification.findOne({receiver: request.sender})
            console.log(notification)
            if(notification){
                console.log(notification.backlog)
                notification.backlog.push(`${user.realName} has ${action} the request: ${request.content}`)
                console.log(notification.backlog)
            } else {
                await Notification.create({
                    receiver: request.sender,
                    backlog: `${user.realName} has ${action} the request: ${request.content}`
                })
            }
            await notification.save()

            //creo la notifica per il destinatario
            notification = await Notification.findOne({receiver: request.receiver})
            if(notification){
                notification.backlog.push(`You have ${action} the request: ${request.content}`)
            } else {
                await Notification.create({
                    receiver: request.receiver,
                    backlog: `You have ${action} the request: ${request.content}`
                })
            }
            await notification.save()

            //creo la notifica visibile nel portale se serve
            if(request.type.includes("portal")&&action!=="rejected"){
                notification = await Notification.findOne({receiver: request.extra})
                if(notification){
                    notification.backlog.push(`${user.realName} has ${action} the request: ${request.content}`)
                } else {
                    await Notification.create({
                        receiver: request.extra,
                        backlog: `${user.realName} has ${action} the request: ${request.content}`
                    })
                }
                await notification.save()
            }
        }

        //elimino la richiesta dal DB
        await Request.findByIdAndDelete(request._id)

        res.status(200).json({ok: true, message: `Request has been ${action}`})
    }catch(err){
        next(err);
    }
}

//Come verranno visualizzate le richieste nella pagina
async function viewRequests(req, res, next){
    //const portal = req.portal
    const userId = req.user.id
    try{
        const user = await BasicUser.findById(userId)
        if(!user){
            throw new HttpError("User not found", 404);
        }

        const sendedRequests = await Request.find({sender: user._id}) //verrà mostrato solo il pulsante di Cancel/Delete della richiesta
        const receivedRequests = await Request.find({receiver: user._id}) //verranno mostrati i pulsanti di Accept e Reject per la richiesta

        const notifications = await Notification.find({receiver: user._id})

        res.status(200).json({ok: true, send_requests: sendedRequests, rec_requests: receivedRequests, notif: notifications})
    }catch(err){
        next(err)
    }
}

module.exports = {viewRequests, actionRequest}