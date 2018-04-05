ideafunnelApp.controller('ViewIdeaBoardVotesController', ['$scope', '$http',
    function($scope, $http) {

        var IDEA_PAUSE = 8000;
        var FADE_WAIT_PAUSE = 1500;
        var NEW_IDEA_CHECK = 10000;

        $scope.ideaBoard = {};
        $scope.showCard = true;
        $scope.currentIdeaIndex = 0;
        $scope.newIdeas = [];
        $scope.sinceDate = new Date();

        $scope.checkForNewIdeas = function() {
            postWithErrorHandling($http, '/api/idea-boards/' + $scope.ideaBoardId + '/all', {since: $scope.sinceDate}, "Could not refresh", function (err, newIdeas) {
                if (!err && newIdeas && newIdeas.length > 0) {
                    for (var i = 0; i < newIdeas.length; i++) {
                        $scope.newIdeas.push(newIdeas[i]);
                        $scope.sinceDate = newIdeas[0].creationDate;
                    }
                }
            });
        };

        setInterval(function() {
            $scope.checkForNewIdeas();
        }, NEW_IDEA_CHECK);


        setInterval(function() {
            if ($scope.ideas && $scope.ideas.length > 0) {

                $("#mainCard").addClass("animated rollOut");

                setTimeout(function() {
                    $("#mainCard").hide();
                    $("#mainCard").removeClass("animated rollOut");

                    if ($scope.newIdeas.length > 0) {
                        $scope.currentIdea = $scope.newIdeas[0];
                        $scope.newIdeas.splice(0, 1);
                        $scope.ideas.push($scope.currentIdea);
                    } else {
                        $scope.currentIdeaIndex ++;

                        if ($scope.currentIdeaIndex >= $scope.ideas.length) {
                            $scope.currentIdeaIndex = 0;
                        }

                        $scope.currentIdea = $scope.ideas[$scope.currentIdeaIndex];
                    }

                    $scope.$apply();

                    $("#mainCard").removeClass("animated rollIn");
                    $("#mainCard").addClass("animated rollIn");
                    $("#mainCard").show();

                }, FADE_WAIT_PAUSE);

            }

        }, IDEA_PAUSE);

        $scope.initIdeaBoard = function(id, username) {
            $scope.ideaBoardId = id;
            $scope.username = username;


            getWithErrorHandling($http, '/api/idea-boards/view/' + id, "Could not retrieve board", function (err, board) {
                $scope.ideaBoard = board;

                // Load all ideas for the board
                getWithErrorHandling($http, '/api/idea-boards/' + id + "/all", "Could not load ideas", function(err, ideas) {
                    $scope.ideas = ideas;

                    if ($scope.ideas && $scope.ideas.length > 0) {
                        $scope.currentIdea = $scope.ideas[0];
                        $scope.currentIdeaIndex = 0;
                        $scope.sinceDate = $scope.ideas[0].creationDate;

                    }

                });

            });
        };
    }
]);