const Portal=require("../model/Portal");



async function portalAdminCheck(req,res,next){
    const adminId = req.user.id; //dalla verifica del token
    const portalId = req.params.portal; //nella richiesta
console.log(adminId);

    try{
        const portal = await Portal.findById(portalId)
        const isAdmin= portal.admins.find(admin => String(admin) === adminId)

        console.log("Fuori dall'if: ",isAdmin)
        if(!portal){
            throw new Error("portalError")
        }else if(!isAdmin) {
            console.log("Dentro l'if: ",isAdmin)
            throw new Error("adminError")
        }else{
            // TODO: controllo dei membri del portale sulle funzioni del superAdmin
            req.portal=portal;
            next()
        }
    }catch(err){
        switch (err.message){
            case "portalError":
                res.status(404).send("Portal Not Found. ")
                break
            case "adminError":
                res.status(403).send("Not an admin - p_adminMiddleware. ")
                break
            default:
                res.status(500).send("Internal Server Error")
        }
        console.error(err);
    }
}

module.exports = {portalAdminCheck};