const mongoose = require('mongoose');


async function dbCon(){
    try{
        const con = await mongoose.connect(process.env.MONGODB_URI)
        console.log(`MongoDB connected: ${con.connection.host}`);
    }catch(error){
        console.log('Error connection to MongoDB',error.message);
        process.exit(1); //errore
    }
}

module.exports = dbCon;