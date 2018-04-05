/*global d3, RadarChart*/
ideafunnelMainApp.controller('ViewIdeaController', ['$scope', '$http', '$location', 'localStorageService', '$routeParams', '$rootScope',
    function($scope, $http, $location, localStorageService, $routeParams, $rootScope) {

        var MAX_GRAPH_TITLE_LENGTH = 12;

        $("body").scrollTop(0);

        $scope.$emit('nav-size', "large");

        $scope.tab = "info";
        $scope.idea = null;
        $scope.ideaId = $routeParams.ideaId;
        $scope.ideaBoardId = $routeParams.boardId;
        $scope.ideaIdList = [];
        $scope.qualifyOptions = {};

        $scope.username = username;

        localStorageService.add("lastIdeaInBoard", $scope.ideaBoardId);
        localStorageService.add("lastIdeaId", $scope.ideaId);

        if (localStorageService.get("ideaList")) {
            $scope.ideaIdList = localStorageService.get("ideaList");
        }

        if (localStorageService.get("defaultIdeaTab")) {
            $scope.tab = localStorageService.get("defaultIdeaTab");
        }


        $scope.showPreviousCard = function() {
            if ($scope.ideaIdList && $scope.ideaIdList.length > 0 && $scope.idea) {
                // Lets find the next ID
                var nextIdeaId = null;
                //$(window).keyup = undefined;

                for (var i = 0; i < $scope.ideaIdList.length; i++) {
                    if ($scope.ideaIdList[i] === $scope.idea._id) {
                        if (i - 1 >= 0) {
                            nextIdeaId = $scope.ideaIdList[i - 1];
                        } else {
                            nextIdeaId = $scope.ideaIdList[$scope.ideaIdList.length - 1];
                        }

                        $scope.idea = null;
                        $location.path("/boards/" + $scope.ideaBoardId + "/" + nextIdeaId);

                        return;
                    }
                }
            }
        };

        $scope.changeTab = function(tab) {
            localStorageService.add("defaultIdeaTab", tab);
            $scope.tab = tab;
        };

        $scope.showNextCard = function() {
            if ($scope.ideaIdList && $scope.ideaIdList.length > 0 && $scope.idea) {
                // Lets find the next ID
                var nextIdeaId = null;
                //$(window).keyup = undefined;

                for (var i = 0; i < $scope.ideaIdList.length; i++) {
                    if ($scope.ideaIdList[i] === $scope.idea._id) {
                        if (i + 1 < $scope.ideaIdList.length) {
                            nextIdeaId = $scope.ideaIdList[i + 1];
                        } else {
                            nextIdeaId = $scope.ideaIdList[0];
                        }

                        $scope.idea = null;

                        $location.path("/boards/" + $scope.ideaBoardId + "/" + nextIdeaId);

                        return;
                    }
                }
            }
        };

        $scope.deleteCard = function() {
            var cardToDelete = $scope.idea, i;

            // Clear the card
            for (i = 0; i < $scope.ideaIdList.length; i++) {
                if ($scope.ideaIdList[i]._id === cardToDelete._id) {
                    $scope.ideaIdList.splice(i, 1);
                    break;
                }
            }

            if ($scope.ideaIdList.length === 0) {
                $scope.closeFullScreen();
            } else {
                $scope.showNextCard();
            }

            // Loop through rootscope cache if we have any and delete the idea from there too
            if ($rootScope.ideaCache && $rootScope.ideaCache[$scope.ideaBoardId] && $rootScope.ideaCache[$scope.ideaBoardId].ideas) {
                for (i = 0; i < $rootScope.ideaCache[$scope.ideaBoardId].ideas.length; i++) {
                    if ($rootScope.ideaCache[$scope.ideaBoardId].ideas[i]._id === cardToDelete._id) {
                        $rootScope.ideaCache[$scope.ideaBoardId].ideas.splice(i, 1);
                        break;
                    }
                }
            }

            postWithErrorHandling($http, '/api/idea-boards/' + $scope.ideaBoardId + '/' + cardToDelete._id + '/delete', {}, "Could not delete idea", function(err, success) {
                // Do nothing
            });


        };

        $scope.closeFullScreen = function() {
            $(window).keyup = undefined;
            $location.path("/boards/" + $scope.ideaBoardId);
        };

        $scope.getBackgroundImageForCard = function(card)  {
            if (card && card.hasImage) {
                return "background-image: url('/card_images/" + card._id + ".jpg'); background-size: cover; background-position: center;";
            } else {
                return "";
            }
        };

        $(window).on("keyup", function(e){

            if (e.keyCode === 37) {
                $scope.showPreviousCard();
                e.preventDefault();
                e.stopPropagation();
                $scope.$apply();
            } else if (e.keyCode === 39) {
                $scope.showNextCard();
                e.preventDefault();
                e.stopPropagation();
                $scope.$apply();
                return false;
            } else if (e.keyCode === 27) {
                $scope.closeFullScreen();
                e.preventDefault();
                e.stopPropagation();
                $scope.$apply();
            }

        });

        $scope.$on('$destroy', function() {
            $(window).off("keyup");
            $scope.idea = null;
            $scope.$emit('nav-size', "small");
        });

        $scope.$on('$routeChangeStart', function(next, current){
            $(window).off("keyup");
        });

        $scope.lookupQualificationTitle = function(criterionId, optionId) {
            if ($scope.board.criteria && $scope.board.criteria.length > 0) {
                for (var i = 0; i < $scope.board.criteria.length; i++) {
                    if ($scope.board.criteria[i]._id === criterionId) {
                        // Found the criteria
                        for (var x = 0; x < $scope.board.criteria[i].choices.length; x++) {
                            if ($scope.board.criteria[i].choices[x]._id === optionId) {
                                return $scope.board.criteria[i].choices[x].title;
                            }
                        }
                    }
                }
            }

            return "";
        };

        $scope.updateQualificationOptions = function() {
            // Find criterions and options for this ID
            var selectedOptions = {};

            if ($scope.idea.qualifications && $scope.idea.qualifications.length > 0) {
                for (var i = 0; i < $scope.idea.qualifications.length; i++) {
                    if ($scope.idea.qualifications[i].userId === $scope.username) {
                        selectedOptions[$scope.idea.qualifications[i].criteriaId] = {
                            id: $scope.idea.qualifications[i].optionId,
                            title: $scope.lookupQualificationTitle($scope.idea.qualifications[i].criteriaId, $scope.idea.qualifications[i].optionId)
                        };
                    }
                }
            }

            $scope.qualifyOptions = selectedOptions;
        };


        $scope.rightClickCard = function() {
            console.log("Right clicked");
        };

        getWithErrorHandling($http, "/api/idea-boards/" + $routeParams.boardId + "/" + $routeParams.ideaId + "/view", "Could not load idea", function(err, idea) {
            $scope.idea = idea;
            $scope.board = idea.board;

            $scope.adminOfBoard = false;

            for (var i = 0; i < $scope.board.members.length; i++) {
                if ($scope.board.members[i].userId === username) {
                    if ($scope.board.members[i].admin) {
                        $scope.adminOfBoard = true;
                    }

                    break;
                }
            }

            $scope.updateQualificationOptions();
            $scope.generateGraph();
        });

        $scope.getPercentage = function(num) {
            if (!num || num === 0) {
                return "0%";
            } else {
                return Math.round(num * 100) + "%";
            }
        };

        $scope.$on('qualificationScoreUpdated', function(event, payload) {
            $scope.idea.qualificationScore = payload.newQualificationScore;

            $(".qualification-score-card").addClass("animated pulse");

            setTimeout(function() {
                $(".qualification-score-card").removeClass("animated pulse");
            }, 1000);


        });

        $scope.qualifyIdeaWithOption = function(criterion, option) {
            $scope.qualifyOptions[criterion._id] = {id: option._id, title: option.title};

            postWithErrorHandling($http, "/api/idea-boards/" + $scope.board._id + "/qualify/" + $scope.idea._id, {criterionId: criterion._id, optionId: option._id}, "Could not qualify idea", function(err, result) {
                $scope.idea.qualificationScore = result.totalScore;
                $scope.idea.qualificationScorePercentage = result.totalScorePercentage;
                $scope.idea.qualificationCategoryScores = result.categories;
                $scope.generateGraph();

                $(".qualification-score-card").addClass("animated pulse");

                setTimeout(function() {
                    $(".qualification-score-card").removeClass("animated pulse");
                }, 1000);
            });

        };

        $scope.trimTitle = function(originalTitle) {
            if (originalTitle.length > MAX_GRAPH_TITLE_LENGTH) {
                return originalTitle.substr(0, MAX_GRAPH_TITLE_LENGTH) + "...";
            } else {
                return originalTitle;
            }
        };

        $scope.generateGraph = function() {

            if ($scope.idea.board.criteria && $scope.idea.board.criteria.length > 1 && Object.keys($scope.idea.qualificationCategoryScores).length > 0) {
                var w = 100,
                    h = 100;

                var colorscale = d3.scale.category10();

                //Legend titles
                var LegendOptions = [''];

                var d = [[]];

                for (var i = 0; i < $scope.idea.board.criteria.length; i++) {
                    var value = 0;

                    if ($scope.idea.qualificationCategoryScores[$scope.idea.board.criteria[i]._id]) {
                        d[0].push({axis: $scope.trimTitle($scope.idea.board.criteria[i].title), value: $scope.idea.qualificationCategoryScores[$scope.idea.board.criteria[i]._id].percentageAvg});
                    } else {
                        d[0].push({axis: $scope.trimTitle($scope.idea.board.criteria[i].title), value: 0});

                    }

                }

                //Options for the Radar chart, other than default
                var mycfg = {
                    w: w,
                    h: h,
                    maxValue: 1,
                    levels: 10,
                    ExtraWidthX: 150
                };

                //Call function to draw the Radar chart
                //Will expect that data is in %'s
                RadarChart.draw("#chart", d, mycfg);

                ////////////////////////////////////////////
                /////////// Initiate legend ////////////////
                ////////////////////////////////////////////

                var svg = d3.select('#chartHolder')
                    .selectAll('svg')
                    .append('svg')
                    .attr("width", w)
                    .attr("height", h);
            }
        };
    }
]);