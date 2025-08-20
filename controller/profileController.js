// controller che presente le funzionalità di gestione del profilo da parte di un utente
const BasicUser = require('../model/BasicUser');

async function editProfile(req, res){
    const body = req.body;

    try{
        //dal token prendere id utente e vedere se l'access token è valido
        // per il momento uso l'id utente
        const user = await BasicUser.findById(body.userId);

        //email
        if(!body.email){
            return res.status(404).json({error: "Please, enter an email"})
        }
        if(body.email!==user.email){
            user.email = body.email;
        }


        //anno di nascita
        console.log(user.yearOfBirth)
        if(body.yearOfBirth!==user.yearOfBirth){
            user.yearOfBirth = body.yearOfBirth;
        }

        //nazione di residenza
        console.log(user.countryResidence)
        if(body.countryResidence!==user.countryResidence){
            user.countryResidence = body.countryResidence;
        }

        //nazione di cui si ha la cittadinanza
        console.log(user.countryCitizenship)
        if(body.countryCitizenship!==user.countryCitizenship){
            user.countryCitizenship = body.countryCitizenship;
        }

        //tagline
        console.log(user.tagLine)
        if(body.tagLine!==user.tagLine){
            user.tagLine = body.tagLine;
        }

        console.log(user.description)
        //TODO: vedere come fare il fatto di description
        if(body.description){
            for(const item of body.description){
                if(user.description.find(userItem=>userItem.lang===item.lang)){
                    user.description.find(userItem=>userItem.lang===item.lang).content = item.content;
                }else{
                    user.description.push(item)
                }
            }
        }


        await user.save()
        res.status(200).send('Profile edit')

    }catch(err){
        console.error(err.message);
        res.status(500).send("Internal Server Error")
    }
}

//TODO: completare, vedere dove sono posizionati i campi per gli annunci, ecc...
async function editSettings(req, res){

}

async function editPassword(req, res){
    const {newPass, conNewPass, userId} = req.body;

    try{
        //dal token prendere id utente e vedere se l'access token è valido
        // per il momento uso l'id utente
        const user = await BasicUser.findById(userId);

        if(!newPass){
            return res.status(404).json({error: 'Insert password'})
        }
        if(!conNewPass){
            return res.status(404).json({error: 'Insert confirm password'})
        }

        if(newPass!==conNewPass){
            return res.status(404).send("Confirm passwords don't match")
        }

        user.password = newPass;

        await user.save()

        res.status(200).send('Password change')
    } catch(err){
        console.error(err.message);
        res.status(500).send("Internal Server Error")
    }
}

module.exports = {editProfile, editPassword};