const {Media, Image,Video,Audio,pdf,Text}=require("../model/Media");
const sizeOf=require("image-size").default;
const ffmpeg = require("fluent-ffmpeg");
const pdfParse = require("pdf-parse");
const fs=require("fs");
const BasicUser = require("../model/BasicUser");

//setto da codice i percorsi per ffmpeg ffprobe
ffmpeg.setFfmpegPath("C:/ffmpeg/ffmpeg-8.0-full_build/bin/ffmpeg.exe")
ffmpeg.setFfprobePath("C:/ffmpeg/ffmpeg-8.0-full_build/bin/ffprobe.exe");


function handleTextFile(file){
    const textContent=fs.readFileSync(file.path, "utf8");
    let textType="plain";
    if(file.mimetype==="text/html") textType="html";
    if(file.mimetype==="text/markdown") textType="markdown";
    return {textContent, textType}
}

async function getPdfMetadata(path){
    const dataBuffer=fs.readFileSync(path);
    const data=await pdfParse(dataBuffer);

    return {
        pages:data.numpages,
        info:data.info //info su autore e titolo
    }
}

//funzione che rende asincrona la ricerca dei metadata dei video e degli audio con ffmpeg

function ffprobeAsync(path) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(path, (err, metadata) => {
            if (err) reject(err);
            else resolve(metadata);
        });
    });
}

async function uploadFile(req,res){
    const userId=req.user.id;

    try{
        const file=req.file //multer mette qui il file
        const path=req.file.path;
        //Dalla req prende i campi description e tags. Possono anche essere vuoti dal momento che non sono required nel db
        //description è un semplice stringa e lo posso mettere direttamente in media
        //license di default è settata a "All rights reserved"
        const {description,tagsString,copyright,license,isProfilePic,isCurriculumVitae}=req.body;
        if(isProfilePic && !(file.mimetype.startsWith("image/"))){
            return res.status(400).json({ok:false,message:"The file must be an Image. (Profile Picture)"})
        }else if(isCurriculumVitae && !(file.mimetype === "application/pdf")){
            return res.status(400).json({ok:false,message:"The file must be a pdf. (Curriculum Vitae"})
        }

        //is ProfilePic e isCurriculumVitae sono flag da aggiungere alle richieste isolate di aggiunta
        // dell'immagine e del curriculum

        console.log("FILE PRESO DA REQ.FILE: ", file)
        console.log("MIMETYPE: ", file.mimetype)

        const sizeString=file.size+ " B";

        let media={
            filename: file.originalname,
            mimetype:file.mimetype,
            size: sizeString,
            url: `/uploads/${file.filename}`, // qui locale, in cloud sarebbe un URL pubblico
            uploadedBy: userId,
            description,
            copyright,
            license
        }
        if(tagsString){
            const lowertags=tagsString.toLowerCase(); //tutto lowercase, salvini non ha mai avuto buone idee
            const tags=lowertags.split(",").map(w=>w.trim());//tutte le parole senza spazi eventuali
            media={
                ...media,
                tags:tags,
            }
        }

        let kind= "file";
        if (file.mimetype.startsWith("image/")) {
            const buffer=fs.readFileSync(path)
            const {width,height} = sizeOf(buffer)
            kind = "image";
            media ={...media, width, height};
            const newImageMedia=await Image.create(media)
            //TODO: con le altre cose
            if(isProfilePic){
                const currentUser=await BasicUser.findById(userId)
                currentUser.profilePicture=newImageMedia._id;
                await currentUser.save()
            }
        }
        else if (file.mimetype.startsWith("video/")){
            kind = "video";

            const metadata = await ffprobeAsync(path);

            const duration = metadata.format.duration;
            const videoStream = metadata.streams.find(s => s.codec_type === "video");

            media = {
                ...media,
                duration,
                width: videoStream?.width,
                height: videoStream?.height,
                codec: metadata.format.format_name || null,
            };
            await Video.create(media);
        }
        else if (file.mimetype.startsWith("audio/")){
            kind = "audio";
            const metadata = await ffprobeAsync(path);
            const duration = metadata.format.duration;
            media = {
                ...media,
                duration,
                codec: metadata.format.format_name || null,
            };

            await Audio.create(media);

        }
        else if (file.mimetype === "application/pdf"){
            kind = "pdf";
            const meta = await getPdfMetadata(path);
            media={
                ...media,
                pages:meta.pages,
                info:meta.info,
            }

            const newpdfMedia=await pdf.create(media)
            if(isCurriculumVitae){
                    const currentUser=await BasicUser.findById(userId)
                    currentUser.curriculumVitae=newpdfMedia._id;
                    await currentUser.save()
            }

        }
        else if (file.mimetype.startsWith("text/")){
            kind = "text"
            const {textContent,textType}=handleTextFile(file)
            media={
                ...media,
                textContent,
                format:textType
            }

            await Text.create(media)
        }


        console.log("MIMETYPE: ", file.mimetype)
        console.log("KIND: ", kind)
        console.log("MEDIA: ", media)
        res.status(201).json({ok:true,message:"File uploaded successfully. ", media});
    }catch(err){
        console.log("Error in controller- mediaController- addMedia. :",err);
        res.status(500).json({ok:false,message:"Upload Failed. "});
    }
}
//deve passare per il verifytoken
async function createTextFile(req,res){
    try{
        const {fileTitle,fileContent,fileType}=req.body;


        let media={
            kind:"text",
            filename: fileTitle,
            mimetype:"text/"+fileType,
            size: Buffer.byteLength(fileContent, 'utf8'),
            url: `/uploads/${fileTitle}`, // qui locale, in cloud sarebbe un URL pubblico
            uploadedBy: req.user.id,
            textContent:fileContent,
            format:fileType
        }
        await Text.create(media)
        res.status(201).json({ok:true,message:"Text File created.",media});
    }catch(err){
        console.log("Errore in media Controller - createTextFiles.");
        res.status(500).send("Internal Error in mediaController - createTextFile")
    }
}

