const FullUser=require("../model/FullUser")
const Exposition=require("../model/Exposition")


async function expoCheck(req,res,next) {
    const userId = req.user.id
    const expoId = req.params.expoId;
    try {
        const expo = await Exposition.findById(expoId);
        const fullAccount = await FullUser.findOne({basicCorrespondent: userId})

        if (!expo) {
            throw new Error("expo")
        } else if (!fullAccount) {
            throw new Error('noFull')
        } else {
            req.expo = expo
            req.full = fullAccount
            next()
        }

    } catch (err) {
        switch (err.message) {
            case "expo":
                res.status(404).send("Not Found");
                break
            case "noFull":
                res.status(403).send("Not a Full Account. Can't edit/create an exposition. ");
                break;
            default:
                res.status(500).send("Internal Server Error.");
        }
        console.error("Middleware ExpositionMIddleware - ERRORE: ",err)
    }
}

module.exports = expoCheck