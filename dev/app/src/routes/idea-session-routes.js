//var ideaBoardMemberModel = require("../models/idea-board-member-model");
//var ideaComment = require("../models/idea-comment");
//var userModel = require("../models/user-model");
var ideaModel = require("../models/idea-model"),
    ideaBoardModel = require("../models/idea-board-model"),
    ideaVoteModel = require("../models/idea-vote-model"),
    guestModel = require("../models/guest-model"),
    imageMagick = require("imagemagick"),
    fs = require("fs"),
    md5 = require("MD5"),
    languageProcessing = require("../utility/language-processing"),
    boardLongPolling = require("../routes/board-long-polling"),
    mongoose = require("mongoose"),
    utilities = require("../utility/ideafunnel-utilities"),
    IdeaBoard = mongoose.model("IdeaBoard"),
    IdeaBoardMember = mongoose.model("IdeaBoardMember"),
    Idea = mongoose.model("Idea"),
    IdeaComment = mongoose.model("IdeaComment"),
    User = mongoose.model("User");

//var apiShared = require("../routes/api-shared");

var GUEST_PIC_PATH = "/ideafunnel/guestpics/";
var CARD_IMAGES_PATH = "/ideafunnel/card_images/";

//TODO Remove??
exports.viewIdeaBoardSessionHome = function(req, res) {
    // Load the session
    IdeaBoard.findOne({_id: req.params.boardId}, function(err, board) {
        if (err || !board) {
            res.render("error", {error: "Session not found"});
        } else {
            var userId = "";

            if (req.user) {
                userId = req.user._id;
            }

            res.render("idea-sessions/idea-session-home", {title: board.title, boardId: board._id, userId: userId});
        }
    });
};

/*
 Setup a guest
 */
exports.createGuest = function(req, res) {
    if (req.body.name && req.body.name.trim() !== "") {
        var newGuest = new guestModel.Guest({
            name: req.body.name
        });

        newGuest.save(function(err) {
            res.json(utilities.successOrErrorResponse(err, newGuest));
        });

    } else {
        res.json(utilities.errorResponse("Invalid name"));
    }
};

/*
 Upload a profile pic
 */
exports.profilePicUpload = function(req, res) {
    if (req.params.guestId) {
        // Decode the image
        var dataUrl = req.body.image,
            matches = dataUrl.match(/^data:.+\/(.+);base64,(.*)$/),
            ext = matches[1],
            base64Data = matches[2],
            buffer = new Buffer(base64Data, 'base64');

        var tempFilename = GUEST_PIC_PATH + req.params.guestId + "_temp.jpg";
        var destinationFilename = req.params.guestId + ".jpg";

        fs.writeFile(tempFilename, buffer, function (err) {

            if (err) {
                console.log("Error writing file");
                res.json(utilities.errorResponse(err));
            } else {
                imageMagick.crop({
                    srcPath: tempFilename,
                    dstPath:  GUEST_PIC_PATH + destinationFilename,
                    width: 300,
                    height: 300,
                    quality: 1,
                    gravity: "Center"
                }, function(err, stdout, stderr){
                    if (err) {
                        res.json(utilities.errorResponse(err));
                    } else {
                        res.json(utilities.successOrErrorResponse(err, destinationFilename));
                    }
                });
            }

        });
    } else {
        res.json(utilities.errorResponse("No guest id specified"));
    }

};

/*
 Upload a profile pic - multipart
 */
exports.profilePicUploadUploadMultipart = function(req, res) {
    if (req.params.guestId) {
        var destinationFilename = req.params.guestId + ".jpg";

        if (req.files && req.files.file) {
            imageMagick.crop({
                srcPath: req.files.file.path,
                dstPath:  GUEST_PIC_PATH + destinationFilename,
                width: 300,
                height: 300,
                quality: 1,
                gravity: "Center"
            }, function(err, stdout, stderr){
                if (err) {
                    res.json(utilities.errorResponse(err));
                } else {
                    res.json(utilities.successOrErrorResponse(err, destinationFilename));
                }
            });

        } else {
            res.json(utilities.errorResponse("No file uploaded"));
        }


    } else {
        res.json(utilities.errorResponse("No guest id specified"));
    }

};

/*
 Get the profile pic
 */
