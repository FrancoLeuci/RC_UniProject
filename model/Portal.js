const mongoose = require('mongoose')
const BasicUser=require('./BasicUser')

const PortalSchema = new mongoose.Schema(
    {
        name: { type: String, unique: true, required: true },

        doiAbbreviation: { type: String }, //radice di un codice che identifica il portale di una certa esposizione/lavoro
        issn: { type: String }, //identificatore unico nel mondo, fornito da società internazionale
        url: { type: String }, //rimanda a un sito associato al portale in questione
        default: { type: Boolean, default: false }, //true se il portale è principale, false se è un semplice archivio con tutte quante le esposizioni

        // ReferenceMany verso User/Issue/Exposition
        admins: [{ type: mongoose.Schema.Types.ObjectId, ref: BasicUser }], //da qui nasce la lista degli utenti portal admin e di quale portale sono portal admin
        reviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: BasicUser }],
        contactPersons: [{ type: mongoose.Schema.Types.ObjectId, ref: BasicUser }],
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: BasicUser }],
        issues: [{ type: mongoose.Schema.Types.ObjectId, ref: "Issue" /*da creare*/ }], //pubblicazioni

        externalContactPersons: { type: String }, //contatti esterni
        description: { type: String },
        longDescription: { type: String },
        viewText: { type: String }, //navbar delle esposizioni

        issueList: { type: [String], default: [] },
        textExpositionTemplates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Exposition" }],

        features: [{
            type:Boolean,
            default:false,
            //TODO vedere ogni flag
            enum:["EXPOSITION_CONNECTING","EXPOSITION_DOI_DEPOSIT","EXPOSITION_PUBLISHING",
                "LIMITED_EXPOSITION_PUBLISHING","WORK_CONNECTING","APPLICATION_PUBLISHING","PROFILE",
                "LINK_EXTERNAL","APPLICATION_PROGRAM","MEMBERSHIP_SELECTION","EXTERNAL_CONTENT"]

            /*LINK EXTERNAL=Se true, verrà caricato il sito esterno indicato nel campo url invece del portale sul sito, cliccando da quello della pagina RC
            MEMBERSHIP_SELECTION=Se true, gli utenti possono inviare richiesta per entrare nel portale
            EXPOSITION_CONNECTING=Se true, è possibile collegare expositions al portale.
            WORK_CONNECTING= Se true, l'utente può chiedere di collegare un lavoro al portale
            EXPOSITION_PUBLISHING=Se true i ricercatori possono chiedere di pubblicare nel portale
            EXTERNAL_CONTENT= se true l'utente può inviare expositions con contenuto esterno al loro interno.
            LIMITED_EXPOSITION_PUBLISHING=permette a utenti di richiedere in maniera limitata una pubblicazione.

            APPLICATION_PROGRAM e _PUBLISHING, WORK_CONNECTING: vedere a cosa serveno
            * */
        }]
    }, { timestamps: true }
)

module.exports = mongoose.model('Portal', PortalSchema);