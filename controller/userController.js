const BasicUser = require('../model/BasicUser')
const nodemailer = require('nodemailer');
const {google} = require('googleapis');
const crypto = require('crypto');
const jwt = require('jsonwebtoken')
const RefreshToken=require("../model/tokenModel")
const Portal = require("../model/Portal")
const Request = require("../model/Request");
const Group = require("../model/Group");
require('dotenv').config();

const {HttpError} = require("../middleware/errorMiddleware");

//TODO: RICORDA DI DISATTIVARE AVG!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
const generateTokens=async (userID, roles)=>{
    let dataBase=true;

    const accessToken=jwt.sign({userId:userID, userRoles: roles},process.env.LOGIN_TOKEN,{expiresIn:"10m"});
    const refreshTokenFromDataBase=await RefreshToken.findOne({userId: userID});

    if(!refreshTokenFromDataBase){
        dataBase=false;
        const refreshToken=jwt.sign({userId:userID, userRoles: roles},process.env.REFRESH_TOKEN,{expiresIn:"6d"});
        return {accessToken,refreshToken,dataBase};
    }else{
        const refreshToken=refreshTokenFromDataBase.token
        return {accessToken,refreshToken,dataBase};
    }
}

async function emailSender (email, id, resetKey, next){
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

        if(resetKey===undefined){
            // URL usato dal client per verificare l'account
            const verificationUrl = `http://localhost:${process.env.PORT||5000}/api/auth/verification/${id}`;

            // oggetto in cui è descritta l'email che verrà inviata al client
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Confirm your email address',
                html: `Please click below to confirm your email address: <a href="${verificationUrl}">Confirm email address</a>`,
            }

            return await emailTransporter.sendMail(mailOptions)
        } else {
            // URL usato dal client per resettare la password dell'account
            const verificationUrl = `http://localhost:${process.env.PORT||5000}/api/auth/reset/${resetKey}`;

            // oggetto in cui è descritta l'email che verrà inviata al client
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Reset your account password',
                html: `Please click below to reset your account password: <a href="${verificationUrl}">Reset password</a>`,
            }

            return await emailTransporter.sendMail(mailOptions)
        }
    }catch(err){
        if(resetKey===undefined){
            await BasicUser.findByIdAndDelete(id)
        }
        console.error("Errore invio email:", err);
        throw new HttpError("Failed to send email: " + err.message, 500);
        //console.error("Failed to send email, retry", err.message);
    }
}

async function register(req, res, next){
    const {surname,name,email,password,hide}=req.body;

    try{
        if(!surname){
            throw new HttpError("Surname is required",400)
            //return res.status(400).json({message: 'Missing surname'})
        }
        if(!name){
            throw new HttpError("Name is required",400)
            //return res.status(400).json({message: 'Missing name'})
        }
        if(!email){
            throw new HttpError("Email address is required",400)
            //return res.status(400).json({message: 'Missing email address'})
        }
        if(!password){
            throw new HttpError("Password is requierd",400)
            //return res.status(400).json({message: 'Missing password'})
        }

        const user=await BasicUser.create({
            realName: `${name} ${surname}`,
            email,
            password,
            hide
        })

        await emailSender(user.email, user._id)

        res.status(201).json({ok: true, message:"User successfully registered, check email"})
    } catch (err) {
        //console.error(err.message);
        //res.status(500).json({error: "Internal Server Error"})
        next(err)
    }
}

async function accountVerify(req, res, next){
    const id = req.params.id

    try{
        // verifica che l'utente esista nel DBn
        const user = await BasicUser.findById(id)
        if(!user){
            throw new HttpError("User not Found",404)
            //return res.status(404).json({error: 'User not found'});
        }

        if(user.verified){
            throw new HttpError("Account already verified",208)
            //return res.status(208).json({message: 'Account already verified'});
        }

        user.verified = true

        await user.save()

        res.status(200).json({ok: true, message:"Account verified!"});

    }catch(err){
        next(err)
        //console.log(err.message);
        //res.status(500).json({error: "Internal Server Error"})
    }
}

