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
    const userId = req.user.id;
    const groupId = req.params.grId;
    const {description, visibility} = req.body;
    try{
        //ricavo le informazioni del gruppo
        const group = await Group.findById(groupId)
        if(!group) throw new HttpError('Group not found', 404);

        //verifico se l'utente che ha fatto richiesta sia un admin del gruppo
        let isAdmin = group.admins.includes(userId)
        if(!isAdmin) {
            //altrimenti controllo se è un admin del portale
            const portal = await Portal.findById(group.portal)
            isAdmin = portal.admins.includes(userId)
            if(!isAdmin) throw new HttpError('You are not Authorized to edit the Group', 401)
        }

        //ora possono essere applicate le modifiche sul gruppo
        if(description) group.description = description
        if(visibility) group.visibility = visibility
        await group.save()

        res.status(200).json({ok: true, message:'Group updates successfully'})
    }catch(err){
        next(err);
    }
}

//TODO: chiedere se anche qui l'utente deve accettare una richiesta per divenire un admin o se solo un membro già del gruppo può divenire tale, e se un admin può fare parte di un gruppo
//può essere svolta (per il momento) solo dai portal_admin
//serve per aggiungere gli admin del gruppo
async function addAdmin(req, res, next){
    const userId = req.user.id;
    const groupId = req.params.grId;
    const newAdminId = req.params.id
    try{
        const group = await Group.findById(groupId)
        if(!group) throw new HttpError('Group not found', 404);

        const portal = await Portal.findById(group.portal)
        const isAdmin = portal.admins.includes(userId)
        if(!isAdmin) throw new HttpError('You are not Authorized to edit the Group', 401)

        //controllo sull'utente che viene aggiunto
        const newAdmin = await BasicUser.findById(newAdminId)
        if(!newAdmin) throw new HttpError('User to add as admin not exist', 404)
        if(portal.admins.includes(newAdminId)) throw new HttpError('User to add as admin is an admin of the portal', 400)
        if(!portal.members.includes(newAdminId)) throw new HttpError('User to add as admin is not a member of the portal', 400)
        if(group.admins.includes(newAdminId)) throw new HttpError('The user is already an admin of the group', 409)
        const isFull = await FullUser.findOne({basicCorrespondent: newAdminId})
        if(!isFull||!newAdmin.approved) throw new HttpError('The user that you want to add as admin does not have a full account', 400)

        //aggiungo nella lista degli admins
        group.admins.push(newAdminId)
        if(group.members.includes(newAdminId)){
            const index = group.members.findIndex(member => String(member)===newAdminId)
            group.members.splice(index,1)
        } else {
            isFull.groups.push(group._id)
            await isFull.save()
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
    const groupId = req.params.grId;
    const newMemberId = req.params.id
    try{
        const group = await Group.findById(groupId)
        if(!group) throw new HttpError('Group not found', 404);

        const portal = await Portal.findById(group.portal)
        let isAdmin = portal.admins.includes(userId)
        if(!isAdmin){
            isAdmin = group.admins.includes(userId)
            if(!isAdmin){
                throw new HttpError('You are not Authorized to add a member in the Group', 401)
            }
        }

        //controllo sull'utente che viene aggiunto
        const newMember = await BasicUser.findById(newMemberId)
        if(!newMember) throw new HttpError('User to add as member not exist', 404)
        if(portal.admins.includes(newMemberId)) throw new HttpError('User to add as member is an admin of the portal', 400)
        if(!portal.members.includes(newMemberId)) throw new HttpError('User to add as member is not a member of the portal', 400)
        if(group.admins.includes(newMemberId)) throw new HttpError('The user is already an member of the group', 409)
        if(group.members.includes(newMemberId)) throw new HttpError('The user is already a member of the group', 409)
        const isFull = await FullUser.findOne({basicCorrespondent: newMemberId})
        if(!isFull||!newMember.approved) throw new HttpError('The user that you want to add as member does not have a full account', 400)

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

async function removeMember(req, res, next){
    const userId = req.user.id;
    const groupId = req.params.grId;
    const memberId = req.params.id
    try{
        const group = await Group.findById(groupId)
        if(!group) throw new HttpError('Group not found', 404);

        const portal = await Portal.findById(group.portal)

        if(group.members.includes(memberId)){
            //se è un membro può essere eliminato sia da portal che da group admins
            const isAdminG = group.admins.includes(userId)
            const isAdminP = portal.admins.includes(userId)
            if(isAdminG||isAdminP){
                const memberFull = await FullUser.findOne({basicCorrespondent: memberId})
                memberFull.groups.splice(memberFull.groups.findIndex(group._id),1)
                await memberFull.save()
                group.members.splice(group.members.findIndex(userId),1)
                await group.save()
            } else {
                throw new HttpError('You are not Authorized', 401)
            }
        } else if(group.admins.includes(memberId)){
            //se è un admin può essere eliminato solo da un portal admin
            const isAdminP = portal.admins.includes(userId)
            if(isAdminP){
                const memberFull = await FullUser.findOne({basicCorrespondent: memberId})
                memberFull.groups.splice(memberFull.groups.findIndex(group._id),1)
                await memberFull.save()
                group.admins.splice(group.admins.findIndex(userId),1)
                await group.save()
            } else {
                throw new HttpError('You are not Authorized', 401)
            }
        } else {
            throw new HttpError('The user is not a member/admin of the group', 400)
        }

        //creo notifica che avvisa l'utente di essere stato rimosso dal gruppo
        const notification = await Notification.findOne({receiver: memberId})
        if(notification){
            notification.backlog.push(`You are removed from the group ${group.title}`)
        } else {
            await Notification.create({
                receiver: memberId,
                backlog: `You are removed from the group ${group.title}`
            })
        }
        await notification.save()

        res.status(200).json({ok: true, message:"The user is removed successfully from the group"})
    }catch(err){
        next(err)
    }
}

//eseguibile in base alla visibilità
async function getGroup(req, res, next){
    const {userId} = req.body;
    const groupId = req.params.grId
    try{
        const group = await Group.findById(groupId)
        if(!group){
            throw new HttpError('Group not found', 404)
        }


        if(group.visibility === 'private'){
            if(!userId) throw new HttpError('You are not Authorized',401)

            const isMember = group.members.includes(userId)
            if(!isMember){
                let isAdmin = group.admins.includes(userId)
                if(!isAdmin){
                    const portal = await Portal.findById(group.portal)
                    isAdmin = portal.admins.includes(userId)
                    if(!isAdmin) throw new HttpError('You are not Authorized',401)
                }
            }
            return res.status(200).json({ok: true, data: group})
        } else if (group.visibility === 'website'){
            if(!userId) throw new HttpError('You are not Authorized',401)

            const isUser = await BasicUser.findById(userId)
            if(!isUser) throw new HttpError('You are not Authorized',401)
            return res.status(200).json({ok: true, data: group})
        }

        res.status(200).json({ok: true, data: group})
    }catch(err){
        next(err)
    }
}

module.exports = {groupEdit, addAdmin, addMember, getGroup, removeMember}