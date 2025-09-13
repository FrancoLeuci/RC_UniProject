const Exposition = require('../model/Exposition')
const BasicUser=require('../model/BasicUser')
const FullUser = require('../model/FullUser')
const Portal = require('../model/Portal')

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

        const portalsReviewer = reviewerBasicAccount.portals.reviewers.filter(portal => portal.reviewers.includes(reviewer))

        const expositions = await Exposition.find({portal: portalsReviewer._id, reviewer: {flag:true,user: reviewer}})

        res.status(200).json({ok:true, expositions})
    }catch(err){
        next(err)
    }
}

async function expoStatus(req, res, next){
    const reviewer = req.user.id
    const expoId = req.params.expoId
    const {action} = req.body
    try{
        const expo = await Exposition.findById(expoId)
        if(!expo) throw new HttpError('Exposition not found',404)

        if(!expo.reviewer.user.equals(reviewer)) throw new HttpError('You are not the reviewer.',401)

        const notificationReviewer = await Notification.findOne({receiver: reviewer})
        const creator = expo.authors.find(a => a.role==="creator")
        const notificationCreator = await Notification.findOne({receiver: creator})
        if(action==='rejected'){
            expo.shareStatus = 'private' //lo stato cambia per permettere ai membri di editarlo
        } else if(action==='accepted'){
            expo.published=true;
        } else {
            throw new HttpError('Action not valid',400)
        }

        expo.reviewer = {flag: false, user:null}
        await expo.save()

        if(!notificationReviewer){
            await Notification.create({
                receiver: reviewer,
                backlog: `You ${action} the reviewing request of ${expo.title} exposition`,
            })
        } else {
            notificationReviewer.backlog.push(`You ${action} the reviewing request of ${expo.title} exposition`)
            await notificationReviewer.save()
        }

        if(!notificationCreator){
            await Notification.create({
                receiver: creator,
                backlog: `The reviewing request of ${expo.title} exposition was ${action}`,
            })
        } else {
            notificationReviewer.backlog.push(`The reviewing request of ${expo.title} exposition was ${action}`)
            await notificationReviewer.save()
        }

        res.status(200).send('Exposition reviewing made successfully')
    }catch(err){
        next(err)
    }
}

module.exports = {expoToReviewList, expoStatus}