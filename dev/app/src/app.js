
/**
 * Module dependencies.
 */

var DEFAULT_TIMER =  50000;
var TIMEOUT = 60000;

var express = require('express'),
    routes = require('./routes'),
    userRoutes = require("./routes/user"),
    meRoutes = require("./routes/me-routes"),
    ideaBoardRoutes = require("./routes/idea-board-routes"),
    ideaSessionRoutes = require("./routes/idea-session-routes"),
    http = require('http'),
    path = require('path'),
    mongoose = require('mongoose'),
    md5 = require("MD5"),
    hayPeaEye = require('./api/haypeaeye'),
    boardLongPolling = require('./routes/board-long-polling'),
    utilities = require("./utility/ideafunnel-utilities"),
    userModel = require('./models/user-model'),
    flash = require('connect-flash');

var db = require('./models/db');
var ideaBoardMemberModel = require('./models/idea-board-member-model');
var ideaBoardModel = require('./models/idea-board-model');

var app = express();

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

var FACEBOOK_APP_ID = "1441151356131321";
var FACEBOOK_APP_SECRET = "6243f1f2e333f69d47d52a5fb37f0842";


//CORS middleware
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Add in headers to prevent safari showing blank pages
    if (req.headers["user-agent"] && req.headers["user-agent"].indexOf("Safari") >= 0 && req.headers["user-agent"].indexOf("Chrome") < 0) {
        res.header("Cache-Control", "no-cache, no-store, must-revalidate");
        res.header("Pragma", "no-cache");
        res.header("Expires", 0);
    }

    // intercept OPTIONS method
    if (req.method === 'OPTIONS') {
        res.send(200);
    } else {
        next();
    }
};

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('californi@'));
app.use(express.session());
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(express.bodyParser());
app.use(express.timeout(TIMEOUT));
app.use(allowCrossDomain);
app.use(app.router);
app.use(clientErrorHandler);
app.use(errorHandler);
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static("/ideafunnel/"));

//app.use(express.bodyParser({ keepExtensions: true, uploadDir: "uploads" }));

// development only
if ('development' === app.get('env')) {
    app.use(express.errorHandler());
}


// Passport setup
passport.use(new LocalStrategy(function(email, password, done) {
    mongoose.model("User").findOne({email: email.toLowerCase()}, function(err, user) {

        if (err) {
            return done(err, false, {message: "Please contact admin"});
        }

        if (!user) {
            return done(null, false, {message: 'Invalid credentials. Please try again.'});
        }

        if (user.password !== md5(password)) {
            return done(null, false, {message: 'Invalid credentials. Please try again.'});
        }

        return done(null, user);
    });
}));

// Passport Facebook setup
/*
passport.use(new FacebookStrategy({
        clientID: FACEBOOK_APP_ID,
        clientSecret: FACEBOOK_APP_SECRET,
        callbackURL: "http://localhost:3000/auth/facebook/callback"
    },
    function(accessToken, refreshToken, profile, done) {
        // Check the credentials to see if the user is known
        // TODO - load user if known

        var foundUser = false;

        if (!foundUser) {
            console.log(profile);

            console.log(profile._json.first_name);
            done(null, {id: "__temp", email: "test@test.com", firstName: profile._json.first_name});
        }

        User.findOrCreate(..., function(err, user) {
            if (err) { return done(err); }
            done(null, user);
        });



    }
));

 // Facebook routes for auth
 app.get('/auth/facebook', passport.authenticate('facebook'));

 app.get('/auth/facebook/callback',
 passport.authenticate('facebook', { successRedirect: '/',
 failureRedirect: '/login' }));

*/

var callbackTimeout = function(callback) {
    setTimeout(function() {
        callback();
    }, 10000);
};

//app.get('/longpoll', boardLongPolling.longPoll);
//app.get('/sendmsg', boardLongPolling.newMessage);

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    mongoose.model("User").findById(id, function(err, user) {
        done(err, user);
    });
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }

    // Store path for redirect
    req.session.redirectTo = req.path;

    res.redirect('/login');
}

function ensureAdmin(req, res, next) {
    if (req.isAuthenticated()) {
        if (!req.user.admin) {
            res.redirect('/permissiondenied');
        }

        return next();
    }

    res.redirect('/login');
}

