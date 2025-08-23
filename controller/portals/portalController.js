const Portal = require("../../model/Portal")

async function edit (req, res){
    const body = req.body;
    const userId = req.user.id; //prende dal token
    const portalId = req.params.portal;

    try{
        const portal = Portal.findById(portalId)
        if(!portal){
            return res.status(404).send('Portal not found')
        }

        const user = portal.admins.find(admin => String(admin) === userId)
        if(!user){
            return res.status(401).send('Unauthorized')
        }

        //common
        //TODO: logo vedere come importare file

        if(!body.name){
            return res.status(400).send('Name of portal is required')
        } else {
            portal.name = body.name
        }

        if(!body.url){
            return res.status(400).send('Url of official website is required')
        } else {
            portal.url = body.url
        }

        if(!body.description){
            return res.status(400).send('Description of portal is required')
        } else {
            portal.description = body.description
        }

        if(!body.longDescription){
            return res.status(400).send('Long Description of portal is required')
        } else {
            portal.longDescription = body.longDescription
        }

        if(!body.viewText){
            return res.status(400).send('View Text of portal is required')
        } else {
            portal.viewText = body.viewText
        }

        // roles
        if(body.admins){
            portal.admins.concat(body.admins)
        }

        if(body.reviewers){
            portal.reviewers.concat(body.reviewers)
        }

        if(body.contactPersons){
            portal.contactPersons.concat(body.contactPersons)
        }

        portal.externalContactPersons = body.externalContactPersons

        //TODO: templates da implementare dopo la creazione delle esibizioni

        //doi - da chi viene assegnato?
        portal.doiAbbreviation = body.doiAbbreviation

        //settings
        portal.features = body.features
        /*
            i setting sono settati di default alla creazione del portale
            da parte del superAdmin, di conseguenza l'array di oggetti
            features è già composto di tutti i suoi elementi
        */
        
        await portal.save()

        res.status(200).send('Portal modified successfully')

    }catch(err){
        console.error(err.message)
        res.status(500).send('Internal Error Server')
    }
}

async function getAllInfo(req, res){
    const portalId = req.params.portal;

    try{
        const portal = Portal.findById(portalId)
        if(!portal){
            return res.status(404).send('Not found')
        }

        res.json(portal)

    }catch(err){
        console.error(err.message)
        res.status(500).send('Internal Server Error')
    }
}

module.exports = {edit, getAllInfo}