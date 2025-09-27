const mongoose = require('mongoose')

const Group = require('../model/Group');
const BasicUser = require('../model/BasicUser');
const FullUser = require('../model/FullUser');
const Portal = require('../model/Portal');
const Request = require('../model/Request');
const Notification = require('../model/Notification');

const {HttpError} = require('../middleware/errorMiddleware');

// funzione che può essere gestita da un portal_admin del portale o da un group_admin
// serve per modificare la descrizione, la visibilità e i metadati(non ancora implementati mi pare -> chiedere conferma)
async function groupEdit(req, res, next){
    const group = req.group
    const {description, visibility} = req.body;
    try{
        if(description) group.description = description
        if(visibility) group.visibility = visibility
        await group.save()

        res.status(200).json({ok: true, message:'Group updates successfully'})
    }catch(err){
        next(err);
    }
}

//TODO: chiedere se anche qui l'utente deve accettare una richiesta per divenire un admin o se solo un membro già del gruppo può divenire tale, e se un admin può fare parte di un gruppo
//può essere svolta sia dai portal_admin che dai group_admin
//serve per aggiungere gli admin del gruppo
async function addAdmin(req, res, next){
    const group = req.group;
    const newAdminId = req.params.id
    try{
        //controllo sull'utente che viene aggiunto
        const newAdmin = await BasicUser.findById(newAdminId)
        if(!newAdmin) throw new HttpError('User not found', 404)
        if(group.admins.includes(newAdminId)) throw new HttpError('User is already an admin', 409)
        if(!group.members.includes(newAdminId)) throw new HttpError('User is not a member of the group', 400)
        const isFull = await FullUser.findOne({basicCorrespondent: newAdminId})
        if(!isFull) throw new HttpError('User does not have a full account', 400)

        //aggiungo nella lista degli admins
        group.admins.push(newAdminId)
        const index = group.members.findIndex(member => String(member)===newAdminId)
        group.members.splice(index,1)

        //notifica che avvisi l'utente di essere diventato un admin del gruppo
        const notification = await Notification.findOne({receiver: newAdminId})
        if(notification){
            notification.backlog.push(`You become an admin of the group ${group.title}`)
            await notification.save()
        } else {
            await Notification.create({
                receiver: newAdminId,
                backlog: `You become an admin of the group ${group.title}`
            })
        }

        await group.save()

        res.status(200).json({ok: true, message:"User add as admin of the group"})
    }catch(err){
        next(err);
    }
}

// funzione che può essere gestita da un portal_admin del portale o da un group_admin
// serve per inviare la richiesta ad un utente del portale (che ha creato il gruppo) di diventare un membro del gruppo
async function addMember(req, res, next){
    const userId = req.user.id;
    const group = req.group;
    const newMemberId = req.params.id
    try{
        //controllo sull'utente che viene aggiunto
        const newMember = await BasicUser.findById(newMemberId)
        if(!newMember) throw new HttpError('User not found', 404)

        const existingRequest = await Request.findOne({
            receiver: newMember._id,
            type: 'group.addMember',
            extra: group._id
        });

        if (existingRequest) {
            throw new HttpError(`Request already made`, 409);
        }

        const portal = await Portal.findById(group.portal)
        if(!portal.members.includes(newMemberId)) throw new HttpError('User is not a member of the portal', 400)

        if(group.admins.includes(newMemberId)) throw new HttpError('User is already an admin of the group', 409)
        if(group.members.includes(newMemberId)) throw new HttpError('User is already a member of the group', 409)

        const isFull = await FullUser.findOne({basicCorrespondent: newMemberId})
        if(!isFull) throw new HttpError('User does not have a full account', 400)

        //creo la request
        await Request.create({
            sender: userId,
            receiver: newMemberId,
            type: "group.addMember",
            content: `${group.title} has invited ${newMember.realName} to become a member of the group`,
            extra: group._id
        })

        res.status(200).json({ok: true, message:"Request send successfully"})
    }catch(err){
        next(err)
    }
}

