const {Media,Image,Video,Audio,pdf,Text}=require("../model/Media")
const sizeOf=require("image-size")



async function uploadFile(req,res){
    try{
        const file=req.file //multer mette qui il file
        const path=req.file.path;


        console.log("FILE PRESO DA REQ.FILE: ", file)
        console.log("MIMETYPE: ", file.mimetype)

        const sizeString=file.size+ " B";

        let media={
            filename: file.originalname,
            mimetype: file.mimetype,
            size: sizeString,
            url: `/uploads/${file.filename}`, // qui locale, in cloud sarebbe un URL pubblico
            uploadedBy: req.user.id,
        }


        let kind= "file";
        if (file.mimetype.startsWith("image/")) {
            const {width,height}= await sizeOf(path);
            kind = "image";
            media ={...media, width, height};
            await Image.create(media)
            //TODO: con le altre cose
        }
        else if (file.mimetype.startsWith("video/")) kind = "video";
        else if (file.mimetype.startsWith("audio/")) kind = "audio";
        else if (file.mimetype === "application/pdf") kind = "pdf";
        else if (file.mimetype.startsWith("text/")) kind = "text";




        console.log("MIMETYPE: ", file.mimetype)
        console.log("KIND: ", kind)

        res.status(201).json({ok:true,message:"File uploaded successfully. ", media});
    }catch(err){
        console.log("Error in controller- mediaController- addMedia. :",err);
        res.status(500).json({ok:false,message:"Upload Failed. "});
    }
}

module.exports={uploadFile}