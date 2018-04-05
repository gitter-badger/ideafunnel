var mongoose = require('mongoose'),
    md5 = require('MD5');

exports.Idea = mongoose.model("Idea", {
    ideaBoardId: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    createdBy: {
        type: String,
        required: false
    },
    guestCreatedBy: {
        guestId: String,
        name: String
    },
    session: {
        type: String
    },
    creationDate: {
        type: Date,
        required: true
    },
    active: {
        type: Boolean,
        required: true,
        default: true
    },
    hasImage: {
        type: Boolean,
        required: false
    },
    likes: [String],
    dislikes: [String],
    importantWords: [
        {
            original: String,
            stemmed: String
        }
    ],
    qualifications: [
        {
            userId: String,
            criteriaId: String,
            optionId: String
        }
    ]
});
