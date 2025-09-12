/*TODO: Sto implementando i Gruppi:
sono dei sub-portali, che vengono creati/editati/cancellati da un portal_admin
a cui possono prendervi parti un # qualsiasi di utenti (di regola facenti parte del portale)
che devono avere un FullAccount e che possono divenire a loro volta
degli admin del Gruppo.
In questo Gruppo, un membro potrà creare una propria esposizione o
importare una loro esposizione che hanno già creato (detto 'connection');
quest'ultimo dovrà essere accettato da un admin.
La visibilità del Gruppo, come per i Portali o i Set, può essere:
- private - website - public.
Il Gruppo potrà essere eliminato quando sarà privo di membri o di esposizioni ad esso collegate.
*/
const mongoose = require("mongoose");
const Exposition=require("./Exposition")

const FullUser = require("./FullUser");
const Portal = require("./Portal");
const {Image} = require("./Media");

//TODO: chiedere se inserire un'immagine come copertina del gruppo o se è superfluo

const groupSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    visibility: {
        type: String,
        required: true,
        enum: ['private','website','public'],
        default: 'private'
    },
    admins: [{ //possono essere scelti solo dai portal_admin,
        type: mongoose.Schema.Types.ObjectId,
        ref: "FullUser",
        default: []
    }],
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "FullUser",
        default: []
    }],
    portal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Portal"
    },
    picture: {
        type: mongoose.Schema.Types.ObjectId,
        ref: Image
    },


    //TODO: CHIEDERE COSA SI INTENDE PER GRUPPO IN FUNZIONE DELL'ESPOSIZIONE.
    //io posso creare un'expo e condividerla con un gruppo, ma il gruppo cosa può fare?
    expositions:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: Exposition
    }], //porrò le esposizioni

},{timestamps:true});

module.exports = mongoose.model('Group', groupSchema);