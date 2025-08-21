const mongoose=require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Utenti",
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires:"6d" //TTL 6 giorni

    },
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);