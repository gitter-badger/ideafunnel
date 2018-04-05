var mongoose = require('mongoose'),
    md5 = require('MD5');

exports.IdeaComment = mongoose.model("IdeaComment", {
    ideaId: {
        type: String,
        required: true
    },
    comment: {
        type: String,
        required: true
    },
    createdBy: {
        id: {
            type: String,
            required: false
        },
        guestName: {
            type: String,
            required: false
        }

    },
    creationDate: {
        type: Date,
        required: true
    },
    active: {
        type: Boolean,
        required: true
    }

});
