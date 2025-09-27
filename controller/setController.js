const Set = require("../model/Set")
const {Media} = require("../model/Media")
const mongoose=require("mongoose")
const basicUser=require("../model/BasicUser");

const {HttpError} = require("../middleware/errorMiddleware");

async function createSet(req, res, next){

    try{
        const {setName}=req.body;
        if(!setName){
            throw new HttpError("Can't create a Set whitout a name.",400)
            //return res.status(400).json({ok:false,message:"Can't create a Set without a name. "})
        }

        const set= await Set.create({
            setName,
            creator: req.user.id
        })

        res.status(201).json({ok: true, message: "Set created successfully"})

    }catch(err){
        next(err)
        //res.status(500).json({error: err.message, message: "Internal Server Error - setController - createSet"})
    }
}

async function modifySet(req, res, next){
    //
    const setId=req.params.setId; //Inserire in router
    try{

        const setToModify=await Set.findById(setId);
        if(!setToModify){
            throw new HttpError("Set not found",404)
            //return res.status(401).json({ok:false,message:"Set not found. "})
        }

        const isCreator=String(setToModify.creator)===req.user.id;
        const isEditor=setToModify.otherUsersPermissions.includes({user:req.user.id,canEditSet:true})
        if(isCreator||isEditor){
            const {setName,description,tags,keywords,visibility,otherUsersPermissions}=req.body;
            if(!setName){
                throw new HttpError("Name is required",400)
                //return res.status(401).json({ok:false,message:"name is required"})
            }
            setToModify.setName=setName;
            setToModify.description=description;
            setToModify.tags=tags;
            setToModify.keywords=keywords;

            if(isCreator){
                setToModify.visibility=visibility;
                //richiesta nel body deve essere un'array di oggetti {user,boolean}
                setToModify.otherUsersPermissions=otherUsersPermissions;
            }
            await setToModify.save()
            return res.status(200).json({message: "Updated successfully"});
        }else{
            throw new HttpError("Not Authorized. Only the creator can modify this field/s",401)
            //return res.status(401).json({ok:false,message:"Not Authorized. Only the creator can modify this field/s. "})
        }

    }catch(err){
        next(err)
        //console.log("LOG: ERRORE IN MODIFYSET -")
        //res.status(500).json({error: err.message, message: "Internal Server Error - setController - modifyByCreatore"})
    }
    
}

async function addFiles(req, res, next){
    //id del file dai media fornito nella richiesta, nei params
    try{
        const mediaToAdd = await Media.findById(req.params.mediaId)

        if(!mediaToAdd){
            throw new HttpError("Media not found",404)
            //return res.status(404).json({ok:false,message:"Media not found. "})
        }else if(!(String(mediaToAdd.uploadedBy===req.user.id))){
            throw new HttpError("Forbidden - you are not the creator of this media.",403)
            //return res.status(403).json({ok:false,message:"Forbidden - you are not the creator of this media. "})
        }
        const setToModify=await Set.findById(req.params.setId)
        if(!setToModify){
            throw new HttpError("Set not found",404)
            //res.status(404).json({ok:false,message:"Set not found. "})
        }

        const permission = setToModify.otherUsersPermissions.some(
            (p) => p.user.toString() === req.user.id && p.canEditSet === true
        );
        const isCreator=String(setToModify.creator)===req.user.id;
        if(!permission && !isCreator){
            throw new HttpError("Forbidden - you can't add this item from the media set.",401)
            //res.status(401).json({ok:false,message:"Forbidden - you can't add this item from the media set. "})
        }

        setToModify.mediaList.push(req.params.mediaId);

        await setToModify.save();
        res.status(201).json({ok:true,message:"Media added to the media set."})

    }catch(err){
        next(err)
        //res.status(500).json({error: err.message, message: "Internal Server Error - setController - addFiles"})
    }

}

