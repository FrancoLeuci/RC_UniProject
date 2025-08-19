const User = require('../model/User')
const nodemailer = require('nodemailer');
const {google} = require('googleapis');
const crypto = require('crypto');
require('dotenv').config();

//TODO: LUCIA RICORDA DI DISATTIVARE AVG DEL CAZZO!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

async function emailSender (email, id, resetKey){
    try{
        // metodo della libreria googleapis per creare un client oAuth2 autorizzato
        const oAuth2Client = new google.auth.OAuth2(
            process.env.CLIENT_ID,
            process.env.CLIENT_S,
            process.env.REDIRECT_URI
        );

        // metodo per impostare le credenziale di autorizzazione
        oAuth2Client.setCredentials({
            refresh_token: process.env.OAUTH_REFRESH_TOKEN
        })

        const accessToken = await oAuth2Client.getAccessToken();
        console.log(accessToken);

        // metodo per creare un oggetto Transport per l'invio dell'email
        const emailTransporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.EMAIL_USER,
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_S,
                refreshToken: process.env.OAUTH_REFRESH_TOKEN,
                accessToken: accessToken
            },
        })

        console.log(resetKey)
        if(resetKey===undefined){
            // URL usato dal client per verificare l'account
            const verificationUrl = `http://localhost:${process.env.PORT||5000}/api/auth/verification/${id}`;
            console.log(verificationUrl)

            // oggetto in cui è descritta l'email che verrà inviata al client
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'RC-uni - account verify',
                html: `Please click the link to verify your email: <a href="${verificationUrl}">${verificationUrl}</a>`,
            }

            return await emailTransporter.sendMail(mailOptions)
        } else {
            // URL usato dal client per resettare la password dell'account
            const verificationUrl = `http://localhost:${process.env.PORT||5000}/api/auth/reset/${resetKey}`;
            console.log(verificationUrl)

            // oggetto in cui è descritta l'email che verrà inviata al client
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'RC-uni - reset password',
                html: `Please click the link to reset password: <a href="${verificationUrl}">${verificationUrl}</a>`,
            }

            return await emailTransporter.sendMail(mailOptions)
        }
    }catch(err){
        console.error("Failed to send email, retry", err.message);
    }
}

async function register(req, res){
    const {surname,name,email,password,hide}=req.body;

    try{
        const user=await User.create({
            realName: `${name} ${surname}`,
            name, //TODO: name deve essere univoco per ogni user, ma dato che name va inserito dopo abbiamo che se 2 persone creano allo stesso momento 2 account, avremo che entrambi avranno name = null => errore nel DB
            email,
            password,
            hide
        })
        console.log("Utente creato", user);

        await emailSender(user.email, user._id)

        res.send("Email successfully sent")
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server Error")
    }
}

async function accountVerify(req, res){
    const id = req.params.id //TODO: modificare col token
    console.log(req.params)

    try{
        // verifica che l'utente esista nel DB
        const user = await User.findById(id)
        if(!user){
            return res.status(404).send('User not found');
        }

        //TODO: rimuoverlo dopo che porrò al posto di id il token
        if(user.verified){
            return res.status(403).send('Account already verified');
        }

        user.verified = true
        await user.save()

        res.status(200).send('Account verified');

    }catch(err){
        console.log(err.message);
        res.status(500).send("Internal Server Error")
    }
}

async function login(req, res){
    const {email, password} = req.body;

    try{
        // controllo body della richiesta
        if(!email){
            return res.status(400).json({error: 'Email is required'})
        }
        if(!password){
            return res.status(400).json({error: 'Password is required'})
        }

        const user = await User.findOne({email})
        if(!user){
            return res.status(404).json({error: 'User not found'})
        }

        const valid = await user.comparePassword(password)
        if(!valid){
            return res.status(403).json({message: 'Invalid password'})
        }

        // verifico che l'account sia stato verificato
        if(!user.verified){
            return res.status(401).json({message: "Account not verified, please check your email"})
        }

        //TODO: inserire la generazione dei token

        return res.status(200).json({
            message: `Successfully logged in: ${user.email}`
            //TODO: inserire accessToken
        })
    }catch(err){
        console.error(err.message);
        res.status(500).send("Internal Server Error")
    }
}

async function resetPasswordRequest(req, res){
    const {email} = req.body;

    try{
        // controllo body della richiesta
        if(!email){
            return res.status(400).json({error: 'Email is required'})
        }

        const user = await User.findOne({email})
        if(!user){
            return res.status(404).json({error: 'Email not valid, try again'})
        }

        //genero una stringa casuale per il campo passwordForgottenKey
        const randomString = crypto.randomBytes(32).toString('hex');
        console.log(randomString)

        user.passwordForgottenKey = randomString;
        await user.save();

        await emailSender(user.email,user.id,user.passwordForgottenKey)

        res.send("Email successfully sent")
    }catch(err){
        console.error(err.message);
        res.status(500).send("Internal Server Error")
    }
}

async function resetPassword(req, res){
    const passwordForgottenKey = req.params.key;
    const {newPass} = req.body;

    console.log(passwordForgottenKey)
    console.log(newPass);

    try{
        const user = await User.findOne({passwordForgottenKey})
        if(!user){
            return res.status(404).json({error: 'Link not valid'})
        }

        if(!newPass){
            return res.status(400).json({message: "New password is required"})
        }

        console.log(user.password)
        console.log(user.passwordForgottenKey)
        user.password = newPass;
        user.passwordForgottenKey = undefined;

        await user.save();

        console.log(user.password)
        console.log(user.passwordForgottenKey)

        res.status(200).send("Password successfully reset")

    }catch(err){
        console.error(err.message);
        res.status(500).send("Internal Server Error")
    }
}

module.exports = {register, accountVerify, login, resetPasswordRequest, resetPassword}