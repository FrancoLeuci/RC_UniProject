const Portal=require("../model/Portal");



async function portalAdminCheck(req,res,next){
    const adminId = req.user.id; //dalla verifica del token
    const portalId = req.params.portal; //nella richiesta

    try{
        const portal = await Portal.findById(portalId)
        if(!portal){
            res.status(404).send("Portal Not Found.")
        }
        const admin= portal.admins.find(admin => String(admin) === adminId)
        if(!admin) {
            res.status(401).send("Not Authorized.")
        }

        // TODO: controllo dei membri del portale sulle funzioni del superAdmin

        req.portal=portal;
        next()
    }catch(err){
        console.error(err);
    }
}

module.exports = {portalAdminCheck};