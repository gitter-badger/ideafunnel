var mongoose = require('mongoose'),
    md5 = require('MD5');

exports.User = mongoose.model("User", {
    _id: {
        type: String,
        required: true
    },
    firstName: {
        type: String,
        required: true
    },
    surname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    profilePic: {
        type: String,
        required: false
    },
    appTokens: [
        {
            appToken: String,
            userToken: String
        }
    ],
    auth: [
        {
            provider: String,
            providerId: String
        }
    ]
});
