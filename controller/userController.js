const User = require('../model/User')
const nodemailer = require('nodemailer');
const {google} = require('googleapis');
require('dotenv').config();

async function register(req, res){
    const {surname,name,email,password,hide}=req.body;

    const oAuth2Client = new google.auth.OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_S,
        process.env.REDIRECT_URI
    );

    oAuth2Client.setCredentials({
        refresh_token: process.env.OAUTH_REFRESH_TOKEN
    })

    const accessToken = await oAuth2Client.getAccessToken();
    console.log(accessToken);

    const emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: process.env.EMAIL_USER,
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_S,
            refreshToken: process.env.OAUTH_REFRESH_TOKEN,
            accessToken: accessToken.token
        },
    })

    try{
        const user=await User.create({
            realName: `${name} ${surname}`,
            name, //TODO: name deve essere univoco per ogni user, ma dato che name va inserito dopo abbiamo che se 2 persone creano allo stesso momento 2 account, avremo che entrambi avranno name = null => errore nel DB
            email,
            password,
            hide
        })
        console.log("Utente creato");
        console.log(user)

        const verificationUrl = `http://localhost:${process.env.PORT||5000}/api/auth/verification/${user._id}`;
        console.log(verificationUrl)

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Verify your email',
            html: `Please click to verify your email: <a href="${verificationUrl}">${verificationUrl}</a>`,
        }

        await emailTransporter.sendMail(mailOptions)

        res.send("Email successfully sent")
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Failed to send email")
    }
}

async function test(req, res){
    const id = req.params.id
    console.log(req.params)
    try{
        const user = await User.findById(id)
        if(!user){
            return res.status(403).send('Bho');
        }

        //TODO: rimuoverlo dopo che porrò al posto di id il token
        if(user.verified){
            return res.status(300).send('Account already verified').end();
        }

        user.verified = true

        await user.save()

        res.status(200).send('Account verified');

    }catch(err){
        console.log(err.message);
    }
}

module.exports = {register, test}