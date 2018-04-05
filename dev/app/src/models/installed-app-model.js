var mongoose = require('mongoose'),
    md5 = require('MD5');

exports.InstalledApp = mongoose.model("InstalledApp", {
    userId: String,
    appId: String,
    userKey: String,
    title: String,
    description: String
});