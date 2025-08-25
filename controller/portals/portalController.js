
async function edit (req, res){
    const body = req.body;
    const portal=req.portal;

    try{
        //common
        //TODO: logo vedere come importare file

        if(!body.name){
            return res.status(400).json({message: 'Missing name'})
        } else {
            portal.name = body.name
        }

        if(!body.url){
            return res.status(400).json({message: 'Missing url of website'})
        } else {
            portal.url = body.url
        }

        if(!body.description){
            return res.status(400).json({message: 'Missing description'})
        } else {
            portal.description = body.description
        }

        if(!body.longDescription){
            return res.status(400).json({message: 'Missing Long Description'})
        } else {
            portal.longDescription = body.longDescription
        }

        if(!body.viewText){
            return res.status(400).json({message: 'Missing View Text'})
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

        if(body.externalContactPersons){
            portal.externalContactPersons = body.externalContactPersons
        }

        //TODO: templates da implementare dopo la creazione delle esibizioni

        //doi - da chi viene assegnato?
        if(body.doiAbbreviation){
            portal.doiAbbreviation = body.doiAbbreviation
        }

        //settings
        if(body.features){
            portal.features = body.features
        }
        /*
            i setting sono settati di default alla creazione del portale
            da parte del superAdmin, di conseguenza l'array di oggetti
            features è già composto di tutti i suoi elementi
        */
        
        await portal.save()

        res.status(200).json({ok: true, message: 'Portal modified successfully'})

    }catch(err){
        console.error(err.message)
        res.status(500).json({error: 'Internal Error Server'})
    }
}

async function getAllInfo(req, res){
    const portal = req.portal;

    try{

        res.status(200).json({ok: true, portal})

    }catch(err){
        console.error(err.message)
        res.status(500).json({error: 'Internal Server Error'})
    }
}

module.exports = {edit, getAllInfo}