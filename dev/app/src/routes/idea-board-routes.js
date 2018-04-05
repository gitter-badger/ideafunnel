//var userModel = require("../models/user-model");

var ideaBoardModel = require("../models/idea-board-model"),
    ideaModel = require("../models/idea-model"),
    ideaBoardMemberModel = require("../models/idea-board-member-model"),
    ideaComment = require("../models/idea-comment"),
    autoIncCountersModel = require("../models/auto-inc-counters"),
    ideaVoteModel = require("../models/idea-vote-model"),
    md5 = require("MD5"),
    mongoose = require("mongoose"),
    utilities = require("../utility/ideafunnel-utilities"),
    languageProcessing = require("../utility/language-processing"),
    imageMagick = require("imagemagick"),
    boardLongPolling = require("../routes/board-long-polling.js"),
    apiShared = require("../routes/api-shared"),
    csv = require("express-csv"),
    natural = require("natural");

var IdeaBoard = mongoose.model("IdeaBoard"),
    IdeaBoardMember = mongoose.model("IdeaBoardMember"),
    Idea = mongoose.model("Idea"),
    IdeaComment = mongoose.model("IdeaComment"),
    User = mongoose.model("User");



var CARD_IMAGES_PATH = "/ideafunnel/card_images/",
    QUALIFICATION_CRITERIA = [
        {_id: "cost", id: "cost", title: "Cost", icon: "icon-briefcase-2", description: "What is the cost of this idea?", choices: [{description: "Low", value: 1, colour: "green"}, {description: "Medium", value: 2, colour: "orange"}, {description: "High", value: 3, colour: "red"}]},
        {_id: "impact", id: "impact", title: "Impact", icon: "icon-comment-star-fill", description: "What is the impact of this idea?", choices: [{description: "Low", value: 1, colour: "green"}, {description: "Medium", value: 2, colour: "orange"}, {description: "High", value: 3, colour: "red"}]}
    ],
    TAKEN_IDEA_BOARD_CODES = [];

/*
 Check if Idea Board exists
 */
exports.checkIdeaBoardExistenceApi = function(req, res) {
    IdeaBoard.findOne({_id: req.params.ideaBoardId}, function(err, ideaBoard) {
        if (err || !ideaBoard) {
            res.json(utilities.errorResponse("Idea Board does not exist"));
        } else {
            res.json(utilities.successResponse(true));
        }
    });
};

/*
 Check idea board code
 */
var checkIdeaBoardCodeValidity = function(code, callback) {
    if (!code) {
        callback("No code", false);
    } else {
        var isValid = code.match(/^[a-z0-9_-]{3,30}$/);
        if (isValid) {
            // First check the project code isn't already used in a url
            var usedInUrl = false;

            for (var i = 0; i < TAKEN_IDEA_BOARD_CODES.length; i++) {
                if (TAKEN_IDEA_BOARD_CODES[i].toLowerCase() === code.toLowerCase()) {
                    usedInUrl = true;
                    break;
                }
            }
            if (usedInUrl) {
                callback("Board code used in URL", false);
            } else {
                // Check code not in use
                ideaBoardModel.IdeaBoard.findOne({_id: code.toLowerCase()}, function(err, project) {
                    if (err || !project) {
                        callback(null, true);
                    } else {
                        callback("Board code already in use", false);
                    }
                });
            }
        } else {
            if (code.length < 3 || code.length > 30) {
                callback("Board code must be between 3-30 characters", false);
            } else if (new RegExp(/[A-Z]/).test(code)) {
                callback("Board code must contain lower case letters only", false);
            } else {
                callback("No special characters(!,|.&) or spaces allowed", false);
            }

        }
    }
};

/*
 Query to check if code is valid or not
 */
exports.checkIdeaBoardCode = function(req, res) {
    checkIdeaBoardCodeValidity(req.query.code, function(err) {
        res.json(utilities.successOrErrorResponse(err, "Code is valid"));
    });
};

var checkSessionCodeValidity = function(sessionCode) {
    return sessionCode.match(/^[a-z0-9_-]{3,40}$/);
};

exports.checkAdminAccessToBoard = function(user, boardId, callback) {
    exports.checkUserAccessToBoard(user, boardId, function(err, member, board) {
        if (err) {
            callback(err, null, null);
        } else {
            if (!member.admin) {
                callback("User is not an admin", null, null);
            } else {
                callback(null, member, board);
            }
        }
    });
};

exports.checkUserAccessToBoard = function(user, boardId, callback) {
    if (!user) {
        callback("Board access denied", null, null);
    } else if (!boardId) {
        callback("No board ID specified", null, null);
    } else {
        // Check we have a board member for this user/board combo
        IdeaBoard.findOne({_id: boardId, "members.userId": user._id}, function(err, ideaBoard) {
            if (err) {
                callback("No access to board");
            } else if (!ideaBoard) {
                callback("Idea board not found");
            } else {
                // Find the member in the board
                if (ideaBoard.members && ideaBoard.members !== null) {
                    for (var i = 0; i < ideaBoard.members.length; i++) {
                        if (user._id === ideaBoard.members[i].userId) {
                            callback(null, ideaBoard.members[i], ideaBoard);
                            return;
                        }
                    }
                }

                callback("Could not find member after retrieval", null, null);
            }
        });
    }

};

exports.generateIdeasPage = function(req, res) {
    res.render("idea-boards/generate-ideas", {title: "Generate Ideas", section: "idea-boards"});
};

exports.ideaBoardsHome = function(req, res) {
    res.render("idea-boards/idea-boards-home", {title: "Idea Boards", userId: req.user._id, section: "idea-boards"});
};

exports.createIdeaBoardPage = function(req, res) {
    res.render("idea-boards/create-page", {title: "Create Idea Board", userId: req.user._id, section: "create"});
};

exports.viewIdeaBoard = function(req, res) {
    var boardId = req.params.id;
    exports.checkUserAccessToBoard(req.user, req.params.id, function(err, member) {
        if (err || !member) {
            res.render("error", {error: err});
        } else {
            res.render("idea-boards/view-idea-board", {title: "View Idea Board", userId: req.user._id, boardId: boardId, section: "idea-boards", user: req.user});
        }
    });

};

