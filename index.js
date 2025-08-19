const express = require('express');
require('dotenv').config();

const dbCon = require('./controller/DBcontroller');
const authRoutes = require('./routes/authRoutes');

const app = express();

const Port = process.env.PORT || 5000;

app.use(express.json());

app.use("/api/auth", authRoutes);

dbCon().then(()=>{
    app.listen(Port, ()=>{
        console.log(`Server is running on: http://localhost:${Port}`)
    })
})