function loginRedirect(req, res) {
    if (req.session.redirectTo) {
        res.redirect(req.session.redirectTo);
    } else {
        res.redirect("/home");
    }
}

function checkForApiLogin(req, res, next) {

}

function errorHandler(err, req, res, next) {
    res.status(500);
    res.render('error', { error: err });
}

function createError(err, req, res) {
    res.render("error", err);
}

// APEye Functions
hayPeaEye.setSettings({
    authenticatorMethod: function(req, callback) {
        if (req.isAuthenticated()) {
            callback(req.user);
        } else if (req.query.appToken || req.body.appToken) {
            // We have an app token, check it is valid with the user token
            // TODO do this property
            var appToken = req.query.appToken;
            if (!appToken) {
                appToken = req.body.appToken;
            }

            var userToken = req.query.userToken;
            if (!userToken) {
                userToken = req.body.userToken;
            }

            if (!userToken || !appToken) {
                callback(null);
            } else {
                // Lookup tokens and return user
                userModel.User.findOne({"appTokens.appToken": appToken, "appTokens.userToken": userToken}, function(err, user) {
                    if (err) {
                        callback(null);
                    } else {
                        req.user = user;
                        callback(user);
                    }
                });
            }


        } else {
            callback(null);
        }
    },
    applicationName: "Idea Funnel"
});

// User APIs
hayPeaEye.addApiMethod(
    "/api/user/find", hayPeaEye.GET,
    "Finds a user given a string or partial String",
    {grouping: "User", auth: hayPeaEye.AUTH_OPTIONAL},
    [{name: "s", type: hayPeaEye.String, required: true, description: "String to search for", example: "daryl"}],
    userRoutes.findUser
);

// User stats
hayPeaEye.addApiMethod(
    "/api/user/:username/stats", hayPeaEye.GET,
    "Get stats for a user",
    {grouping: "User", auth: hayPeaEye.AUTH_OPTIONAL},
    [{name: "userId", type: hayPeaEye.String, required: true, description: "Username of the user to get stats for"}],
    meRoutes.getUserStats
);

// Idea Board APIs
hayPeaEye.addApiMethod(
    "/api/idea-boards/check-code", hayPeaEye.GET,
    "Checks if an idea board code is in use",
    {grouping: "Idea Boards", auth: hayPeaEye.AUTH_REQUIRED},
    [{name: "code", type: hayPeaEye.String, required: true, description: "The code to check", example: "myboard"}],
    ideaBoardRoutes.checkIdeaBoardCode
);


hayPeaEye.addApiMethod(
    "/api/idea-boards/:boardId/create", hayPeaEye.POST,
    "Create a new idea in the specified board",
    {grouping: "Ideas", auth: hayPeaEye.AUTH_OPTIONAL},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "The id of the board you want to create the idea in"},
        {name: "description", type: hayPeaEye.String, required: true, description: "The content of the idea"},
        {name: "file", type: hayPeaEye.File, required: false, description: "Optional image to include on the card"},
        {name: "guestId", type: hayPeaEye.String, required: false, description: "ID of the guest, if it is a guest submitting this idea"},
        {name: "guestName", type: hayPeaEye.String, required: false, description: "Name or nickname of the guest, if it is a guest submitting this idea"}

    ],
    ideaBoardRoutes.createIdeaForBoardApi
);
//TODO remove this??
hayPeaEye.addApiMethod(
    "/api/idea-boards/:boardId/sessions/create", hayPeaEye.POST,
    "Create session for a board",
    {grouping: "Sessions", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "ID of the board to create the session in", example: "my-board"},
        {name: "title", type: hayPeaEye.String, required: true, description: "Title for the session", example: "My board description"},
        {name: "password", type: hayPeaEye.String, required: false, description: "An optional password for the session", example: "password"},
        {name: "type", type: hayPeaEye.Enum, required: false, description: "The type of session to create (either 'capture' or 'vote'). If you don't enter a value here the type is assumed to be 'capture'", validValues: ["capture", "vote"], example: "capture"}

    ],
    ideaBoardRoutes.createSessionForBoardApi
);

