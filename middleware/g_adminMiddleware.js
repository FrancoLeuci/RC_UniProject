//stessa funzionalità di p_adminMiddleware
const Group = require('../model/Group')
const FullUser=require("../model/FullUser");

async function groupAdminCheck(req,res,next){
    const adminId = req.user.id; //dalla verifica del token
    const groupId = req.params.grId; //nella richiesta

    try{
        const adminFull= await FullUser.findOne({basicCorrespondent:adminId})
        if(!adminFull){
            throw new Error("fullError")
        }
        const group = await Group.findById(groupId)
        const isAdminG= group.admins.includes(adminFull._id);

        if(!group){
            throw new Error("groupError");
        }else if(!isAdminG) {
            throw new Error("adminError");
        }else{
            req.group=group;
            next()
        }
    }catch(err){
        switch (err.message){
            case "fullError":
                res.status(404).send("User does not have a Full account.")
                break
            case "groupError":
                res.status(404).send("Group Not Found. ")
                break
            case "adminError":
                res.status(403).send("Not an admin - g_adminMiddleware. ")
                break
            default:
                res.status(500).json({message: "Internal Server Error", error: err})
        }
        console.log(err)
    }
}

module.exports = {groupAdminCheck};