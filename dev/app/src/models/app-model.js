var mongoose = require('mongoose'),
    md5 = require('MD5');

exports.App = mongoose.model("App", {
    title: String,
    description: String,
    appId: String
});