async function login(req, res, next){
    const {email, password} = req.body;

    try{
        // controllo body della richiesta
        if(!email){
            throw new HttpError("Email is required",400)
            //return res.status(400).json({message: 'Missing email'})
        }
        if(!password){
            throw new HttpError("Password is required",400)
            //return res.status(400).json({message: 'Missing password'})
        }

        const user = await BasicUser.findOne({email})
        if(!user){
            throw new HttpError("User not found",404)
            //return res.status(404).json({error: 'User not found'})
        }

        const valid = await user.comparePassword(password)
        if(!valid){
            throw new HttpError("Incorrect password",401)
            //return res.status(401).json({error: 'Incorrect password'})
        }

        // verifico che l'account sia stato verificato
        if(!user.verified){
            throw new HttpError("Account not verified, check your email",401)
            //return res.status(401).json({error: 'Account not verified'})
       }

        const {accessToken,refreshToken,dataBase}=await generateTokens(user._id, user.roles);
        if(!dataBase){
            await RefreshToken.create({
                token:refreshToken,
                userId:user._id,
                userRoles:user.roles
            });
        }

        res.cookie('jwt', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'Lax',
            maxAge:  6* 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            ok: true,
            message: `Successfully logged in: ${user.email}`,
            accessToken
        })
    }catch(err){
        next(err)
        //console.error(err.message);
        //res.status(500).json({error: 'Internal Server Error'})
    }
}

async function logout(req, res, next){
    const cookies=req.cookies;
    console.log(cookies)

    if(!cookies?.jwt){
        return res.sendStatus(204);
    }
    const refreshTokenFromCookie=cookies.jwt;

    try{
        await RefreshToken.deleteOne({
            token:refreshTokenFromCookie
        })

        res.clearCookie("jwt",{
            httpOnly:true,
            secure:false,
            sameSite:"None",
        })

        res.status(200).json({ok: true, message:'Logout effettuato con successo.'})

    }catch(err){
        next(err)
        //console.error(err.message)
        //res.status(400).json({error: 'Internal Server Error'})
    }
}

async function resetPasswordRequest(req, res, next){
    const {email} = req.body;

    try{
        // controllo body della richiesta
        if(!email){
            throw new HttpError("Email is required",400)
            //return res.status(400).json({message: 'Missing email'})
        }

        const user = await BasicUser.findOne({email})
        if(!user){
            throw new HttpError("Email not valid",404)
            //return res.status(404).json({error: 'Email not valid, try again'})
        }

        //genero una stringa casuale per il campo passwordForgottenKey
        user.passwordForgottenKey = crypto.randomBytes(32).toString('hex');
        await user.save();

        await emailSender(user.email,user.id,user.passwordForgottenKey)

        res.status(200).json({ok: true, message: 'Check your email'})
    }catch(err){
        next(err)
        //console.error(err.message);
        //res.status(500).json({error: 'Missing password'})
    }
}

async function resetPassword(req, res, next){
    const passwordForgottenKey = req.params.key;
    const {newPass} = req.body;

    try{
        const user = await BasicUser.findOne({passwordForgottenKey})
        if(!user){
            throw new HttpError("Link not valid",403)
            //return res.status(403).json({error: 'Link not valid'})
        }

        if(!newPass){
            throw new HttpError("New password is required",400)
            //return res.status(400).json({message: "New password is required"})
        }

        user.password = newPass;
        user.passwordForgottenKey = undefined;

        await user.save();

        res.status(200).json({ok: true, message:"Password successfully reset"})

    }catch(err){
        next(err)
        //console.error(err.message);
        //res.status(500).json({error: 'Internal Server Error'})
    }
}

