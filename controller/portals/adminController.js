const BasicUser = require("../../model/BasicUser");
const FullUser = require("../../model/FullUser");
const Request = require("../../model/Request");
const Group = require("../../model/Group")
const Exposition = require("../../model/Exposition");
const Notification = require("../../model/Notification");

const {HttpError} = require("../../middleware/errorMiddleware");



//Creazione di nuovi profili da zero: Nome, email (preferibilmente istituzionale)
//se il nome è già collegato a un utente già esistente (o email) chiederà se vuole aggiungerlo al portale
//in questa maniera appariranno solo utenti con una mail verificata

//pending requests

//TODO-domanda al prof: l'account creato dal portal_admin è già full o deve fare richiesta al super_admin?
async function newUser(req,res,next) {
    const portal=req.portal;
    const {email, name, surname, password} = req.body;

    try {

        if (!email || !name || !surname || !password) {
            throw new HttpError("Email, name, surname and password must be specified for new user creation.",400)
            //return res.status(400).json({message: "Email, name, surname and password must be specified for new user creation."})
        }

        const realName = `${name} ${surname}`;

        const emailUsed = await BasicUser.findOne({email: email})
        if (emailUsed) {
            throw new HttpError("An account associated with this email already exists.",409)
            //return res.status(409).json({message: 'An account associated with this email already exists.'})
        }

        //TODO: dato che abbiamo chiarito col prof che il nome non è univoco, serve questo controllo?
        //la mia idea è di fornire al front-end una lista di utenti con medesimo nome e se serve allora l'admin può inviare la richiesta con addToPortal

        /*
        const alreadyUserByName = await BasicUser.find({realName: realName})
        if(alreadyUserByName){
            //lista completa utenti stesso nome
            return res.status(409).json({message:"Users with the same name already exist. ",usersWithSameName:alreadyUserByName})

        }
       TODO: chiedere al prof se è possibile mostrare una lista di utenti con lo stesso nome per poi chiedere se l'utente vuole creare lo stesso o meno
         */

            const user = await BasicUser.create({
                realName,
                email,
                password,
                verified: true,
                portals: portal._id //è creato da un admin del portale
            })

            portal.members.push(user._id)
            await portal.save()

            res.status(201).json({ok: true, message: "You created a new Account."})

    } catch (err) {
        next(err)
        //console.error(err.message);
        //res.status(500).json({error: "Internal Server Error"});
    }
}

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
            const newMember = await BasicUser.findById(newMemberId)
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
        const userToRemove = await BasicUser.findById(memberToRemoveId)
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

            const userToRemoveFull = await FullUser.findOne({basicCorrespondent: memberToRemoveId}).populate("groups").populate("expositions")


            if (userToRemoveFull) {
                await Promise.all(userToRemoveFull.expositions.map(async e=>{
                    if(e.portal.equals(portal._id)){
                        e.portal=null;
                        e.shareStatus="private"
                        e.reviewer={flag:false,user:null}
                        await e.save();

                        console.log("LOG DEBUG INDICE ESPOSIZIONE NEL PORTALE: ",portal.expositionsLinked.indexOf(e._id))
                        portal.expositionsLinked.splice(portal.expositionsLinked.indexOf(e._id),1)
                    }
                }))
                await portal.save()


                userToRemoveFull.groups = userToRemoveFull.groups.filter(g => g.populate !== portal._id)
                await userToRemoveFull.save()

                const portalGroups = await Group.find({portal: portal._id})
                if (portalGroups) {
                    await Promise.all(portalGroups.map(async pg => {
                        if(pg.members.find(userToRemoveFull._id)){
                            pg.members.splice(pg.members.indexOf(userToRemoveFull._id), 1);
                            await pg.save();
                        }else if(pg.admins.find(userToRemoveFull._id)) {
                            pg.admins.splice(pg.members.indexOf(userToRemoveFull._id), 1);
                            await pg.save();
                        }
                    }))
                }
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

//TODO: chiedere al prof
/*async function editUser(req, res, next){
    const userId = req.params.id;
    const body = req.body;
    const portal = req.portal

    try{
        const user = await BasicUser.findById(userId);
        if(!user){
            throw new HttpError("User not found",404)
            //return res.status(404).json({message: "The user doesn't exist."})
        }

        if(!portal.members.includes(user._id)) throw new HttpError('User not a member of the portal or is an admin',409)

        //TODO: è necessario che il portal_admin possa modificare l'alias dell'utente?
        //const userFull = await FullUser.findOne({basicCorrespondent: user._id}) //serve per l'alias

        //profile
        //controllo per verificare che nella richiesta non venga cancellato il nome di un utente
        if(body.name){
            user.realName = body.name;
        }

        if(userFull && body.alias){
            userFull.alias = body.alias; //campo di FullUser
            await userFull.save()
        }

        if(body.email){
            user.email = body.email;
        }

        //la password non viene modificata se il campo viene lasciato vuoto
        if(body.password){
           user.password = body.password;
        }

        //TODO: settings - da completare perchè presenta la questione degli annunci da vedere
        if(!body.language){
            throw new HttpError("Select a language",400)
            //return res.status(400).json({message: "Select a language"})
        } else {
            user.settings.language = body.language
        }

        await user.save()

        res.status(200).json({ok:true,message:"User updated successfully."})
    }catch(err){
        next(err)
        //console.error(err);
        //res.status(500).json({error: "Internal Server Error"});
    }
}
*/
//TODO: chidere a F se ha senso tenerlo dato che il prof ha detto che basta 1 portale per ogni casistica e reputo strano che un admin possa chiedere che un utente diventi membro di un altro portale
/*async function addToOtherPortal(req,res,next){
    //serve il middleware solo per assicurarsi che il portal admin sia effettivamente portal admin e possa eseguire questa azione sull'utente
    //del quale disponiamo dell'id (req.params.id)
    const portal=req.portal;
    const userId=req.params.id;
    const otherPortal=req.params.otherPortal

    try{
        if(!portal.members.find(memberId=>String(memberId)===userId)){
            throw new HttpError("Not Authorized to operate on this User",401)
            //return res.status(401).json({message: "Not authorized to operate on this User."});
        }

        if(otherPortal.members.find(memberId=>String(memberId)===userId)){
            throw new HttpError("User already in this Portal",409)
            //return res.status(409).json({message: "User already in this Portal."})
        }

        //manca implementazione super admin

    }catch(err){
        next(err)
        //console.log("Errore: ",err)
        //res.status(500).json({error: "An error occured while adding this user to another portal."})
    }

}*/

async function getPortalMembers(req, res, next){
    const portal = req.portal

    try{
        const users = await Promise.all(portal.members.map(member => BasicUser.findById(member)))

        res.status(200).json({ok: true, data: users});

    }catch(err){
        next(err)
        //console.error(err);
        //res.status(500).json({error: "Internal Server Error"});
    }
}

async function createGroup(req, res, next){
    const portal = req.portal
    const {title, description} = req.body;
    try{
        //controllo sul body
        if(!title) throw new HttpError('Title is required',400)
        if(!description) throw new HttpError('Description is required',400)

        await Group.create({
            title,
            description,
            portal: portal._id
        })

        res.status(201).json({ok: true, message:'Group create successfully'})
    }catch(err){
        next(err)
    }
}

//funzione per visualizzare tutti i gruppi creati dal portale
//TODO: vedere se serve
/*async function getGroups(req, res, next){
    const portal = req.portal
    try{
        const groups = await Group.find({portal: portal._id})

        res.status(200).json({ok: true, data: groups});
    }catch(err){
        next(err);
    }
}*/

async function deleteGroup(req, res, next){
    const portal = req.portal
    const groupId = req.params.grId;

    try{
        const group = await Group.findById(groupId)
        if(!group) throw new HttpError("Group not found",404)

        if(group.admins.length!==0){
            await Promise.all(group.admins.map(async admin => {
                const fullAccount = await FullUser.findOne({basicCorrespondent: admin})
                const index = fullAccount.groups.findIndex(g => g.equals(group._id))
                fullAccount.groups.splice(index,1)
                await fullAccount.save()
            }))
        }
        if(group.members.length!==0){
            await Promise.all(group.members.map(async member => {
                const fullAccount = await FullUser.findOne({basicCorrespondent: member})
                const index = fullAccount.groups.findIndex(g => g.equals(group._id))
                fullAccount.groups.splice(index,1)
                await fullAccount.save()
            }))
        }

        //elimino l'oggetto Notifica legata ad esso
        await Notification.deleteOne({receiver: group._id})

        await Group.findByIdAndDelete(groupId)

        res.status(200).json({ok: true, message:'Group deleted successfully'})
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
    const reviewerToRemove=req.params.id
    try{
        //basic user può essere un reviewer
        if(!portal.reviewers.includes(reviewerToRemove)){
            throw new HttpError("User is not a Reviewer.",404)
        }

        portal.reviewers=portal.reviewers.filter(a=>a!==reviewerToRemove);
        await portal.save();


        const notification = await Notification.findOne({receiver: reviewerToRemove})
        if(notification){
            notification.backlog.push(`You're not a reviewer of ${portal.name} anymore. `)
            await notification.save() //sta qui
        } else {
            await Notification.create({
                receiver: reviewerToRemove,
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
        const adminAccount=await BasicUser.findById(adminId)
        const existingRequest = await Request.findOne({
            type: 'portal.delete',
            extra: portal._id
        });

        if (existingRequest) {
            throw new HttpError(`Request already made`, 409);
        }

        const superAdmins=await BasicUser.find({role:"super-admin"})
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

module.exports = {newUser, addToPortal, removeFromPortal, getPortalMembers, createGroup, deleteGroup, addReviewer,
    removeReviewer, selectReviewer, requestToRemovePortal}