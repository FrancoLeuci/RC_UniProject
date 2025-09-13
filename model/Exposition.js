const mongoose=require("mongoose");
const FullUser=require("./FullUser")
const Media=require("./Media")
const Portal=require("./Portal")
const BasicUser=require("./BasicUser")

const ExpositionSchema=new mongoose.Schema({
    title:{
        type:String,
        required:true
    },


   published:{
        type:Boolean,
       required:true,
       default:false
   },

    shareStatus:{
        type:String,
        enum:["private","public","portal","reviewing"],
        default:"private",
        required:true,
    },


    authors:[{
        role:{
            type:String,
            enum:['creator','co-author'],
        },
        userId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"FullUser"
        }
    }],


    abstract:{
        type:String,
        required:true
    },
    copyright: {type: String, required: true},

    licence:{
        type:String,
        enum:["All rights reserved","CC", "BY","NC","SA","ND", "Public domain"],
        required:true,
    },
    //lista dei media utilizzati nell'esposizione da cui ricaveremo il copyright e le license
    media:[{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Media"
    }],

    portal:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Portal"
    },

    //utilizzato quando l'esposizione è collegata ad un portale ed il creatore fa richiesta di revisione di quest'ultima
    reviewer:{
        flag:{
            type: Boolean,
            default: false
        },
        user:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"BasicUser"
        }
    },

    //l'editor tira fuori una Stringa assurda in html, poi nel load carica direttamente da quella.
    HTMLString:String,

}, {timestamps:true})

//se viene pubblicata non può più essere modificata.
ExpositionSchema.pre("save",function(next){
    if(this.published){
        this.shareStatus="public"
    }
    next()
})
module.exports = mongoose.model('Exposition', ExpositionSchema);