exports.viewIdeaBoardVotes = function(req, res) {
    var boardId = req.params.id;

    exports.checkUserAccessToBoard(req.user, req.params.id, function(err, member) {
        if (err || !member) {
            res.render("error", {error: err});
        } else {
            res.render("idea-boards/view-idea-board-votes", {title: "View Idea Board Votes", userId: req.user._id, boardId: boardId, section: "idea-boards", user: req.user});
        }
    });
};

exports.viewIdeaBoardScreen = function(req, res) {
    var boardId = req.params.id;

    exports.checkUserAccessToBoard(req.user, req.params.id, function(err, member) {
        if (err || !member) {
            res.render("error", {error: err});
        } else {
            res.render("idea-boards/view-idea-board-screen", {title: "Idea Board Screen", userId: req.user._id, boardId: boardId, section: "idea-boards", user: req.user});
        }
    });
};

exports.defaultQualificationCriteriaApi = function(req, res) {
    res.json(utilities.successResponse(QUALIFICATION_CRITERIA));
};

exports.countIdeasForGuest = function(board, guestId, callback) {
    if (guestId) {
        ideaModel.Idea.count({"ideaBoardId": board._id, "guestCreatedBy.guestId": guestId}, function(err, count) {
            callback(err, count);
        });
    } else {
        callback(null, 0);
    }

};

// Generator access, e.g. using the app as a guest to generate ideas
exports.generatorAccessToBoard = function(req, res, board) {
    if (board && board.openAccess && (!board.openAccessPassword || board.openAccessPassword === "")) {
        var basicBoard = {
            _id: board._id,
            createdBy: board.createdBy,
            description: board.description,
            openAccess: board.openAccess,
            title: board.title
        };

        // Check how many ideas the user has created
        if (req.body.guestId) {
            exports.countIdeasForGuest(board, req.body.guestId, function(err, count) {
                if (!err) {
                    basicBoard.userIdeaCount = count;
                } else {
                    basicBoard.userIdeaCount = 0;
                }

                res.json(utilities.successResponse(basicBoard));

            });
        } else {
            basicBoard.userIdeaCount = 0;
            res.json(utilities.successResponse(basicBoard));
        }


    } else {
        res.json(utilities.errorResponse("Access denied"));
    }
};

exports.viewUserIdeasForBoardApi = function(req, res) {
    var searchData = {ideaBoardId: req.params.id};

    if (req.body.guestId) {
        searchData["guestCreatedBy.guestId"] = req.body.guestId;
    } else if (req.user) {
        searchData.createdBy = req.user._id;
    } else {
        res.json(utilities.errorResponse("Invalid user/guest login"));
        return;
    }

    ideaModel.Idea.find(searchData, {description: true, createdBy: true, creationDate: true}, {sort: {creationDate: -1}}, function(err, ideas) {
        res.json(utilities.successOrErrorResponse(err, ideas));
    });

};

exports.deleteIdeaBoardApi = function(req, res) {
    var boardId = req.params.id;
    if (req.user) {
        exports.checkUserAccessToBoard(req.user, req.params.id, function(err, member, ideaBoard) {
            if (err || !member || !member.admin) {
                res.json(utilities.errorResponse("Only admins can delete this board"));
            } else {
                ideaBoardModel.IdeaBoard.findOneAndUpdate({_id: boardId}, {active: false}, function(err, result) {
                    if (err) {
                        res.json(utilities.errorResponse(err));
                    } else {
                        res.redirect('/home');
                    }
                });
            }

        });
    } else {
        res.json(utilities.errorResponse("Error - can't delete idea board"));
    }

};
/*view board*/
exports.viewIdeaBoardApi = function(req, res) {
    var boardId = req.params.id;
    if (req.user) {
        exports.checkUserAccessToBoard(req.user, req.params.id, function(err, member, ideaBoard) {
            if (err || !member) {
                exports.generatorAccessToBoard(req, res, ideaBoard);
            } else {
                // TODO show password if the member is allowed to see it, i.e. if they are an owner
                ideaBoard.openAccessPassword = "";
                res.json(utilities.successOrErrorResponse(err, ideaBoard));
            }
        });
    } else {
        // If board is open, then return just the board name
        ideaBoardModel.IdeaBoard.findOne({_id: boardId}, function(err, ideaBoard) {
            if (err || !ideaBoard) {
                res.json(utilities.errorResponse("Board does not exist"));
            } else {
                exports.generatorAccessToBoard(req, res, ideaBoard);
            }
        });
    }
};

exports.exportIdeaBoardApi = function(req, res) {
    var boardId = req.params.id;

    apiShared.getUserFromRequestOrAppToken(req, function(user) {
        if (user === null) {
            res.json(utilities.errorResponse("Invalid access token"));
        } else {
            // Check we have a board member for this user/board combo
            exports.checkUserAccessToBoard(user, boardId, function(err, member, ideaBoard) {
                if (err || !member) {
                    res.json(utilities.errorResponse(err));
                } else {
                    var sessionsMap = {};

                    if (ideaBoard.sessions && ideaBoard.sessions.length > 0) {
                        for (var i = 0; i < ideaBoard.sessions.length; i++) {
                            sessionsMap[ideaBoard.sessions[i]._id] = ideaBoard.sessions[i].title;
                        }
                    }


                    // Get all of the ideas an export them
                    ideaModel.Idea.find({ideaBoardId: boardId}, function(err, ideas) {
                        var csvArray = [["Idea", "Created By", "Date", "Session"]];

                        for (var i = 0; i < ideas.length; i++) {
                            var session = "";

                            if (ideas[i].session) {
                                if (sessionsMap[ideas[i].session]) {
                                    session = sessionsMap[ideas[i].session];
                                } else {
                                    session = ideas[i].session;
                                }
                            }

                            var createdBy = "";

                            if (ideas[i].createdBy) {
                                createdBy = ideas[i].createdBy;
                            } else {
                                createdBy = ideas[i].guestCreatedBy.name;
                            }


                            csvArray.push([ideas[i].description, createdBy, ideas[i].creationDate, session]);
                        }
                        var filename = "Ideafunnel_"+ boardId + "_" + new Date().toISOString() + ".csv";
                        res.setHeader('Content-disposition', 'attachment; filename='+ filename);
                        res.setHeader('Content-type', "text/csv");
                        res.csv(csvArray);

                    });


                }
            });
        }
    });
};

