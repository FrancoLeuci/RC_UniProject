const mongoose = require('mongoose')
const BasicUser=require("./BasicUser")
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
    url:{type:String,required:true},
    size:{type:String,require:true},
    uploadedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"BasicUser",
        required:true,},

    description:String,

    tags:[String],
        
    openKeywords:[String],

    copyright: {type: String, required: true},

    licence:{type:String,
        enum:["All rights reserved","CC", "BY","NC","SA","ND", "Public domain"],
        default:"All rights reserved",
        required:true,}

},options);

const Media=mongoose.model('Media', AbstractMediaSchema)

const Image=Media.discriminator("image",new mongoose.Schema({
    width:Number,
    height:Number,
},options))


const Video=Media.discriminator("video",new mongoose.Schema({
    duration:Number,
    width:Number,
    height:Number,
    codec:String,
},options))

const Audio=Media.discriminator("audio",new mongoose.Schema({
    duration:Number,
    codec:String,
},options))

const pdf=Media.discriminator("pdf",new mongoose.Schema({
    pages:Number,
    info: Object  //titolo, creator,
},options))

const Text=Media.discriminator("text",new mongoose.Schema({
        textContent: String,
        format: {
            type: String, enum: ["html", "markdown", "plain"] }
    },options))

module.exports={Media,Image,Video,Audio,pdf,Text} //da capire se non devo tirar fuori nient'altro
