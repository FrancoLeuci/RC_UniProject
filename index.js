const express = require('express');
require('dotenv').config();

const dbCon = require('./controller/DBcontroller');
const authRoutes = require('./routes/authRoutes');
const portalRoutes = require('./routes/portalRoutes');
const pageRoutes = require('./routes/pageRoutes')

const app = express();

const Port = process.env.PORT || 5000;

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/portal", portalRoutes);
app.use("/api", pageRoutes)

dbCon().then(()=>{
    app.listen(Port, ()=>{
        console.log(`Server is running on: http://localhost:${Port}`)
    })
})