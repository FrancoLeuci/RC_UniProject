const mongoose = require('mongoose')

const BasicUser=require('./BasicUser')
const Group = require('./Group')

const fullUser= new mongoose.Schema({
    basicCorrespondent:{
        type: mongoose.Schema.Types.ObjectId,
        ref: BasicUser
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


    groups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }],

    expositions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exposition"
    }], //id di esposizioni dell'utente (one to many)

})

module.exports = mongoose.model('FullUser', fullUser)