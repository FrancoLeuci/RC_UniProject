const mongoose = require('mongoose')
const User = require('./User')

const profileSchema = new mongoose.Schema({
    picture: {
        type: String,
        default: "https://thumbs.dreamstime.com/b/default-avatar-profile-trendy-style-social-media-user-icon-187599373.jpg"
    }
})

profileSchema.add(User.schema)

module.exports = mongoose.model('Profile', profileSchema)