const BasicUser = require('../model/BasicUser')
const nodemailer = require('nodemailer');
const {google} = require('googleapis');
const crypto = require('crypto');
const jwt = require('jsonwebtoken')
const RefreshToken=require("../model/tokenModel")
const Portal = require("../model/Portal")
const Request = require("../model/Request");
const Group = require("../model/Group");
const FullUser=require("../model/FullUser")

require('dotenv').config();

const {HttpError} = require("../middleware/errorMiddleware");
const Notification = require("../model/Notification");

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
            throw new HttpError("Password is required",400)
            //return res.status(400).json({message: 'Missing password'})
        }

        const user=await BasicUser.create({
            realName: `${name} ${surname}`,
            email,
            password,
            hide
        })

        //await emailSender(user.email, user._id)

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
        // verifica che l'utente esista nel DB
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
                userRoles:user.role
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
    const {aliasName} = req.body;
    try{
        const portal = await Portal.findById(portalId)
        if(!portal){
            throw new HttpError("Portal not found",404)
        }

        if(!portal.features.MEMBERSHIP_SELECTION) throw new HttpError(`${portal.name} does not accept request`,409)
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

        const isFull = await FullUser.findOne({basicCorrespondent: user._id})
        if(!isFull){
            if(!aliasName) throw new HttpError('Alias field is required',400)
            const isUnique = await FullUser.findOne({alias: aliasName})
            if(isUnique) throw new HttpError('Alias already in use',409)

            await Request.create({
                sender: user._id,
                receiver: portal._id,
                type: 'portal.requestToAccess',
                content: `${user.realName} want to became a member of ${portal.name}`,
                extra: portal._id,
                alias: aliasName
            })
        } else {
            await Request.create({
                sender: user._id,
                receiver: portal._id,
                type: 'portal.requestToAccess',
                content: `${user.realName} want to became a member of ${portal.name}`,
                extra: portal._id
            })
        }

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

    try{
        const superAdminList=await BasicUser.find({role:"super-admin"})
        //capire lo status code
        if(superAdminList.length===0)throw new HttpError("Can't request to delete your account. There are no superAdmins available at the moment. Contant the website owner. ",418)

        const user=await BasicUser.findById(userId).populate("portals")
        const userFullAccount=await FullUser.findOne({basicCorrespondent:user._id}).populate("groups")
        //controllo sui gruppi, se è unico admin deve promuovere almeno un altro alla posizione
        if(userFullAccount){
            let oneAdminNotification = []
            userFullAccount.groups.forEach(pg=>{
                if(pg.admins.includes(userFullAccount._id)&&pg.admins.length===1) oneAdminNotification.push(pg.title)
            })
            if(oneAdminNotification.length>0){
                throw new HttpError(
                    `${oneAdminNotification.join(", ")} only has/have 1 admin. Promote a member for each portal to leave the portal.`, 409);
            }
        }


        user.portals.map(p=>{
            if(p.admins.includes(user._id)&&p.admins.length===1)throw new HttpError(`Can't process this request, you are the only admin in ${p.name}. Add another admin to the list and then request again.`,400)
        })

        const existingRequest = await Request.findOne({
            sender: userId,
            type: 'user.selfDeleteRequest',
        })

        if (existingRequest) {
            throw new HttpError("Request already made. ",409)
        }

        await Promise.all(superAdminList.map(async superAdmin=>
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

async function fullAccountRequest(req,res,next){
    //TODO: chiedere se c'è bisogno di qualcosa per andare full. Una carta d'identità o simili.

    const userId = req.user.id
    const {newAlias}=req.body

    try{
        if(!newAlias)throw new HttpError("Alias not found. You must specify an alias to request a Full Account. ",400)
        const sameAlias=await FullUser.findOne({alias:newAlias})
        if(sameAlias)throw new HttpError("Alias already in use. Please choose another one. ",409)

        const superAdminList=await BasicUser.find({role:"super-admin"})
        if(superAdminList.length===0)throw new HttpError("Can't request to update your account. There are no superAdmins available at the moment. Contant the website owner. ",418)
        const user=await BasicUser.findById(userId)
        if(!user){
            throw new HttpError("User not found.",404)
        }

        const existingRequest = await Request.findOne({
            sender: userId,
            type: 'user.fullAccountRequest',
        })

        if (existingRequest) {
            throw new HttpError("Request already made. ",409)
        }

        await Promise.all(superAdminList.map(async superAdmin=>
            await Request.create({
                sender: userId,
                receiver: superAdmin._id,
                type: 'user.fullAccountRequest',
                content: `${user.realName} has requested to promote his basic account to full.`,
                alias:newAlias
            })
        ))

        res.status(201).send('Request sent successfully')
    }catch(err){
        next(err)
    }
}


//funzione per lasciare il portale. Se sono creatore di un'expo linkata al portale viene tagliato il legame e resta up (Full)
//se sono in qualche gruppo, esco (Full)
//se sono reviewer, vengo tolto da tutte le review del portale
//se sono admin viene tolto dagli admin - richieste da admin a utente da eliminare (portale e gruppo se admin gruppo)

//verifytoken e basta
async function leavePortal(req,res,next){

    const userId = req.user.id
    const portalId = req.params.portal
    try{
        const portal=await Portal.findById(portalId).populate("linkedExpositions");
        if(!portal)throw new HttpError("Portal not found.",404)
        const userBasicAccount=await BasicUser.findById(userId)
        const userFullAccount=await FullUser.findOne({basicCorrespondent:userBasicAccount._id}).populate("groups").populate("expositions")

        if(userFullAccount){
            const portalGroups = userFullAccount.groups.filter(g => g.portal.equals(portal._id))
            let oneAdminNotification = []
            portalGroups.forEach(pg=>{
                if(pg.admins.includes(userFullAccount._id)&&pg.admins.length===1) oneAdminNotification.push(pg.title)
            })
            if(oneAdminNotification.length>0){
                throw new HttpError(
                    `${oneAdminNotification.join(", ")} only has/have 1 admin. Promote a member for each portal to leave the portal.`, 409);
            }
        }

        if(userBasicAccount.portals.includes(portal._id)){
            let index=portal.admins.indexOf(userBasicAccount._id);
            if(index===-1){
                index=portal.members.indexOf(userBasicAccount._id);
                portal.members.splice(index,1)
            } else {
                if(portal.admins.length===1) throw new HttpError(`Can't process this request, you are the only admin in ${portal.name}. Add another admin to the list and then request again.`,400)
                portal.admins.splice(index,1)
            }
            index=portal.reviewers.indexOf(userBasicAccount._id)
            if(index!==-1){
                portal.reviewers.splice(index,1)
                await Promise.all(portal.linkedExpositions.map(async e=>{
                    console.log("reviewer dall'expo: ",e.reviewer)
                    console.log("cond su reviewerflag : ",e.reviewer.user?.equals(userBasicAccount._id))
                    if(e.reviewer.user?.equals(userBasicAccount._id)){
                        e.reviewer={flag:false,user:null};
                        e.shareStatus="private";
                        await e.save();

                        const creator=e.authors.find(a => a.role==="creator")
                        const creatorFull=await FullUser.findById(creator.userId)

                        const notification = await Notification.findOne({receiver: creatorFull.basicCorrespondent})
                        if (notification) {
                            notification.backlog.push(`Your exposition ${e.title} will not be reviewed by ${userBasicAccount.realName} anymore since he has left the Portal ${portal.name}. Make a new request to get a new reviewer.`)
                            await notification.save() //sta qui
                        } else {
                            await Notification.create({
                                receiver: creatorFull.basicCorrespondent,
                                backlog: `Your exposition ${e.title} will not be reviewed by ${userBasicAccount.realName} anymore since he has left the Portal ${portal.name}. Make a new request to get a new reviewer. `
                            })
                        }
                    }
                }))
            }

            const notification = await Notification.findOne({receiver: portal._id})
            if (notification) {
                notification.backlog.push(`${userBasicAccount.realName} has left the portal, so his/her expositions are removed.`)
                await notification.save() //sta qui
            } else {
                await Notification.create({
                    receiver: portal._id,
                    backlog: `${userBasicAccount.realName} has left the portal, so his/her expositions are removed.`
                })
            }

            userBasicAccount.portals.splice(userBasicAccount.portals.indexOf(portal._id),1)
            await userBasicAccount.save()

            //esce dai gruppi
            if(userFullAccount){
                const portalGroups = userFullAccount.groups.filter(g => g.portal.equals(portal._id))
                await Promise.all(userFullAccount.groups.map(async g=>{
                    let index=g.admins.indexOf(userFullAccount._id);
                    if(index===-1){
                        index=g.members.indexOf(userFullAccount._id);
                        g.members.splice(index,1)
                    } else {
                        g.admins.splice(index,1)
                    }
                    await g.save();

                    const notification = await Notification.findOne({receiver: g._id})
                    if (notification) {
                        notification.backlog.push(`${userBasicAccount.realName} has left the Portal ${portal.name}, so he/she won't be part of ${g.title} anymore.`)
                        await notification.save() //sta qui
                    } else {
                        await Notification.create({
                            receiver: g._id,
                            backlog: `${userBasicAccount.realName} has left the Portal ${portal.name}, so he/she won't be part of ${g.title} anymore. `
                        })
                    }
                }))

                userFullAccount.groups=userFullAccount.groups.filter(g=>!g.portal.equals(portal._id))
                await userFullAccount.save()

                //ho popolato linkedExpositions ed expositions rispettivamente da portal e userFullAccount
                await Promise.all(userFullAccount.expositions.map(async e=>{
                    //se è collegata al portale di cui sopra
                    if(e.portal?.equals(portal._id)){
                        e.portal=0;
                        //se sta in fase di reviewing
                        if(e.shareStatus==="reviewing"){
                            e.shareStatus="private";
                            e.reviewer={flag:false,user:null}
                        }

                        await e.save()
                        //viene rimossa la traccia nel portale
                        portal.linkedExpositions=portal.linkedExpositions.filter(eL=>!eL._id.equals(e._id))
                    }
                }))
            }

            await portal.save()
            res.status(200).send("You left the portal.")
        } else {throw new HttpError(`You are not a member/admin of ${portal.name} portal.`,400)}
    }catch(err){
        next(err)
    }
}

//I gruppi saranno gestiti dai soli admin di esso, il portal-admin potrà solo crearli inserendo il primo admin del gruppo
async function leaveGroup(req,res,next){
    const userId=req.user.id
    const groupId=req.params.groupId
    try{
        const group=await Group.findById(groupId)
        if(!group) throw new HttpError('Group not found.',404)
        const userFullAccount=await FullUser.findOne({basicCorrespondent:userId})
        if(!userFullAccount){
            throw new HttpError("User does not have a full account. ",400)
        }

        if(userFullAccount.groups.includes(group._id)){
            userFullAccount.groups=userFullAccount.groups.filter(g=>!g.equals(group._id))
            let index=group.members.indexOf(userFullAccount._id)
            if(index===-1){
                if(group.admins.length===1) throw new HttpError(`Can't process this request, you are the only admin in ${group.title}. Add another admin to the list and then request again.`,400)
                group.admins.splice(group.admins.indexOf(userFullAccount._id),1)
            }else{
                group.members.splice(index,1)
            }

            const notification = await Notification.findOne({receiver: group._id})
            if (notification) {
                notification.backlog.push(`${userFullAccount.alias} has left the Group ${group.title}. `)
                await notification.save() //sta qui
            } else {
                await Notification.create({
                    receiver: group._id,
                    backlog: `${userFullAccount.alias} has left the Group ${group.title}. `
                })
            }

            await userFullAccount.save()
            await group.save();
        } else {
            throw new HttpError(`You are not a member/admin of ${group.title} group.`,400)
        }
        res.status(200).send("You left the group.")
    }catch(err){
        next(err)
    }
}

async function requestToCreatePortal(req, res, next){
    //adminsId è un array di BasicUser.id
    const userId = req.user.id
    const {name, description, adminsId} = req.body;
    try{
        if(!name || !description || adminsId.length<1){
            throw new HttpError('All fields are required',400)
        }

        //TODO TEST
        await Promise.all(adminsId.map(async adminId=>{
            const user=await BasicUser.findById(adminId);
            if(!user)throw new HttpError("One of the users in the admin list was not found.",404)
        }))

        adminsId.push(userId)

        const portalByName = await Portal.findOne({name: name})
        if(portalByName) throw new HttpError('Name already used',400)

        //una richiesta per volta, per lo stesso portale
        const existingRequest = await Request.findOne({
            sender: userId,
            type: 'portal.create',
            "formFields.title": name,
            "formFields.description": description,
        });

        if (existingRequest) {
            throw new HttpError("Request alredy sent.", 409);
        }

        const superAdminList=await BasicUser.find({role:"super-admin"})
        if(superAdminList.length===0)throw new HttpError("Can't request to create the portal. There are no superAdmins available at the moment. Contact the website owner. ",418)

        const user = await BasicUser.findById(userId)

        await Promise.all(superAdminList.map(async superAdmin=>
            await Request.create({
                sender: userId,
                receiver: superAdmin._id,
                type: 'portal.create',
                content: `${user.realName} has requested to create a portal.`,
            })
        ))

        res.status(201).json({ok: true, message: "Request sent successfully"})

    }catch(err){
        next(err)
    }
}

//TODO test
async function requestToCreateGroup(req, res, next){
    //adminsId è un array di BasicUser.id
    const userId = req.user.id
    const portalId=req.params.portal //id del portale nei parametri
    const {title, description, adminsId} = req.body;
    try{
        if(!portalId) throw new HttpError("Can't find portal Id in request parameters.")
        const user = await BasicUser.findById(userId)
        if(user.portals.includes(portalId)){
            const portal = await Portal.findById(portalId);
            if(portal.admins.includes(user._id)) throw new HttpError('You are Not Authorized',401)
        } else {
            throw new HttpError('You are Not Authorized - you are not a member of the portal',401)
        }

        const userFull=await FullUser.findOne({basicCorrespondent:userId})
        if(!userFull) throw new HttpError("You can't create a group since you don't have a full account. ",403)
        const portal=await Portal.findById(portalId)
        if(!portal) throw new HttpError("Portal not found.",404)
        if(!title || !description || adminsId.length<1){
            throw new HttpError('All fields are required',400)
        }

        //TODO TEST
        await Promise.all(adminsId.map(async adminId=>{
            const user=await FullUser.findOne({basicCorrespondent: adminId});
            if(!user)throw new HttpError("One of the users in the admin list doesn't have a full Account.",404)
        }))

        adminsId.push(userId)

        //una richiesta per volta, per lo stesso portale
        //!IMPORTANT controlla che non ci siano richieste per lo stesso portale di creazione di gruppi con lo stesso titolo e description
        const existingRequest = await Request.findOne({
            type: 'group.create',
            "formFields.title": title,
            "formFields.description": description,
            receiver:portal._id
        });

        if (existingRequest) {
            throw new HttpError("Request alredy sent.", 409);
        }

        await Request.create({
                sender: userFull.basicCorrespondent,
                receiver: portal._id,
                type: 'portal.create',
                content: `${userFull.alias} has requested to create a portal.`,
        })

        res.status(201).json({ok: true, message: "Request sent successfully."})

    }catch(err){
        next(err)
    }
}

module.exports = {register, accountVerify, login, logout, resetPasswordRequest, resetPassword, requestToBecomePortalMember,
    requestToBecomeGroupMember, findUserByName, deleteSelfRequest, fullAccountRequest, leavePortal, leaveGroup, requestToCreatePortal,
    requestToCreateGroup}