const mongoose = require('mongoose')
const BasicUser=require('./BasicUser')
const {Image} = require("./Media");
const Exposition=require("./Exposition");

const PortalSchema = new mongoose.Schema(
    {
        name: { type: String, unique: true, required: true },

        doiAbbreviation: { type: String }, //radice di un codice che identifica il portale di una certa esposizione/lavoro
        issn: { type: String }, //identificatore unico nel mondo, fornito da società internazionale
        url: { type: String }, //rimanda a un sito associato al portale in questione

        admins: [{ type: mongoose.Schema.Types.ObjectId, ref: BasicUser }], //da qui nasce la lista degli utenti portal admin
        reviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: BasicUser }],
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: BasicUser }],
        issues: [{ type: mongoose.Schema.Types.ObjectId, ref: "Issue" /*da creare*/ }], //pubblicazioni

/* TODO: chiedere se va meglio questa versione del codice per avere la query su un solo array
        users: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: BasicUser, required: true },
                role: {
                    type: String,
                    enum: ["admin", "member", "reviewer", "contactPerson"],
                    required: true
                }
            }
        ],
*/
        externalContactPersons: { type: String }, //contatti esterni
        description: { type: String },
        longDescription: { type: String },
        viewText: { type: String }, //navbar delle esposizioni

        issueList: { type: [String], default: [] },
        //oggetto opzioni:

        features: {
            EXPOSITION_CONNECTING:{type:Boolean, default:false},
            EXPOSITION_PUBLISHING:{type:Boolean, default:false},
            LIMITED_EXPOSITION_PUBLISHING:{type:Boolean, default:false},
            LINK_EXTERNAL:{type:Boolean, default:false},
            MEMBERSHIP_SELECTION:{type:Boolean, default:false}, //
            EXTERNAL_CONTENT:{type:Boolean, default:false},

            /*LINK EXTERNAL=Se true, verrà caricato il sito esterno indicato nel campo url invece del portale sul sito, cliccando da quello della pagina RC
            MEMBERSHIP_SELECTION=Se true, gli utenti possono inviare richiesta per entrare nel portale
            EXPOSITION_CONNECTING=Se true, è possibile collegare expositions al portale.
            EXPOSITION_PUBLISHING=Se true i ricercatori possono chiedere di pubblicare nel portale
            EXTERNAL_CONTENT= se true l'utente può inviare expositions con contenuto esterno al loro interno.
            LIMITED_EXPOSITION_PUBLISHING=permette a utenti di richiedere in maniera limitata una pubblicazione.
            * */
        },
        picture: {
            type: mongoose.Schema.Types.ObjectId,
            ref: Image
        },

        linkedExpositions:[{
            type:mongoose.Schema.Types.ObjectId,
            ref:Exposition
        }]
    }, { timestamps: true }
)

module.exports = mongoose.model('Portal', PortalSchema);