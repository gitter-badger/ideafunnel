var mongoose = require('mongoose');
var md5 = require('MD5');

exports.IdeaBoardMember = mongoose.model("IdeaBoardMember", {
    userId: {
        type: String,
        required: true
    },
    ideaBoardId: {
        type: String,
        required: true
    },
    admin: {
        type: Boolean
    },
    joinedOn: {
        type: Date,
        required: true
    }

});
