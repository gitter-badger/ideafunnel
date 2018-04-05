var mongoose = require('mongoose');

exports.IdeaVote = mongoose.model("IdeaVote", {
    guestId: String,
    userId: String,
    ideaId: String,
    boardId: String,
    votes: [
        {
            criteriaId: String,
            optionId: String
        }
    ]

});