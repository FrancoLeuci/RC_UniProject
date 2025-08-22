const Portal=require("../../model/Portal");

const basicUser = require("../../model/BasicUser");



//Creazione di nuovi profili da zero: Nome, email (preferibilmente istituzionale)
//se il nome è già collegato a un utente già esistente (o email) chiederà se vuole aggiungerlo al portale
//in questa maniera appariranno solo utenti con una mail verificata

//pending requests

//da trasformare in un middleware
async function portalAdmin(portalId,adminId,res){

        const portal = await Portal.findById(portalId)
        if(!portal){
            throw new Error("portalMissing")
        }
        const admin= portal.admins.find(admin => String(admin) === adminId)
        if(!admin) {
            throw new Error("adminMissing")
        }
        return portal

}

async function newUser(req,res) {
    const adminId = req.user.id; //dalla verifica del token
    const portalId = req.params.id;

    const {email, name, surname, password} = req.body;
    const realName = `${name} ${surname}`;

    try {

        const portal = await portalAdmin(portalId, adminId);
                if (!email || !name || !surname || !password) {
                    res.status(400).json({message: "Email, name, surname and password must be specified for new user creation."})
                }
                const emailUsed = await basicUser.findOne({email: email})
                if (!emailUsed) {
                    res.status(409).json({message: 'An account associatd with this email already exists.'})
                }

                const alreadyUserByName = await basicUser.findOne({realName: realName})
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
                const user = await basicUser.create({
                    realName,
                    email,
                    password,
                })
                console.log("Portal Admin created a new account.", user);

                res.status(201).send("You created a new Account.")
    } catch (err) {
        if (err.message === "portalMissing") {
            return res.status(404).send("Portal Not Found");
        }
        if (err.message === "adminMissing") {
            return res.status(401).send("Not Authorized.");
        }
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
}


async function addToPortal(req,res){
    const adminId=req.user.id; //dalla verifica del token
    const portalId=req.params.id;
    const newMemberId=req.params.id;
    try{
        const portal=await portalAdmin(portalId,adminId);
        if(portal.members.find(memberId=>String(memberId)===newMemberId)){
            res.status(409).send("User already a member of the Portal.");
        }

        portal.members.push(newMemberId);
        await portal.save();
        console.log("Componente aggiunto alla lista di membri del portale.")
        res.status(201).json({ok:true,message:"Added to the members list."})
    }catch{

    }
}

async function removeFromPortal(req,res){
    const adminId=req.user.id; //dalla verifica del token
    const portalId=req.params.id;
    const memberToRemoveId=req.params.id;
    try{
        const portal=await portalAdmin(portalId,adminId);
        if(portal.members.find(memberId=>String(memberId)===memberToRemoveId)){
            portal.members.filter(memberId=>String(memberId)!==memberToRemoveId);
            await portal.save();
            console.log("Componente rimosso dalla lista di membri del portale.")
        }



        res.status(200).json({ok:true,message:"Deleted from the members list."})
    }catch{

    }
}