exports.getGuestPic = function(req, res) {
    var sizeModifier = "";

    if (req.query.size && req.query.size !== "") {
        sizeModifier = "_small";
    }

    if (!req.params.username || req.params.username === "") {
        res.redirect("/images/userprofile" + sizeModifier + ".png");
    } else {
        fs.exists(GUEST_PIC_PATH + req.params.username + ".jpg", function(exists) {
            if (exists) {
                //res.redirect("/guestpics/" + req.params.username + sizeModifier + ".jpg");
                res.redirect("/guestpics/" + req.params.username + ".jpg");
            } else {
                res.redirect("/images/userprofile" + sizeModifier + ".png");
            }
        });
    }
};

/**
 * List sessions for an idea board
 */
exports.sessionsForBoard = function(req, res) {
    ideaBoardModel.IdeaBoard.findOne({_id: req.params.boardId}, {"sessions": true}, function(err, board) {
        if (err) {
            res.json(utilities.errorResponse(err));
        } else if (!board || !board.sessions || board.sessions.length === 0) {
            res.json(utilities.successResponse([]));
        } else {
            // Loop through and state if this board has a password or not
            var newArray = [];

            for (var i = 0; i < board.sessions.length; i++) {
                var hasPassword = false;

                if (board.sessions[i].password && board.sessions[i].password !== null) {
                    hasPassword = true;
                }

                newArray.push({
                    _id: board.sessions[i]._id,
                    title: board.sessions[i].title,
                    date: board.sessions[i].date,
                    hasPassword: hasPassword,
                    beaconId: board.sessions[i].beaconId,
                    sessionType: board.sessions[i].sessionType
                });

            }

            res.json(utilities.successResponse({_id: req.params.boardId, sessions: newArray}));
        }

    });
};

/**
 * Check session password
 */
exports.checkSessionPassword = function(req, res) {
    var md5Password = md5(req.query.sessionPassword);
    ideaBoardModel.IdeaBoard.findOne({_id: req.params.boardId, "sessions._id": req.params.sessionId, "sessions.password": md5Password}, {"sessions._id": true, "sessions.title": true}, function(err, board) {
        if (err || !board) {
            res.json(utilities.errorResponse(err));
        } else {
            res.json(utilities.successResponse(true));
        }

    });
};

/*
 Vote for an idea in a session
 */
exports.voteForIdeaInSessionApi = function(req, res) {
    var boardId = req.params.boardId;
    var ideaId = req.params.ideaId;
    var sessionId = req.params.sessionId;

    var scores = req.body.scores;

    // Load board and session
    ideaBoardModel.IdeaBoard.findOne({_id: boardId, "sessions._id": sessionId}, {"sessions.$": true}, function(err, board) {
        if (err || !board) {
            res.json(utilities.errorResponse(err));
        } else {
            // Check password if there is one
            if (board.sessions[0].password) {
                if (!(req.body.password && board.sessions[0].password === md5(req.body.password))) {
                    // Password is invalid
                    res.json(utilities.errorResponse("Invalid session password"));
                    return;
                }
            }

            ideaVoteModel.IdeaVote.findOneAndUpdate({ideaId: ideaId, boardId: boardId, guestId: req.body.guestId}, {$set: {votes: scores}}, {upsert: true}, function(err, vote) {
                res.json(utilities.successOrErrorResponse(err, vote));
            });

        }
    });
};

/*
 Add idea to session
 */
exports.createIdeaForSessionApi = function(req, res) {
    var boardId = req.params.boardId;
    var sessionId = req.params.sessionId;
    var file = null;

    // Load board and session
    ideaBoardModel.IdeaBoard.findOne({_id: boardId, "sessions._id": sessionId}, {"sessions.$": true}, function(err, board) {
        if (err || !board) {
            res.json(utilities.errorResponse(err));
        } else {
            // Check password if there is one
            if (board.sessions[0].password) {
                if (!(req.body.password && board.sessions[0].password === md5(req.body.password))) {
                    // Password is invalid
                    res.json(utilities.errorResponse("Invalid session password"));
                    return;
                }
            }

            if (!req.body.guest) {
                res.json(utilities.errorResponse("No guest specified"));
                return;
            }

            // Ok to continue
            var idea = new Idea({
                ideaBoardId: boardId,
                description: req.body.description,
                guestCreatedBy: {name: req.body.guest.name, guestId: req.body.guest._id},
                session: sessionId,
                creationDate: new Date(),
                active: true,
                hasImage: false,
                importantWords: languageProcessing.tokenizeAndStemImportantWords(req.body.description)
            });

            idea.save(function(err) {
                if (!err && idea) {
                    console.log("pushing new idea from session");
                    boardLongPolling.pushNewIdea(idea);
                }

                // Now save any additional images that have been uploaded
                var destinationFilename = CARD_IMAGES_PATH + idea._id + ".jpg";

                if (req.files && req.files.file) {
                    imageMagick.crop({
                        srcPath: req.files.file.path,
                        dstPath:  destinationFilename,
                        width: 700,
                        height: 400,
                        quality: 1,
                        gravity: "Center"
                    }, function(err, stdout, stderr){
                        if (err) {
                            console.log("Could not upload file", err);
                        } else {
                            idea.hasImage = true;
                            idea.save(function(err) {
                                res.json(utilities.successOrErrorResponse(err, idea));
                            });
                        }
                    });

                } else {

                    res.json(utilities.successOrErrorResponse(err, idea));
                }

            });

        }
    });
};

