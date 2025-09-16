const BasicUser = require('../model/BasicUser')
const Portal = require('../model/Portal')
const Group = require('../model/Group')
const Exposition = require('../model/Exposition')
const Request = require('../model/Request')
const Notification = require('../model/Notification')

const {HttpError} = require('../middleware/errorMiddleware')

//creazione del portale (con richiesta) e inserimento di un admin
//eliminazione di un account (con richiesta) - rimozione delle esposizioni, dei media, della sua presenza in eventuali portali/gruppi/collaborazioni
//gestione delle problematiche dovute a copyright di media o di esposizioni

//TODO: Chidere come poter gestire la creazione del primo super-admin del sito

async function addSuperAdmin(req,res,next){
    const requestUserId=req.user.id
    const userToPromoteId = req.params.id
    try{
        const isSuperAdmin=await BasicUser.findOne({_id: requestUserId, role: 'super-admin'})
        if(!isSuperAdmin) throw new HttpError("You are not a super admin.",403)

        const userToPromote=await BasicUser.findById(userToPromoteId)
        if(!userToPromote) throw new HttpError("User to promote was not found.",404)
        if(userToPromote.role==="super-admin") throw new HttpError("User is a super-admin already.",409)

        userToPromote.role="super-admin";
        await userToPromote.save();

        res.status(200).send('User promoted to super-admin.')
    }catch(err){
        next(err)
    }
}

//nei parametri rqId è id della richiesta
async function portalDeletionResponse(req,res,next){
    const sAdminId = req.user.id
    const requestId = req.params.rqId
    const {action} = req.body
    try{
        const isSuperAdmin=await BasicUser.findOne({_id:sAdminId,role:"super-admin"})
        if(!isSuperAdmin) throw new HttpError("Forbidden. You are not a super admin. ");

        const request = await Request.findById(requestId)
        if(!request) throw new HttpError('Request not found',404)
        if(request.type!=="portal.delete") throw new HttpError('Wrong request type.',400)


        if(action === 'accepted'){
            //togliere dalle expo il portale
            const portal=Portal.findById(request.extra)
            const expos=await Promise.all(portal.expositionsLinked.map(async e=>{
                const expo=await Exposition.findById(e)
                expo.portal=null;

                //se in fase di review all'interno di quel portale viene ripristinato tutto
                if(expo.shareStatus==='reviewing'){
                    expo.shareStatus='private'
                    expo.reviewer={flag:false, user: null}
                }
                await expo.save();
            }))

            //invio delle notifiche ad admins e membri del portale
            await Promise.all(portal.admins.map(async a => {
                //eliminazione dal BasicUser
                const adminAccount = await BasicUser.findById(a)
                const index = adminAccount.portals.indexOf(portal._id)
                adminAccount.portals.splice(index,1)
                await adminAccount.save()

                //eliminazione dal FullUser
                const adminFull = await FullUser.findOne({basicCorrespondent: a}).populate(groups)
                if(adminFull) {
                    adminFull.groups = adminFull.groups.filter(g => g.portal.equals(portal._id))
                    await adminFull.save()
                }

                //notifiche x tutti gli admin di portale
                const notification = await Notification.findOne({receiver: a})
                if(notification){
                    notification.backlog.push(`${portal.name} and its groups have been deleted. Following this, all links between Expositions and these were cut. `)
                    await notification.save()
                } else {
                    await Notification.create({
                        receiver: a,
                        backlog: `${portal.name} and its groups have been deleted. Following this, all links between Expositions and these were cut. `
                    })
                }
            }))

            await Promise.all(portal.members.map(async m => {
                //eliminazione dal BasicUser
                const adminAccount = await BasicUser.findById(m)
                const index = adminAccount.portals.indexOf(portal._id)
                adminAccount.portals.splice(index,1)
                await adminAccount.save()

                //eliminazione dal FullUser
                const adminFull = await FullUser.findOne({basicCorrespondent: m}).populate(groups)
                if(adminFull) {
                    adminFull.groups = adminFull.groups.filter(g => g.portal.equals(portal._id))
                    await adminFull.save()
                }

                //notifiche x tutti i membri del portale
                const notification = await Notification.findOne({receiver: m})
                if(notification){
                    notification.backlog.push(`${portal.name} and its groups have been deleted. Following this, all links between Expositions and these were cut. `)
                    await notification.save()
                } else {
                    await Notification.create({
                        receiver: m,
                        backlog: `${portal.name} and its groups have been deleted. Following this, all links between Expositions and these were cut. `
                    })
                }
            }))

            //cancellare tutti i gruppi del portale e scollegare
            await Group.deleteMany({portal: request.extra})
            await Portal.findByIdAndDelete(portal._id)
        } else if(action === 'rejected'){
            //invia la notifica solo all'admin del portale che ha fatto la richiesta
            const notification = await Notification.findOne({receiver: request.sender})
            if(notification){
                notification.backlog.push(`Super-admin has ${action} the request: ${request.content}`)
                await notification.save()
            } else {
                await Notification.create({
                receiver: request.sender,
                backlog: `Super-admin has ${action} the request: ${request.content}`
            })
            }

            return res.send('Portal wasn\'t deleted.')
        } else {throw new HttpError('Action not valid',400)}

        //le elimino tutte
        await Request.deleteMany({type:"portal.delete", extra: request.extra})

        res.send('Portal deleted')
    }catch(err){
        next(err)
    }
}

async function createPortalRequest(req,res,next){
    const sAdminId=req.user.id
    const {name, emailFirstAdmin}=req.body
    try{
        const isSuperAdmin=await BasicUser.findOne({_id: sAdminId, role: 'super-admin'})
        if(!isSuperAdmin) throw new HttpError("You are not a super admin.",403)

        if(!name) throw new HttpError("Name required.",400)
        if(!emailFirstAdmin)throw new HttpError("Email required.",404)

        const firstAdmin=await BasicUser.find(emailFirstAdmin)
        if(!firstAdmin) throw new HttpError("User to promote not found.",404)

        const portal = await Portal.create({
            name,
            admins: [firstAdmin._id]
        })

        firstAdmin.portals.push(portal._id)
        await firstAdmin.save()

        const notification = await Notification.findOne({receiver: firstAdmin._id})
        if(notification){
            notification.backlog.push(`Super-admin has created a new portal named ${name} and has promoted you to portal admin role. `)
            await notification.save()
        } else {
            await Notification.create({
                receiver: firstAdmin._id,
                backlog: `Super-admin has created a new portal named ${name} and has promoted you to portal admin role. `
            })
        }
        res.status(201).send('Portal created successfully')
    }catch(err){
        next(err)
    }
}

module.exports = {addSuperAdmin}