//TODO remove this??
hayPeaEye.addApiMethod(
    "/api/idea-boards/:boardId/sessions/:sessionId/delete", hayPeaEye.POST,
    "Delete the specified session",
    {grouping: "Sessions", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "ID of the board", example: "my-board"},
        {name: "sessionId", type: hayPeaEye.String, required: true, description: "ID of the session to delete"}

    ],
    ideaBoardRoutes.deleteSessionForApi
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/check-exists/:ideaBoardId", hayPeaEye.GET,
    "Checks that an idea board with the given id exists",
    {grouping: "Idea Boards", auth: hayPeaEye.AUTH_NOT_REQUIRED},
    [{name: "ideaBoardId", type: hayPeaEye.String, required: true, description: "The board ID to check", example: "myboard"}],
    ideaBoardRoutes.checkIdeaBoardExistenceApi
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/all", hayPeaEye.POST,
    "List all boards for the user",
    {grouping: "Idea Boards", auth: hayPeaEye.AUTH_REQUIRED},
    [],
    ideaBoardRoutes.allIdeaBoards
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/view/:id", hayPeaEye.POST,
    "View an Idea Board with the given ID",
    {grouping: "Idea Boards", auth: hayPeaEye.AUTH_OPTIONAL},
    [
        {name: "id", type: hayPeaEye.String, required: true, description: "The Idea Board ID", example: "myboard"},
        {name: "countUserIdeas", type: hayPeaEye.Boolean, required: false, description: "True if you want to include a count of user ideas in the returned board"},
        {name: "guestId", type: hayPeaEye.String, required: false, description: "You must include a valid guest id if you want to count the number of ideas the guest has generated"}

    ],
    ideaBoardRoutes.viewIdeaBoardApi
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/:id/delete", hayPeaEye.DELETE,
    "Delete an Idea Board with the given ID",
    {grouping: "Idea Boards", auth: hayPeaEye.AUTH_OPTIONAL},
    [
        {name: "id", type: hayPeaEye.String, required: true, description: "The Idea Board ID", example: "myboard"},
        {name: "guestId", type: hayPeaEye.String, required: false, description: "You must include a valid guest id if you want to count the number of ideas the guest has generated"}

    ],
    ideaBoardRoutes.deleteIdeaBoardApi
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/view/:id/user-ideas", hayPeaEye.POST,
    "View all ideas a user or guest has generated for a board",
    {grouping: "Idea Boards", auth: hayPeaEye.AUTH_OPTIONAL},
    [
        {name: "id", type: hayPeaEye.String, required: true, description: "The Idea Board ID", example: "myboard"},
        {name: "guestId", type: hayPeaEye.String, required: false, description: "If you are not providing a user key, you must provide a guest ID"}

    ],
    ideaBoardRoutes.viewUserIdeasForBoardApi
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/:id/ideas/export", hayPeaEye.POST,
    "Exports all ideas from an Idea Board",
    {grouping: "Idea Boards", auth: hayPeaEye.AUTH_REQUIRED},
    [{name: "id", type: hayPeaEye.String, required: true, description: "The Idea Board ID to export", example: "myboard"}],
    ideaBoardRoutes.exportIdeaBoardApi
);


hayPeaEye.addApiMethod(
    "/api/idea-boards/:id/members/add", hayPeaEye.POST,
    "Add a member to the board",
    {grouping: "Idea Boards", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "id", type: hayPeaEye.String, required: true, description: "The Idea Board ID", example: "myboard"},
        {name: "userId", type: hayPeaEye.String, required: true, description: "ID of user to add", example: "daz"},
        {name: "admin", type: hayPeaEye.Boolean, required: true, description: "True if user should be an admin", example: "true"}
    ],
    ideaBoardRoutes.addMemberToBoardApi
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/:id/members/remove", hayPeaEye.POST,
    "Remove a member from the board",
    {grouping: "Idea Boards", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "id", type: hayPeaEye.String, required: true, description: "The Idea Board ID", example: "myboard"},
        {name: "userId", type: hayPeaEye.String, required: true, description: "ID of user to add", example: "daz"}
    ],
    ideaBoardRoutes.removeMemberFromBoardApi
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/create", hayPeaEye.POST,
    "Create a new Idea Board",
    {grouping: "Idea Boards", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "_id", type: hayPeaEye.String, required: true, description: "An ID for your board", example: "my-new-board"},
        {name: "title", type: hayPeaEye.String, required: true, description: "Title for your new board", example: "My new board"},
        {name: "description", type: hayPeaEye.String, required: true, description: "Short description of your board", example: "This is my board to capture new ideas"}
    ],
    ideaBoardRoutes.createIdeaBoardApi
);


