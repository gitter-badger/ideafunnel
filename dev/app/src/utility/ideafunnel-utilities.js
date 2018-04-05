exports.errorResponse = function(err) {
    if (err === null) {
        return {status: "error", error: err};
    } else {
        return {status: "error", error: err};
    }

};

exports.successResponse = function(data) {
    return {status: "ok", data: data};
};

exports.successOrErrorResponse = function(err, data) {
    if (err) {
        return exports.errorResponse(err);
    } else {
        return exports.successResponse(data);
    }
};

exports.unauthorisedResponse = function() {
    return {status: "error", error: "Not logged in or authorised app"};
};