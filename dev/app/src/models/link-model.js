var mongoose = require('mongoose'),
    md5 = require('MD5');

exports.Link = mongoose.model("Link", {
    userId: String,
    url: String,
    title: String,
    description: String
});
