const Set = require("../model/Set")
const {Media} = require("../model/Media")
const mongoose=require("mongoose")
const basicUser=require("../model/BasicUser");

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

async function modifySet(req, res){
    //
    const setId=req.params.setId; //Inserire in router
    try{

        const setToModify=await Set.findById(setId);
        if(!setToModify){
            console.log("ERRORE NEL TROVARE IL SET DA MODIFICARE - MODIFYSET")
            console.log("id del set cercato: ",setId)
            return res.status(401).json({ok:false,message:"Set not found. "})

        }

        const isCreator=String(setToModify.creator)===req.user.id;
        const isEditor=setToModify.otherUsersPermissions.includes({user:req.user.id,canEditSet:true})
        if(isCreator||isEditor){
            const {setName,description,tags,keywords,visibility,otherUsersPermissions,portalsSharedWith}=req.body;
            if(!setName){
                res.status(401).json({ok:false,message:"name is required"})
            }
            setToModify.setName=setName;
            setToModify.description=description;
            setToModify.tags=tags;
            setToModify.keywords=keywords;

            if(isCreator){
                setToModify.visibility=visibility;
                setToModify.portalsSharedWith=portalsSharedWith.map(id=>new mongoose.Types.ObjectId(id))
                //richiesta nel body deve essere un'array di oggetti {user,boolean}
                setToModify.otherUsersPermissions=otherUsersPermissions;
            }
            await setToModify.save()
            return res.status(200).json({message: "Updated successfully"});
        }else{
            return res.status(401).json({ok:false,message:"Not Authorized. Only the creator can modify this field/s. "})
        }

    }catch(err){
        console.log("LOG: ERRORE IN MODIFYSET -")
        res.status(500).json({error: err.message, message: "Internal Server Error - setController - modifyByCreatore"})
    }
    
}

async function addFiles(req, res){
    //id del file dai media fornito nella richiesta, nei params
    try{

        const mediaToAdd = await Media.findById(req.params.mediaId)

        if(!mediaToAdd){
            return res.status(404).json({ok:false,message:"Media not found. "})
        }else if(!(String(mediaToAdd.uploadedBy===req.user.id))){
            return res.status(403).json({ok:false,message:"Forbidden - you are not the creator of this media. "})
        }
        const setToModify=await Set.findById(req.params.setId)
        if(!setToModify){
            res.status(404).json({ok:false,message:"Set not found. "})
        }

        const permission = setToModify.otherUsersPermissions.some(
            (p) => p.user.toString() === req.user.id && p.canEditSet === true
        );
        const isCreator=String(setToModify.creator)===req.user.id;
        if(!permission && !isCreator){
            console.log("LOG: L'UTENTE NON PUò EDITARE E NON è CREATORE DEL SET");
            res.status(401).json({ok:false,message:"Forbidden - you can't add this item from the media set. "})
        }

        setToModify.mediaList.push(req.params.mediaId);

        await setToModify.save();
        res.status(201).json({ok:true,message:"Media added to the media set. "})

    }catch(err){
        res.status(500).json({error: err.message, message: "Internal Server Error - setController - addFiles"})
    }

}

async function removeFiles(req, res){
    const userId=req.user.id;
    const setId=req.params.setId;
    const mediaId=req.params.mediaId;
    try{
        const setToModify=await Set.findById(setId)
        
        if(!setToModify){
            return res.status(404).json({ok:false,message:"Set not found. "})
        }
        const mediaToRemove=setToModify.mediaList.find(media => String(media)===mediaId);
        if(!mediaToRemove){
            return res.status(404).json({ok:false,message:"Media you are trying to cancel is not in the media set already. "})
        }
        const permission=setToModify.otherUsersPermissions.includes({user:new mongoose.Types.ObjectId(userId),canEditSet:true})
        const isCreator=String(setToModify.creator)===userId;
        if(!permission && !isCreator){
            console.log("LOG: L'UTENTE NON PUò EDITARE E NON è CREATORE DEL SET");
            return res.status(401).json({ok:false,message:"Forbidden - you can't remove this item from the media set. "})
        }

        setToModify.mediaList.splice(setToModify.mediaList.indexOf(mediaToRemove),1);

        await setToModify.save();
        res.status(201).json({ok:true,message:"Media removed from the media set. "})


    }catch(err){
        res.status(500).json({error: err.message, message: "Internal Server Error - setController - removeFiles"})
    }
}

async function getSet(req,res){
    const setId=req.params.setId;
    const userId=req.user.id;
    try{
        const setToShow=await Set.findById(setId);
        if(!setToShow){
            console.log("LOG: ERRORE IN GETSET, NON TROVA IL SET TO SHOW. ")
            return res.status(404).json({ok:false,message:"Set not found. "})
        }
        const istheCreator=String(setToShow.creator)===userId;


        const hasPermission = setToShow.otherUsersPermissions.some(
            perm => perm.user.toString() === userId
        );
        if(istheCreator||hasPermission){
            console.log("CREATORE DEL SET oppure \"membro\". ")
            return res.json({ok:true,set:setToShow.mediaList})
        }
        const userInfo=await basicUser.findById(userId);
        const userPortals=userInfo.portals;

        //per ogni elemento del primo itera sugli elementi del secondo
        //(per ogni portale con cui è condivide il set controlla se sta nella lista
        //di portali dell'utente, ha senso)

        console.log("SETPORTALS: ", setToShow.portalsSharedWith)
        console.log("USERPORTALS: ", userPortals)
        const isShared = setToShow.portalsSharedWith.some(
            port=> userPortals.some(userport=>String(port)===(String(userport)))
        );

        if(isShared){
            console.log("Membro di un portale con il quale è stato condiviso il set.")
            return res.json({ok: true, set: setToShow.mediaList})
        }

        console.log("NON è Nè UN UTENTE AUTORIZZATO, Nè PARTE DEL PORTALE, Nè IL CREATORE. ")
        res.status(401).json({message:"Not authorized. Only authorized members can access the set. "})
    }catch(err){
        console.log("LOG: ERRORE INTERNO SETCONTROLLER - GETSET")
        res.status(500).send("Errore interno. set controller - getset.")
    }
}

async function deleteSet(req,res){
    const creatorId=req.user.id;
    const setId=req.params.setId;
    try{
        if(!creatorId||!setId){
            console.log("LOG: ERROR IN REMOVESET - SETCONTROLLER")
            return res.status(400).json({ok:false,message:"Bad request - user ID or set ID missing in request. "})
        }
        const setToRemove=await Set.findById(setId);
        if(!setToRemove){
            console.log("LOG: IL SET NON ESISTE.")
            return res.status(404).json({ok:false, message:"Set Not Found. "})
        }

        const istheCreator=String(setToRemove.creator)===creatorId;
        
        if(!istheCreator){
            console.log("LOG:PROBLEMA COL CREATOR ID IN SETCONTROLLER DELETESET")
            return res.status(403).json({ok:false,message:"Only the creator can delete the set. "})
        }

        await Set.findByIdAndDelete(setId)
        res.status(200).json({ok:true,message:"Set deleted. "})
        
    }catch(err){
        console.log("LOG: ERRORE IN SETCONTROLLER - REMOVESET. ")
        res.status(500).send("Set not removed because of an error. ")

    }
}
module.exports = {createSet, modifySet, addFiles, removeFiles, deleteSet, getSet}