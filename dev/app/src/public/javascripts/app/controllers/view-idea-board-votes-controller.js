ideafunnelApp.controller('ViewIdeaBoardVotesController', ['$scope', '$http', '$location',
    function($scope, $http) {

        var POSITION_PAUSE = 2000;
        var NEXT_CRITERIA_PAUSE = 5000;
        var HEADING_PAUSE = 500;
        var FADE_OUT_PAUSE = 4000;

        $scope.criteria = [];
        $scope.ideas = [];
        $scope.rankings = [];
        $scope.showNow = [false, false, false];
        $scope.currentCriteriaIndex = 0;

        $scope.initIdeaBoard = function(id, username) {
            $scope.ideaBoardId = id;
            $scope.username = username;


            getWithErrorHandling($http, '/api/idea-boards/view/' + id, "Could not retrieve board", function (err, board) {
                $scope.ideaBoard = board;
                $scope.criteria = board.criteria;

                // Load all ideas for the board
                getWithErrorHandling($http, '/api/idea-boards/' + id + "/all", "Could not load ideas", function(err, ideas) {
                    $scope.ideas = ideas;
                    $scope.moveToCriteria($scope.criteria[0]);
                });


            });
        };

        $scope.showNextPosition = function() {
            $scope.showNow[$scope.currentPosition] = true;
            $scope.$apply();

            $scope.currentPosition --;

            if ($scope.currentPosition >= 0) {
                setTimeout(function() {
                    $scope.showNextPosition();
                }, POSITION_PAUSE);
            } else {
                // Move to next criteria
                $scope.currentCriteriaIndex ++;

                if ($scope.currentCriteriaIndex >= $scope.criteria.length) {
                    $scope.currentCriteriaIndex = 0;
                }

                setTimeout(function() {
                    $scope.moveToCriteria($scope.criteria[$scope.currentCriteriaIndex]);
                }, NEXT_CRITERIA_PAUSE);

                setTimeout(function() {
                    $("#mainArea").addClass("animated fadeOut");
                }, FADE_OUT_PAUSE);

            }

        };

        $scope.moveToCriteria = function(criteria) {
            $("#mainHeading").removeClass("animated slideInDown");
            $("#mainHeading").hide();

            setTimeout(function() {
                $("#mainHeading").show();
                $("#mainHeading").addClass("animated slideInDown");
                $("#mainArea").removeClass("animated fadeOut");
            }, HEADING_PAUSE);



            getWithErrorHandling($http, "/api/idea-boards/" + $scope.ideaBoardId + "/votes/criteria/" + criteria._id, "Could not retrieve criteria scores", function(err, scores) {
                $scope.selectedCriterion = criteria;
                $scope.rankings = [];
                $scope.showNow = [false, false, false];

                if (scores) {
                    var results = scores.results;

                    for (var i = 0; i < results.length && i < 3; i++) {
                        // Loop through ideas to find the one to display
                        for (var x = 0; x < $scope.ideas.length; x++) {
                            if ($scope.ideas[x]._id === results[i].ideaId) {
                                $scope.rankings[i] = {
                                    idea: $scope.ideas[x],
                                    score: results[i].totalScore
                                };
                                break;
                            }
                        }
                    }
                }

                $scope.currentPosition = $scope.rankings.length - 1;

                setTimeout(function() {
                    $scope.showNextPosition();
                }, POSITION_PAUSE);

           });

        };

    }
]);