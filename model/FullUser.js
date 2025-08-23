const mongoose = require('mongoose')
const BasicUser=require('./BasicUser')

const fullUser= new mongoose.Schema({
    basicCorresponent:{
        type: mongoose.Schema.Types.ObjectId,
        ref:BasicUser
    },

    alias:{
        type:String,
        unique:true
    },

    dateOfUpgrade:{
        type: Date,
        default: Date.now
    },

    //indica se l'utente ha pubblicato almeno un oggetto
    hasPublicObjects: {
        type: Boolean,
        default: false
    },

    groups: [{ type: String }],

    researches: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exposition"
    }], //id di esposizioni dell'utente (one to many)
    works: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Work"
    }], //id di lavori dell'utente (one to many)

})

module.exports = mongoose.model('FullUser', fullUser)