var ideafunnelApp = angular.module('ideafunnelApp', ["inlineConfirm", "timeago", "ngTouch", "angucomplete", "anguprofile", "LocalStorageModule"])
    .config(['localStorageServiceProvider', function(localStorageServiceProvider){
        localStorageServiceProvider.setPrefix('if');
    }]);


var errorCount = 0;

function handleError(err, responseData) {
    errorCount ++;
    console.log(err);
    console.log(responseData);

    var errDescription = "";

    if (responseData && responseData.error) {
        errDescription = " - " + responseData.error;
    }

    $("body").append('<div id="error' + errorCount + '" class="error-alert slideInRight animated"><i class="icon-alert icon-spaced-right"></i>' + err + errDescription + '</div>');

    setTimeout(function() {
        $("#error" + errorCount).removeClass("slideInRight animated");
        $("#error" + errorCount).addClass("slideOutRight animated");

        $(".error-alert").remove();

    }, 3000);

}

function getTabPage(path, defaultTab) {
    if (path && path.length > 1) {
        return path.substr(1);
    } else {
        return defaultTab;
    }
}

function postWithErrorHandling($http, url, data, errorMsg, callback) {
    $http.post(url, data).
        success(function(responseData, status, headers, config) {
            if (responseData.status && responseData.status === "ok") {
                callback(null, responseData.data);
            } else {
                handleError(errorMsg, responseData);
                callback(errorMsg, null);
            }
        }).
        error(function(data, status, headers, config) {
            handleError(errorMsg, data);
            callback(errorMsg, null);
        });
}

function getWithErrorHandling($http, url, errorMsg, callback) {
    $http.get(url).
        success(function(responseData, status, headers, config) {
            if (responseData.status && responseData.status === "ok") {
                callback(null, responseData.data);
            } else {
                handleError(errorMsg, responseData);
                callback(errorMsg, null);
            }
        }).
        error(function(data, status, headers, config) {
            handleError(errorMsg, data);
            callback(errorMsg, null);
        });
}

function browserSupportsAnimations() {
    var s = document.createElement('p').style;
    return 'transition' in s || 'WebkitTransition' in s || 'MozTransition' in s || 'msTransition' in s || 'OTransition' in s;
}