/*
 List ideas for session
 */
exports.listIdeasForSessionApi = function(req, res) {
    var boardId = req.params.boardId;
    var sessionId = req.params.sessionId;

    // Load board and session
    ideaBoardModel.IdeaBoard.findOne({_id: boardId, "sessions._id": sessionId}, {"sessions.$": true}, function(err, board) {
        if (err || !board) {
            res.json(utilities.errorResponse(err));
        } else {
            // Check password if there is one
            if (board.sessions[0].password) {
                if (!(req.body.password && board.sessions[0].password === md5(req.body.password))) {
                    // Password is invalid
                    res.json(utilities.errorResponse("Invalid session password"));
                    return;
                }
            }

            if (board.sessions[0].sessionType && board.sessions[0].sessionType === ideaBoardModel.SESSION_TYPE_VOTE) {
                ideaModel.Idea.find({"ideaBoardId": board._id}, function(err, ideas) {
                    res.json(utilities.successOrErrorResponse(err, ideas));
                });
            } else {
                res.json(utilities.errorResponse("Idea listing is only supported on 'vote' sessions"));
            }

        }
    });
};

/*
 List any ideas for session that haven't yet been voted on
 */
exports.listIdeasForSessionNotVotedApi = function(req, res) {
    var boardId = req.params.boardId;
    var sessionId = req.params.sessionId;

    // Load board and session
    ideaBoardModel.IdeaBoard.findOne({_id: boardId, "sessions._id": sessionId}, {"sessions.$": true}, function(err, board) {
        if (err || !board) {
            res.json(utilities.errorResponse(err));
        } else {
            // Check password if there is one
            if (board.sessions[0].password) {
                if (!(req.body.password && board.sessions[0].password === md5(req.body.password))) {
                    // Password is invalid
                    res.json(utilities.errorResponse("Invalid session password"));
                    return;
                }
            }

            if (board.sessions[0].sessionType && board.sessions[0].sessionType === ideaBoardModel.SESSION_TYPE_VOTE) {
                ideaModel.Idea.find({"ideaBoardId": board._id}, function(err, ideas) {
                    // Load votes for this board
                    ideaVoteModel.IdeaVote.find({boardId: board._id, guestId: req.query.guestId}, function(err, votes) {
                        if (err) {
                            res.json(utilities.errorResponse(err));
                        } else {
                            // Remove any voted ideas from the return list
                            var ideasToVoteOn = [];

                            for (var i = 0; i < ideas.length; i++) {
                                var found = false;

                                for (var x = 0; x < votes.length; x++) {
                                    if (votes[x].ideaId === ideas[i]._id) {
                                        found = true;
                                        break;
                                    }
                                }

                                if (!found) {
                                    ideasToVoteOn.push(ideas[i]);
                                }

                            }

                            res.json(utilities.successOrErrorResponse(err, ideasToVoteOn));
                        }
                    });

                });
            } else {
                res.json(utilities.errorResponse("Idea listing is only supported on 'vote' sessions"));
            }

        }
    });
};

/*
 List criteria for session API
 */
exports.listCriteriaForSessionApi = function(req, res) {
    var boardId = req.params.boardId;
    var sessionId = req.params.sessionId;

    // Load board and session
    ideaBoardModel.IdeaBoard.findOne({_id: boardId, "sessions._id": sessionId}, {"criteria": true, "sessions.$": true}, function(err, board) {
        if (err || !board) {
            res.json(utilities.errorResponse(err));
        } else {
            // Check password if there is one
            if (board.sessions[0].password) {
                if (!(req.body.password && board.sessions[0].password === md5(req.body.password))) {
                    // Password is invalid
                    res.json(utilities.errorResponse("Invalid session password"));
                    return;
                }
            }

            res.json(utilities.successResponse(board.criteria));

        }
    });
};

