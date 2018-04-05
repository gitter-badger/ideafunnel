ideafunnelMainApp.controller('QualificationCriteriaController', ['$scope', '$http', '$location', 'localStorageService', '$routeParams',
    function($scope, $http, $location, localStorageService, $routeParams) {

        $scope.$emit('navChange', "boards");
        $scope.$emit('subNavChange', "board-members");

        $("body").scrollTop(0);

        $scope.boardMembers = [];
        $scope.selectedUser = {};
        $scope.username = username;

        $scope.showAddNew = false;

        $scope.newOption = {show: false};

        $scope.criteria = [];
        $scope.options = [];

        $scope.editTitle = false;


        // Begin by loading the board
        getWithErrorHandling($http, "/api/idea-boards/view/" + $routeParams.boardId, "Could not load board", function(err, board) {
            $scope.board = board;
            $scope.criteria = board.criteria.reverse();


            $scope.adminOfBoard = false;

            for (var i = 0; i < $scope.board.members.length; i++) {
                if ($scope.board.members[i].userId === username) {
                    if ($scope.board.members[i].admin) {
                        $scope.adminOfBoard = true;
                    }

                    break;
                }
            }

            $scope.$emit('selectedBoard', board);
        });

        $scope.addNewCriterion = function() {
            if ($scope.addCriteriaTitle && $scope.addCriteriaTitle !== "") {
                postWithErrorHandling($http, "/api/idea-boards/" + $scope.board._id + "/criteria/add", {title: $scope.addCriteriaTitle}, "Could not update board", function(err, updatedBoard) {
                    if (!err) {
                        $scope.board = updatedBoard;
                        $scope.criteria = $scope.board.criteria.reverse();
                        $scope.showEditOptionsDialog($scope.criteria[0]);
                    }

                    $scope.addCriteriaTitle = "";

                });

            }

        };

        $scope.showAddNewOption = function() {
            $scope.newOption.show = true;
            var title = $("#newOptionTitle").val("");
            var score = $("#newOptionScore").val("0");
        };

        $scope.saveNewOption = function(criteria) {
            $scope.newOption = {show: false};

            var title = $("#newOptionTitle").val();
            var score = $("#newOptionScore").val();

            postWithErrorHandling($http, "/api/idea-boards/" + $scope.board._id + "/criteria/" + $scope.selectedCriterion._id  + "/options/add", {title: title, weighting: score}, "Error adding option", function(err, updated) {
                if (!err) {
                    $scope.board = updated;
                    $scope.criteria = updated.criteria.reverse();

                    // Find the criteria and get the updated options
                    for (var i = 0; i < updated.criteria.length; i++) {
                        if (updated.criteria[i]._id === $scope.selectedCriterion._id) {
                            $scope.sortAndSetOptionsArray(updated.criteria[i].choices);
                            return;
                        }
                    }
                }

            });

        };

        $scope.sortOptionsArray = function(options) {
            options.sort(function(a, b) {
                if (b.weighting && a.weighting) {
                    return b.weighting - a.weighting;
                } else if (!a.weighting) {
                    return 1;
                } else if (!b.weighting) {
                    return -1;
                }
            });

            return options;
        };

        $scope.sortAndSetOptionsArray = function(optionsArray) {
            $scope.options = optionsArray;
            $scope.sortOptionsArray($scope.options);

        };

        $scope.deleteOption = function(option) {
            postWithErrorHandling($http, "/api/idea-boards/" + $scope.board._id + "/criteria/" + $scope.selectedCriterion._id + "/options/remove", {optionId: option._id}, "Could not remove option", function(err, updated) {
                if (!err) {
                    $scope.board = updated;
                    $scope.criteria = updated.criteria.reverse();

                    // Find the criteria and get the updated options
                    for (var i = 0; i < updated.criteria.length; i++) {
                        if (updated.criteria[i]._id === $scope.selectedCriterion._id) {
                            $scope.sortAndSetOptionsArray(updated.criteria[i].choices);
                            return;
                        }
                    }
                }
            });
        };

        $scope.deleteCriterion = function(criterion) {
            postWithErrorHandling($http, "/api/idea-boards/" + $scope.board._id + "/criteria/" + criterion._id + "/remove", {}, "Could not remove criterion", function(err, updated) {
                if (!err) {
                    $scope.board = updated;
                    $scope.criteria = updated.criteria.reverse();
                }
            });

        };

        $scope.editOption = function(option) {
            option.edit = true;
        };

        $scope.hideAddOption = function() {
            $scope.addOptionTitle = "";
            $scope.addOptionScore = "";
            $scope.newOption = {show: false};
        };

        $scope.cancelEditOption = function(option) {
            option.edit = false;
            $("#editOptionTitle_" + option._id).val(option.title);
            $("#editOptionScore_" + option._id).val("0");
        };

        $scope.saveEditOption = function(option) {
            option.edit = false;

            var title = $("#editOptionTitle_" + option._id).val();
            var score = $("#editOptionScore_" + option._id).val();

            postWithErrorHandling($http, "/api/idea-boards/" + $scope.board._id + "/criteria/" + $scope.selectedCriterion._id + "/options/edit", {optionId: option._id, title: title, weighting: score}, "Could not update option", function(err, updated) {
                if (!err) {
                    $scope.board = updated;
                    $scope.criteria = updated.criteria.reverse();

                    // Find the criteria and get the updated options
                    for (var i = 0; i < updated.criteria.length; i++) {
                        if (updated.criteria[i]._id === $scope.selectedCriterion._id) {
                            $scope.sortAndSetOptionsArray(updated.criteria[i].choices);
                            return;
                        }
                    }
                }

            });
        };

        $scope.showEditOptionsDialog = function(criterion) {
            $scope.selectedCriterion = criterion;
            $scope.sortAndSetOptionsArray($scope.selectedCriterion.choices);
            $scope.addOptionTitle = "";
            $scope.addOptionScore = "";
            $scope.newOption = {show: false};

            // Loop through options (if there is any) and set edit to false
            if ($scope.options && $scope.options.length > 0) {
                for (var i = 0; i < $scope.options.length; i++) {
                    $scope.options[i].edit = false;
                }
            }

            $("#editOptions").modal();
        };

        $scope.showEditTitle = function() {
            $scope.editTitle = true;
        };

        $scope.cancelEditTitle = function() {
            $scope.editTitle = false;
        };

        $scope.saveEditTitle = function() {
            var newTitle = $("#newTitle").val();

            if (!newTitle || newTitle.trim() === "") {
                handleError("No title specified");
            } else {
                postWithErrorHandling($http, "/api/idea-boards/" + $scope.board._id + "/criteria/" + $scope.selectedCriterion._id + "/edit", {title: newTitle}, "Could not update criterion", function(err, updated) {
                    if (!err) {
                        $scope.board = updated;
                        $scope.criteria = updated.criteria.reverse();

                        // Find the criteria and get the updated options
                        for (var i = 0; i < updated.criteria.length; i++) {
                            if (updated.criteria[i]._id === $scope.selectedCriterion._id) {
                                $scope.selectedCriterion = updated.criteria[i];
                                $scope.sortAndSetOptionsArray(updated.criteria[i].choices);
                                break;
                            }
                        }
                    }

                });

                $scope.editTitle = false;
            }

        };

    }
]);