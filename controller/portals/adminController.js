const Portal=require("../../model/Portal");

const BasicUser = require("../../model/BasicUser");

const FullUser = require("../../model/FullUser");



//Creazione di nuovi profili da zero: Nome, email (preferibilmente istituzionale)
//se il nome è già collegato a un utente già esistente (o email) chiederà se vuole aggiungerlo al portale
//in questa maniera appariranno solo utenti con una mail verificata

//pending requests


async function newUser(req,res) {
    const portal=req.portal;
    const {email, name, surname, password} = req.body;
    const realName = `${name} ${surname}`;

    try {

                if (!email || !name || !surname || !password) {
                    res.status(400).json({message: "Email, name, surname and password must be specified for new user creation."})
                }
                const emailUsed = await BasicUser.findOne({email: email})
                if (!emailUsed) {
                    res.status(409).json({message: 'An account associatd with this email already exists.'})
                }

                const alreadyUserByName = await BasicUser.findOne({realName: realName})
                if (alreadyUserByName) {
                    const memberOfPortal = portal.members.find(memberId => memberId === alreadyUserByName._id)
                    if (memberOfPortal) {
                        res.status(409).json({
                            error: "UserAlreadyInPortal",
                            message: "User with the same name is a member of the Portal."
                        })
                    }
                    res.status(409).json({
                        error: "UserNameExistsAlready",
                        message: "User already exists, but is not a member of the Portal."
                    })
                    //TODO: creare messaggio per la richiesta dell'admin all'utente di invito al portale
                }
                const user = await BasicUser.create({
                    realName,
                    email,
                    password,
                    portals: portal._id //se è creato da un admin del portale
                })
                console.log("Portal Admin created a new account.", user);

                res.status(201).send("You created a new Account.")
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
}

async function addToPortal(req,res){

    const portal=req.portal;
    const newMemberId=req.params.id;
    try{
        if(portal.members.find(memberId=>String(memberId)===newMemberId)){
            res.status(409).send("User already a member of the Portal.");
        }

        portal.members.push(newMemberId);
        await portal.save();
        console.log("Componente aggiunto alla lista di membri del portale.")
        res.status(201).json({ok:true,message:"Added to the members list."})
    }catch(err){
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
}

async function removeFromPortal(req,res){
    const portal=req.portal;
    const memberToRemoveId=req.params.id;
    try{
        if(portal.members.find(memberId=>String(memberId)===memberToRemoveId)){
            portal.members.filter(memberId=>String(memberId)!==memberToRemoveId);
            await portal.save();
            console.log("Componente rimosso dalla lista di membri del portale.")
        } else {
            res.status(400).json({message: "L'utente non è membro del portale"})
        }


        res.status(200).json({ok:true,message:"Deleted from the members list."})
    }catch(err){
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
}

async function editUser(req, res){
    const userId = req.params.id;
    const body = req.body;

    try{
        const user = await BasicUser.findById(userId);
        if(!user){res.status(404).send("The user doesn't exist.")}
        const userFull = await FullUser.find({basicCorrespondent: user._id}) //serve per l'alias


        //profile
        //controllo per verificare che nella richiesta non venga cancellato il nome di un utente
        if(body.name){
            user.realName = body.name;
        }

        if(body.alias){
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
            res.status(400).json({message: "Select a language"})
        } else {
            user.settings.language = body.language
        }

        await user.save()

        res.status(200).json({ok:true,message:"User updated successfully."})
    }catch(err){
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
}

async function addToOtherPortal(req,res){
    //serve il middleware solo per assicurarsi che il portal admin sia effettivamente portal admin e possa eseguire questa azione sull'utente
    //del quale disponiamo dell'id (req.params.id)
    const portal=req.portal;
    const userId=req.params.id;
    const otherPortal=req.params.otherPortal
    try{
        if(!portal.members.find(memberId=>String(memberId)===userId)){
            res.status(401).send("Not authorized to operate on this User.");
        }

        if(otherPortal.members.find(memberId=>String(memberId)===userId)){
            res.status(409).send("User already in this Portal.")
        }

        //manca implementazione super admin

    }catch(err){
        console.log("Errore: ",err)
        res.status(500).send("An error occured while adding this user to another portal.")
    }

}

async function getPortalMembers(req, res){
    const portal = req.portal

    try{

        res.json(portal.members);

    }catch(err){
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
}

module.exports = {newUser, addToPortal, removeFromPortal, editUser, getPortalMembers, addToOtherPortal}