exports.addMemberToBoardApi = function(req, res) {
    // Check we have a board member for this user/board combo
    exports.checkAdminAccessToBoard(req.user, req.params.id, function(err, member, ideaBoard) {
        if (err || !member) {
            res.json(utilities.errorResponse(err));
        } else if (!req.body.userId) {
            res.json(utilities.errorResponse("No user id provided"));
        } else if (req.body.userId === req.user._id) {
            res.json(utilities.errorResponse("You cannot change the status of yourself"));
        } else {
            var adminStatus = false;

            if (req.body.admin) {
                adminStatus = req.body.admin;
            }

            // Now update the object
            var newMember = {userId: req.body.userId, ideaBoardId: req.params.id, admin: adminStatus, joinedOn: new Date()};

            var memberExists = false;

            for (var i = 0; i < ideaBoard.members.length; i++) {
                if (ideaBoard.members[i].userId === req.body.userId) {
                    memberExists = true;
                    break;
                }
            }

            if (memberExists) {
                IdeaBoard.findOneAndUpdate({_id: ideaBoard._id, "members.userId": req.body.userId}, {$set: {"members.$.admin": adminStatus}}, function(err, ideaBoard) {
                    res.json(utilities.successOrErrorResponse(err, ideaBoard));
                });
            } else {

                try {
                    IdeaBoard.findOneAndUpdate({_id: ideaBoard._id}, {$push: {members: newMember}}, function(err, ideaBoard) {
                        res.json(utilities.successOrErrorResponse(err, ideaBoard));
                    });
                } catch (e) {
                    res.json(utilities.errorResponse(e));
                }
            }

        }
    });
};

exports.removeMemberFromBoardApi = function(req, res) {
    // Check we have a board member for this user/board combo
    exports.checkAdminAccessToBoard(req.user, req.params.id, function(err, member) {
        if (err || !member || member.length === 0) {
            res.json(utilities.errorResponse(err));
        } else {
            if (!req.body.userId) {
                res.json(utilities.errorResponse("No user specified"));
            } else if (req.body.userId === req.user._id) {
                res.json(utilities.errorResponse("You cannot remove yourself"));
            } else {
                IdeaBoard.findOneAndUpdate({_id: req.params.id}, {$pull: {members: {userId: req.body.userId}}}, function(err) {
                    res.json(utilities.successOrErrorResponse(err, "Removed"));
                });
            }
        }
    });
};

// Save an update to the board (e.g. settings or criteria)
exports.saveBoardUpdateCriteriaApi = function(req, res) {
    var boardId = req.params.id;

    // Check we have a board member for this user/board combo
    exports.checkAdminAccessToBoard(req.user, req.params.id, function(err, member, board) {
        if (err || !member) {
            res.json(utilities.errorResponse(err));
        } else {
            IdeaBoard.findOneAndUpdate({_id: board._id}, {$set: {standardCriteria: req.body.standardCriteria}}, function(err) {
                res.json(utilities.successOrErrorResponse(err, "Update ok"));
            });
        }
    });
};

// Adds a criterion to a board
exports.addCriterionToBoard = function(req, res) {
    var boardId = req.params.id;
    var title = req.body.title;

    // Check we have a board member for this user/board combo
    exports.checkAdminAccessToBoard(req.user, req.params.id, function(err, member, board) {
        if (err || !member) {
            res.json(utilities.errorResponse(err));
        } else {
            var criterion = {
                title: title
            };

            IdeaBoard.findOneAndUpdate({_id: board._id}, {$push: {criteria: criterion}}, function(err, newBoard) {
                res.json(utilities.successOrErrorResponse(err, newBoard));
            });
        }
    });
};

// Adds a criterion to a board
exports.removeCriterionFromBoard = function(req, res) {
    var boardId = req.params.id;
    var criterionId = req.params.criterionId;

    // Check we have a board member for this user/board combo
    exports.checkAdminAccessToBoard(req.user, boardId, function(err, member, board) {
        if (err || !member) {
            res.json(utilities.errorResponse(err));
        } else {
            IdeaBoard.findOneAndUpdate({_id: board._id}, {$pull: {criteria: {_id: criterionId}}}, function(err, updatedBoard) {
                res.json(utilities.successOrErrorResponse(err, updatedBoard));
            });
        }
    });
};

// Adds an option to a criterion
exports.addOptionToCriterion = function(req, res) {
    var boardId = req.params.id;
    var criterionId = req.params.criterionId;

    // Check we have a board member for this user/board combo
    exports.checkAdminAccessToBoard(req.user, boardId, function(err, member, board) {
        if (err || !member) {
            res.json(utilities.errorResponse(err));
        } else {
            // Get the criterion, if it exists
            if (board.criteria && board.criteria.length > 0) {
                var foundCriteria = null;
                var foundCriteriaIndex = -1;

                for (var i = 0; i < board.criteria.length; i++) {
                    if (board.criteria[i]._id === criterionId) {
                        foundCriteria = board.criteria[i];
                        foundCriteriaIndex = i;
                        break;
                    }
                }

                if (!foundCriteria) {
                    res.json(utilities.errorResponse("Could not find criteria"));
                    return;
                }

                var weighting = 0;

                if (req.body.weighting && req.body.weighting !== null && req.body.weighting !== "null") {
                    weighting = req.body.weighting;
                }


                var choice = {
                    title: req.body.title,
                    weighting: weighting
                };

                IdeaBoard.findOneAndUpdate({_id: board._id, "criteria._id": foundCriteria._id}, {$addToSet: {"criteria.$.choices": choice}}, function(err, updatedBoard) {
                    res.json(utilities.successOrErrorResponse(err, updatedBoard));
                });


            } else {
                res.json(utilities.errorResponse("No criteria on board"));
            }



        }
    });
};

