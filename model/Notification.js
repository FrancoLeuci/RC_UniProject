const mongoose=require("mongoose")
const BasicUser=require("./BasicUser")

//TODO: un singolo oggetto Notification per utente in cui saranno contenute tutte le stringhe delle notifiche
const notificationSchema = new mongoose.Schema({
    receiver: { type: mongoose.Schema.Types.ObjectId},

    backlog: [{ type: String }], // per le richiesta
    feed: [{type: String}], // per i follow
});

module.exports=mongoose.model("Notification", notificationSchema);

