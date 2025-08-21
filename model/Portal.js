const mongoose = require('mongoose')
const basicUser=require('./BasicUser')

const PortalSchema = new mongoose.Schema(
    {
        name: { type: String, unique: true, required: true },

        doiAbbreviation: { type: String },
        issn: { type: String },
        url: { type: String },
        default: { type: Boolean, default: false },

        // ReferenceMany verso User/Issue/Exposition
        admins: [{ type: mongoose.Schema.Types.ObjectId, ref: basicUser }], //da qui nasce la lista degli utenti portal admin e di quale portale sono portal admin
        reviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: basicUser }],
        contactPersons: [{ type: mongoose.Schema.Types.ObjectId, ref: basicUser }],
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: basicUser }],
        issues: [{ type: mongoose.Schema.Types.ObjectId, ref: "Issue" /*da creare*/ }],

        externalContactPersons: { type: String },
        description: { type: String },
        longDescription: { type: String },
        viewText: { type: String },

        issueList: { type: [String], default: [] },
        textExpositionTemplates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Exposition" }],

        features: [{
            type:Boolean,
            default:false,
            //TODO vedere ogni flag
            enum:["EXPOSITION_CONNECTING","EXPOSITION_DOI_DEPOSIT","EXPOSITION_PUBLISHING",
                "LIMITED_EXPOSITION_PUBLISHING","PROJECT_CONNECTING","DEGREE_CONNECTING",
                "DEGREE_PUBLISHING","WORK_CONNECTING","APPLICATION_PUBLISHING","PROFILE",
                "LINK_EXTERNAL","APPLICATION_PROGRAM","MEMBERSHIP_SELECTION","EXTERNAL_CONTENT"]
        }]
    }, { timestamps: true }
)

module.exports = mongoose.model('Portal', PortalSchema);