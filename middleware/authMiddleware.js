const jwt=require('jsonwebtoken')


function verifyToken(req,res,next){
    const authHeader=req.headers.authorization || req.headers.Authorization;

    if(!authHeader?.startsWith("Bearer ")){
        return res.status(401).json({message:"Non autorizzato:token mancante o malformato"})
    }

    const token=authHeader.split(' ')[1];

    jwt.verify(token,process.env.LOGIN_TOKEN, (err,decoded)=>{
        if(err){
            console.error('Errore nella verifica jwt: ',err.name, err.message);
            return res.status(403).json({message:'Proibito: Token non valido o scaduto'})
        }
        req.user = {
            id: decoded.userId,
        }
        next();
    })
}


module.exports = {verifyToken}