//TODO: sia portal_admin che group_admin possono rimuovere gli admin del gruppo
async function removeMember(req, res, next){
    const group = req.group;
    const memberToRemoveId = req.params.id
    try{
        if(!group.members.includes(memberToRemoveId)) throw new HttpError('User is not a member',400)

        //elimino l'utente dal gruppo
        let index = group.members.findIndex(member => member.equals(memberToRemoveId))
        group.members.splice(index,1)
        await group.save()

        //rimuovo il gruppo dalla lista dell'utente
        const memberToRemoveFull = await FullUser.findOne({basicCorrespondent: memberToRemoveId})
        index = memberToRemoveFull.groups.findIndex(group => group.equals(group._id))
        memberToRemoveFull.groups.splice(index,1)
        await memberToRemoveFull.save()

        //creo notifica che avvisa l'utente di essere stato rimosso dal gruppo
        let notification = await Notification.findOne({receiver: memberToRemoveId})
        if(notification){
            notification.backlog.push(`You are removed from the group ${group.title}`)
            await notification.save()
        } else {
            await Notification.create({
                receiver: memberId,
                backlog: `You are removed from the group ${group.title}`
            })
        }

        //creo notifica che avvisa il gruppo
        notification = await Notification.findOne({receiver: group._id})
        const memberToRemove = await BasicUser.findById(memberToRemoveId)
        if(notification){
            notification.backlog.push(`${memberToRemove.realName} has been removed from the group`)
            await notification.save()
        } else {
            await Notification.create({
                receiver: group._id,
                backlog: `${memberToRemove.realName} has been removed from the group`
            })
        }

        res.status(200).json({ok: true, message:"The user is removed successfully from the group"})
    }catch(err){
        next(err)
    }
}

//eseguibile in base alla visibilità
async function getGroup(req, res, next){
    const userId = req.user.id;
    const groupId = req.params.grId
    try{
        const group = await Group.findById(groupId)
        if(!group){
            throw new HttpError('Group not found', 404)
        }

        const portal = await Portal.findById(group.portal)
        const isSuperAdmin = await BasicUser.findById(userId)

        if(!portal.admins.includes(userId)){
            const fullUser = await FullUser.findOne({basicCorrespondent: userId})
            if(!fullUser)throw new HttpError("You are Not Authorized to access this group's info.",403);
            const isAdmin = group.admins.includes(fullUser._id)
            const isMember = group.members.includes(fullUser._id)
            if(!isAdmin&&!isMember&&!isSuperAdmin.role==='super-admin') throw new HttpError('You are Not Authorized',401)
        }

        res.status(200).json({ok: true, data: group})
    }catch(err){
        next(err)
    }
}
//funzione grazie alla quale il group admin cancella il gruppo
//passa per il middleware dei gruppi che controlla se user che fa richiesta è group admin e restituisce il group

async function groupAdminGroupDelete(req,res,next){
    const group = req.group;
    try{
        await group.populate("members").populate("admins")

        await Promise.all(group.members.map(async member=>{
            member.groups.splice(member.groups.indexOf(group._id),1)
            await member.save()

            const notification = await Notification.findOne({receiver:member.basicCorrespondent})
              if(notification){
                notification.backlog.push(`${group.title} has been deleted.`)
                await notification.save()
            } else {
                await Notification.create({
                    receiver: member.basicCorrespondent,
                    backlog: `${group.title} has been deleted.`
                })
            }
        }))

        await Promise.all(group.admins.map(async admin=>{
            admin.groups.splice(admin.groups.indexOf(group._id),1)
            await admin.save()

            const notification = await Notification.findOne({receiver:admin.basicCorrespondent})
            if(notification){
                notification.backlog.push(`${group.title} has been deleted.`)
                await notification.save()
            } else {
                await Notification.create({
                    receiver: admin.basicCorrespondent,
                    backlog: `${group.title} has been deleted.`
                })
            }
        }))


        const notification = await Notification.findOne({receiver:group.portal})
        if(notification){
            notification.backlog.push(`${group.title} has been deleted.`)
            await notification.save()
        } else {
            await Notification.create({
                receiver: group.portal,
                backlog: `${group.title} has been deleted.`
            })
        }

        await Group.findByIdAndDelete(group._id)

        res.send('Group eliminated')

    }catch(err){
        next(err)
    }
}


module.exports = {groupEdit, addAdmin, addMember, getGroup, removeMember, groupAdminGroupDelete}