// Removes an option from a criterion
exports.removeOptionFromCriterion = function(req, res) {
    var boardId = req.params.id;
    var criterionId = req.params.criterionId;
    var optionId = req.params.optionId;

    // Check we have a board member for this user/board combo
    exports.checkAdminAccessToBoard(req.user, boardId, function(err, member, board) {
        if (err || !member) {
            res.json(utilities.errorResponse(err));
        } else {
            // Get the criterion, if it exists
            if (board.criteria && board.criteria.length > 0) {
                var foundCriteria = null;
                var foundCriteriaIndex = -1;

                for (var i = 0; i < board.criteria.length; i++) {
                    if (board.criteria[i]._id === criterionId) {
                        foundCriteria = board.criteria[i];
                        foundCriteriaIndex = i;
                        break;
                    }
                }

                if (foundCriteria !== null) {
                    // Run update script
                    IdeaBoard.findOneAndUpdate({_id: board._id, "criteria._id": foundCriteria._id}, {$pull: {"criteria.$.choices": {_id: req.body.optionId}}}, function(err, updatedBoard) {
                        res.json(utilities.successOrErrorResponse(err, updatedBoard));
                    });

                } else {
                    res.json(utilities.errorResponse("Criterion not found"));
                }

            } else {
                res.json(utilities.errorResponse("No criteria on board"));
            }



        }
    });
};

// Removes an option from a criterion
exports.editCriterionOptionApi = function(req, res) {
    var boardId = req.params.id;
    var criterionId = req.params.criterionId;
    var optionId = req.body.optionId;
    var title = req.body.title;
    var weighting = req.body.weighting;

    // Check we have a board member for this user/board combo
    exports.checkAdminAccessToBoard(req.user, boardId, function(err, member, board) {
        if (err || !member) {
            res.json(utilities.errorResponse(err));
        } else {
            // Get the criterion, if it exists
            if (board.criteria && board.criteria.length > 0) {
                var foundCriteria = null;
                var foundCriteriaIndex = -1;

                for (var i = 0; i < board.criteria.length; i++) {
                    if (board.criteria[i]._id === criterionId) {
                        foundCriteria = board.criteria[i];
                        foundCriteriaIndex = i;
                        break;
                    }
                }

                if (foundCriteria !== null) {
                    // First pull
                    IdeaBoard.findOneAndUpdate({_id: board._id, "criteria._id": foundCriteria._id}, {$pull: {"criteria.$.choices": {_id: req.body.optionId}}}, function(err, firstUpdatedBoard) {
                        // Now push, with the same option ID

                        IdeaBoard.findOneAndUpdate({_id: board._id, "criteria._id": foundCriteria._id}, {$push: {"criteria.$.choices": {_id: req.body.optionId, title: title, weighting: weighting}}}, function(err, updatedBoard) {
                            res.json(utilities.successOrErrorResponse(err, updatedBoard));
                        });


                    });

                } else {
                    res.json(utilities.errorResponse("Criterion not found"));
                }

            } else {
                res.json(utilities.errorResponse("No criteria on board"));
            }

        }
    });
};

// Edits the title of a criterion
exports.editCriterionTitleApi = function(req, res) {
    var boardId = req.params.id;
    var criterionId = req.params.criterionId;
    var title = req.body.title;

    // Check we have a board member for this user/board combo
    exports.checkAdminAccessToBoard(req.user, boardId, function(err, member, board) {
        if (err || !member) {
            res.json(utilities.errorResponse(err));
        } else {
            // Get the criterion, if it exists
            if (board.criteria && board.criteria.length > 0) {
                var foundCriteria = null;
                var foundCriteriaIndex = -1;

                for (var i = 0; i < board.criteria.length; i++) {
                    if (board.criteria[i]._id === criterionId) {
                        foundCriteria = board.criteria[i];
                        foundCriteriaIndex = i;
                        break;
                    }
                }


                if (foundCriteria !== null) {
                    // Run update script
                    IdeaBoard.findOneAndUpdate({_id: board._id, "criteria._id": foundCriteria._id}, {$set: {"criteria.$.title": title}}, function(err, updatedBoard) {
                        res.json(utilities.successOrErrorResponse(err, updatedBoard));
                    });

                } else {
                    res.json(utilities.errorResponse("Criterion not found"));
                }



            } else {
                res.json(utilities.errorResponse("No criteria on board"));
            }



        }
    });
};

exports.allIdeaBoards = function(req, res) {
    ideaBoardModel.IdeaBoard.find({"members.userId": req.user._id, active:true}).sort({creationDate: -1}).exec(function(err, ideaBoards) {
        res.json(utilities.successOrErrorResponse(err, ideaBoards));
    });
};

/*
 Create Idea Board
*/
exports.createIdeaBoardApi = function(req, res) {
    // First check the project code is valid
    if (req.body._id && req.body._id.trim() !== "") {
        checkIdeaBoardCodeValidity(req.body._id, function(err) {
            var newMember = {
                userId: req.user._id,
                admin: true,
                joinedOn: new Date()
            };

            var newIdeaBoard = new IdeaBoard(
                {
                    _id: req.body._id.toLowerCase(),
                    title: req.body.title,
                    description: req.body.description,
                    createdBy: req.user._id,
                    creationDate: new Date(),
                    openAccess: false,
                    members: [newMember],
                    allowAnonymous: req.body.allowAnonymous
                });
            newIdeaBoard.save(function(err) {
                // New idea board has been saved, create a new member
                res.json(utilities.successOrErrorResponse(err, newIdeaBoard));
            });
        });
    }
};

