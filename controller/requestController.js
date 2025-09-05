const BasicUser = require("../model/BasicUser");
const Portal = require("../model/Portal");
const Request = require("../model/Request");
const Notification = require("../model/Notification");

const {HttpError} = require("../middleware/errorMiddleware");

// TODO: per il momento per i portali è valido solo per la 2^ soluzione e 1^ soluzione per le notifiche

/*async function statusRequest(req, res, next) {
    const userId = req.user.id
    const requestId = req.params.reqId
    try{
        const request = await Request.findById(requestId)
        if(!request){
            throw new HttpError('Request not found',404)
        }

        if(request.receiver !== userId){
            throw new HttpError('Not Authorized to accept the request',401)
        }


    }catch(err){
        next(err);
    }
}*/


// Richiesta HTTP svolta quando il destinatario della richiesta clicca su Accept
async function acceptedRequest(req, res, next) {
    const userId = req.user.id
    const requestId = req.params.reqId
    try{
        //controllo sulla richiesta
        const request = await Request.findById(requestId)
        if(!request){
            throw new HttpError('Request not found',404)
        }

        const user = await BasicUser.findById(userId)
        if(!user){
            throw new HttpError('User not found',404)
        }

        console.log(request.receiver)
        console.log(user._id)
        //controllo sull'utente
        if(String(request.receiver) !== String(user._id)){
            throw new HttpError('Not Authorized to accept the request',401)
        }

        //modifico lo status della richiesta da pending ad accepted
        request.status = 'accepted'
        await request.save()

        if(request.type==="portal.addMember"){
            const portal = await Portal.findById(request.extra)
            portal.members.push(user._id)
            await portal.save()

            user.portals.push(portal._id)
            await user.save()
        }

        //creo la notifica per il mittente
        await Notification.create({
            receiver: request.sender,
            content: `${user.realName} has accepted the request: ${request.content}`
        })

        //creo la notifica per il destinatario
        await Notification.create({
            receiver: request.receiver,
            content: `You have accepted the request: ${request.content}`
        })

        //elimino la richiesta dal DB
        await Request.findByIdAndDelete(request._id)

        res.status(200).json({ok: true, message: 'Request has been accepted'})
    }catch(err){
        next(err);
    }
}

async function rejectedRequest(req, res, next) {
    try{

    }catch(err){
        next(err);
    }
}

async function canceledRequest(req, res, next) {
    try{

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

module.exports = {viewRequests, acceptedRequest, rejectedRequest, canceledRequest}