async function requestToBecomePortalMember(req, res, next){
    const userId = req.user.id
    const portalId = req.params.portalId
    try{
        const portal = await Portal.findById(portalId)
        if(!portal){
            throw new HttpError("Portal not found",404)
        }

        if(!portal.features.MEMBERSHIP_SELECTION) throw new HttpError(`${portal.name} not accept request`,409)

        const user = await BasicUser.findById(userId)

        const existingRequest = await Request.findOne({
            sender: user._id,
            receiver: portal._id,
            type: 'portal.requestToAccess',
            extra: portal._id
        });

        if (existingRequest) {
            throw new HttpError("You have already requested access to this portal", 409);
        }

        if(portal.members.includes(user._id)||portal.admins.includes(user._id)){
            throw new HttpError("You are already a member of the portal",409)
        }

        await Request.create({
            sender: user._id,
            receiver: portal._id,
            type: 'portal.requestToAccess',
            content: `${user.realName} want to became a member of ${portal.name}`,
            extra: portal._id
        })

        res.status(201).json({ok: true, message: "Request send successfully"})
    }catch(err){
        next(err)
    }
}

async function requestToBecomeGroupMember(req, res, next){
    const userId = req.user.id
    const groupId = req.params.grId
    try{
        const group = await Group.findById(groupId)
        if(!group){
            throw new HttpError("Group not found",404)
        }

        const user = await BasicUser.findById(userId)

        const portal = await Portal.findById(group.portal)

        const existingRequest = await Request.findOne({
            sender: userId,
            receiver: group._id,
            type: 'group.requestToAccess',
             extra: group._id
        });

        if (existingRequest) {
            throw new HttpError("You have already requested access to this group", 409);
        }

        if(group.members.includes(user._id)||group.admins.includes(user._id)){
            throw new HttpError("You are already a member of the group",409)
        }

        if(!user.approved) throw new HttpError("You do not have a full account",409);

        await Request.create({
            sender: userId,
            receiver: group._id,
            type: 'group.requestToAccess',
            content: `${user.realName} want to became a member of ${group.title}`,
            extra: group._id
        })

        res.status(201).json({ok: true, message: "Request send successfully"})
    }catch(err){
        next(err)
    }
}

async function findUserByName(req,res,next){
    const {text} = req.body;
    try{
        if(!text) throw new HttpError("Enter a text",400);

        const allUsers = await BasicUser.find({});

        const validUsers = allUsers.filter(user => user.realName.includes(text))

        res.status(200).json({ok: true, data: validUsers})
    }catch(err){
        next(err)
    }
}

async function deleteSelfRequest(req,res,next){
    //TODO: ricordare di porre il controllo sul numero di admins del portale, di cui se è il singolo admin avvisare
    const userId = req.user.id
    const superAdminList=await BasicUser.find({role:"super-admin"})

    try{
        //capire lo status code
        if(superAdminList.length===0)throw new HttpError("Can't request to delete your account. There are no superAdmins available at the moment. Contant the website owner. ",418)

        const user=await BasicUser.findById(userId).populate("portals")
        user.portals.map(p=>{
            if(p.admins.includes(user._id)&&p.admins.length===1)throw new HttpError(`Can't process this request, you are the only admin in ${p.name}. Add another admin to the list and then request again`)
        })

        const existingRequest = await Request.find({
            sender: userId,
            type: 'user.selfDeleteRequest',
        })

        if (existingRequest) {
            throw new HttpError("You have already requested access to this group",409)
        }

        await Promise.all(superAdmin.map(async superAdmin=>
            await Request.create({
                sender: userId,
                receiver: superAdmin._id,
                type: 'user.selfDeleteRequest',
                content: `${user.realName} has requested to delete his account permanently from the website.`,
            })
        ))

        res.status(201).send('Request sent successfully')
    }catch(err){
        next(err)
    }

}
module.exports = {register, accountVerify, login, logout, resetPasswordRequest, resetPassword, requestToBecomePortalMember, requestToBecomeGroupMember, findUserByName,deleteSelfRequest}