// Voting
exports.votesForCriterionApi = function(req, res) {
    var boardId = req.params.boardId;
    var criterionId = req.params.criterionId;

    exports.checkUserAccessToBoard(req.user, boardId, function(err, member, board) {
        if (err || !member) {
            res.json(utilities.errorResponse(err));
        } else {
            // Aggregate!

            if (!board.criteria || board.criteria.length === 0) {
                res.json(utilities.errorResponse("No criteria in board"));
                return;
            }

            // Check criterion is part of the board
            var foundCriteria = null;

            for (var i = 0; i < board.criteria.length; i++) {
                if (board.criteria[i]._id === criterionId) {
                    foundCriteria = board.criteria[i];
                    break;
                }
            }

            if (foundCriteria === null) {
                // Criteria not found
                res.json(utilities.errorResponse("Criteria not found"));
            } else {

                // We need to get the choices in a keyed array
                var weightedChoices = {};

                if (foundCriteria.choices !== null) {
                    for (var j = 0; i < foundCriteria.choices.length; i++) {
                        weightedChoices[foundCriteria.choices[j]._id] = foundCriteria.choices[j].weighting;
                    }
                }

                ideaVoteModel.IdeaVote.aggregate([
                    {$match: {boardId: boardId}},
                    {$unwind: "$votes"},
                    {$match: {"votes.criteriaId": criterionId}},
                    {$project: {ideaId: "$ideaId", "votes": 1, "criteriaId": "$votes.criteriaId",  "optionId": "$votes.optionId"}},
                    {$group: {_id: {"ideaId": "$ideaId", "criteriaId": "$criteriaId", "optionId": "$optionId" }, count: {$sum: 1}}},
                    {$sort: {"_id.ideaId": 1, "_id.optionId": 1}}
                ], function(err, results) {

                    if (err) {
                        res.json(utilities.errorResponse(err));
                    } else if (!results || results.length === 0) {
                        res.json(utilities.successResponse({boardId: boardId, results: []}));
                    } else {
                        // Loop over and build out the array that clearly shows votes for each idea
                        var summary = [], i;

                        for (i = 0; i < results.length; i++) {
                            if (summary.length === 0 || results[i]._id.ideaId !== summary[summary.length - 1].ideaId) {
                                summary.push({ideaId: results[i]._id.ideaId});
                            }

                            // Assume we are adding to the last element in the array
                            summary[summary.length - 1][results[i]._id.optionId] = results[i].count;
                        }

                        // Calc scores
                        for (i = 0; i < summary.length; i++) {
                            var totalScore = 0;

                            for (var key in weightedChoices) {
                                var choice = key;

                                if (summary[i][choice]) {
                                    totalScore = totalScore + (summary[i][choice] * weightedChoices[choice]);
                                }
                            }

                            summary[i].totalScore = totalScore;
                        }

                        summary.sort(function(a, b) {
                            return b.totalScore - a.totalScore;
                        });

                        res.json(utilities.successResponse({boardId: boardId, criteria: foundCriteria.title, results: summary}));
                    }
                });
            }

        }
    });
};

// Count number of users who voted in a session
exports.numberOfUsersVotingInBoardApi = function(req, res) {
    var boardId = req.params.boardId;

    exports.checkUserAccessToBoard(req.user, boardId, function(err, member, board) {
        if (err || !member) {
            res.json(utilities.errorResponse(err));
        } else {
            // Aggregate!


            ideaVoteModel.IdeaVote.aggregate([
                {$match: {boardId: boardId}},
                {$group: {_id: {guestId: "$guestId"}, count: {$sum: 1}}},
                {$group: {_id: "number", count: {$sum: 1}}}
            ], function (err, results) {
                if (err) {
                    res.json(utilities.errorResponse(err));
                } else {
                    if (!results || results === 0) {
                        res.json(utilities.successResponse({count: 0}));
                    } else {
                        res.json(utilities.successResponse({count: results[0].count}));
                    }
                }

            });

        }


    });


};

exports.generateChoiceScoresForBoard = function(board) {
    var choiceScores = {};

    for (var i = 0; i < board.criteria.length; i++) {
        if (board.criteria[i].choices && board.criteria[i].choices.length > 0) {
            var thisCriteria = board.criteria[i];

            for (var c = 0; c < thisCriteria.choices.length; c++) {
                choiceScores[board.criteria[i].choices[c]._id] = board.criteria[i].choices[c].weighting;
            }
        }

    }

    return choiceScores;
};

exports.calculateQualificationScoreForIdea = function(choiceScores, idea, criteria) {
    var qualificationScore = 0;
    var totalScorePercentage = 0;

    var qualificationScoreCategories = {};
    var uniqueUsers = {};

    if (idea.qualifications) {
        for (var q = 0; q < idea.qualifications.length; q++) {
            var selectedOption = idea.qualifications[q].optionId;

            if (choiceScores[selectedOption]) {
                uniqueUsers[idea.qualifications[q].userId] = true;

                if (!qualificationScoreCategories[idea.qualifications[q].criteriaId]) {
                    qualificationScoreCategories[idea.qualifications[q].criteriaId] = {score: choiceScores[selectedOption], users: 1};
                } else {
                    qualificationScoreCategories[idea.qualifications[q].criteriaId].score += choiceScores[selectedOption];
                    qualificationScoreCategories[idea.qualifications[q].criteriaId].users ++;

                }

                qualificationScore = qualificationScore + choiceScores[selectedOption];
            }

        }

        if (Object.keys(uniqueUsers).length > 0) {
            for (var key in qualificationScoreCategories) {
                var avg = Math.round(qualificationScoreCategories[key].score / qualificationScoreCategories[key].users);
                qualificationScoreCategories[key].avg = avg;

                // Calculate the % score (based on max achievable score)
                for (var c = 0; c < criteria.length; c++) {
                    if (criteria[c]._id === key) {
                        // Loop through options to get the highest value one
                        var highest = 0;

                        for (var y = 0; y < criteria[c].choices.length; y++) {
                            if (criteria[c].choices[y].weighting > highest) {
                                highest = criteria[c].choices[y].weighting;
                            }
                        }

                    }
                }

                if (highest > 0) {
                    qualificationScoreCategories[key].maxScore = highest;
                    qualificationScoreCategories[key].percentageAvg = avg / highest;
                } else {
                    qualificationScoreCategories[key].maxScore = highest;
                    qualificationScoreCategories[key].percentageAvg = 0;
                }

            }

            // Figure out the total percentage avg
            var totalPossibleScore = 0;

            for (var key2 in qualificationScoreCategories) {
                totalPossibleScore += qualificationScoreCategories[key2].maxScore;
            }

            var totalScore = qualificationScore / Object.keys(uniqueUsers).length;
//            var totalScorePercentage = 0;

            if (totalPossibleScore > 0) {
                totalScorePercentage = totalScore / totalPossibleScore;
            }

            return {totalScore: Math.round(totalScore), totalScorePercentage: totalScorePercentage, categories:qualificationScoreCategories};

        } else {
            return {totalScore: qualificationScore, totalScorePercentage: totalScorePercentage, categories: {}};
        }
    } else {
        return {totalScore: 0, categories: {}};
    }


};

