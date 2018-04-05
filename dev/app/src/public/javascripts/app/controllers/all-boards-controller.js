ideafunnelApp.controller('AllBoardsController', ['$scope', '$http', function ($scope, $http) {

    $scope.ideaBoards = [];
    $scope.showCreate = false;

    $scope.loadAllIdeaBoards = function () {
        $http.post('/api/idea-boards/all', {}).
            success(function (responseData) {
                if (responseData.status && responseData.status === "ok") {
                    $scope.ideaBoards = responseData.data;
                } else {
                    handleError("Could not load idea boards", responseData);
                }

            }).
            error(function (data) {
                handleError("An error occurred loading idea boards", data);
            });
    };

    $scope.viewBoard = function (board) {
        window.location.href = "/boards/" + board._id;
    };

    $scope.loadAllIdeaBoards();

}]);