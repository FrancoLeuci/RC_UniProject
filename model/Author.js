const mongoose = require('mongoose')

const User=require('./User')

const author= new mongoose.Schema({
    basicCorrespondent:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    alias:{
        type:String,
        unique:true
    },

    //?
    dateOfUpgrade:{
        type: Date,
        default: Date.now
    },

    expositions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exposition"
    }], //id di esposizioni dell'utente (one to many)

})

module.exports = mongoose.model('Author', author)