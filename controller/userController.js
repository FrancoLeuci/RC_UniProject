const User = require('../model/User')
const nodemailer = require('nodemailer');
require('dotenv').config();

async function register(req, res){
    const {surname,name,email}=req.body;

    const emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PS
        },
        //TODO: sistemare sto fatto che gmail non accetta l'autorizzazione
        tls: {
            rejectUnauthorized: false // Accept self-signed certs
        }
    })

    try{
        const user=await User.create({
            realName: name+surname,
            email,
        })
        console.log("Utente creato");
        console.log(user)

        const verificationUrl = `http://localhost:${process.env.PORT||3001}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Verify your email',
            html: `Please click to verify your email: <a href="${verificationUrl}">${verificationUrl}</a>`,
        }

        await emailTransporter.sendMail(mailOptions)
        res.send("Successful")
    } catch (err) {
        console.error(err.message);
    }
}

module.exports = {register}