hayPeaEye.addApiMethod(
    "/api/idea-boards/:boardId/update/access", hayPeaEye.POST,
    "Save board access update",
    {grouping: "Idea Boards", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "ID of the board to update"},
        {name: "openAccess", type: hayPeaEye.Boolean, required: true, description: "Is this board open access? true/false"},
        {name: "openAccess", type: hayPeaEye.Boolean, required: false, description: "An optional password for open access boards"}
    ],
    ideaBoardRoutes.updateBoardAccessApi
);


// Likes/Dislikes
hayPeaEye.addApiMethod(
    "/api/idea-boards/:boardId/unliked", hayPeaEye.GET,
    "List all of the ideas in a board that a guest or user has not yet liked",
    {grouping: "Like and Dislike", auth: hayPeaEye.AUTH_OPTIONAL},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "The Idea Board ID"},
        {name: "guestId", type: hayPeaEye.String, required: false, description: "If you are not providing a user key, you must provide a guest ID"}
    ],
    ideaBoardRoutes.unlikedIdeasApi
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/:boardId/:ideaId/like", hayPeaEye.POST,
    "Like an idea",
    {grouping: "Like and Dislike", auth: hayPeaEye.AUTH_OPTIONAL},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "The Idea Board ID"},
        {name: "ideaId", type: hayPeaEye.String, required: true, description: "The Idea ID"},
        {name: "guestId", type: hayPeaEye.String, required: false, description: "If you are not providing a user key, you must provide a guest ID"}
    ],
    ideaBoardRoutes.likeIdeaApi
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/:boardId/:ideaId/dislike", hayPeaEye.POST,
    "Dislike an idea",
    {grouping: "Like and Dislike", auth: hayPeaEye.AUTH_OPTIONAL},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "The Idea Board ID"},
        {name: "ideaId", type: hayPeaEye.String, required: true, description: "The Idea ID"},
        {name: "guestId", type: hayPeaEye.String, required: false, description: "If you are not providing a user key, you must provide a guest ID"}
    ],
    ideaBoardRoutes.dislikeIdeaApi
);


// Board Criteria
hayPeaEye.addApiMethod(
    "/api/idea-boards/:id/update/criteria", hayPeaEye.POST,
    "Update criteria for the board",
    {grouping: "Criteria", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "id", type: hayPeaEye.String, required: true, description: "ID of the board to update"},
        {name: "standardCriteria", type: hayPeaEye.String, required: true, description: "Array of standard criteria to set"}
    ],
    ideaBoardRoutes.saveBoardUpdateCriteriaApi
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/:id/criteria/add", hayPeaEye.POST,
    "Add custom criteria to the board",
    {grouping: "Criteria", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "id", type: hayPeaEye.String, required: true, description: "ID of the board to add criteria to"},
        {name: "title", type: hayPeaEye.String, required: true, description: "Array of standard criteria to set"}
    ],
    ideaBoardRoutes.addCriterionToBoard
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/:id/criteria/:criterionId/remove", hayPeaEye.POST,
    "Removes custom criteria from a board",
    {grouping: "Criteria", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "id", type: hayPeaEye.String, required: true, description: "ID of the board to add criteria to"},
        {name: "criterionId", type: hayPeaEye.String, required: true, description: "ID of the criterion to remove"}
    ],
    ideaBoardRoutes.removeCriterionFromBoard
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/:id/criteria/:criterionId/edit", hayPeaEye.POST,
    "Edit criterion title",
    {grouping: "Criteria", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "id", type: hayPeaEye.String, required: true, description: "ID of the board to add criteria to"},
        {name: "criterionId", type: hayPeaEye.String, required: true, description: "ID of the criterion to edit"},
        {name: "title", type: hayPeaEye.String, required: true, description: "New title for the criterion"}

    ],
    ideaBoardRoutes.editCriterionTitleApi
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/:id/criteria/:criterionId/options/add", hayPeaEye.POST,
    "Adds an option to a criterion",
    {grouping: "Criteria", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "id", type: hayPeaEye.String, required: true, description: "ID of the board to add criteria to"},
        {name: "criterionId", type: hayPeaEye.String, required: true, description: "ID of the criterion to remove"},
        {name: "title", type: hayPeaEye.String, required: true, description: "Title for the option"},
        {name: "weighting", type: hayPeaEye.Number, required: true, description: "Weighting for the option"}

    ],
    ideaBoardRoutes.addOptionToCriterion
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/:id/criteria/:criterionId/options/remove", hayPeaEye.POST,
    "Remove an option from a criterion",
    {grouping: "Criteria", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "id", type: hayPeaEye.String, required: true, description: "ID of the board to add criteria to"},
        {name: "criterionId", type: hayPeaEye.String, required: true, description: "ID of the criterion to remove"},
        {name: "optionId", type: hayPeaEye.String, required: true, description: "ID of the option to remove"}

    ],
    ideaBoardRoutes.removeOptionFromCriterion
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/:id/criteria/:criterionId/options/edit", hayPeaEye.POST,
    "Updates an option's values",
    {grouping: "Criteria", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "id", type: hayPeaEye.String, required: true, description: "ID of the board to add criteria to"},
        {name: "criterionId", type: hayPeaEye.String, required: true, description: "ID of the criterion to remove"},
        {name: "optionId", type: hayPeaEye.String, required: true, description: "ID of the option to remove"},
        {name: "title", type: hayPeaEye.String, required: true, description: "New title for the option"},
        {name: "weighting", type: hayPeaEye.Number, required: true, description: "New weighting for the option"}

    ],
    ideaBoardRoutes.editCriterionOptionApi
);

