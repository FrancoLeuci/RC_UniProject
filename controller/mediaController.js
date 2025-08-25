const Media=require("../model/Media")



async function uploadFile(req,res){
    try{
        const file=req.file //multer mette qui il file

        let kind= "file";
        if (file.mimetype.startsWith("image/")) kind = "image";
        else if (file.mimetype.startsWith("video/")) kind = "video";
        else if (file.mimetype.startsWith("audio/")) kind = "audio";
        else if (file.mimetype === "application/pdf") kind = "pdf";
        else if (file.mimetype.startsWith("text/")) kind = "text";

        const media = await Media.create({
            kind,
            filename: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            url: `/uploads/${file.filename}`, // qui locale, in cloud sarebbe un URL pubblico
            uploadedBy: req.user.id, // in qualche modo dal verifyToken
        });

        res.status(201).json({ok:true,message:"File uploaded successfully. ",media});
    }catch(err){
        console.log("Error in controller- mediaController- addMedia. :",err);
        res.status(500).json({ok:false,message:"Upload Failed. "});
    }
}

module.exports={uploadFile}