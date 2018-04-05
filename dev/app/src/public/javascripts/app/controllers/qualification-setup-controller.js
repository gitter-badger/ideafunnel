ideafunnelMainApp.controller('ViewIdeaController', ['$scope', '$http', '$location', 'localStorageService', '$routeParams',
    function($scope, $http, $location, localStorageService, $routeParams) {

        $scope.$emit('navChange', "boards");
        $scope.$emit('subNavChange', "view-idea");

        $scope.idea = null;
        $scope.ideaId = $routeParams.ideaId;
        $scope.ideaBoardId = $routeParams.boardId;


        // Load Idea
        getWithErrorHandling($http, "/api/idea-boards/" + $routeParams.boardId + "/" + $routeParams.ideaId + "/view", "Could not load idea", function(err, idea) {
            $scope.idea = idea;
            $scope.$emit('selectedIdea', idea);
        });

    }
]);