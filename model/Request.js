const mongoose=require("mongoose")
const BasicUser=require("./BasicUser")


const requestSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [
            // collaboration
            "collaboration.addUser", //solo il creatore può chiedere ad altre persone di collaborare
            // portal
            "portal.addMember", //svolta dal portale verso un utente
            "portal.requestToAccess", //svolta dall'utente verso un portale
            // group
            "group.addMember", //svolta dal gruppo verso un utente
            "group.requestToAccess", //svolta dall'utente verso il gruppo
        ],
    },

    sender: { type: mongoose.Schema.Types.ObjectId, ref: BasicUser },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: BasicUser },

    content: { type: String }, // testo libero, se serve

    extra: {type: mongoose.Schema.Types.ObjectId},

    createdAt: { type: Date, default: Date.now },
});

module.exports=mongoose.model("Request", requestSchema);

