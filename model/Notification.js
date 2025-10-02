const mongoose=require("mongoose")
const User=require("./User")

//TODO: un singolo oggetto Notification per utente in cui saranno contenute tutte le stringhe delle notifiche
const notificationSchema = new mongoose.Schema({
    receiver: { type: mongoose.Schema.Types.ObjectId},

    backlog: [{ type: String }], // per le richiesta
    feed: [{type: String}], // per i follow <- Gestire queste notifiche per le esposizioni
});

module.exports=mongoose.model("Notification", notificationSchema);