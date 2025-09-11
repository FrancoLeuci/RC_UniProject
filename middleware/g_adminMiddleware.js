//stessa funzionalità di p_adminMiddleware
const Group = require('../model/Group')
const Portal=require("../model/Portal");

async function groupAdminCheck(req,res,next){
    const adminId = req.user.id; //dalla verifica del token
    const groupId = req.params.grId; //nella richiesta

    try{
        const group = await Group.findById(groupId)
        const isAdminG= group.admins.includes(adminId);

        //TODO: discutere meglio sul ruolo dei portal_admin nei gruppi
        const portal = await Portal.findById(group.portal)
        const isAdminP = portal.admins.includes(adminId);

        if(!group){
            throw new Error("groupError");
        }else if(!isAdminG&&!isAdminP) {
            throw new Error("adminError");
        }else{
            req.group=group;
            next()
        }
    }catch(err){
        switch (err.message){
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