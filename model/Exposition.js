const mongoose=require("mongoose");
const FullUser=require("FullUser")
const Media=require("Media")
const Portal=require("Portal")

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
        enum:["private","public","portal"],
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
            ref:FullUser
        }
    }],


    abstract:{
        type:String,
        required:true
    },
    copyright: {type: String, required: true},

    license:{
        type:String,
        enum:["All rights reserved","CC", "BY","NC","SA","ND", "Public domain"],
        default:"All rights reserved",
        required:true,
    },
    //lista dei media utilizzati nell'esposizione da cui ricaveremo il copyright e le license
    media:[{
            type:mongoose.Schema.Types.ObjectId,
            ref:Media
    }],

    portal:{
        type:mongoose.Schema.Types.ObjectId,
        ref:Portal
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