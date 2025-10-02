const User = require("../../model/User");
const Author = require("../../model/Author");
const Request = require("../../model/Request");
const Exposition = require("../../model/Exposition");
const Notification = require("../../model/Notification");

const {HttpError} = require("../../middleware/errorMiddleware");
const Portal = require("../../model/Portal");



//Creazione di nuovi profili da zero: Nome, email (preferibilmente istituzionale)
//se il nome è già collegato a un utente già esistente (o email) chiederà se vuole aggiungerlo al portale
//in questa maniera appariranno solo utenti con una mail verificata

//TODO: quando un membro diviene reviewer deve rimanere nella lista dei membri del portale?
async function addToPortal(req,res,next){
    const portal=req.portal;
    const newMemberId=req.params.id;
    const adminId = req.user.id

    try{
        if(portal.members.find(memberId=>String(memberId)===newMemberId)||portal.admins.find(adminId=>String(adminId)===newMemberId)){
            throw new HttpError("User already a member of the Portal",409)
            //return res.status(409).json({message: "User already a member of the Portal."});
        }else{
            const newMember = await User.findById(newMemberId)
            if(!newMember){
                throw new HttpError("User not found",404)
            }

            const existingRequest = await Request.findOne({
                receiver: newMember._id,
                type: 'portal.addMember',
                extra: portal._id
            });

            if (existingRequest) {
                throw new HttpError(`Request already made`, 409);
            }

            await Request.create({
                type: 'portal.addMember',
                sender: adminId, //<- è visibile solo a lui la richiesta e non a tutto il portale
                receiver: newMember._id,
                content: `${portal.name} has invited ${newMember.realName} to become a member of the Portal`,
                extra: portal._id
            })

            return res.status(201).json({ok:true, message:"Request send successfully"})
        }

    }catch(err){
        next(err)
        //console.error(err);
        //res.send("Internal Server Error");
    }
}

async function removeFromPortal(req,res,next){
    const portal=req.portal;
    const memberToRemoveId=req.params.id;

    try{
        const userToRemove = await User.findById(memberToRemoveId)
        if(!userToRemove) throw new HttpError('User not found',404)

        if(portal.members.find(memberId=>String(memberId)===memberToRemoveId)) {
            portal.members.splice(portal.members.indexOf(memberToRemoveId), 1);
            userToRemove.portals.splice(userToRemove.portals.indexOf(portal._id), 1);
            await userToRemove.save()
            if (portal.reviewers.find(reviewerId => String(reviewerId) === memberToRemoveId)) {
                portal.reviewers.splice(portal.reviewers.indexOf(memberToRemoveId), 1);
                const expoReviewing = await Exposition.find({reviewer: {flag: true, user: memberToRemoveId}})
                if (expoReviewing) {
                    await Promise.all(expoReviewing.map(async expo => {
                        expo.reviewer = {flag: false, user: null};
                        expo.shareStatus="private";

                        await expo.save();
                        //la notifica arriva all'esposizione (a tutti gli autori+creatore)
                        const notification = await Notification.findOne({receiver: expo._id})
                        if (notification) {
                            notification.backlog.push(`The user ${userToRemove.realName} was recently removed from the Portal ${portal.name} and from his reviewing role for your Exposition. Make a new pubblication request to get a new reviewer. `)
                            await notification.save() //sta qui
                        } else {
                            await Notification.create({
                                receiver: memberToRemoveId,
                                backlog: `The user ${userToRemove.realName} was recently removed from the Portal ${portal.name} and from his reviewing role for your Exposition. Make a new pubblication request to get a new reviewer.`
                            })
                        }
                    }))
                }
                await portal.save();
            }

            const userToRemoveFull = await Author.findOne({basicCorrespondent: memberToRemoveId}).populate("groups").populate("expositions")


            if (userToRemoveFull) {
                await Promise.all(userToRemoveFull.expositions.map(async e=>{
                    if(e.portal.equals(portal._id)){
                        e.portal=null;
                        e.shareStatus="private"
                        e.reviewer={flag:false,user:null}
                        await e.save();

                        console.log("LOG DEBUG INDICE ESPOSIZIONE NEL PORTALE: ",portal.linkedExpositions.indexOf(e._id))
                        portal.linkedExpositions.splice(portal.linkedExpositions.indexOf(e._id),1)
                    }
                }))
                await portal.save()

                await userToRemoveFull.save()
            }

            //creo notifica che avvisa l'utente di essere stato rimosso dal portale
            let notification = await Notification.findOne({receiver: memberToRemoveId})
            if(notification){
                notification.backlog.push(`You were removed from the portal ${portal.name}`)
                await notification.save()
            } else {
                await Notification.create({
                    receiver: memberToRemoveId,
                    backlog: `You were removed from the portal ${portal.name} and from all its groups.`
                })
            }

            notification = await Notification.findOne({receiver: portal._id})
            if(notification){
                notification.backlog.push(`${userToRemove.realName} was removed from the portal`)
                await notification.save()
            } else {
                await Notification.create({
                    receiver: portal._id,
                    backlog: `${userToRemove.realName} was removed from the portal`
                })
            }
        } else {
            throw new HttpError('User is not a member of the portal.',400)
        }

        res.status(200).json({ok:true,message:"User deleted from the members list."})
    }catch(err){
        next(err)
        //console.error(err);
        //res.status(500).send("Internal Server Error");
    }
}