async function filterMedia(req, res){

    let {search} = req.body;
    const userId = req.user.id;
    if(Array.isArray(search)){
        //Caso array
        search = search.map(m => m.toLowerCase())
    } else {
        //Caso di un solo elemento
        search = search.toLowerCase();
    }

    try{
        const media = await Media.find({uploadedBy: userId})

        if(!media){
            return res.status(404).json({message: "User don't have media"})
        }

        console.log(media, search)
        console.log(media.map(m => m.tags))
        let list = media.map(m => m.tags.map(tag => search.includes(tag)))
        console.log(list)
        list = list.map((element => {
            console.log(element)
            element = element.filter(((tag,i) => {
                console.log(i)
                return tag!==false
            })) // [[true, true]]
            return element
        }))
        console.log(list)
        list = list.map((element, i) => {
            if((Array.isArray(search) && element.length === search.length)||(!Array.isArray(search)&&element.length===1)){
                return i
            } else {
                return null;
            }
        })
        console.log(list)
        list = list.filter(element => element!==null)
        console.log(list)
        list = media.filter((m,i) => list.includes(i))
        console.log(list)

        res.status(200).json(list)

    }catch(err){
        res.status(500).json({error: err.message, message: "Internal Server Error - mediaController - filterMedia"})
    }
}

async function getMedia(req, res){
    const userId = req.user.id

    try{
        const user = await BasicUser.findById(userId)
        let media = await Media.find({uploadedBy: userId})
        //quando si vuole confrontare 2 ObjectId di mongoose è necessario utilizzare il metodo .equals() al posto dei classici operatori
        media=media.filter(m => !m._id.equals(user.curriculumVitae) && !m._id.equals(user.profilePicture))
        res.status(200).json(media)

    }catch(err){
        res.status(500).json({error: err.message, message: "Internal Server Error - mediaController - getMedia"})
    }
}

//Inutile, poichè il frontend ha già avuto tutti i media dell'utente. Frontend può cercare all'interno dello stesso
//array fornito dal backend.

async function getMediaById({mediaIdList,mediaId}) {
    if(mediaIdList){
    }
}

async function removeMedia(req,res){
    const mediaId=req.params.mediaId;
    const userId=req.user.id;
    if(!mediaId){
        return res.status(400).json({ok:false, message:"No media to remove in the request params."})
    }

    try{
        const mediaToRemove=await Media.findById(mediaId)
        if(!mediaToRemove){
            return res.status(404).json({ok:false,message:"File not found."});
        }

        if(String(mediaToRemove.uploadedBy)===userId){
            //eliminazione dal set
            await Media.findByIdAndDelete(mediaId);
            return res.status(200).json({ok:true,message:"File cancellato da tutti i set e dal server. "});
        }
        res.status(401).json({ok:false,message:"Not Authorized. You can Only delete the files you have uploaded. "})

    }catch(err){
        res.status(500).json({error: err.message, message: "Internal Server Error - mediaController - removeMedia"});
    }
}


module.exports={uploadFile, createTextFile, filterMedia, getMedia, removeMedia}