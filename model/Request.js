const mongoose=require("mongoose")
const BasicUser=require("./BasicUser")


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
            "portal.requestToLinkExposition", //dal creatore verso un portale
            "portal.delete",//da un admin verso un super-admin
            // group
            "group.addMember", //svolta dal gruppo verso un utente
            "group.requestToAccess", //svolta dall'utente verso il gruppo
            //users
            "user.selfDeleteRequest",
            "user.fullAccount.Request"
        ],
    },

    sender: { type: mongoose.Schema.Types.ObjectId, ref: BasicUser },
    receiver: { type: mongoose.Schema.Types.ObjectId},
    alias:{type:String},

    content: { type: String },

    extra: {type: mongoose.Schema.Types.ObjectId},

    createdAt: { type: Date, default: Date.now },
});

module.exports=mongoose.model("Request", requestSchema);

