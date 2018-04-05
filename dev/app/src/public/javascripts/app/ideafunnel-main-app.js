var ideafunnelMainApp = angular.module('ideafunnelMainApp', ["ngRoute", "inlineConfirm", "timeago", "ngTouch", "angucomplete", "anguprofile", "LocalStorageModule", "ideaservice"])
    .config(['localStorageServiceProvider', function(localStorageServiceProvider){
        localStorageServiceProvider.setPrefix('if');
    }]);


ideafunnelMainApp
    .filter('ideas', function () {
        return function (input, filterObj) {
            if (input) {
                var returnArr = [];
                input.forEach(function(item) {
                    var canPush = true;

                    if (filterObj.hotTopics && filterObj.hotTopics.length ) {
                        if (item.importantWords && item.importantWords.length > 0) {
                            var matchesFilter = false;

                            for (var i = 0; i < item.importantWords.length; i++) {
                                for (var h = 0; h < filterObj.hotTopics.length; h++) {
                                    if (filterObj.hotTopics[h] === item.importantWords[i].stemmed) {
                                        matchesFilter = true;
                                        break;
                                    }
                                }

                                if (matchesFilter) {
                                    break;
                                }
                            }

                            if (!matchesFilter) {
                                canPush = false;
                            }
                        } else {
                            // We have hot topics to match, but this card doesn't have any hot topics
                            canPush = false;
                        }
                    }

                    if (canPush) {
                        returnArr.push(item);
                    }



                });

                return returnArr;
            }
        };
    });


// Routing
ideafunnelMainApp.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.
            //when('/', {
            //    templateUrl: '/javascripts/app/partials/home.html',
            //    controller: 'HomeController'
            //}).
            when('/', {
                redirectTo: '/boards'
            }).
            when('/boards', {
                templateUrl: '/javascripts/app/partials/idea-boards.html',
                controller: 'IdeaBoardsController'
            }).
            when('/boards/create', {
                templateUrl: '/javascripts/app/partials/create-idea-board.html',
                controller: 'CreateIdeaBoardController'
            }).
            when('/boards/:boardId', {
                templateUrl: '/javascripts/app/partials/view-idea-board.html',
                controller: 'ViewIdeaBoardController'
            }).
            when('/boards/:boardId/sessions/create', {
                templateUrl: '/javascripts/app/partials/create-session.html',
                controller: 'CreateSessionController'
            }).
            when('/boards/:boardId/sessions', {
                templateUrl: '/javascripts/app/partials/session-manage.html',
                controller: 'SessionManagementController'
            }).
            when('/boards/:boardId/members', {
                templateUrl: '/javascripts/app/partials/board-members.html',
                controller: 'BoardMembersController'
            }).
            when('/boards/:boardId/criteria', {
                templateUrl: '/javascripts/app/partials/qualification-criteria.html',
                controller: 'QualificationCriteriaController'
            }).
            when('/boards/:boardId/:ideaId', {
                templateUrl: '/javascripts/app/partials/view-idea.html',
                controller: 'ViewIdeaController'
            }).
            when('/@/:userId', {
                templateUrl: '/javascripts/app/partials/me.html',
                controller: 'MeController'
            }).
            when('/me', {
                templateUrl: '/javascripts/app/partials/me.html',
                controller: 'MeController'
            }).
            otherwise({
                redirectTo: '/'
            });
    }]);

var errorCount = 0;


var DEFAULT_COLOURS = ["#E53B3A", "#60A0D2", "#595757", "#6AC15C", "#554D97", "#E7413D"];

function handleError(err, responseData) {
    errorCount ++;
    console.log(err);
    console.log(responseData);

    var errDescription = "";

    if (responseData && responseData.error) {
        if (typeof responseData.error === 'string') {
            errDescription = " - " + responseData.error;
        } else if (responseData.error.message) {
            errDescription = " - " + responseData.error.message;
        }

    }

    $("body").append('<div id="error' + errorCount + '" class="error-alert bounceInRight animated"><i class="icon-alert icon-spaced-right"></i>' + err + errDescription + '</div>');

    setTimeout(function() {
        $("#error" + errorCount).removeClass("slideInRight animated");
        $("#error" + errorCount).addClass("slideOutRight animated");

        $(".error-alert").remove();

    }, 4000);

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

var username = "";

function checkLogin() { //TODO Test this
//    $.get( "/api/check-login", function(data) {
//        username = data.data._id;
//    });
    username = userId;
}

checkLogin();

function browserSupportsAnimations() {
    var s = document.createElement('p').style;
    return 'transition' in s || 'WebkitTransition' in s || 'MozTransition' in s || 'msTransition' in s || 'OTransition' in s;
}