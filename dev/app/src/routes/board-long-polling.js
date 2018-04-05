var ideaBoardRoutes = require("../routes/idea-board-routes"),
    utilities = require("../utility/ideafunnel-utilities");

// Open requests stores a board ID and the latest
var openBoardRequests = {};
var LONG_POLL_TIMEOUT = 50000;
var STORE_IDEAS_FOR = 1200000;


exports.addLongPollForBoard = function(boardId, callback) {
    if (!openBoardRequests[boardId]) {
        openBoardRequests[boardId] = {ideas: [], requests: []};
    }

    openBoardRequests[boardId].requests.push(callback);

};

// Pushes a new idea to all connected long polling clients
exports.pushNewIdea = function(idea) {
    console.log("New idea pushed to " + idea.ideaBoardId);
    if (!openBoardRequests[idea.ideaBoardId]) {
        openBoardRequests[idea.ideaBoardId] = {ideas: [], requests: []};
    }

    // Clear off any old ideas
    var i = 0;

    var now = new Date().getTime();

    while (i < openBoardRequests[idea.ideaBoardId].ideas.length) {
        if (now - STORE_IDEAS_FOR > openBoardRequests[idea.ideaBoardId].ideas[i].creationDate.getTime()) {
            openBoardRequests[idea.ideaBoardId].ideas.splice(i, 1);
        } else {
            i++;
        }
    }

    // Add in new idea
    openBoardRequests[idea.ideaBoardId].ideas.push(idea);


    while (openBoardRequests[idea.ideaBoardId].requests.length > 0) {
        if (openBoardRequests[idea.ideaBoardId].requests[0]) {
            openBoardRequests[idea.ideaBoardId].requests[0]([idea]);
        }

        openBoardRequests[idea.ideaBoardId].requests.shift();
    }

};

exports.startLongPollForIdeas = function(req, res) {
    // User is now verified. First check to see if there have been any ideas since the last timestamp

    var lastTimestamp = 0; // Start of time, well, 1970ish
    var boardId = req.params.boardId;

    if (req.query.lastIdeaTimestamp) {
        lastTimestamp = req.query.lastIdeaTimestamp;
    }

    var ideasToReturn = [];

    if (new Date().getTime() - STORE_IDEAS_FOR > lastTimestamp ) {
        // We need to return all ideas since a certain date... best just to do a full call


    } else if (openBoardRequests[boardId] && openBoardRequests[boardId].ideas.length > 0) {
        // Check to see if there are any ideas that this user hasn't yet seen
        for (var i = 0; i < openBoardRequests[boardId].ideas.length; i++) {
            if (lastTimestamp < openBoardRequests[boardId].ideas[i].creationDate.getTime()) {
                ideasToReturn.push(openBoardRequests[boardId].ideas[i]);
            } else {
                break;
            }
        }
    }

    if (ideasToReturn.length > 0) {
        // Return the ideas, no need to long poll
        res.json(utilities.successResponse(ideasToReturn));
    } else {
        exports.addLongPollForBoard(boardId, function(msg) {
            if (!res.headerSent) {
                res.json(utilities.successResponse(msg));
            }
        });


    }

};

exports.longPollForIdeas = function(req, res) {
    var boardId = req.params.boardId;

    // First check user's access to this board
    if (req.session.boardAccess && req.session.boardAccess[boardId]) {
        exports.startLongPollForIdeas(req, res);
    } else {
        ideaBoardRoutes.checkUserAccessToBoard(req.user, boardId, function(err, member, board) {
            if (err || !member) {
                res.json(utilities.errorResponse("No access to board"));
            } else {
                // Add access flag to session for future requests
                if (!req.session.boardAccess) {
                    req.session.boardAccess = {};
                }
                req.session.boardAccess[boardId] = true;
            }

            exports.startLongPollForIdeas(req, res);
        });
    }


};
