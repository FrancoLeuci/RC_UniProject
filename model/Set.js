const mongoose=require("mongoose")
const basicUser=require("./User")
const portals=require("./Portal")
const Media=require("./Media")

const setSchema=new mongoose.Schema({
    setName:{
        //possono esistere set con nomi uguali
        type:String,
        required:true,
    },
    description:String,
    tags:[String],
    keywords:[String],

    creator:{
        type:mongoose.Schema.Types.ObjectId,
        ref:basicUser
    },

    visibility:{
        type:String,
        enum:["public","website","private"],
        default:"private"
    },

//array che specifica cosa possono fare gli altri utenti(al di fuori del creatore)
    otherUsersPermissions:[{
        user:{
            type:mongoose.Schema.Types.ObjectId,
            ref:basicUser,
        },

        canEditSet:{
            type:Boolean,
            required:true,
            default:false
        }
    }],

    mediaList:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:Media
    }]
},{timestamps:true})

module.exports =mongoose.model("Set",setSchema)