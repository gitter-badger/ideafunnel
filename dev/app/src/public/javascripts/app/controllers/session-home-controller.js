ideafunnelApp.controller('SessionHomeController', ['$scope', '$http', '$location', 'localStorageService',
    function($scope, $http, $location, localStorageService) {

        $scope.guest = null;

        $scope.initPage = function(userId, boardId) {
            $scope.userId = userId;
            $scope.boardId = boardId;

            // Load the board
            getWithErrorHandling($http, "/api/" + boardId + "/sessions/list", "Could not load sessions", function(err, board) {
                $scope.sessions = board.sessions;
            });

        };

        $scope.page = "welcome";

        $scope.changePage = function(page) {
            window.location.href = "#/" + page;
        };

        $scope.chooseSession = function(session) {
            if (session.password) {
                $scope.session = session;
                $scope.page = "password";
            } else {
                $scope.session = session;

                if (session.sessionType === 'vote') {
                    window.location.href = "#/vote";
                } else {
                    window.location.href = "#/generate";
                }


            }
        };

        $scope.loadUser = function() {
            $http.get('/api/user/' + $scope.username + '/view', {}).
                success(function(responseData) {
                    if (responseData.status && responseData.status === "ok") {
                        $scope.user = responseData.data;
                    } else {
                        handleError("Could not load user", responseData);
                    }

                    $scope.loadingUser = false;

                }).
                error(function(data) {
                    handleError("An error occurred loading your user details", data);
                    $scope.loadingUser = false;
                });
        };

        $scope.guestNameEntered = function() {
            if (!$scope.guestName || $scope.guestName.trim() === "") {
                alert("Please enter a name");
            } else {
                // Create the guest login details
                $scope.creatingGuest = true;

                postWithErrorHandling($http, "/api/sessions/create-guest", {name: $scope.guestName}, "Could not create guest", function(err, newUser) {
                    if (!err) {
                        $scope.guest = newUser;
                        localStorageService.add('guestId', newUser._id);
                        localStorageService.add('guestName', newUser.name);
                        window.location.href = "#/guest-pic";
                    }
                });
            }
        };

        $scope.passwordEntered = function() {
            getWithErrorHandling($http, "/api/sessions/" + $scope.boardId + "/" + $scope.session._id + "/check-password?sessionPassword=" + $scope.sessionPassword, "Invalid password", function(err) {
                if (!err) {
                    window.location.href = "#/generate";
                }
            });
        };

        $scope.voteForIdea = function() {
            if ($scope.currentIdea !== null) {
                $scope.loadingVotes = true;

                var scoresObj = [];

                // Get all the values
                for (var i = 0; i < $scope.votingCriteria.length; i++) {

                    if ($("#criterion_" + $scope.votingCriteria[i]._id).val() !== "") {
                        scoresObj.push({
                            criteriaId: $scope.votingCriteria[i]._id,
                            optionId: $("#criterion_" + $scope.votingCriteria[i]._id).val()
                        });
                    }

                }

                $scope.currentIdeaIndex ++;

                postWithErrorHandling($http, "/api/sessions/" + $scope.boardId + "/" + $scope.session._id + "/" + $scope.currentIdea._id + "/vote", {scores: scoresObj, guestId: $scope.guest._id}, "Could not post votes", function(err, savedObj) {
                    if ($scope.currentIdeaIndex < $scope.votingIdeas.length) {
                        $scope.currentIdea = $scope.votingIdeas[$scope.currentIdeaIndex];

                        // Clear out the currently selected votes
                        for (var i = 0; i < $scope.votingCriteria.length; i++) {
                            $("#criterion_" + $scope.votingCriteria[i]._id).val("");
                        }


                        $scope.loadingVotes = false;
                    } else {
                        $scope.loadingVotes = false;
                        $scope.finishedVoting = true;
                    }

                });
            }
        };

        $scope.shuffleArray = function(array) {
            if (!array || array.length === 0) {
                return array;
            }

            for (var i = array.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
            return array;
        };

        // Setup voting
        $scope.setupVoting = function() {
            $scope.loadingVotes = true;

            // Load criteria for board
            getWithErrorHandling($http, "/api/sessions/" + $scope.boardId + "/" + $scope.session._id + "/criteria", "Could not load criteria", function(err, criteria) {
                $scope.votingCriteria = criteria;

                if (!err) {
                    getWithErrorHandling($http, "/api/sessions/" + $scope.boardId + "/" + $scope.session._id + "/ideas-unvoted?guestId=" + $scope.guest._id, "Could not load ideas", function(err, ideas) {
                        if (!err) {
                            $scope.votingIdeas = $scope.shuffleArray(ideas);


                            if ($scope.votingIdeas.length > 0) {
                                $scope.currentIdeaIndex = 0;
                                $scope.currentIdea = $scope.votingIdeas[$scope.currentIdeaIndex];

                                setTimeout(function() {
                                    window.scrollTo(0, 1);
                                }, 100);

                                $("#votingScreen").removeClass("animated fadeIn");
                                $("#votingScreen").addClass("animated fadeIn");


                            } else {
                                $scope.finishedVoting = true;
                            }

                            $scope.loadingVotes = false;
                        }

                    });
                }

            });

        };

        // Page tab changer
        $scope.$watch(function() {
            return $location.path();
        }, function() {


            if (localStorageService.get('guestId')) {
                $scope.guest = {
                    _id: localStorageService.get('guestId'),
                    name: localStorageService.get('guestName')
                };
            }

            $scope.page = getTabPage($location.path(), "welcome");


            if ($scope.guest && $scope.guest._id && $scope.page !== "choose" && $scope.page !== "generate" && $scope.page !== "vote") {
                $location.path("/choose");
            }

            if ($scope.page !== "generate") {
                document.ontouchmove = function(event){

                };
            }

            if ($scope.page === "guest-pic" && !$scope.guest) {
                $location.path("/guest");
            } else if ($scope.page === "generate") {
                if ($scope.session) {
                    document.ontouchmove = function(event){
                        event.preventDefault();
                    };

                    var hammer = Hammer(document.getElementById("swipeArea"));

                    // the whole area
                    hammer.on("swipeup", function(ev) {
                        if ($scope.cardContent && $scope.cardContent !== "") {
                            $("#bigCard").addClass("animated slideOutUp");

                            $scope.previousCardContent = $scope.cardContent;

                            var postObject = {guest: $scope.guest, description: $scope.cardContent};

                            if ($scope.sessionPassword) {
                                postObject.password = $scope.sessionPassword;
                            }

                            postWithErrorHandling($http, "/api/sessions/" + $scope.boardId + "/" + $scope.session._id + "/create-idea", postObject, "Could not post idea", function(err) {
                                if (err) {
                                    $scope.cardContent = $scope.previousCardContent;
                                }
                            });

                            setTimeout(function() {
                                $("#bigCard").removeClass("animated slideOutUp");
                                $scope.cardContent = "";
                                $scope.$apply();
                            }, 700);
                        }

                    });
                } else {
                    $location.path("/choose");
                }

            } else if ($scope.page === "vote") {
                if ($scope.session) {
                    // Start loading votes
                    $scope.setupVoting();

                } else {
                    $location.path("/choose");
                }
            }

        });


        setTimeout(function() {
            window.scrollTo(0, 1);
        }, 1000);


    }
]);