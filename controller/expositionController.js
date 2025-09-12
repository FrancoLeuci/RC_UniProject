//modifica metadati di un'esposizione
//funzione di creazione dell'esposizione -> titolo,descrizione, ecc....
//funzione che gestisce la lista dei co-autori -> aggiungere(richiesta) e rimuovere
//funzione di richiesta di collegare l'esposizione ad un portale
//funzione di richiesta di review

const FullUser = require("../model/FullUser");
const Exposition=require("../model/Exposition");

const {HttpError} = require("../middleware/errorMiddleware")

async function createExposition(req,res,next){
    const userId=req.user.id;
    //servono nella richiesta nel body (minimo indisp)
    const {title,abstract,copyright,license}=req.body;


    try{
        const isFull = await FullUser.findOne({basicCorrespondent: userId});
        if(!isFull){
            throw new HttpError("You are not a Full User, so you can't create an Exposition.",403)
        }

        if(!title||!abstract||!copyright||!license) throw new HttpError("All data specified are required. ",400)

        const newExpo=await Exposition.create({
            title,
            abstract,
            copyright,
            license,
            authors:{
                role:"creator",
                userId
            }
        })

        isFull.expositions.push(newExpo._id)
        await isFull.save()

        res.status(201).send("Exposition created successfully.")
    }catch(err){
        next(err)
    }
}

async function setExpoPublic(req,res,next){
    const expo=req.expo
    const fullAccount=req.fullAccount

    try{
        const creator=expo.authors.find(a=>a.role==="creator")

        if(String(creator.userId)===fullAccount._id){
            expo.published=true;
            await expo.save()
        }
    }catch(err){
        next(err)
    }
}

module.exports = {createExposition, setExpoPublic}