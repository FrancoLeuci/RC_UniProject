const mongoose = require('mongoose');
const {isEmail} =require("validator");
const bcrypt = require('bcrypt');
const Portal=require("./Portal")
const {pdf,Image}=require("../model/Media")


const basicUserSchema = new mongoose.Schema({
    disabled: {
        type: Boolean,
        default: false,
    }, //se è true l'utente non vi può più accedere

    hide: {
        type: Boolean,
        default: false
    }, //nasconde solamente il profilo

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

    portals: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: Portal
    }],

    role: {
        type: String,
        enum: ["super-admin", "limited-user"],
        default: 'limited-user'
    },

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
        announcements:{
            type:Boolean,
            default:false
        },
        digest:{
            type:Boolean,
            default:false
        },
        uploadNotification:{
            type:Boolean,
            default:false
        },
        messageNotification:{
          type:Boolean, 
            default:false
        },
        collabNotification:{
            type:Boolean,
            default:false
        }
    },

    description:{
        type:String,
    },

    curriculumVitae: {
        type: mongoose.Schema.Types.ObjectId,
        ref: pdf
    }, //one to one cv

    profilePicture:{
        type:mongoose.Schema.Types.ObjectId,
        ref: Image
    },

    // ricercatori che l'utente segue
    followedResearchers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: User
    }],

    followedPortals:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Portal"
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

module.exports = mongoose.model('User', basicUserSchema);