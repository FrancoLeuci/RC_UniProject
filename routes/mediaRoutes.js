const express=require("express")
const multer=require("multer")
const {uploadFile, createTextFile, filterMedia, getMedia}=require("../controller/mediaController")
const {verifyToken} = require('../middleware/authMiddleware')

const router=express.Router();

const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null, "uploads/");
    },
    filename:(req,file,cb)=>{
        //sto mantenendo il nome originale
        //serve un controllo, nel caso esista già un file con lo stesso nome nel dataBase,
        //è sufficiente dargli un numero tra parentesi

        cb(null, file.originalname)
    }
})

const upload=multer({storage:storage})
//Upload.single per un solo upload, il file si chiama "file" da qui sotto
//devo pensare ai path specifici, se ce n'è bisogno.
//Devo capire se funziona e come. Devo testare e devo passare al database
router.post("/", verifyToken, upload.single("file"),uploadFile)

router.post("/search", verifyToken, filterMedia)

module.exports=router