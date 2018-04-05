ideafunnelMainApp.controller('SessionManagementController', ['$scope', '$http', '$location', 'localStorageService', '$routeParams',
    function($scope, $http, $location, localStorageService, $routeParams) {

        $("body").scrollTop(0);

        // Load the board
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

        });

        $scope.createNewSession = function() {
            if ($scope.newSessionTitle && $scope.newSessionTitle.trim() !== "") {
                postWithErrorHandling($http, "/api/idea-boards/" + $scope.board._id + "/sessions/create", {title: $scope.newSessionTitle}, "Could not create session", function(err, updatedBoard) {
                    $scope.newSessionTitle = "";
                    $scope.board = updatedBoard;
                });
            }
        };

        $scope.deleteSession = function(session) {
            postWithErrorHandling($http, "/api/idea-boards/" + $scope.board._id + "/sessions/" + session._id + "/delete", {}, "Could not delete session", function(err, updatedBoard) {
                $scope.board = updatedBoard;
            });
        };

    }
]);