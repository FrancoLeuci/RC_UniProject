const BasicUser = require('../model/BasicUser')
const Portal = require('../model/Portal')
const Group = require('../model/Group')
const Exposition = require('../model/Exposition')
const Request = require('../model/Request')
const Notification = require('../model/Notification')
const {Media}=require("../model/Media")
const Set = require('../model/Set')
const FullUser=require("../model/FullUser")

const {HttpError} = require('../middleware/errorMiddleware')
const {google} = require("googleapis");
const nodemailer = require("nodemailer");

//funzione per promuovere basic-user a full-user
//TODO: gestione delle problematiche dovute a copyright di media o di esposizioni (chiedere se ci deve essere una richiesta previa)

async function emailSender (email){
    try{
        // metodo della libreria googleapis per creare un client oAuth2 autorizzato
        const oAuth2Client = new google.auth.OAuth2(
            process.env.CLIENT_ID,
            process.env.CLIENT_S,
            process.env.REDIRECT_URI
        );

        // metodo per impostare le credenziale di autorizzazione
        oAuth2Client.setCredentials({
            refresh_token: process.env.OAUTH_REFRESH_TOKEN
        })

        const accessToken = await oAuth2Client.getAccessToken();

        // metodo per creare un oggetto Transport per l'invio dell'email
        const emailTransporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.EMAIL_USER,
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_S,
                refreshToken: process.env.OAUTH_REFRESH_TOKEN,
                accessToken: accessToken
            },
        })

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Poliba account',
                html: `Your account is delete as you required`,
            }

            return await emailTransporter.sendMail(mailOptions)
    }catch(err){
        console.error("Errore invio email:", err);
        throw new HttpError("Failed to send email: " + err.message, 500);
    }
}