exports.allIdeasForBoardApi = function(req, res) {
    var boardId = req.params.boardId;

    var searchObj = {
        ideaBoardId: boardId,
        active: true
    };

    if (req.body.selectedSessions && req.body.selectedSessions.length > 0) {
        searchObj.session = {$in: req.body.selectedSessions};
    }

    if (req.body.since) {
        searchObj.creationDate = {$gt: req.body.since};
    }

    if (req.body.hotTopics && req.body.hotTopics.length > 0) {
        searchObj["importantWords.stemmed"] = {$in: req.body.hotTopics};
    }

    exports.checkUserAccessToBoard(req.user, boardId, function(err, member, board) {
        if (err || !member) {
            res.json(utilities.errorResponse(err));
        } else {
            // List out all of the ideas
            Idea.find(searchObj).lean().sort({creationDate: -1}).exec(function(err, ideas) {
                if (err) {
                    res.json(utilities.errorResponse(err));
                } else {
                    // Create an object for our score values
                    var choiceScores = {};

                    if (board.criteria && board.criteria.length > 0) {
                        choiceScores = exports.generateChoiceScoresForBoard(board);

                        // Now we have the ideas, add in qualification scores
                        for (var i = 0; i < ideas.length; i++) {
                            var calculatedQualification = exports.calculateQualificationScoreForIdea(choiceScores, ideas[i], board.criteria);
                            ideas[i].qualificationScore = calculatedQualification.totalScore;
                            ideas[i].qualificationScorePercentage = calculatedQualification.totalScorePercentage;
                            ideas[i].qualificationCategoryScores = calculatedQualification.categories;
                        }

                    }

                    res.json(utilities.successOrErrorResponse(err, ideas));
                }


            });
        }
    });
};

// LIKE & DISLIKE
var likeOrDislike = function(req, res, like) {
    exports.checkUserAccessForGenerating(req, res, function(err, member) {
        if (err || !member) {
            res.json(utilities.successOrErrorResponse("You do not have access to that board"));
        } else {
            var idToAdd = "";

            if (member.user) {
                idToAdd = member.user._id;
            } else {
                idToAdd = "GUEST_" + member.guest.id;
            }

            if (like) {
                ideaModel.Idea.findOneAndUpdate({_id: req.params.ideaId, ideaBoardId: req.params.boardId}, {$addToSet: {likes: idToAdd}, $pull: {dislikes: idToAdd}}, function(err, updatedIdea) {
                    res.json(utilities.successOrErrorResponse(err, {liked: true}));
                });
            } else {
                ideaModel.Idea.findOneAndUpdate({_id: req.params.ideaId, ideaBoardId: req.params.boardId}, {$addToSet: {dislikes: idToAdd}, $pull: {likes: idToAdd}}, function(err, updatedIdea) {
                    res.json(utilities.successOrErrorResponse(err, {liked: true}));
                });
            }

        }
    });
};

exports.likeIdeaApi = function(req, res) {
    likeOrDislike(req, res, true);
};

exports.dislikeIdeaApi = function(req, res) {
    likeOrDislike(req, res, false);
};

exports.unlikedIdeasApi = function(req, res) {
    exports.checkUserAccessForGenerating(req, res, function(err, member) {
        if (err || !member) {
            res.json(utilities.successOrErrorResponse("You do not have access to that board"));
        } else {
            var idToFind = "";

            var findModel = {ideaBoardId: req.params.boardId};

            if (member.user) {
                findModel.createdBy = {$ne: member.user._id};
                findModel.$and = [
                    {likes: {$nin: [member.user._id]}},
                    {dislikes: {$nin: [member.user._id]}}
                ];
            } else {
                findModel["guestCreatedBy.guestId"] = {$ne: member.guest.id};
                findModel.$and = [
                    {likes: {$nin: ["GUEST_" + member.guest.id]}},
                    {dislikes: {$nin: ["GUEST_" + member.guest.id]}}
                ];
            }

            ideaModel.Idea.find(findModel, {description: true, createdBy: true, creationDate: true}, function (err, unliked) {
                res.json(utilities.successOrErrorResponse(err, unliked));
            });

        }


    });
};

// CHECK USER ACCESS FOR GENERATING
exports.checkUserAccessForGenerating = function(req, res, callback) {
    if (!req.user && !req.body.guestId) {
        // No credentials provided
        callback("No credentials provided", null);
    } else {
        IdeaBoard.findOne({_id: req.params.boardId}, function(err, ideaBoard) {
            if (err || !ideaBoard) {
                callback("Invalid board", null);
            } else {
                if (ideaBoard.openAccess) {
                    if (ideaBoard.openAccessPassword && ideaBoard.openAccessPassword !== "") {
                        // Check if user has provided an access password
                        if (req.body.openAccessPassword) {
                            if (req.body.openAccessPassword === ideaBoard.openAccessPassword) {
                                if (req.body.guestId) {
                                    callback(null, {guest: {id: req.body.guestId, name: req.body.guestName}});
                                } else if (req.user) {
                                    callback(null, {user: req.user});
                                } else {
                                    callback("No user or guest specified", null);
                                }
                            } else {
                                callback("Invalid board access password", null);
                            }

                        } else if (req.user) {
                            // No password, but there is a logged in user, so check if they have access
                            var foundMember = false;

                            for (var i = 0; i < ideaBoard.members.length; i++) {
                                if (ideaBoard.members[i].userId === req.user._id) {
                                    foundMember = true;
                                    break;
                                }
                            }

                            if (foundMember) {
                                callback(null, {user: req.user});
                            } else {
                                callback("User does not have access to the board", null);
                            }


                        } else {
                            callback("Invalid board access password", null);
                        }

                    } else {
                        // Completely open, return the user or the guest
                        if (req.body.guestId) {
                            callback(null, {guest: {id: req.body.guestId, name: req.body.guestName}});
                        } else if (req.user) {
                            callback(null, {user: req.user});
                        } else {
                            callback("No user or guest specified", null);
                        }
                    }

                } else {
                    // Board is not open, need to check user has access
                    exports.checkUserAccessToBoard(req.user, req.params.boardId, function(err) {
                        callback(err, {user: req.user});
                    });
                }
            }


        });
    }


};

