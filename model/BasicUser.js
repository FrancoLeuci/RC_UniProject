const mongoose = require('mongoose');
const {isEmail} =require("validator");
const bcrypt = require('bcrypt');
const Portal=require("./Portal")

const basicUserSchema = new mongoose.Schema({
    hide: {
        type: Boolean,
        default: false
    },
    email: {
        type: String,
        required: true,
        validate:[isEmail,"Inserire un'e-mail valida"],
        unique: true,
        lowercase: true
    },
    verified: { //flag per verifica dell'email
        type: Boolean,
        default: false
    },
    approved: {
        type: Boolean,
        default: false
    }, // da basic a full account
    password: {
        type: String,
        required: true,
        minlength: 8
    }, // hash in produzione

    realName: {
        type: String,
        required:true
    },

    countryResidence: [{
        type: String
    }],
    countryCitizenship: [{
        type: String
    }],

    // piccola descrizione
    tagLine: {
        type: String
    },

    yearOfBirth: {
        type: Number,
        min:[1950,"Please insert a valid year of Birth."]
    },

    // TODO: Relazioni da creare
    portals: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Portal"
    }],
    // richieste utente in attesa di accettazione
    pendingPortals: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Portal"
    }],

    roles: [{
        type: String,
        // admin e reviewer potrebbero essere ridondanti. Chiedere o controllare.
        enum: ["super-admin", "portal-admin", "reviewer", "limited-user"],
        default: 'limited-user' //usato sia per basic che full user per i token
    }],

    passwordForgottenKey: { type: String },

    // Documenti embedded
    settings: {
        language: {
            type: String,
            default: "en" },
        theme: {
            type: String,
            default: "light"
        },
        // puoi estendere in base al file PHP Settings.php
    },


    description: [
            {
                lang:{
                    type:String,
                    enum:["en","ita","por","nld","est","fin","fra","deu","lor","swe","spa","dan","lit"],
                    default:"en",
                    unique:true
                },
                content:{
                    type:String,
                }
            }
    ],

    curriculumVitae: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media"
    }, //one to one cv

    // ricercatori che l'utente segue
    followedResearchers: [{
        followedUserId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "BasicUser"
        },
        options:{
            share:{type:Boolean,default:true},
            edit:{type:Boolean,default:true},
            comment:{type:Boolean,default:true},
            publication:{type:Boolean,default:true},
            //PUBBLICATION: SE FALSE NON MOSTRA LE PUBBLICAZIONI
            //EDIT: SE FALSE NON APPARE QUANDO VIENE MODIFICATA EXPO
            //COMMENT: SE TRUE APPARE QUANDO LA PERSONA COMMENTA QUALCOSA
            //SHARE: TRUE APPARE QUANDO LA PERSONA CONDIVIDE SU INSTA...
        }
    }],



    followedPortals:[{
        followedPortalId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: Portal
        },
        options:{
            share:{type:Boolean,default:true},
            edit:{type:Boolean,default:true},
            comment:{type:Boolean,default:true},
            publication:{type:Boolean,default:true},
            //PUBBLICATION: SE FALSE NON MOSTRA LE PUBBLICAZIONI
            //EDIT: SE FALSE NON APPARE QUANDO VIENE MODIFICATA EXPO
            //COMMENT: SE TRUE APPARE QUANDO LA PERSONA COMMENTA QUALCOSA
            //SHARE: TRUE APPARE QUANDO LA PERSONA CONDIVIDE SU INSTA...
        }
    }],

    favoritesExposition: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exposition"
    }], // TODO: da testare dopo la creazione del modello Esposizione



},{timestamps:true});


basicUserSchema.pre("save",async function(next){
    if(!this.isModified('password')){
        return next();
    }
    try{
        const salt= await bcrypt.genSalt(10);
        this.password=await bcrypt.hash(this.password,salt);
        next();
    }catch(e){
        next(e);
    }
})

basicUserSchema.methods.comparePassword=async function(candidatePw){
    return await bcrypt.compare(candidatePw,this.password);
}


module.exports = mongoose.model('BasicUser', basicUserSchema);