var mongoose = require('mongoose'),
    md5 = require('MD5');

exports.SESSION_TYPE_CAPTURE = "capture";
exports.SESSION_TYPE_VOTE = "vote";

exports.Session = new mongoose.Schema({
    title: String,
    date: Date,
    password: String,
    beaconId: {
        type: Number,
        required: false
    },
    sessionType: {
        type: String,
        required: false
    }
});

exports.IdeaBoard = mongoose.model("IdeaBoard", {
    _id: {
        type: String
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    createdBy: {
        type: String,
        required: true
    },
    creationDate: {
        type: Date,
        required: true
    },
    allowAnonymous: {
        type: Boolean,
        default: true
    },
    active: {
        type: Boolean,
        default: true,
        required: true
    },
    openAccess: {
        type: Boolean
    },
    openAccessPassword: {
        type: String
    },
    criteria: [
        {
            title: String,
            choices: [{title: String, weighting: Number}]
        }
    ],
    standardCriteria: [
        {
            _id: String,
            title: String,
            enabled: Boolean,
            icon: String,
            description: String,
            choices: [
                {
                    description: String,
                    value: Number,
                    colour: String
                }
            ]

        }
    ],
    customCriteria: [
        {
            title: String,
            description: String,
            criteriaType: String,
            choices: [{description: String}]
        }
    ],
    sessions: [exports.Session],
    members: [
        {
            userId: {
                type: String
            },
            ideaBoardId: {
                type: String
            },
            admin: {
                type: Boolean
            },
            joinedOn: {
                type: Date
            }
        }
    ]
});
