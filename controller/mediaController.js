const {Media, Image,Video,Audio,pdf,Text}=require("../model/Media");
const sizeOf=require("image-size");
const ffmpeg = require("fluent-ffmpeg");
const pdfParse = require("pdf-parse");
const fs=require("fs");


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
ffmpeg.setFfmpegPath("C:/ffmpeg/ffmpeg-8.0-full_build/bin/ffmpeg.exe");
ffmpeg.setFfprobePath("C:/ffmpeg/ffmpeg-8.0-full_build/bin/ffprobe.exe");
function ffprobeAsync(path) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(path, (err, metadata) => {
            if (err) reject(err);
            else resolve(metadata);
        });
    });
}

async function uploadFile(req,res){

    try{
        const file=req.file //multer mette qui il file
        const path=req.file.path;
        //dalla req prende i campi description e tags. Possono anche essere vuoti dal momento che non sono required nel db
        //description è un semplice stringa e lo posso mettere direttamente in media
        //TODO:FRONTEND tags è una stringa che contiene stringhe separate da virgole
        const {description,tagsString}=req.body;

        console.log("FILE PRESO DA REQ.FILE: ", file)
        console.log("MIMETYPE: ", file.mimetype)

        const sizeString=file.size+ " B";

        let media={
            filename: file.originalname,
            mimetype:file.mimetype,
            size: sizeString,
            url: `/uploads/${file.filename}`, // qui locale, in cloud sarebbe un URL pubblico
            uploadedBy: req.user.id,
            description
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
            const {width,height} = sizeOf(path);
            kind = "image";
            media ={...media, width, height};
            await Image.create(media)
            //TODO: con le altre cose
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

            await pdf.create(media)

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
        const {fileTitle,fileContent}=req.body;


        const lower = fileContent.toLowerCase();
        let mime="plain"
        if (/<[a-z][\s\S]*>/i.test(fileContent)) {
            mime="html";
        }else if (
            /^#{1,6}\s/m.test(lower) ||     // titoli markdown
            /\*\*[^\*]+\*\*/.test(lower) || // bold
            /\[[^\]]+\]\([^)]+\)/.test(lower) // link
        ) mime="markdown";

        let media={
            kind:"text",
            filename: fileTitle,
            mimetype:"text/"+mime,
            size: Buffer.byteLength(fileContent, 'utf8'),
            url: `/uploads/${fileTitle}`, // qui locale, in cloud sarebbe un URL pubblico
            uploadedBy: req.user.id,
            textContent:fileContent,
            format:mime
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
        const media = await Media.find({uploadedBy: userId})

        res.status(200).json(media)

    }catch(err){
        res.status(500).json({error: err.message, message: "Internal Server Error - mediaController - getMedia"})
    }
}

async function getMediaByName(req,res){


    try{
        const {mediaName}=req.body
        if(!mediaName){
            res.status(400).send("Field Name is required.")
        }
        const mediaList=await Media.find({filename:mediaName})
        if(!mediaList){
            res.status(404).send("No media found under the name "+mediaName);
        }
        res.status(200).json({ok:true,mediaList})
    }catch(err){
        console.log("Error in mediaController, getMediaByName ");

    }

}
module.exports={uploadFile, createTextFile, filterMedia, getMedia}