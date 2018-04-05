var mongoose = require("mongoose"),
    md5 = require("MD5"),
    utilities = require("../utility/ideafunnel-utilities"),
    user = require("../models/user-model"),
    imageMagick = require("imagemagick"),
    fs = require("fs"),
    PROFILE_PIC_PATH = "/ideafunnel/pics/";
//var passport = require("passport");

/*
 * GET users listing.
 */
var User = mongoose.model("User");


var checkUsernameValidity = function(username) {
    if (!username) {
        return {status: false, error: "Username not provided"};
    }

    if (!username.match(/^[a-z0-9_-]{3,16}$/)) {
        var msg = "";
        if (username.length < 3 || username.length > 16) {
            msg = "Username must be between 3 and 16 characters";
        }
        if (username.match(/[A-Z]/)) {
            if (msg.length !== 0) { msg += ", "; }
            msg += "Username must contain lower case letters only";
        }
        return {status: false, error: msg};
    }
    return {status: true, error: null};

};

exports.list = function(req, res) {
    mongoose.model("User").find(function(err, users) {
        res.json(users);
    });
};

exports.signup = function(req, res) {
    var error = req.query.error;
    var user = {firstName: "", lastName: "", email: "", username: ""};

    if (req.query.firstName) {
        user.firstName = req.query.firstName;
    }

    if (req.query.lastName) {
        user.lastName = req.query.lastName;
    }

    if (req.body.email) {
        user.email = req.query.email;
    }

    res.render("signup", {title: 'Sign up', noNav: true, controller: "signup-controller", error: error, user: user});
};

exports.completeSignup = function(req, res) {
    var user = {firstName: req.body.firstName, lastName: req.body.lastName, email: req.body.email, _id: req.body.username, username: req.body.username};
    if ((!user.firstName || user.firstName.length === 0 )|| (!user.lastName || user.lastName.length === 0) || (!user.email || user.email.length === 0) || (!req.body.password || req.body.password.length === 0)) {
        res.render("signup", {title: 'Sign up', noNav: true, controller: "signup-controller", error: "Please fill in all fields", user: user});
    } else {
        var usernameCheck = checkUsernameValidity(req.body.username);
        if (usernameCheck.status === false) {
            res.render("signup", {title: 'Sign up', noNav: true, controller: "signup-controller", error: usernameCheck.error, user: user});
            return;
        }

        // Check if username and email exist in db
        User.find({$or: [{_id: user.username}, {email: user.email}]}, function(err, foundUsers) {
            if (err) {
                res.render("signup", {title: 'Sign up', noNav: true, controller: "signup-controller", error: "Error occurred whilst checking username. Please try again later.", user: user});
                return;
            }
            if (foundUsers) {
                var msg = "";
                foundUsers.forEach(function(foundUser){

                    if (foundUser._id === user._id) {
                        msg = "Username already in use";
                    }
                    if (foundUser.email === user.email) {
                        if (msg.length !== 0) { msg += ", "; }
                        msg += " Email already in use";
                    }
                });

                if (msg && msg.length >0) {
                    res.render("signup", {title: 'Sign up', noNav: true, controller: "signup-controller", error: msg, user: user});
                    return;
                }
            }

            var newUser = new User({
                _id: req.body.username,
                firstName: req.body.firstName,
                surname: req.body.lastName,
                email: req.body.email,
                password: md5(req.body.password)
            });

            newUser.save(function(err) {
                if (err) {
                    console.log(err);
                    res.render("signup", {title: 'Sign up',
                        noNav: true, controller: "signup-controller", firstName: req.body.firstName, lastName: req.body.lastName,
                        email: req.body.email, password: req.body.password, username: req.body.username, error: "Could not setup your account"});
                } else {
                    req.login(newUser, function(err) {
                        if (err) {
                            res.redirect('/login');
                        } else {
                            res.redirect('/home');
                        }

                    });
                }
            });

        });

    }
};