exports.createIdeaForBoardApi = function(req, res) {
    var boardId = req.params.boardId;

    var importantWords = languageProcessing.tokenizeAndStemImportantWords(req.body.description);

    exports.checkUserAccessForGenerating(req, res, function(err, member) {
        if (err || !member) {
            res.json(utilities.errorResponse(err));
        } else {
            // create the idea
            var idea = new Idea({
                ideaBoardId: boardId,
                description: req.body.description,
                creationDate: new Date(),
                importantWords: importantWords
            });

            if (member.user) {
                idea.createdBy = req.user._id;
            } else {
                var guestName = "Anonymous";

                if (req.body.guestName && req.body.guestName.trim() !== "") {
                    guestName = req.body.guestName;
                }

                idea.guestCreatedBy = {
                    guestId: req.body.guestId,
                    name: guestName
                };
            }

            if (req.files && req.files.file) {
                idea.active = false;
            } else {
                idea.active = true;
            }

            idea.save(function(err) {
                // Now save any additional images that have been uploaded
                if (req.files && req.files.file) {
                    var destinationFilename = CARD_IMAGES_PATH + idea._id + ".jpg";

                    try {
                        imageMagick.crop({
                            srcPath: req.files.file.path,
                            dstPath:  destinationFilename,
                            width: 700,
                            height: 400,
                            quality: 1,
                            gravity: "Center"
                        }, function(err, stdout, stderr){
                            if (err) {
                                res.json(utilities.successOrErrorResponse("Could not upload file " + err));
                            } else {
                                idea.hasImage = true;
                                idea.active = true;
                                idea.save(function(err) {
                                    res.json(utilities.successOrErrorResponse(err, idea));
                                });
                            }
                        });
                    } catch (e) {
                        ideaModel.Idea.findOneAndRemove({_id: idea._id});
                        res.json(utilities.errorResponse("Image could not be uploaded " + e));
                    }


                } else {
                    if (!err && idea) {
                        // Push Idea to long polling clients
                        boardLongPolling.pushNewIdea(idea);
                    }

                    res.json(utilities.successOrErrorResponse(err, idea));
                }

            });

        }

    });
};

// Find a session by a beacon id
exports.findSessionByBeaconId = function(req, res) {
    var beaconId = req.params.beaconId;

    ideaBoardModel.IdeaBoard.findOne({"sessions.beaconId": beaconId}, function(err, foundBoard) {
        if (err || !foundBoard) {
            res.json(utilities.errorResponse(err));
        } else {
            // Create the JSON object to return
            var returnObj = {
                boardId: foundBoard._id,
                boardDescription: foundBoard.description
            };

            var foundSession = null;

            for (var i = 0; i < foundBoard.sessions.length; i++) {
                if (foundBoard.sessions[i].beaconId === beaconId) {
                    foundSession = foundBoard.sessions[i];
                    break;
                }
            }

            if (!foundSession) {
                res.json(utilities.errorResponse("Could not find session in board"));
            } else {
                returnObj._id = foundSession._id;
                returnObj.title = foundSession.title;
                returnObj.creationDate = foundSession.date;
                returnObj.beaconId = foundSession.beaconId;
                returnObj.sessionType = foundSession.sessionType;

                if (foundSession.password) {
                    returnObj.hasPassword = true;
                } else {
                    returnObj.hasPassword = false;
                }

                res.json(utilities.successResponse(returnObj));
            }

        }
    });
};

// Push a new session into an idea board
exports.createSessionForBoardApi = function(req, res) {
    var boardId = req.params.boardId;
    var type = req.body.type;

    if (!type) {
        // Default to capture type for sessions
        type = ideaBoardModel.SESSION_TYPE_CAPTURE;
    }

    if (!boardId) {
        res.json(utilities.errorResponse("No board id specified"));
    } else if (!req.body.title || req.body.title.trim() === "") {
        res.json(utilities.errorResponse("You must enter a valid title"));
    } else {
        exports.checkAdminAccessToBoard(req.user, boardId, function(err, member, ideaBoard) {
            if (err || !member) {
                res.json(utilities.errorResponse(err));
            } else {
                // Check session code is unique

                // create the session
                autoIncCountersModel.getNextSequence(autoIncCountersModel.SESSION_BEACON_COUNTER, function(err, nextId) {
                    if (err) {
                        res.json(utilities.errorResponse(err));
                    } else {
                        var session = {
                            title: req.body.title,
                            date: new Date(),
                            beaconId: nextId,
                            sessionType: type
                        };

                        if (req.body.password && req.body.password !== null && req.body.password !== "") {
                            session.password = md5(req.body.password);
                        }

                        IdeaBoard.findOneAndUpdate({_id: ideaBoard._id}, {$push: {sessions: session}}, function(err, updated) {
                            res.json(utilities.successOrErrorResponse(err, updated));
                        });
                    }

                });

            }
        });
    }

};

exports.updateBoardAccessApi = function(req, res) {
    exports.checkAdminAccessToBoard(req.user, req.params.boardId, function(err, member, ideaBoard) {
        if (err || !member) {
            res.json(utilities.errorResponse(err));
        } else {
            var openAccess = req.body.openAccess;

            if (openAccess === null) {
                openAccess = false;
            }

            var openAccessPassword = req.body.openAccessPassword;

            if (openAccessPassword === null) {
                openAccessPassword = "";
            }

            // Update the board access rights
            IdeaBoard.findOneAndUpdate({_id: ideaBoard._id}, {$set: {openAccess: openAccess, openAccessPassword: openAccessPassword}}, function(err, updated) {
                res.json(utilities.successOrErrorResponse(err, updated));
            });

        }
    });
};

// Push a new session into an idea board
exports.deleteSessionForApi = function(req, res) {
    var boardId = req.params.boardId;
    var sessionId = req.params.sessionId;

    exports.checkAdminAccessToBoard(req.user, boardId, function(err, member, ideaBoard) {
        if (err || !member) {
            res.json(utilities.errorResponse(err));
        } else {
            // Delete the session
            IdeaBoard.findOneAndUpdate({_id: boardId}, {$pull: {"sessions": {_id: sessionId}}}, function(err, updated) {
                res.json(utilities.successOrErrorResponse(err, updated));
            });
        }
    });

};