// Votes calculation
hayPeaEye.addApiMethod(
    "/api/idea-boards/:boardId/votes/criteria/:criterionId", hayPeaEye.POST,
    "Shows the number of votes for options on ideas against the given criterion",
    {grouping: "Voting", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "The id of the board you want to view ideas for"},
        {name: "criterionId", type: hayPeaEye.String, required: true, description: "The id of the criterion you want to see scores for"}
    ],
    ideaBoardRoutes.votesForCriterionApi
);


// Ideas APIs
hayPeaEye.addApiMethod(
    "/api/idea-boards/:boardId/all", hayPeaEye.POST,
    "List all ideas for the given board",
    {grouping: "Ideas", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "The id of the board you want to view ideas for"},
        {name: "hotTopics", type: hayPeaEye.Object, required: false, description: "An array containing stemmed hot topics that you want to search for"},
        {name: "selectedSessions", type: hayPeaEye.Object, required: false, description: "An array containing any session IDs you want to filter on"}
    ],
    ideaBoardRoutes.allIdeasForBoardApi
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/:boardId/:ideaId/delete", hayPeaEye.POST,
    "Delete the specified idea",
    {grouping: "Ideas", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "The id of the board you want to create the idea in"},
        {name: "ideaId", type: hayPeaEye.String, required: true, description: "The  id of the idea to delete"}

    ],
    ideaBoardRoutes.deleteIdeaApi
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/:boardId/:ideaId/view", hayPeaEye.GET,
    "Retrieves the specified idea",
    {grouping: "Ideas", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "The id of the board you want to get the idea from"},
        {name: "ideaId", type: hayPeaEye.String, required: true, description: "The  id of the idea to retrieve"}

    ],
    ideaBoardRoutes.viewIdeaApi
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/:boardId/:ideaId/update/criteria", hayPeaEye.POST,
    "Update criteria for the idea",
    {grouping: "Ideas", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "ideaId", type: hayPeaEye.String, required: true, description: "The  id of the idea to delete"}
    ],
    ideaBoardRoutes.saveIdeaUpdateCriteriaApi
);

// Idea Comments API
hayPeaEye.addApiMethod(
    "/api/idea-boards/:boardId/:ideaId/comments/all", hayPeaEye.POST,
    "List all comments for the specified idea",
    {grouping: "Idea Comments", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "The id of the board you want to create the idea in"},
        {name: "ideaId", type: hayPeaEye.String, required: true, description: "The  id of the idea"}

    ],
    ideaBoardRoutes.allCommentsForIdea
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/:boardId/:ideaId/comments/create", hayPeaEye.POST,
    "Create a new comment for the specified idea",
    {grouping: "Idea Comments", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "The id of the board you want to create the idea in"},
        {name: "ideaId", type: hayPeaEye.String, required: true, description: "The  id of the idea"},
        {name: "comment", type: hayPeaEye.String, required: true, description: "The text of the comment"}


    ],
    ideaBoardRoutes.createCommentForIdea
);

