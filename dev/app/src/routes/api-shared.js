var mongoose = require("mongoose"),
    installedAppModel = require("../models/installed-app-model"),
    userModel = require("../models/user-model");

exports.getUserFromRequestOrAppToken = function(req, callback) {
    if (req.body.appToken && req.body.userKey) {
        // Load the token and user key to see if we have a match
        installedAppModel.InstalledApp.findOne({appId: req.body.appToken, userKey: req.body.userKey}, function(err, installedApp) {
            if (err || !installedApp) {
                callback(null);
            } else {
                userModel.User.findOne({_id: installedApp.userId}, function(err, foundUser) {
                    if (err || !installedApp) {
                        callback(null);
                    } else {
                        callback(foundUser);
                    }
                });
            }
        });

    } else if (req.user) {
        // This is the current user
        callback(req.user);
    } else {
        callback(null);
    }
};