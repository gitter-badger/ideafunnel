//var userModel = require("../models/user-model");

var mongoose = require("mongoose"),
    utilities = require("../utility/ideafunnel-utilities"),
    User = mongoose.model("User"),
    ideaModel = require("../models/idea-model"),
    fs = require("fs"),
    imageMagick = require("imagemagick"),
    PROFILE_PIC_PATH = '/ideafunnel/pics/';

exports.meHomePage = function(req, res) {
    var profilePic = false;

    if (req.user.profilePic) {
        profilePic = true;
    }

    res.render("me/me-home", {title: "Me", section: "me", userId: req.user._id, profilePic: profilePic, fullName: req.user.firstName + " " + req.user.surname});
};

exports.userDetailsApi = function(req, res) {
    User.findOne({_id: req.params.userId
    }, function(err, user) {
        res.json(utilities.successOrErrorResponse(err, user));
    });
};

exports.getUserStats = function(req, res) {
    var countOfIdeas = 0;

    ideaModel.Idea.count({createdBy: req.query.userId}, function(err, count) {
        var countValue = 0;

        if (!err) {
            countValue = count;
        }

        ideaModel.Idea.findOne({createdBy: req.query.userId}, {}, {skip:0, limit:1, sort:{creationDate: -1}}, function(err, latestIdea) {
            var lastIdeaDate = null;

            if (!err && latestIdea) {
                lastIdeaDate = latestIdea.creationDate;
            }

            res.json(utilities.successOrErrorResponse(err, {user: req.query.userId, totalIdeas: countValue, lastIdea: lastIdeaDate}));

        });

    });
};

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

        imageMagick.crop({
            srcPath: tempFilename,
            dstPath:  PROFILE_PIC_PATH + "/" + destinationFilename,
            width: 300,
            height: 300,
            quality: 1,
            gravity: "Center"
        }, function(err, stdout, stderr){
            console.log(err);

            // Save profile pic status to user
            req.user.profilePic = true;

            User.findOneAndUpdate({_id: req.user._id}, {profilePic: destinationFilename}, {$upsert: true}, function(err) {
                res.json(utilities.successOrErrorResponse(err, destinationFilename));
            });

        });

    });
};