exports.checkEmail = function(req, res) {
    // Check email is valid
    if (req.body.email && req.body.email.length !== 0) {
        User.find({email: req.body.email}, function(err, users) {
            if (err) {
                res.json(utilities.errorResponse("Error finding email"));
            } else if (users && users.length > 0) {
                res.json(utilities.errorResponse("Email already exists"));

            } else {
                res.json(utilities.successResponse("OK"));
            }
        });
    } else {
        res.json(utilities.errorResponse("Email not provided"));
    }
};

exports.checkUsername = function(req, res) {
    var usernameStatus = checkUsernameValidity(req.body.username);

    // Check username is valid
    if (usernameStatus.status) {
        User.find({_id: req.body.username}, function(err, users) {
            if (err) {
                res.json(utilities.errorResponse("Error finding users"));
            } else if (users && users.length > 0) {
                res.json(utilities.errorResponse("Username already exists"));

            } else {
                res.json(utilities.successResponse("OK"));
            }
        });
    } else {
        res.json(utilities.errorResponse(usernameStatus.error));
    }
};

exports.findUser = function(req, res) {
    if (req.query.s && req.query.s !== "") {
        var regExp = new RegExp(req.query.s, 'i');
        User.find({$or: [{firstName: {$regex: regExp}}, {surname: {$regex: regExp}}]}, {firstName: 1, surname: 1, profilePic: 1, email: 1}, function(err, users) {
            if (err || !users || users.length === 0) {
                res.json([]);
            } else {
                // Add in full image path, or empty profile pic if there isn't one

                for (var i = 0; i < users.length; i++) {
                    users[i].profilePic = "/me/profile/" + users[i]._id;
                }

                res.json(users);
            }
        });
    } else {
        res.json([]);
    }
};

/*
 Upload a profile pic
 */
exports.profilePicUpload = function(req, res) {
    // Decode the image
    var dataUrl = req.body.image,
        matches = dataUrl.match(/^data:.+\/(.+);base64,(.*)$/),
        ext = matches[1],
        base64Data = matches[2],
        buffer = new Buffer(base64Data, 'base64'),
        tempFilename = PROFILE_PIC_PATH + req.user._id + "_temp.jpg",
        destinationFilename = req.user._id + ".jpg";

    fs.writeFile(tempFilename, buffer, function (err) {

        if (err) {
            console.log("Error writing file");
            res.json(utilities.errorResponse(err));
        } else {
            imageMagick.crop({
                srcPath: tempFilename,
                dstPath:  PROFILE_PIC_PATH + destinationFilename,
                width: 300,
                height: 300,
                quality: 1,
                gravity: "Center"
            }, function(err, stdout, stderr){
                if (err) {
                    res.json(utilities.errorResponse(err));
                } else {
                    // Save profile pic status to user
                    req.user.profilePic = true;

                    userModel.User.findOneAndUpdate({_id: req.user._id}, {profilePic: destinationFilename}, {$upsert: true}, function(err) {
                        res.json(utilities.successOrErrorResponse(err, destinationFilename));
                    });
                }

            });
        }

    });
};

/*
 Get the profile pic
 */
exports.getProfilePic = function(req, res) {
    fs.exists(PROFILE_PIC_PATH + req.params.username + ".jpg", function(exists) {
        if (exists) {
            res.redirect("/pics/" + req.params.username + ".jpg");
        } else {
            res.redirect("/images/userprofile.png");
        }
    });
};

exports.checkUserLoginApi = function(req, res) {
    if (req.user) {
        res.json(utilities.successResponse(req.user));
    } else {
        res.json(false);
    }
};

exports.getUserDetailsFromUsernamesApi = function(req, res) {
    User.find({_id: {$in: req.body.usernames}}, {}, function(err, users) {
        res.json(utilities.successOrErrorResponse(err, users));
    });

};