async function getPortalMembers(req, res, next){
    const portal = req.portal
    try{
        const users = await Promise.all(portal.members.map(member => User.findById(member)))

        res.status(200).json({ok: true, data: users});

    }catch(err){
        next(err)
    }
}

async function addReviewer(req,res,next){
    //arriva il portale dal middleware, user è admin
    const portal=req.portal;
    const user=req.user.id;
    const memberToReviewer=req.params.id

    try{

        const isMember=portal.members.includes(memberToReviewer)
        const isAdmin=portal.admins.includes(memberToReviewer)
        if(!(isMember||isAdmin)){
            throw new HttpError("User can't be a reviewer if he's not a member of the portal.",400)
        }
        //basic user può essere un reviewer

        if(portal.reviewers.includes(memberToReviewer)){
            throw new HttpError("User already is a Reviewer.",409)
        }

        portal.reviewers.push(memberToReviewer);
        await portal.save();

        const notification = await Notification.findOne({receiver: memberToReviewer})
        if(notification){
            notification.backlog.push(`You became a reviewer of the portal: ${portal.name}`)
            await notification.save() //sta qui
        } else {
            await Notification.create({
                receiver: memberToReviewer,
                backlog: `You became a reviewer of the portal: ${portal.name}`
            })
        }

        res.status(200).send('Reviewer add successfully')
    }catch(err){
        next(err)
    }

}

async function removeReviewer(req,res,next) {
    const portal=req.portal;
    const reviewerToRemoveId=req.params.id
    try{
        //basic user può essere un reviewer
        if(!portal.reviewers.includes(reviewerToRemoveId)){
            throw new HttpError("User is not a Reviewer.",404)
        }

        portal.reviewers=portal.reviewers.filter(a=>a!==reviewerToRemove);
        await portal.save();

        const listExpoOfReviewer = await Exposition.find({reviewer: {flag:true, user:reviewerToRemoveId}})
        await Promise.all(listExpoOfReviewer.map(async expo => {
            expo.shareStatus = "private"
            expo.reviewer = {flag: false, user: null}
            await expo.save()

            const creator = expo.authors.filter(a => a.role==='creator')
            const notification = await Notification.findOne({receiver: creator.userId})
            if(notification){
                notification.backlog.push(`The reviewer of the exposition ${expo.title} was removed from the portal, it's necessary to send another request of publication. `)
                await notification.save() //sta qui
            } else {
                await Notification.create({
                    receiver: creator.userId,
                    backlog: `The reviewer of the exposition ${expo.title} was removed from the portal, it's necessary to send another request of publication. `
                })
            }
        }))

        const notification = await Notification.findOne({receiver: reviewerToRemoveId})
        if(notification){
            notification.backlog.push(`You're not a reviewer of ${portal.name} anymore. `)
            await notification.save() //sta qui
        } else {
            await Notification.create({
                receiver: reviewerToRemoveId,
                backlog: `You're not a reviewer of the portal ${portal.name} anymore. `
            })
        }

        res.status(200).send('Reviewer removed successfully.')
    }catch(err){
        next(err)
    }
}

