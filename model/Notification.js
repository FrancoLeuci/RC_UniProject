const mongoose=require("mongoose")
const BasicUser=require("./BasicUser")


const NotificationSchema = new mongoose.Schema({
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
            "portal.add",
            "portal.request",
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

    // stato notifica
    read: { type: Boolean, default: false },

    // per backlog o azioni
    action: {
        type: String,
        enum: ["accept", "decline", "cancel", null],
        default: null,
    },

    status: {
        type: String,
        enum: ["pending", "accepted", "declined", "cancelled","info"],
        default: "pending",
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// aggiornare automaticamente updatedAt
NotificationSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports=mongoose.model("Notification", NotificationSchema);

