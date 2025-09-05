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

    // stato notifica
    //read: { type: Boolean, default: false },

    // per backlog o azioni
    /*action: {
        type: String,
        enum: ["accept", "decline", "cancel", null],
        default: null,
    },*/

    status: {
        type: String,
        enum: ["pending", "accepted", "declined", "cancel"],
        default: "pending",
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// aggiornare automaticamente updatedAt
/*requestSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});*/

module.exports=mongoose.model("Request", requestSchema);

