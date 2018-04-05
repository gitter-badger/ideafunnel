var mongoose = require('mongoose');

exports.SESSION_BEACON_COUNTER = "beacon";

exports.AutoIncCounter = mongoose.model("AutoIncCounter", {
    _id: String,
    seq: Number
});

exports.getNextSequence = function (name, callback) {
    exports.AutoIncCounter.findOneAndUpdate({_id: name}, {$inc: {seq: 1}}, {upsert: true}, function (err, updatedCounter) {
        callback(err, updatedCounter.seq);
    });

};