async function removeFiles(req, res, next){
    const userId=req.user.id;
    const setId=req.params.setId;
    const mediaId=req.params.mediaId;
    try{
        const setToModify=await Set.findById(setId)
        
        if(!setToModify){
            throw new HttpError("Set not found",404)
            //return res.status(404).json({ok:false,message:"Set not found. "})
        }
        const mediaToRemove=setToModify.mediaList.find(media => String(media)===mediaId);
        if(!mediaToRemove){
            throw new HttpError("Media you are trying to cancel is not in the media set.",400)
            //return res.status(404).json({ok:false,message:"Media you are trying to cancel is not in the media set already. "})
        }
        const permission=setToModify.otherUsersPermissions.includes({user:new mongoose.Types.ObjectId(userId),canEditSet:true})
        const isCreator=String(setToModify.creator)===userId;
        if(!permission && !isCreator){
            throw new HttpError("Forbidden - you can't remove this item from the media set.",403)
            //return res.status(401).json({ok:false,message:"Forbidden - you can't remove this item from the media set. "})
        }

        setToModify.mediaList.splice(setToModify.mediaList.indexOf(mediaToRemove),1);

        await setToModify.save();
        res.status(201).json({ok:true,message:"Media removed from the media set."})


    }catch(err){
        next(err)
        //res.status(500).json({error: err.message, message: "Internal Server Error - setController - removeFiles"})
    }
}

async function getSet(req,res,next){
    const setId=req.params.setId;
    const userId=req.user.id;
    try{
        const setToShow=await Set.findById(setId);
        if(!setToShow){
            throw new HttpError("Set not found",404)
            //return res.status(404).json({ok:false,message:"Set not found. "})
        }

        const istheCreator=String(setToShow.creator)===userId;
        const hasPermission = setToShow.otherUsersPermissions.some(
            perm => perm.user.toString() === userId
        );

        const isSuperAdmin = await BasicUser.findById(userId)

        if(istheCreator||hasPermission||isSuperAdmin.role==='super-admin'){
            const mediaToShow=await Promise.all(setToShow.mediaList.map(async(mediaId)=>await Media.findById(mediaId)))
            return res.json({ok:true,setMedias:mediaToShow})
        }

        //per ogni elemento del primo itera sugli elementi del secondo
        //(per ogni portale con cui è condivide il set controlla se sta nella lista
        //di portali dell'utente, ha senso)

        throw new HttpError("Not Authorized. Only authorized members can access this set.",401)
        //res.status(401).json({message:"Not authorized. Only authorized members can access the set. "})
    }catch(err){
        next(err)
        //console.log("LOG: ERRORE INTERNO SETCONTROLLER - GETSET")
        //res.status(500).send("Errore interno. set controller - getset.")
    }
}

async function deleteSet(req,res,next){
    const creatorId=req.user.id;
    const setId=req.params.setId;
    try{
        if(!creatorId||!setId){
            throw new HttpError("Bad request - user Id or set Id missing in request",400)
            //return res.status(400).json({ok:false,message:"Bad request - user ID or set ID missing in request. "})
        }
        const setToRemove=await Set.findById(setId);
        if(!setToRemove){
            throw new HttpError("Set not found",404)
            //return res.status(404).json({ok:false, message:"Set Not Found. "})
        }

        const istheCreator=String(setToRemove.creator)===creatorId;
        
        if(!istheCreator){
            throw new HttpError("Only the creator can delete the set",403)
            //return res.status(403).json({ok:false,message:"Only the creator can delete the set. "})
        }

        await Set.findByIdAndDelete(setId)
        res.status(200).json({ok:true,message:"Set deleted."})
    }catch(err){
        next(err)
        //console.log("LOG: ERRORE IN SETCONTROLLER - REMOVESET. ")
        //res.status(500).send("Set not removed because of an error. ")
    }
}

async function mySetRepository(req,res,next){
    const userId = req.user.id
    try{

        let mySets = await Set.find({})
        let setsSharedWithMe = []

        console.log(mySets)

        mySets=mySets.map(set => {
            console.log(set)
            if(String(set.creator) === userId){
                return set._id
            } else if(set.otherUsersPermissions.some(obj=>String(obj.user)===userId)){
                setsSharedWithMe.push(set._id)
                return null
            }
        })
        mySets=mySets.filter(set=>set!==null);

        res.status(200).json({ok: true, mySets, setsSharedWithMe})
    }catch(err){
        next(err)
        //console.log(err.message)
    }
}

module.exports = {createSet, modifySet, addFiles, removeFiles, deleteSet, getSet, mySetRepository}