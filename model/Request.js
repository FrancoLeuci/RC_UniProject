const mongoose=require("mongoose")
const User=require("./User")


const requestSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [
            // collaboration - riguarda le esposizioni
            "collaboration.addUser", //solo il creatore può chiedere ad altre persone di collaborare
            "collaboration.requestToPortal", //autore di un esposizione chiede ad un portale (di cui è membro) di collegare quest'ultima
            // portal
            "portal.addMember", //svolta dal portale verso un utente
            "portal.requestToAccess", //svolta dall'utente verso un portale
            "portal.requestToLinkExposition", //dal creatore verso un portale per la pubblocazione
            "portal.delete",//da un admin verso un super-admin
            "portal.create", //utente chiede al superadmin di creare un portale
            //users
            "user.selfDeleteRequest",
            "user.fullAccountRequest"
        ],
    },

    sender: { type: mongoose.Schema.Types.ObjectId, ref: User },
    receiver: { type: mongoose.Schema.Types.ObjectId},
    content: { type: String },
    extra: {type: mongoose.Schema.Types.ObjectId},
    formFields:{
        title:{
            type:String,
            maxLength:15
        },
        description:{
            type:String,
        },
        adminList:[{type:mongoose.Schema.Types.ObjectId}]
    },
    alias: {type: String},

    createdAt: { type: Date, default: Date.now },
});

module.exports=mongoose.model("Request", requestSchema);