// DELETE IDEA
exports.deleteIdeaApi = function(req, res) {
    // Load the idea first
    Idea.findOne({_id: req.params.ideaId}, function(err, idea) {
        if (err || !idea) {
            res.json(utilities.errorResponse(err));
        } else {
            exports.checkUserAccessToBoard(req.user, idea.ideaBoardId, function(err, member) {
                if (err || !member) {
                    res.json(utilities.errorResponse(err));
                } else {
                    // TODO check user has delete permissions
                    idea.remove(function(err) {
                        res.json(utilities.successOrErrorResponse(err, "Deleted"));
                    });
                }

            });
        }
    });
};

// VIEW Idea
exports.viewIdeaApi = function(req, res) {
    // Load the idea first
    Idea.findOne({_id: req.params.ideaId}).lean().exec(function(err, idea) {
        if (err || !idea) {
            res.json(utilities.errorResponse(err));
        } else {
            exports.checkUserAccessToBoard(req.user, idea.ideaBoardId, function(err, member, board) {
                if (err || !member) {
                    res.json(utilities.errorResponse(err));
                } else {
                    // Calculate the qualification score for the idea
                    var calculatedQualification = exports.calculateQualificationScoreForIdea(exports.generateChoiceScoresForBoard(board), idea, board.criteria);
                    idea.qualificationScore = calculatedQualification.totalScore;
                    idea.qualificationScorePercentage = calculatedQualification.totalScorePercentage;
                    idea.qualificationCategoryScores = calculatedQualification.categories;

                    // Set the board on the idea
                    idea.board = board;

                    res.json(utilities.successOrErrorResponse(err, idea));
                }

            });
        }

    });
};

// Update Idea with criteria
exports.saveIdeaUpdateCriteriaApi = function(req, res) {
    // Load Idea first
    Idea.findOne({_id: req.params.ideaId}, function(err, idea) {
        if (err || !idea) {
            res.json(utilities.errorResponse(err));
        } else {
            exports.checkUserAccessToBoard(req.user, idea.ideaBoardId, function(err, member) {
                if (err || !member) {
                    res.json(utilities.errorResponse(err));
                } else {
                    // Now update
                    Idea.findOneAndUpdate({_id: req.params.ideaId}, {qualificationCriteria: req.body.qualificationCriteria}, {$upsert: true}, function(err) {
                        res.json(utilities.successOrErrorResponse(err, "Update ok"));
                    });
                }
            });
        }
    });
};

// COMMENTS
//Delete
exports.deleteCommentApi = function(req, res) {
    // Load the idea firsthey
    IdeaComment.findOne({_id: req.body.commentId}, function(err, comment) {
        if (err || !comment) {
            res.json(utilities.errorResponse("Could not find comment"));
        } else {
            Idea.findOne({_id: req.params.ideaId}, function(err, idea) {
                exports.checkUserAccessToBoard(req.user, idea.ideaBoardId, function(err, member) {
                    if (err || !idea) {
                        res.json(utilities.errorResponse("Could not find comment"));
                    } else {
                        // TODO check user has delete permissions
                        comment.remove(function(err) {
                            res.json(utilities.successOrErrorResponse(err, "Deleted"));
                        });
                    }

                });
            });
        }
    });


};

exports.allCommentsForIdea = function(req, res) {
    var ideaId = req.params.ideaId;

    // First load the idea
    Idea.findOne({_id: ideaId}, function(err, idea) {
        if (err || !idea) {
            res.json(utilities.errorResponse(err));
        } else if (!idea){
            // Send blank list of comments if we can't find this
            res.json(utilities.successResponse([]));
        } else {
            // Check access to the board
            exports.checkUserAccessToBoard(req.user, idea.ideaBoardId, function(err, member) {
                if (err || !member) {
                    res.json(utilities.errorResponse(err));
                } else {
                    // List out all of the comments
                    IdeaComment.find({ideaId: ideaId}).sort({creationDate: -1}).exec(function(err, comments) {
                        res.json(utilities.successOrErrorResponse(err, comments));
                    });
                }

            });
        }
    });
};

exports.createCommentForIdea = function(req, res) {
    var ideaId = req.params.ideaId;

    // First load the idea
    Idea.findOne({_id: ideaId}, function(err, idea) {
        if (err || !idea) {
            res.json(utilities.errorResponse(err));
        } else {
            // Check access to the board
            exports.checkUserAccessToBoard(req.user, idea.ideaBoardId, function(err, member) {
                if (err || !member) {
                    res.json(utilities.errorResponse(err));
                } else {
                    // Create the comment
                    var newComment = new IdeaComment({ideaId: ideaId, comment: req.body.comment, createdBy: {id: req.user._id, username: req.user.username}, creationDate: new Date(), active: true});
                    newComment.save(function(err) {
                        res.json(utilities.successOrErrorResponse(err, newComment));
                    });
                }

            });
        }
    });
};

// QUALIFYING
exports.qualifyIdeaApi = function(req, res) {
    var ideaId = req.params.ideaId;
    var boardId = req.params.boardId;
    var criterionId = req.body.criterionId;
    var optionToVoteFor = req.body.optionId;

    // First see if user is allowed to qualify on this board
    exports.checkAdminAccessToBoard(req.user, boardId, function(err, member, board) {
        if (err || !member) {
            res.json(utilities.errorResponse(err));
        } else {
            // See if user has already qualified against this criterion and idea, and pull if they have
            ideaModel.Idea.findOneAndUpdate({ideaBoardId: boardId, _id: ideaId}, {$pull: {qualifications: {userId: req.user._id, criteriaId: criterionId}}}, function(err, results) {
                // Now push a new qualification 'vote'

                var newQualification = {
                    userId: req.user._id,
                    criteriaId: criterionId,
                    optionId: optionToVoteFor
                };

                ideaModel.Idea.findOneAndUpdate({ideaBoardId: boardId, _id: ideaId}, {$push: {qualifications: newQualification}}, function(err, idea) {
                    res.json(utilities.successOrErrorResponse(err, exports.calculateQualificationScoreForIdea(exports.generateChoiceScoresForBoard(board), idea, board.criteria)));
                });


            });




        }
    });


};