hayPeaEye.addApiMethod(
    "/api/idea-boards/:boardId/:ideaId/comments/delete", hayPeaEye.POST,
    "Delete the specified comment",
    {grouping: "Idea Comments", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "The id of the board you want to create the idea in"},
        {name: "ideaId", type: hayPeaEye.String, required: true, description: "The  id of the idea"},
        {name: "commentId", type: hayPeaEye.String, required: true, description: "The comment ID to delete"}


    ],
    ideaBoardRoutes.deleteCommentApi
);

// Idea Sessions APIs
hayPeaEye.addApiMethod(
    "/api/:boardId/sessions/list", hayPeaEye.GET,
    "Lists all sessions for a given board ID",
    {grouping: "Sessions", auth: hayPeaEye.AUTH_OPTIONAL},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "The id of the board you want to create the idea in"}
    ],
    ideaSessionRoutes.sessionsForBoard
);

hayPeaEye.addApiMethod(
    "/api/sessions/:boardId/:sessionId/check-password", hayPeaEye.GET,
    "Checks a password against a session password",
    {grouping: "Sessions", auth: hayPeaEye.AUTH_OPTIONAL},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "The id of the board you want to create the idea in"},
        {name: "sessionId", type: hayPeaEye.String, required: true, description: "The id of the session you want to check a passsword for", example: "mysession"},
        {name: "sessionPassword", type: hayPeaEye.String, required: true, description: "The password you want to check"}
    ],
    ideaSessionRoutes.checkSessionPassword
);

hayPeaEye.addApiMethod(
    "/api/sessions/:boardId/:sessionId/create-idea", hayPeaEye.POST,
    "Creates an idea in a session",
    {grouping: "Sessions", auth: hayPeaEye.AUTH_OPTIONAL},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "The id of the board you want to create the idea in"},
        {name: "sessionId", type: hayPeaEye.String, required: true, description: "The id of the session", example: "mysession"},
        {name: "password", type: hayPeaEye.String, required: false, description: "The password of the session, if there is one"},
        {name: "description", type: hayPeaEye.String, required: true, description: "The text content of the idea you want to post"},
        {name: "file", type: hayPeaEye.String, required: false, description: "An optional file upload (image)"},
        {name: "guest.name", type: hayPeaEye.String, required: false, description: "The name of the guest"},
        {name: "guest._id", type: hayPeaEye.String, required: false, description: "The ID of the guest"}
    ],
    ideaSessionRoutes.createIdeaForSessionApi
);

hayPeaEye.addApiMethod(
    "/api/sessions/:boardId/:sessionId/ideas", hayPeaEye.GET,
    "Lists ideas for a session. Note: not all sessions suppport the listing of ideas (currently only vote sessions)",
    {grouping: "Sessions", auth: hayPeaEye.AUTH_OPTIONAL},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "The id of the board you want to create the idea in"},
        {name: "sessionId", type: hayPeaEye.String, required: true, description: "The id of the session"},
        {name: "password", type: hayPeaEye.String, required: false, description: "The password of the session, if there is one"}
    ],
    ideaSessionRoutes.listIdeasForSessionApi
);

hayPeaEye.addApiMethod(
    "/api/sessions/:boardId/:sessionId/ideas-unvoted", hayPeaEye.GET,
    "Lists ideas for a session that this guest has not yet voted on. Note: not all sessions suppport the listing of ideas (currently only vote sessions)",
    {grouping: "Sessions", auth: hayPeaEye.AUTH_OPTIONAL},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "The id of the board you want to create the idea in"},
        {name: "sessionId", type: hayPeaEye.String, required: true, description: "The id of the session"},
        {name: "guestId", type: hayPeaEye.String, required: true, description: "The id of the guest"},
        {name: "password", type: hayPeaEye.String, required: false, description: "The password of the session, if there is one"}
    ],
    ideaSessionRoutes.listIdeasForSessionNotVotedApi
);