//TODO: Chidere come poter gestire la creazione del primo super-admin del sito - come richiedere al sito la creazione del portale
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
        if(!isSuperAdmin) throw new HttpError("Forbidden. You are not a super admin. ",403);

        const request = await Request.findById(requestId)
        if(!request) throw new HttpError('Request not found',404)
        if(request.type!=="portal.delete") throw new HttpError('Wrong request type.',400)


        if(action === 'accepted'){
            //togliere dalle expo il portale
            const portal=await Portal.findById(request.extra)
            await Promise.all(portal.linkedExpositions.map(async e=>{
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
                const adminFull = await FullUser.findOne({basicCorrespondent: a}).populate("groups")
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
                const adminFull = await FullUser.findOne({basicCorrespondent: m}).populate("groups")
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

            //cancellazione delle richieste e delle notifiche
            await Request.deleteMany({receiver: portal._id})
            await Request.deleteMany({sender: portal._id})
            await Request.deleteMany({extra: portal._id})
            await Notification.deleteMany({receiver: portal._id})

            //cancellazione portale
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

//ci serve sapere come arriva la richiesta di creazione
async function createPortalRequest(req,res,next){
    const sAdminId=req.user.id
    const {name, emailFirstAdmin}=req.body
    try{
        const isSuperAdmin=await BasicUser.findOne({_id: sAdminId, role: 'super-admin'})
        if(!isSuperAdmin) throw new HttpError("You are not a super admin.",403)

        if(!name) throw new HttpError("Name required.",400)
        if(!emailFirstAdmin)throw new HttpError("Email required.",404)

        const firstAdmin=await BasicUser.findOne({email: emailFirstAdmin})
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

async function userDeletionResponse(req,res,next){
    const sAdminId=req.user.id
    const requestId=req.params.rqId
    const {action}=req.body

    try{
        const isSuperAdmin=await BasicUser.findOne({_id: sAdminId, role: 'super-admin'}) //
        if(!isSuperAdmin) throw new HttpError("You are not a super admin.",403)

        const request = await Request.findById(requestId)
        if(!request) throw new HttpError('Request not found',404)
        if(request.type!=="user.selfDeleteRequest") throw new HttpError('Wrong request type.',400)

        if(action==="accepted"){
            //NuovoAccount10
            const userToDelete = await BasicUser.findById(request.sender).populate({path:"portals", populate:{path:"linkedExpositions",}}) //nested populate
            //togliere dai portali
            await Promise.all(userToDelete.portals.map(async p =>{
                let index = p.admins.indexOf(userToDelete._id)
                if(index!==(-1)){
                    p.admins.splice(index,1) //1 -> Portale 1
                } else {
                    index = p.members.indexOf(userToDelete._id) //2 -> Portale 2
                    p.members.splice(index,1)
                }
                index = p.reviewers.indexOf(userToDelete._id) //3 -> Portale 1 o 2
                //rimozione dalle esposizioni in reviewing
                if(index!==(-1)) { //creare un'esposizione dove user10 deve essere un reviwer
                    p.reviewers.splice(index,1)
                    await Promise.all(p.linkedExpositions.map(async expo => {
                        if(expo.reviewer.user.equals(userToDelete._id)){
                            expo.reviewer = {flag: false, user: null}
                            expo.shareStatus='private';
                            await expo.save()
                        }
                    }))
                }
                await p.save()

                //avvisa il portale che l'utente non fa più parte di esso
                const notification = await Notification.findOne({receiver: p._id})
                if(notification){
                    notification.backlog.push(`${userToDelete.realName} and its expositions were removed from the portal`)
                    await notification.save()
                } else {
                    await Notification.create({
                        receiver:  p._id,
                        backlog: `${userToDelete.realName} and its expositions were removed from the portal`
                    })
                }
            }))

            const userToDeleteFull = await FullUser.findOne({basicCorrespondent: userToDelete._id}).populate("groups").populate({path:"expositions",populate:[{path:"portal"},{path:"authors.userId"}]})

            if(userToDeleteFull){
                //togliere dai gruppi
                await Promise.all(userToDeleteFull.groups.map(async g => {
                    let index = g.admins.indexOf(userToDelete._id) //gruppo 1 di cui è l'unico admin -> Portal 2
                    if(index!==(-1)){
                        g.admins.splice(index,1)
                    } else {
                        index = g.members.indexOf(userToDelete._id) //gruppo 2 di cui è membro -> Portal 2
                        g.members.splice(index,1)
                    }
                    await g.save()
                    if(g.admins.length===0){
                        const notification = await Notification.findOne({receiver: g.portal})
                        if(notification){
                            notification.backlog.push(`${g.title} has now no admins. Make sure to promote a member. `)
                            await notification.save()
                        } else {
                            await Notification.create({
                                receiver:  g.portal,
                                backlog: `${g.title} has now no admins. Make sure to promote a member.`
                            })
                        }
                    }

                    const notification = await Notification.findOne({receiver: g._id})
                    if(notification){
                        notification.backlog.push(`${userToDelete.realName} has been removed from the group.`)
                        await notification.save()
                    } else {
                        await Notification.create({
                            receiver:  g._id,
                            backlog: `${userToDelete.realName} has been removed from the group.`
                        })
                    }
                }))

                //eliminazione delle esposizioni se è un creatore - rimozione dalle esposizioni se è un co-autore
                await Promise.all(userToDeleteFull.expositions.map(async expo => { //expo2 -> user10 è il creator e aggiungiamo almeno 1 co-autore e lo colleghiamo a Portal2
                    //verificare userId===userToDeleteFull
                    if(expo.authors.find(a => a.role==="creator"&& (String(a.userId._id)===String(userToDeleteFull._id)))){
                        //eliminazione dell'expo dal portale
                        if(expo.portal){
                            let index = expo.portal.linkedExpositions.indexOf(expo._id)
                            expo.portal.linkedExpositions.splice(index,1)
                            await expo.portal.save()
                        }

                        //in caso serve eliminare anche dai gruppi, non sappiamo che relazione ha il gruppo con l'expo

                        //eliminazione dell'esposizione dagli array expositions negli account fullUser di ogni co autore che ne faceva parte
                        await Promise.all(expo.authors.map(async a => {
                            a.userId.expositions.splice(a.userId.expositions.indexOf(expo._id),1)
                            await a.userId.save();
                            //invio delle notifiche ad ogni co-autore dell'esposizione
                            const notification = await Notification.findOne({receiver: a.userId.basicCorrespondent})
                            if(notification){
                                notification.backlog.push(`${expo.title} has been eliminated since its creator's account has been eliminated upon request. `)
                                await notification.save()
                            } else {
                                await Notification.create({
                                    receiver: a.userId.basicCorrespondent,
                                    backlog: `${expo.title} has been eliminated since its creator's account has been eliminated upon request. `
                                })
                            }
                        }))

                        //eliminazione dal db dell'esposizione
                        await Exposition.findByIdAndDelete(expo._id);
                    } else {
                        let index = expo.authors.findIndex((a) => a.role === "co-author" && a.userId._id.equals(userToDeleteFull._id));
                        expo.authors.splice(index,1)
                        await expo.save()

                        const creator = expo.authors.find(a => a.role==="creator")
                        const creatorF = await FullUser.findById(creator.userId)
                        const notification = await Notification.findOne({receiver: creatorF.basicCorrespondent})
                        if(notification){
                            notification.backlog.push(`${userToDelete.realName} was removed from the exposition ${expo.title}`)
                            await notification.save()
                        } else {
                            await Notification.create({
                                receiver:  creatorF.basicCorrespondent,
                                backlog: `${userToDelete.realName} was removed from the exposition ${expo.title}`
                            })
                        }
                    }
                }))
                //eliminazione finale fullUser
                await FullUser.findOneAndDelete({basicCorrespondent:userToDelete._id})
            }

            //elimazione dei propri media
            await Media.deleteMany({uploadedBy: userToDelete._id}) //importiamo almeno 3 media con account10
            await Set.deleteMany({creator: userToDelete._id}) //creiamo 2 set -> uno di cui è creatore, l'altro a cui è stato condiviso a user10
            const setsSharedWithUserToDelete = await Set.find({otherUsersPermissions: {user: userToDelete._id}}).populate("mediaList")
            await Promise.all(setsSharedWithUserToDelete.map(async set => {
                set.mediaList = set.mediaList.filter(media => !media.uploadedBy.equals(userToDelete._id))
                const index = set.otherUsersPermissions.indexOf({user: userToDelete._id})
                set.otherUsersPermissions.splice(index,1)
                await set.save()
            }))

            //eliminazione delle richieste e delle notifiche
            await Request.deleteMany({receiver: userToDelete._id})
            await Request.deleteMany({sender: userToDelete._id})
            await Notification.deleteMany({receiver: userToDelete._id})

            //invio della email
            await emailSender(userToDelete.email)

            await BasicUser.findByIdAndDelete(userToDelete._id)

        }else if(action==="rejected"){


        }else{
            throw new HttpError('Action not valid',400)
        }

        //le elimino tutte
        await Request.deleteMany({type:"user.selfDeleteRequest", sender: request.sender})

        res.send('Request accepted/rejected successfully')
    }catch(err){
        next(err)
    }
}

async function fullAccountResponse(req,res,next){
    const sAdminId=req.user.id
    const requestId=req.params.rqId
    const {action}=req.body

    try{
        const isSuperAdmin=await BasicUser.findOne({_id: sAdminId, role: 'super-admin'}) //
        if(!isSuperAdmin) throw new HttpError("You are not a super admin.",403)

        const request = await Request.findById(requestId)
        if(!request) throw new HttpError('Request not found',404)
        if(request.type!=="user.fullAccountRequest") throw new HttpError('Wrong request type.',400)

        if(action==="accepted"){
            const newFull=await FullUser.create({
                basicCorrespondent:request.sender,
                alias:request.alias
            })
            console.log("FULLUSER NUOVO: ",newFull)
        } else if(action!=="rejected"){throw new HttpError('Action not valid',400)}

        const notification = await Notification.findOne({receiver: request.sender})
        if(notification){
            notification.backlog.push(`Super-admin has ${action} your account upgrade request.`)
            await notification.save()
        } else {
            await Notification.create({
                receiver: request.sender,
                backlog: `Super-admin has ${action} your account upgrade request.`
            })
        }
        res.send('Request accepted/rejected successfully')
    }catch(err){
        next(err)
    }
}

module.exports = {addSuperAdmin, portalDeletionResponse, createPortalRequest, userDeletionResponse, fullAccountResponse}