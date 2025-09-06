const BasicUser = require("../../model/BasicUser");
const FullUser = require("../../model/FullUser");
const Request = require("../../model/Request");

const {HttpError} = require("../../middleware/errorMiddleware");



//Creazione di nuovi profili da zero: Nome, email (preferibilmente istituzionale)
//se il nome è già collegato a un utente già esistente (o email) chiederà se vuole aggiungerlo al portale
//in questa maniera appariranno solo utenti con una mail verificata

//pending requests


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

        const alreadyUserByName = await BasicUser.findOne({realName: realName})
        if (alreadyUserByName !== null) {
            const memberOfPortal = portal.members.find(memberId => memberId.equals(alreadyUserByName._id))
            const adminOfPortal = portal.admins.find(adminId => adminId.equals(alreadyUserByName._id));
            if (memberOfPortal || adminOfPortal) {
                throw new HttpError("User with the same name is a member of the Portal",409)
                /*return res.status(409).json({
                    error: "UserAlreadyInPortal",
                    message: "User with the same name is a member of the Portal."
                })*/
            }
            throw new HttpError("User already exists, but is not a member of the Portal",409)
            /*return res.status(409).json({
                error: "UserNameExistsAlready",
                message: "User already exists, but is not a member of the Portal."
            })*/
            //TODO: creare messaggio per la richiesta dell'admin all'utente di invito al portale
        }

        const user = await BasicUser.create({
            realName,
            email,
            password,
            verified: true,
            portals: portal._id //se è creato da un admin del portale
        })
        console.log("Portal Admin created a new account.", user);

        portal.members.push(user._id)
        await portal.save()

        res.status(201).json({ok: true, message: "You created a new Account."})
    } catch (err) {
        next(err)
        //console.error(err.message);
        //res.status(500).json({error: "Internal Server Error"});
    }
}

async function addToPortal(req,res,next){
    const portal=req.portal;
    const newMemberId=req.params.id;
    const adminId = req.user.id

    console.log(portal)

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

            console.log("Componente aggiunto alla lista di membri del portale.")
            return res.status(201).json({ok:true, message:"Added to the members list."})
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
            console.log("Componente rimosso dalla lista di membri del portale.")
        } else {
            throw new HttpError("User is not a member of the Portal",400)
            //return res.status(400).json({message: "L'utente non è membro del portale"})
        }


        res.status(200).json({ok:true,message:"Deleted from the members list."})
    }catch(err){
        next(err)
        //console.error(err);
        //res.status(500).send("Internal Server Error");
    }
}

async function editUser(req, res, next){
    const userId = req.params.id;
    const body = req.body;

    try{
        const user = await BasicUser.findById(userId);
        if(!user){
            throw new HttpError("User not found",404)
            //return res.status(404).json({message: "The user doesn't exist."})
        }

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


        //roles
        user.approved = !body.approved; //se la checkbox è true => campo approved diviene false e viceversa


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

async function addToOtherPortal(req,res,next){
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

}

async function getPortalMembers(req, res, next){
    const portal = req.portal

    try{
        const users = await Promise.all(portal.members.map(memeber => BasicUser.findById(member)))

        res.status(200).json({ok: true, data: users});

    }catch(err){
        next(err)
        //console.error(err);
        //res.status(500).json({error: "Internal Server Error"});
    }
}

async function createGroup(req, res, next){

}

module.exports = {newUser, addToPortal, removeFromPortal, editUser, getPortalMembers, addToOtherPortal}