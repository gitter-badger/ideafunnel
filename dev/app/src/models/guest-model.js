var mongoose = require('mongoose');
var md5 = require('MD5');

exports.Guest = mongoose.model("Guest", {
    name: String,
    sessions: [
        {
            boardId: String,
            sessionId: String
        }
    ]
});