hayPeaEye.addApiMethod(
    "/api/sessions/:boardId/:sessionId/criteria", hayPeaEye.GET,
    "Lists criteria for a session (if there are any)",
    {grouping: "Sessions", auth: hayPeaEye.AUTH_OPTIONAL},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "The id of the board you want to create the idea in"},
        {name: "sessionId", type: hayPeaEye.String, required: true, description: "The id of the session"},
        {name: "password", type: hayPeaEye.String, required: false, description: "The password of the session, if there is one"}
    ],
    ideaSessionRoutes.listCriteriaForSessionApi
);

// Guests
hayPeaEye.addApiMethod(
    "/api/sessions/create-guest", hayPeaEye.POST,
    "Creates a guest to use in sessions",
    {grouping: "Sessions", auth: hayPeaEye.AUTH_OPTIONAL},
    [
        {name: "name", type: hayPeaEye.String, required: true, description: "The name of the guest"}
    ],
    ideaSessionRoutes.createGuest
);

hayPeaEye.addApiMethod(
    "/api/sessions/beacons/:beaconId", hayPeaEye.POST,
    "Find a session by a beacon id",
    {grouping: "Sessions", auth: hayPeaEye.AUTH_OPTIONAL},
    [
        {name: "beaconId", type: hayPeaEye.String, required: true, description: "ID of iBeacon for this session"}
    ],
    ideaBoardRoutes.findSessionByBeaconId
);

// Idea Votes (from sessions)
hayPeaEye.addApiMethod(
    "/api/sessions/:boardId/:sessionId/:ideaId/vote", hayPeaEye.POST,
    "Votes on an idea in a session (for the given criteria and options)",
    {grouping: "Voting", auth: hayPeaEye.AUTH_OPTIONAL},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "The id of the board you want to create the idea in"},
        {name: "sessionId", type: hayPeaEye.String, required: true, description: "The id of the session", example: "mysession"},
        {name: "ideaId", type: hayPeaEye.String, required: true, description: "The id of the session", example: "mysession"},
        {name: "password", type: hayPeaEye.String, required: false, description: "The password of the session, if there is one"},
        {name: "guestId", type: hayPeaEye.String, required: false, description: "The ID of the guest"},
        {name: "scores", type: hayPeaEye.Object, required: true, description: "The scoring for the idea against the criteria (array of objects containing the criteria id and the chosen option id for each criteria)"}
    ],
    ideaSessionRoutes.voteForIdeaInSessionApi
);

// Count users voting in board
hayPeaEye.addApiMethod(
    "/api/sessions/:boardId/voters/count", hayPeaEye.POST,
    "Count the number of voters in a board",
    {grouping: "Voting", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "The id of the board to count voters for"}

    ],
    ideaBoardRoutes.numberOfUsersVotingInBoardApi
);


// USERS
hayPeaEye.addApiMethod(
    "/api/check-login", hayPeaEye.GET,
    "Check the user's login status. Returns a user if they are.",
    {grouping: "User", auth: hayPeaEye.AUTH_OPTIONAL},
    [
    ],
    userRoutes.checkUserLoginApi
);

// Get user first and last names from list of user ids
hayPeaEye.addApiMethod(
    "/api/users/names", hayPeaEye.POST,
    "Retrieves a list of users full names given their IDs as an array of strings",
    {grouping: "User", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "usernames", type: hayPeaEye.Array, required: true, description: "Array of usernames"}

    ],
    userRoutes.getUserDetailsFromUsernamesApi
);
hayPeaEye.addApiMethod(
    "/api/signup/check-email/", hayPeaEye.POST,
    "Returns an error if email exists in the db",
    {grouping: "User", auth: hayPeaEye.AUTH_NOT_REQUIRED},
    [
        {name: "email", type: hayPeaEye.String, required: true, description: "Email"}
    ],
    userRoutes.checkEmail
);

