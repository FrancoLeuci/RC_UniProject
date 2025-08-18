const express = require('express')
require('dotenv').config()

const userRouter = require('./routes/authRoutes')

const app = express()

app.use(express.json())

app.use('/api/users', userRouter)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
    console.log(`Listening on http://localhost:${PORT}`)
})