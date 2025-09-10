const BasicUser = require("../../model/BasicUser");
const FullUser = require("../../model/FullUser");
const Request = require("../../model/Request");
const Group = require("../../model/Group")
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
                portals: portal._id //se è creato da un admin del portale
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

//TODO: vedere come implementare la ricerca se una richiesta simile è stata già mandata all'utente che si vuole aggiungere
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

            await Request.create({
                type: 'portal.addMember',
                sender: adminId, //<-
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
        if(portal.members.find(memberId=>String(memberId)===memberToRemoveId)){
            console.log(portal.members.indexOf(memberToRemoveId))
            portal.members.splice(portal.members.indexOf(memberToRemoveId),1);
            await portal.save();

            const userToRemove = await BasicUser.findById(memberToRemoveId)
            userToRemove.portals.splice(userToRemove.portals.indexOf(portal._id),1);
            await userToRemove.save()
        } else {
            throw new HttpError("User is not a member of the Portal",400)
            //return res.status(400).json({message: "L'utente non è membro del portale"})
        }

        //creo notifica che avvisa l'utente di essere stato rimosso dal portale
        const notification = await Notification.findOne({receiver: memberToRemoveId})
        if(notification){
            notification.backlog.push(`You were removed from the portal ${portal.name}`)
            await notification.save()
        } else {
            await Notification.create({
                receiver: memberToRemoveId,
                backlog: `You were removed from the portal ${portal.name}`
            })
        }


        //TODO: farlo anche per il portale

        res.status(200).json({ok:true,message:"User deleted from the members list."})
    }catch(err){
        next(err)
        //console.error(err);
        //res.status(500).send("Internal Server Error");
    }
}

//TODO: da sistemare sia qui che in newUser il fatto del fullAccount
async function editUser(req, res, next){
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

        //TODO: discutere, perchè se noi facciamo che quando un utente viene creato dal portal admin è già fullAccount
        const userFull = await FullUser.findOne({basicCorrespondent: user._id}) //serve per l'alias

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

        if(!userFull && user.approved){
            await FullUser.create({
                basicCorrespondent: userId,
                alias: body.alias?body.alias:""
            })
        }

        res.status(200).json({ok:true,message:"User updated successfully."})
    }catch(err){
        next(err)
        //console.error(err);
        //res.status(500).json({error: "Internal Server Error"});
    }
}

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

//TODO: chiedere se un gruppo può essere eliminato quando è privo di membri e senza connections
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

module.exports = {newUser, addToPortal, removeFromPortal, editUser, getPortalMembers, createGroup, deleteGroup}