// QUALIFICATION
// Qualify idea
hayPeaEye.addApiMethod(
    "/api/idea-boards/:boardId/qualify/:ideaId", hayPeaEye.POST,
    "Qualifies an idea for the logged in user",
    {grouping: "Qualifying", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "Idea board ID"},
        {name: "ideaId", type: hayPeaEye.String, required: true, description: "ID of the Idea to qualify"},
        {name: "criterionId", type: hayPeaEye.String, required: true, description: "ID of the criterion to qualify against"},
        {name: "optionId", type: hayPeaEye.String, required: true, description: "ID of the option you want to set this criterion to"}
    ],
    ideaBoardRoutes.qualifyIdeaApi
);

// LONG POLLING
hayPeaEye.addApiMethod(
    "/api/idea-boards/:boardId/long-poll", hayPeaEye.POST,
    "Long polls for ideas in the given board. Returns a list of ideas either immediately (if they exist at the time of request), or up to 60 seconds later. Times out after 60 seconds.",
    {grouping: "Long Polling", auth: hayPeaEye.AUTH_REQUIRED},
    [
        {name: "boardId", type: hayPeaEye.String, required: true, description: "Idea board ID"},
        {name: "lastIdeaTimestamp", type: hayPeaEye.String, required: false, description: "The timestamp of the last idea your client received. Or empty if none have been received yet."}
    ],
    boardLongPolling.longPollForIdeas
);

app.all("/api/*", function(req, res, next) {
    hayPeaEye.handleRequest(req, res, next);
});


app.get('/landing', routes.landing);

// Login and Signup
app.get('/login', routes.login);
app.get('/logout', routes.logout);
app.post('/login', passport.authenticate('local', {successRedirect: '/login-redirect', failureRedirect: '/login',  failureFlash: true}));
app.get('/login-redirect', loginRedirect);
app.get('/signup', userRoutes.signup);
app.post('/signup/complete', userRoutes.completeSignup);
app.post('/signup/username-check', userRoutes.checkUsername);

// Views
app.get('/boards/:id/votes', ensureAuthenticated, ideaBoardRoutes.viewIdeaBoardVotes);
app.get('/boards/:id/screen', ensureAuthenticated, ideaBoardRoutes.viewIdeaBoardScreen);
//app.get('/me', ensureAuthenticated, meRoutes.meHomePage);

app.post('/me/profile/upload', ensureAuthenticated, meRoutes.profilePicUpload);

// API
//User search
//app.get('/user/find', ensureAuthenticated, userRoutes.findUser);
app.get('/user/:userId/view', ensureAuthenticated, meRoutes.userDetailsApi);
app.post('/me/profile/upload', ensureAuthenticated, userRoutes.profilePicUpload);
app.get('/me/profile/:username', userRoutes.getProfilePic);

// Config + static data
app.post('/api/config/qualification-criteria', ensureAuthenticated, ideaBoardRoutes.defaultQualificationCriteriaApi);


app.get('/', routes.landing);
app.get('/home', ensureAuthenticated, routes.index);

// Idea sessions
app.get('/:boardId', ideaSessionRoutes.viewIdeaBoardSessionHome);
//app.get('/:boardId', ideaBoardRoutes.viewIdeaBoard);
app.post('/guest/:guestId/pic/upload', ideaSessionRoutes.profilePicUpload);
app.post('/guest/:guestId/pic/upload-multipart', ideaSessionRoutes.profilePicUploadUploadMultipart);
app.get('/guest/pic/:username', ideaSessionRoutes.getGuestPic);
app.get('/guest/pic', ideaSessionRoutes.getGuestPic);


var server = app.listen(app.get('port'));
/*var io = require('socket.io').listen(server);

io.sockets.on('connection', function (socket) {
    socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
        console.log(data);
    });
});
*/
/*http.createServer(app).listen(app.get('port'), function(){
    console.log('Idea Funnel started on port ' + app.get('port'));
    console.log('Let the Ideas Begin...');

    var io = require('socket.io').listen(server);

});*/

// Error handling
function logErrors(err, req, res, next) {
    console.log("ERROR");
    next(err);
}

function clientErrorHandler(err, req, res, next) {
    if (err && err.timeout) {
        if (req && req.url && req.url.indexOf("long-poll")) {
            // Long poll has timed out, send some blank data
            res.json(utilities.successResponse([]));
        } else {
            next(err);
        }

    } else {
        console.error(err.stack);

        if (req.xhr) {
            res.send(500, { error: 'A 500 server error occurred' });
        } else {
            next(err);
        }
    }

}

