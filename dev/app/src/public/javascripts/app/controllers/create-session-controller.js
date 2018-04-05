ideafunnelMainApp.controller('CreateSessionController', ['$scope', '$http', '$location', 'localStorageService', '$routeParams',
    function($scope, $http, $location, localStorageService, $routeParams) {

        $scope.$emit('navChange', "boards");
        $scope.ideaBoardId = $routeParams.boardId;
        $scope.username = username;

    }
]);