async function selectReviewer(req,res,next){
    const portal = req.portal
    //id del reviewer da assegnare
    const {reviewerId} = req.body
    //richiesta di publishing di una expo
    const requestId = req.params.reqId
    try{
        const request = await Request.findById(requestId)
        if(!request) throw new HttpError('Request not found',404)
        if(request.type!=="portal.requestToLinkExposition") throw new HttpError('Wrong request type.',400)

        if(!portal.reviewers.includes(reviewerId)) throw new HttpError('Reviewer not found',404)

        const expo = await Exposition.findById(request.extra)
        expo.reviewer = {
            flag: true,
            user: reviewerId
        }

        expo.shareStatus = 'reviewing'
        await expo.save()

        await Request.findByIdAndDelete(requestId)

        res.status(200).send('Reviewer selected.')
    }catch(err){
        next(err)
    }
}

async function requestToRemovePortal(req,res,next){
    const adminId=req.user.id
    const portal=req.portal
    try{
        const adminAccount=await User.findById(adminId)
        const existingRequest = await Request.findOne({
            type: 'portal.delete',
            extra: portal._id
        });

        if (existingRequest) {
            throw new HttpError(`Request already made`, 409);
        }

        const superAdmins=await User.find({role:"super-admin"})
        superAdmins.map(async sA=>{
            await Request.create({
                type: 'portal.delete',
                sender: adminId,
                receiver: sA._id,
                content: `${adminAccount.realName} requested to delete ${portal.name} portal.`,
                extra: portal._id
            })

        })

        res.status(201).send('Request sent successfully')
    }catch(err){
        next(err)
    }
}

async function removeLinkedExposition(req,res,next){
    const portal=req.portal;
    const expoId=req.params.expo
    try{
        //rimuovere dall'expo il portale
        const expo=await Exposition.findById(expoId);

        if(!expo.portal?.equals(portal._id)) throw new HttpError('This exposition is not linked to the portal',409)

        expo.portal=null

        //rimuovere lo stato di review (if) ...
        if(expo.shareStatus==="reviewing"){
            expo.shareStatus="private";

            //notifica all'esposizione che non è più in fase di review
            let notification = await Notification.findOne({receiver: expo._id})
            if(notification){
                notification.backlog.push(`${expo.title} is not undergoing review anymore, since a portal admin has removed it from the portal it was linked to. `)
                await notification.save() //sta qui
            } else {
                await Notification.create({
                    receiver: expo._id,
                    backlog: `${expo.title} is not undergoing review anymore, since a portal admin has removed it from the portal it was linked to.  `
                })
            }

            //notifica al reviewer in questione che non deve più fare nessuna review per quell'esposizione
            notification = await Notification.findOne({receiver: expo.reviewer.user})
            if(notification){
                notification.backlog.push(`${expo.title} is not linked to ${portal.name} portal anymore, you don't have to review its content.`)
                await notification.save() //sta qui
            } else {
                await Notification.create({
                    receiver: expo.reviewer.user,
                    backlog: `${expo.title} is not linked to ${portal.name} portal anymore, you don't have to review its content.`
                })
            }

            expo.reviewer={flag: false,user: null};

        }
        await expo.save();

        const adminBasic=await User.findById(req.user.id)
        //rimuovere expo da lista del portale
        portal.linkedExpositions.splice(portal.linkedExpositions.indexOf(expo._id),1)

        let notification = await Notification.findOne({receiver: portal._id})
        if(notification){
            notification.backlog.push(`${adminBasic.realName} has removed exposition: ${expo.title} from ${portal.name} portal.`)
            await notification.save() //sta qui
        } else {
            await Notification.create({
                receiver: portal._id,
                backlog: `${adminBasic.realName} has removed exposition: ${expo.title} from ${portal.name} portal.`
            })
        }

        await portal.save()

        res.status(200).send(`${expo.title} removed from the portal`)
    }catch(err){
        next(err)
    }
}

module.exports = {addToPortal, removeFromPortal, getPortalMembers, addReviewer,
    removeReviewer, selectReviewer, requestToRemovePortal, removeLinkedExposition}