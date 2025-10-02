const Portal = require("../../model/Portal");
const Author = require("../../model/Author");
const User = require('../../model/User')

const {HttpError} = require("../../middleware/errorMiddleware");

async function edit (req, res, next){
    const body = req.body;
    const portal=req.portal;

    try{
        //common
        //TODO: logo vedere come importare file

        if(!body.name){
            throw new HttpError("Name is required",400)
            //return res.status(400).json({message: 'Missing name'})
        } else {
            portal.name = body.name
        }

        if(!body.url){
            throw new HttpError("Url of the website is required",400)
            //return res.status(400).json({message: 'Missing url of website'})
        } else {
            portal.url = body.url
        }

        if(!body.description){
            throw new HttpError("Description is required",400)
            //return res.status(400).json({message: 'Missing description'})
        } else {
            portal.description = body.description
        }

        if(!body.viewText){
            throw new HttpError("View Text is required",400)
            //return res.status(400).json({message: 'Missing View Text'})
        } else {
            portal.viewText = body.viewText
        }

        // array
        if(body.admins){

            portal.admins.concat(body.admins)
        }

        if(body.reviewers){
            portal.reviewers = body.reviewers
        }

        if(body.contactPersons){
            portal.contactPersons = body.contactPersons
        }

        if(body.externalContactPersons){
            portal.externalContactPersons = body.externalContactPersons
        }

        //TODO: templates da implementare dopo la creazione delle esibizioni

        //doi - assegnato da società internazionale
        if(body.doiAbbreviation){
            portal.doiAbbreviation = body.doiAbbreviation
        }

        //settings
        if(body.features){
            //lista di booleani
            portal.features = body.features
        }
        /*
            i setting sono settati di default alla creazione del portale
            da parte del superAdmin
        */
        
        await portal.save()

        res.status(200).json({ok: true, message: 'Portal modified successfully'})

    }catch(err){
        next(err)
        //console.error(err.message)
        //res.status(500).json({error: 'Internal Error Server'})
    }
}

async function getAllInfo(req, res, next){
    const portal = req.portal;

    try{
        res.status(200).json({ok: true, portal})
    }catch(err){
        next(err)
    }
}

async function getPortals(req, res, next){
    try{
        const portals = await Portal.find({})

        res.status(200).json({ok: true, portals})
    }catch(err){
        next(err)
    }
}

module.exports = {edit, getAllInfo, getPortals}