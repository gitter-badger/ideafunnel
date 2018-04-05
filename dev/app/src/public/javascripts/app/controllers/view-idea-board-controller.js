ideafunnelMainApp.controller('ViewIdeaBoardController', ['$scope', '$http', '$location', 'localStorageService', '$routeParams', '$interval', '$timeout', 'IdeaService', '$rootScope',
    function ViewIdeaBoardController($scope, $http, $location, localStorageService, $routeParams, $interval, $timeout, IdeaService, $rootScope) {

        $scope.colours = ["#E53B3A", "#60A0D2", "#595757", "#554D97", "#E7413D", "#6AC15C"];

        $scope.globalSearch = "";

        var CACHE_TIMEOUT = 600000;

        if (!$rootScope.ideaCache) {
            $rootScope.ideaCache = {};
        }

        $scope.inlineSearch = {};
        $scope.maxCharacters = 160;
        $scope.temporaryId = 0;
        $scope.firstLoad = false;
        $scope.hotTopicsFilter = [];
        $scope.filters = {hotTopics: []};
        $scope.accessRights = "open";

        $scope.selectedHotTopics = [];
        $scope.selectedSessions = [];
        $scope.sortBy = ['creationDate', 'qualificationScore'];


        $("body").scrollTop(0);

        $scope.hotTopicsMap = {};

        $scope.selectSession = function(session, event) {
            event.stopPropagation();
            event.preventDefault();

            var found = false;

            for (var i = 0; i < $scope.selectedSessions.length; i++) {
                if ($scope.selectedSessions[i] === session._id) {
                    $scope.selectedSessions.splice(i, 1);
                    found = true;
                    break;
                }
            }

            if (!found) {
                $scope.selectedSessions.push(session._id);
            }

            localStorageService.add("selectedSessions", {boardId: $scope.ideaBoardId, sessions: $scope.selectedSessions});

            $scope.loadIdeas();

        };

        $scope.unselectSession = function(session) {
            for (var i = 0; i < $scope.selectedSessions.length; i++) {
                if ($scope.selectedSessions[i] === session._id) {
                    $scope.selectedSessions.splice(i, 1);
                    break;
                }
            }
        };

        $scope.sessionIsSelected = function(session) {
            if ($scope.selectedSessions.length === 0) {
                return false;
            } else {
                for (var i = 0; i < $scope.selectedSessions.length; i++) {
                    if ($scope.selectedSessions[i] === session._id) {
                        return true;
                    }
                }

                return false;
            }
        };

        $scope.setSortBy = function(firstField) {
            if (firstField === 'creationDate') {
                $scope.sortBy = ['creationDate', 'qualificationScore'];
            } else {
                $scope.sortBy = ['qualificationScore', 'creationDate'];
            }

            localStorageService.add("sortBy", $scope.sortBy);
        };

        $scope.$on('hotTopicListChanged', function(event, payload) {
            $scope.hotTopicsFilter = payload;
            $scope.filters.hotTopics = payload;
        });


        $scope.ideaBoardId = $routeParams.boardId;

        // Check to see if there are hot topic filters already applied
        if (localStorageService.get("hotTopics")) {
            var hotTopics = localStorageService.get("hotTopics");

            if (hotTopics.boardId === $scope.ideaBoardId) {
                $scope.filters.hotTopics = hotTopics.selectedTopics;
            }
        }

        if (localStorageService.get("sortBy")) {
            $scope.sortBy = localStorageService.get("sortBy");
        }

        if (localStorageService.get("selectedSessions")) {
            var tempSelectedSessions = localStorageService.get("selectedSessions");

            if (tempSelectedSessions.boardId === $scope.ideaBoardId) {
                $scope.selectedSessions = tempSelectedSessions.sessions;
            }
        }


        $interval.cancel($scope.refreshTimer);

        $scope.getSessionColour = function(idea) {
            if (idea.session && $scope.board.sessions && $scope.board.sessions.length > 0) {

                for (var i = 0; i < $scope.board.sessions.length; i++) {
                    if ($scope.board.sessions[i]._id === idea.session) {
                        return $scope.colours[i];
                    }
                }
            } else {
                return "";
            }
        };

        // Creates a list of idea IDs ready to be used by the viewer
        $scope.setIdeaListForView = function() {
            var ideaIds = [];

            if ($scope.ideas && $scope.ideas.length > 0) {
                for (var i = 0; i < $scope.ideas.length; i++) {
                    ideaIds.push($scope.ideas[i]._id);
                }

                localStorageService.add("ideaList", ideaIds);
            }

        };

        $scope.firstLoadTimer = $timeout(function() {
            if (!$scope.ideas || $scope.ideas.length === 0) {
                $scope.firstLoad = true;
            }
        }, 500);

        $scope.addIdeaToHotList = function(idea) {
            if (idea.importantWords) {
                for (var w = 0; w < idea.importantWords.length; w++) {
                    var word = idea.importantWords[w];

                    if (!$scope.hotTopicsMap[word.stemmed]) {
                        // Addding afresh
                        $scope.hotTopicsMap[word.stemmed] = {
                            stemmed: word.stemmed,
                            originals: [word.original],
                            count: 1
                        };
                    } else {
                        // We are updating the count
                        $scope.hotTopicsMap[word.stemmed].count ++;
                        $scope.hotTopicsMap[word.stemmed].originals.push(word.original);
                    }

                }

                $scope.generateRankedHotList();
            }

        };

        $scope.generateRankedHotList = function() {
            var hotTopicsRanked = [];

            // Lets add all of the results to the array
            for (var key in $scope.hotTopicsMap) {
                hotTopicsRanked.push($scope.hotTopicsMap[key]);
            }

            $scope.hotList = hotTopicsRanked;

            //$scope.$emit('hotList', hotTopicsRanked);
        };

        $scope.compileHotList = function() {
            // Loop through all ideas and compile the hot list of topics

            $scope.hotTopicsMap = {};

            for (var i = 0; i < $scope.ideas.length; i++) {
                var thisIdea = $scope.ideas[i];

                if (thisIdea.importantWords && thisIdea.importantWords.length > 0) {
                    for (var w = 0; w < thisIdea.importantWords.length; w++) {
                        var word = thisIdea.importantWords[w];

                        if (!$scope.hotTopicsMap[word.stemmed]) {
                            // Addding afresh
                            $scope.hotTopicsMap[word.stemmed] = {
                                stemmed: word.stemmed,
                                originals: [word.original],
                                count: 1
                            };
                        } else {
                            // We are updating the count
                            $scope.hotTopicsMap[word.stemmed].count ++;
                            $scope.hotTopicsMap[word.stemmed].originals.push(word.original);
                        }

                    }
                }

            }

            $scope.generateRankedHotList();
        };

        $scope.processNewIdeas = function() {
            $scope.setIdeaListForView();

            // Did we just come from an idea?
            if (localStorageService.get("lastBoardId") && localStorageService.get("lastBoardId") === $scope.ideaBoardId) {
                setTimeout(function() {
                    $("body").scrollTop(localStorageService.get("lastIdeaScrollPos"));
                    localStorageService.remove("lastBoardId");
                    localStorageService.remove("lastIdeaScrollPos");

                }, 0);
            }

            /*$scope.refreshTimer = $interval(function() {
                $scope.loadNewIdeas();
            }, 4000);*/

            $scope.longPollForIdeas();

        };

        $scope.loadIdeas = function() {
            $scope.loadingIdeas = true;

            var now = new Date().getTime();
            var reload = true;

            if ($rootScope.ideaCache[$scope.ideaBoardId] && $rootScope.ideaCache[$scope.ideaBoardId].timestamp > now - CACHE_TIMEOUT) {
                var thisBoardCache = $rootScope.ideaCache[$scope.ideaBoardId];

                var sessionCompare = $scope.compareArrays(thisBoardCache.selectedSessions, $scope.selectedSessions);
                reload = !sessionCompare;

                if (!reload) {
                    $scope.ideas = thisBoardCache.ideas;
                    $scope.processNewIdeas();
                    $scope.loadingIdeas = false;
                    $timeout.cancel($scope.firstLoadTimer);
                    $scope.firstLoad = false;
                    $scope.compileHotList();
                    $scope.longPollForIdeas();
                }
            }

            if (reload) {
                $http.post('/api/idea-boards/' + $scope.ideaBoardId + '/all', {selectedSessions: $scope.selectedSessions}).
                    success(function(responseData) {
                        if (responseData.status && responseData.status === "ok") {
                            $scope.ideas = responseData.data;

                            $scope.setIdeaListForView();

                            // Did we just come from an idea?
                            $scope.processNewIdeas();

                            $rootScope.ideaCache[$scope.ideaBoardId] = {
                                timestamp: new Date().getTime(),
                                ideas: responseData.data,
                                selectedSessions: $scope.selectedSessions.slice()
                            };


                        } else {
                            handleError("Could not load ideas", responseData);
                        }

                        $scope.loadingIdeas = false;
                        $timeout.cancel($scope.firstLoadTimer);
                        $scope.firstLoad = false;
                        $scope.compileHotList();

                    }).
                    error(function(data) {
                        handleError("An error occurred loading ideas", data);
                        $scope.loadingIdeas = false;
                        $scope.firstLoad = false;
                        $timeout.cancel($scope.firstLoadTimer);
                    });
            }

        };

        $scope.saveBoardAccessRights = function() {
            var openAccess = false;

            if ($scope.accessRights === "open" || $scope.accessRights === "password") {
                openAccess = true;

                if ($scope.accessRights === "open") {
                    $scope.board.openAccessPassword = "";
                }

            } else {
                openAccess = false;
            }

            postWithErrorHandling($http, "/api/idea-boards/" + $scope.board._id + "/update/access", {openAccess: openAccess, openAccessPassword: $scope.board.openAccessPassword}, "Could not update board access", function(err, updatedBoard) {

                if (!err) {
                    $scope.board = updatedBoard;
                    $("#accessModal").modal('hide');
                }
            });


        };

        $scope.addNewCard = function() {
            $("#ideaEntryCard").html("");

            $scope.charactersLeft = $scope.maxCharacters;
            $scope.addingNew = true;

            setTimeout(function() {
                $("#ideaEntryCard").focus();
            }, 100);

        };

        $scope.cancelNewCard = function() {
            $scope.addingNew = false;
        };

        $scope.clearFilters = function() {
            $scope.filters = {};
        };

        $scope.createNewIdea = function() {
            var newIdeaDescription = $('#ideaEntryCard').text();
            $scope.searchField = "";

            if (newIdeaDescription && newIdeaDescription.trim() !== "") {
                // Increment the temporary ID
                $scope.temporaryId ++;

                // Add the card to the ideas list before persisting (makes for a better UI)
                var newIdea = {
                    description: newIdeaDescription,
                    _id: $scope.temporaryId,
                    createdBy: $scope.username,
                    pulse: true,
                    tempId: $scope.temporaryId
                };

                var tempId = $scope.temporaryId;

                setPulseTimeoutForNewIdea(tempId);

                $scope.inlineSearch.description = '';

                $scope.clearFilters();

                $scope.ideas.unshift(newIdea);
                $scope.showCreateNew = false;


                $http.post('/api/idea-boards/' + $scope.ideaBoardId + '/create', {description: newIdeaDescription}).
                    success(function(responseData, status, headers, config) {
                        if (responseData.status && responseData.status === "ok") {
                            // Update the Idea ID
                            for (var i = 0; i < $scope.ideas.length; i++) {
                                if ($scope.ideas[i].tempId && $scope.ideas[i].tempId === tempId) {
                                    $scope.ideas[i]._id = responseData.data._id;
                                    $scope.ideas[i].importantWords = responseData.data.importantWords;
                                    $scope.addIdeaToHotList($scope.ideas[i]);
                                }
                            }

                        } else {
                            handleError("Could not create idea", responseData);
                        }

                    }).
                    error(function(data) {
                        handleError("An error occurred loading ideas", data);
                    });
            } else {
                $scope.showCreateNew = false;
                $scope.$apply();
            }

        };

        var setPulseTimeoutForNewIdea = function(tempId) {
            setTimeout(function() {
                for (var i = 0; i < $scope.ideas.length; i++) {
                    if ($scope.ideas[i].tempId === tempId) {
                        $scope.ideas[i].pulse = false;
                        break;
                    }
                }

            }, 1000);
        };

        $("#ideaEntryCard").on('keyup', function(event) {
            if (event.keyCode === 13) {
                // return pressed - we are trying to save a new idea
                var totalCount = $scope.maxCharacters - $("#ideaEntryCard").text().length;

                if (totalCount >= 0) {
                    event.stopPropagation();
                    event.preventDefault();
                    $scope.addingNew = false;
                    $scope.createNewIdea();
                } else {
                    event.stopPropagation();
                    event.preventDefault();
                }

            } else if (event.keyCode === 27) {
                $scope.addingNew = false;
                $scope.$apply();
                event.stopPropagation();
                event.preventDefault();
            } else {
                $scope.charactersLeft = $scope.maxCharacters - $("#ideaEntryCard").text().length;
                $scope.$apply();
                event.stopPropagation();
                event.preventDefault();
            }
        });

        $("body").on('keydown', function(event) {
            if (!$scope.addingNew && $("#accessModal").css("display") === "none") {
                if (!event.metaKey) {
                    if (event.keyCode === 8) {
                        // backspace
                        if ($scope.globalSearch.length > 0) {
                            $scope.globalSearch = $scope.globalSearch.substr(0, $scope.globalSearch.length - 1);
                        }

                        $scope.$apply();
                        event.preventDefault();
                        event.stopPropagation();

                    } else if (event.keyCode === 32) {
                        // Spacebar
                        $scope.globalSearch = $scope.globalSearch + " ";
                        $scope.$apply();
                        event.preventDefault();
                        event.stopPropagation();

                    } else if (event.keyCode >= 48) {
                        $scope.globalSearch = $scope.globalSearch + String.fromCharCode(event.keyCode);
                        $scope.$apply();
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }

                localStorageService.add("globalBoardSearch", {boardId: $scope.board._id, searchStr: $scope.globalSearch});

            }

        });

        $scope.selectIdea = function(idea) {
            localStorageService.add("lastBoardId", $scope.ideaBoardId);
            localStorageService.add("lastIdeaScrollPos", $("body").scrollTop());

            $location.path("/boards/" + $scope.ideaBoardId + "/" + idea._id);
        };

        $scope.lastIdeaTimestamp = new Date().getTime();


        $scope.longPollForIdeas = function() {

            $http.get('/api/idea-boards/' + $scope.ideaBoardId + '/long-poll?lastIdeaTimestamp=' + $scope.lastIdeaTimestamp).
                success(function(responseData) {
                    if (responseData.status && responseData.status === "ok") {
                        if (responseData.data && responseData.data.length > 0) {
                            $scope.lastIdeaTimestamp = new Date(responseData.data[responseData.data.length - 1].creationDate).getTime();

                            var newIdeas = responseData.data;

                            for (var i = 0; i < newIdeas.length; i++) {
                                var newIdea = newIdeas[i];
                                newIdea.tempId = newIdea._id;
                                newIdea.pulse = true;

                                var found = false;

                                for (var x = 0; x < $scope.ideas.length; x++) {
                                    if ($scope.ideas[x]._id === newIdea._id) {
                                        found = true;
                                    }
                                }

                                if (!found) {
                                    setPulseTimeoutForNewIdea(newIdea._id);

                                    if ($rootScope.ideaCache[$scope.ideaBoardId]) {
                                        $rootScope.ideaCache[$scope.ideaBoardId].ideas.unshift(newIdea);
                                    }

                                    $scope.addIdeaToHotList(newIdea);
                                }

                            }

                            $scope.setIdeaListForView();
                            $scope.compileHotList();

                        }

                    }

                    $scope.longPollForIdeas();

                }).
                error(function(data, status) {
                    if (status && (status !== 401 && status !== 0)) {
                        $scope.longPollForIdeas();
                    }

                });
        };

        $scope.loadNewIdeas = function() {

            if ($scope.ideas.length && $scope.ideas.length >= 0) {
                postWithErrorHandling($http, '/api/idea-boards/' + $scope.ideaBoardId + '/all', {since: $scope.ideas[0].creationDate, selectedSessions: $scope.selectedSessions}, "Could not refresh", function(err, newIdeas) {
                    if (!err && newIdeas && newIdeas.length > 0) {
                        for (var i = 0; i < newIdeas.length; i++) {
                            var newIdea = newIdeas[i];
                            newIdea.tempId = newIdea._id;
                            newIdea.pulse = true;

                            var found = false;

                            for (var x = 0; x < $scope.ideas.length; x++) {
                                if ($scope.ideas[x]._id === newIdea._id) {
                                    found = true;
                                }
                            }

                            if (!found) {
                                setPulseTimeoutForNewIdea(newIdea._id);

                                if ($rootScope.ideaCache[$scope.ideaBoardId]) {
                                    $rootScope.ideaCache[$scope.ideaBoardId].ideas.unshift(newIdea);
                                }

                                $scope.addIdeaToHotList(newIdea);
                            }

                        }

                        $scope.setIdeaListForView();
                        $scope.compileHotList();

                    } else if (err) {
                        if ($scope.refreshTimer) {
                            $interval.cancel($scope.refreshTimer);

                        }
                    }
                });
            }
        };

        $scope.getBackgroundImageForCard = function(card)  {
            if (card && card.hasImage) {
                return "background-image: url('/card_images/" + card._id + ".jpg'); background-size: cover; background-position: center;";
            } else {
                return "";
            }
        };

        $scope.refreshTimer = null;

        // Begin by loading the board
        getWithErrorHandling($http, "/api/idea-boards/view/" + $routeParams.boardId, "Could not load board", function(err, board) {
            $scope.board = board;

            $scope.adminOfBoard = false;

            for (var i = 0; i < $scope.board.members.length; i++) {
                if ($scope.board.members[i].userId === username) {
                    if ($scope.board.members[i].admin) {
                        $scope.adminOfBoard = true;
                    }

                    break;
                }
            }

            // Check for any previously selected hot topics
            if (localStorageService.get("hotTopics")) {
                var hotTopics = localStorageService.get("hotTopics");

                if (hotTopics.boardId === $scope.board._id) {
                    $scope.selectedHotTopics = hotTopics.selectedTopics;
                }
            }

            if (localStorageService.get("globalBoardSearch")) {
                var savedSearch = localStorageService.get("globalBoardSearch");

                if (savedSearch.boardId === $scope.board._id) {
                    $scope.globalSearch = savedSearch.searchStr;
                }
            }

            // Generate QR Code
            var largeQrCode = new QRCode("largeQrCode", {
                text: "ideafunnel.io/" + $scope.board._id,
                width: 350,
                height: 350,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });

            // Figure out what the access rights are


            if ($scope.board.openAccess) {
                if ($scope.board.openAccessPassword && $scope.board.openAccessPassword !== "") {
                    $scope.accessRights = "password";
                } else {
                    $scope.accessRights = "open";
                }
            } else {
                $scope.accessRights = "private";
            }


            $scope.loadIdeas();
        });

        $scope.showQrCode = function() {
            $("#qrModal").modal(true);
        };

        $scope.showAccessModal = function() {
            $("#accessModal").modal(true);
        };

        $scope.clearGlobalSearch = function() {
            $scope.globalSearch = '';
            localStorageService.remove("globalBoardSearch");
        };

        $('.no-close-dropdown').click(function(e) {
            e.stopPropagation();
        });



        $scope.selectHotTopic = function(hotTopic, event) {
            event.preventDefault();
            event.stopPropagation();

            // if this is already selected, deselect
            var found = false;

            for (var i = 0; i < $scope.selectedHotTopics.length; i++) {
                if ($scope.selectedHotTopics[i] === hotTopic.stemmed) {
                    $scope.selectedHotTopics.splice(i, 1);
                    found = true;
                    break;
                }
            }

            if (!found) {
                $scope.selectedHotTopics.push(hotTopic.stemmed);
            }

            $("body").scrollTop(0);

            $scope.$broadcast('hotTopicListChanged', $scope.selectedHotTopics);
            localStorageService.add("hotTopics", {boardId: $scope.board._id, selectedTopics: $scope.selectedHotTopics});

        };

        $scope.getPercentage = function(num) {
            if (!num || num === 0) {
                return "0%";
            } else {
                return Math.round(num * 100) + "%";
            }
        };


        $scope.checkIfTopicSelected = function(hotTopic) {
            for (var i = 0; i < $scope.selectedHotTopics.length; i++) {
                if ($scope.selectedHotTopics[i] === hotTopic.stemmed) {
                    return true;
                }
            }

            return false;
        };


        $scope.$on('$routeChangeStart', function(next, current){
            $interval.cancel($scope.refreshTimer);
        });

        $scope.$on("$destroy", function(){
            $interval.cancel($scope.refreshTimer);

            $("body").off('keydown');

        });


        $scope.compareArrays = function(array1, array2) {
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



    }
]);