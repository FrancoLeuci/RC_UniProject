const mongoose = require('mongoose');
const {isEmail} =require("validator");
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    hide: {
        type: Boolean,
        default: false
    },
    hasPublicObjects: {
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
        minLength: 8
    }, // hash in produzione
    name: {
        type: String,
        unique: true
    }, //nome d'arte
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
    affiliation: {
        type: String
    }, //istituzioni che collaborano con RC
    favorites: [{
        type: String
    }], // ids di contenuti preferiti
    tagLine: {
        type: String
    },
    yearOfBirth: {
        type: Number
    },

    // TODO: Relazioni da creare
    portals: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Portal"
    }],
    pendingPortals: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Portal"
    }],

    roles: [{
        type: String,
        enum: ["super-admin", "portal-admin", "reviewer", "limited-user"]
    }],
    passwordForgottenKey: { type: String },

    sarMember: {
        type: Boolean,
        default: false
    },
    memberInstitution: { type: String },

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

    description: {
        en: { type: String },
        it: { type: String },
        // altre lingue possibili
    },

    groups: [{ type: String }],

    curriculumVitae: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media"
    }, //one to one cv

    researches: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exposition"
    }], //id di esposizioni dell'utente (one to many)
    works: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Work"
    }], //id di lavori dell'utente (one to many)

    followedEntityIds: [{ type: Number }], //id di profile preferiti

},{timestamps:true});


userSchema.pre("save",async function(next){
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

userSchema.methods.comparePassword=async function(candidatePw){
    return await bcrypt.compare(candidatePw,this.password);
}



module.exports = mongoose.model('User', userSchema)