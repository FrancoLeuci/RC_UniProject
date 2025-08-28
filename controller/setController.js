const Set = require("../model/Set")
const Media = require("../model/Media")
const BasicUser = require("../model/BasicUser")

async function createSet(req, res){

    try{
        const {setName}=req.body;
        if(!setName){
            console.log("LOG: NOME DEL SET NON PRESENTE NELLA RICHIESTA DI CREAZIONE");
            return res.status(400).json({ok:false,message:"Can't create a Set without a name. "})
        }

        const set= await Set.create({
            setName,
            creator: req.user.id
        })

        console.log("LOG: ISTRUZIONE DI CREATE SUL SET:" + set)
        res.status(201).json({ok: true, message: "Set created successfully"})

    }catch(err){
        res.status(500).json({error: err.message, message: "Internal Server Error - setController - createSet"})
    }
}

async function modifySetByCreator(req, res){
    const setId=req.params.setId; //inserire in router
    try{

        const setToModify=await Set.findById(setId);
        const isCreator=String(setToModify.creator)===req.user.Id;
        if(!isCreator){
            return res.status(401).send("Not Authorized. Only the creator can modify this field/s. ")
        }
        
        const {setName,description,tags,keywords,visibility,otherUsersPermissions,portalsSharedWith}=req.body;
        if(!setName){
            res.send(400).send("Insert a valid name for the set. ")
        }
        setToModify.setName=setName;
        setToModify.description=description;
        setToModify.tags=setName;
        setToModify.keywords=setName;
        setToModify.visibility=setName;
        setToModify.portalsSharedWith=setName;


        //richiesta nel body deve essere un'array di oggetti {user,canEditSet}

        setToModify.otherUsersPermissions=otherUsersPermissions;
        
        
        await setToModify.save();
    }catch(err){
        console.log("LOG: ERRORE IN MODIFYSETCREATOR -")
        res.status(500).json({error: err.message, message: "Internal Server Error - setController - modifyByCreatore"})
    }
    
}

module.exports = {createSet, modifySetByCreator}