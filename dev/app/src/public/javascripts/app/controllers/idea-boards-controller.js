ideafunnelMainApp.controller('IdeaBoardsController', ['$scope', '$http', '$location',
    function($scope, $http, $location) {

        $scope.$emit('navChange', "boards");
        $scope.globalSearch = "";

        $scope.loadAllIdeaBoards = function() {
            $http.post('/api/idea-boards/all', {}).
                success(function(responseData) {
                    if (responseData.status && responseData.status === "ok") {
                        $scope.ideaBoards = responseData.data;

                    } else {
                        handleError("Could not load idea boards", responseData);
                    }

                }).
                error(function(data) {
                    handleError("An error occurred loading idea boards", data);
                });
        };

        $scope.viewIdeaBoard = function(board) {
            if (board && board._id) {
                $scope.$emit('selectedBoardChange', board);
                $location.path("/boards/" + board._id);
            }
        };

        $("body").on('keydown', function(event) {
            if (!$scope.addingNew) {
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

            }

        });

        $scope.$on("$destroy", function(){
            $("body").off('keydown');

        });

        $scope.loadAllIdeaBoards();

    }
]);