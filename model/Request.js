const mongoose=require("mongoose")
const BasicUser=require("./BasicUser")


const requestSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [
            // collaboration
            "collaboration.add",
            "collaboration.accept",
            "collaboration.decline",
            "collaboration.cancel",
            "collaboration.leave",
            "collaboration.add.editor",
            "collaboration.admin.add",
            "collaboration.admin.remove",
            // portal
            "portal.addMember", //svolta dal portale verso un utente
            "portal.requestToAccess", //svolta dall'utente verso un portale
            "portal.accepted",
            "portal.declined",
            // newsletter
            "newsletter.approve",
            // task
            "task.add",
            // ecc.
        ],
    },

    sender: { type: mongoose.Schema.Types.ObjectId, ref: BasicUser },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: BasicUser },

    content: { type: String }, // testo libero, se serve

    extra: {type: mongoose.Schema.Types.ObjectId},

    createdAt: { type: Date, default: Date.now },
});

module.exports=mongoose.model("Request", requestSchema);

