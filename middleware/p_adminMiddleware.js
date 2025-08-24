const Portal=require("../model/Portal");



async function portalAdminCheck(req,res,next){
    const adminId = req.user.id; //dalla verifica del token
    const portalId = req.params.portal; //nella richiesta

    const portal = await Portal.findById(portalId)
    if(!portal){
        res.status(404).send("Portal Not Found.")
    }
    const admin= portal.admins.find(admin => String(admin) === adminId)
    if(!admin) {
        res.status(401).send("Not Authorized.")
    }
    req.portal=portal;
    next()
}

module.exports = {portalAdminCheck};