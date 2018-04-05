//factory for processing push notifications.
angular.module('ideaservice', [])
    .service('IdeaService', function($rootScope, $http) {

        var CACHE_TIMEOUT = 600000;

        var ideaCache = {};

        var compareArrays = function(array1, array2) {
            if (!array1 && !array2) {
                return true;
            }

            if (!array1 && array2) {
                return false;
            }

            if (!array2 && array1) {
                return false;
            }

            // compare lengths - can save a lot of time
            if (array1.length !== array2.length) {
                return false;
            }

            for (var i = 0, l = array1.length; i < l; i++) {
                // Check if we have nested arrays
                if (array1[i] instanceof Array && array2[i] instanceof Array) {
                    // recurse into the nested arrays
                    if (!array1[i].compare(array2[i])) {
                        return false;
                    }
                }
                else if (array1[i] !== array2[i]) {
                    // Warning - two different object instances will never be equal: {x:20} != {x:20}
                    return false;
                }
            }
            return true;
        };

        this.loadIdeasForBoard = function(boardId, selectedSessions, callback) {
            var now = new Date().getTime();
            var reload = true;

            if (ideaCache[boardId] && ideaCache[boardId].timestamp > now - CACHE_TIMEOUT) {
                var thisBoardCache = ideaCache[boardId];

                var sessionCompare = compareArrays(thisBoardCache.selectedSessions, selectedSessions);

                reload = !sessionCompare;

                if (!reload) {
                    callback(null, thisBoardCache.ideas);
                }
            }

            if (reload) {
                ideaCache[boardId] = null;

                $http.post('/api/idea-boards/' + boardId + '/all', {selectedSessions: selectedSessions}).
                    success(function(responseData, status, headers, config) {
                        if (responseData.status && responseData.status === "ok") {
                            ideaCache[boardId] = {
                                timestamp: new Date().getTime(),
                                ideas: responseData.data,
                                selectedSessions: selectedSessions.slice()
                            };

                            callback(null, responseData.data);
                        } else {
                            callback(responseData, null);
                        }
                    }).
                    error(function(data, status, headers, config) {
                        callback(data);
                    });
            }

        };

        this.loadNewIdeasForBoard = function(boardId, selectedSessions, callback) {
            var currentIdeas = ideaCache[boardId];
            var newIdeas = [];

            if (!currentIdeas) {
                loadIdeasForBoard(boardId, selectedSessions, callback);
            } else {
                // Update now
                if (currentIdeas.ideas && currentIdeas.ideas.length >= 0) {
                    postWithErrorHandling($http, '/api/idea-boards/' + boardId + '/all', {since: currentIdeas.ideas[0].creationDate, selectedSessions: selectedSessions}, "Could not refresh", function(err, newIdeas) {
                        if (!err && newIdeas && newIdeas.length > 0) {
                            for (var i = 0; i < newIdeas.length; i++) {
                                var newIdea = newIdeas[i];
                                newIdea.tempId = newIdea._id;
                                newIdea.pulse = true;

                                var found = false;

                                for (var x = 0; x < currentIdeas.ideas.length; x++) {
                                    if (currentIdeas.ideas[x]._id === newIdea._id) {
                                        found = true;
                                        break;
                                    }
                                }

                                if (!found) {
                                    //setPulseTimeoutForNewIdea(newIdea._id);
                                    newIdeas.unshift(newIdea);
                                    currentIdeas.ideas.unshift(newIdea);
                                    //$scope.addIdeaToHotList(newIdea);
                                }

                            }

                            callback(null, newIdeas);

                            //$scope.setIdeaListForView();
                            //$scope.compileHotList();

                        } else if (err) {
                            callback(err, null);
                        }
                    });
                }
            }

        };

    });