const mongoose = require('mongoose')
const basicUser=require("./BasicUser")
//Uso una chiave per scindere i diversi tipi di media
//funzione è model.discriminator(discriminatore, new mongoose.Schema({eventuali campi in più}, options))
//verranno comunque salvati tutti in Media nel database. Quindi il modello finale è Media
//Il campo in cui viene registrata la chiave di discriminazione è _t, ma io l'ho cambiato in "kind"

const options={discriminatorKey:"kind",timestamps:true}

const AbstractMediaSchema = new mongoose.Schema({

    filename:{
        type:String,
        required:true,
    },
    mimetype:{
        type:String,
        required:true
    },
    url:String,
    size:Number,
    uploadedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:basicUser
    },
    tags:[String]
},
    options //qui gli dico che userò una discriminatory key
);

const Media=mongoose.model('Media', AbstractMediaSchema)

const ImageMedia=Media.discriminator("image",new mongoose.Schema({
    width:Number,
    height:Number,
},options))

const VideoMedia=Media.discriminator("video",new mongoose.Schema({
    duration:Number,
    width:Number,
    height:Number,
},options))

const AudioMedia=Media.discriminator("audio",new mongoose.Schema({
    duration:Number,
},options))

const pdfMedia=Media.discriminator("pdf",new mongoose.Schema({
    pages:Number,
}))

const TextMedia=Media.discriminator("text",new mongoose.Schema({
    textContent: String,
    format: {
        type: String, enum: ["html", "markdown", "plain"] }
    }
))
module.exports=Media //da capire se non devo tirar fuori nient'altro



