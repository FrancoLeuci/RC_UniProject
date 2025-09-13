const express = require('express');
require('dotenv').config();

const dbCon = require('./controller/DBcontroller');
const authRoutes = require('./routes/authRoutes');
const portalRoutes = require('./routes/portalRoutes');
//const pageRoutes = require('./routes/pageRoutes')
const followRoutes = require('./routes/followRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const setRoutes=require('./routes/setRoutes');
const requestRoutes = require('./routes/requestRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expositionRoutes = require('./routes/expositionRoutes')
const reviewerRoutes = require('./routes/reviewerRoutes');

const {errorHandler} = require("./middleware/errorMiddleware");

const app = express();

const Port = process.env.PORT || 5000;

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/portal", portalRoutes);
//app.use("/api", pageRoutes)
app.use("/api/follow", followRoutes)
app.use("/api/uploads",mediaRoutes)
app.use("/api/set", setRoutes)
app.use("/api/requests", requestRoutes)
app.use("/api/group", groupRoutes)
app.use("/api/expo", expositionRoutes)
app.use("/api/reviewer", reviewerRoutes)

app.use(errorHandler)

dbCon().then(()=>{
    app.listen(Port, ()=>{
        console.log(`Server is running on: http://localhost:${Port}`)
    })
})