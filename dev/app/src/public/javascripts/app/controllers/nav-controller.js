ideafunnelMainApp.controller('NavController', ['$scope', '$http', '$location', 'localStorageService',
    function NavController($scope, $http, $location, localStorageService) {

        $scope.colours = DEFAULT_COLOURS;
        $scope.selectedNav = "home";
        $scope.subNav = null;
        $scope.qualifyOptions = {};
        $scope.largeNav = true;

        $scope.selectedHotTopics = [];

        $scope.adminOfBoard = false;

        $scope.username = username;

        $scope.$on('navChange', function(event, payload) {
            $scope.selectedNav = payload;
            $scope.subNav = null;
        });

        $scope.$on('subNavChange', function(event, payload) {
            $scope.subNav = payload;
        });

        $scope.$on('selectedIdea', function(event, payload) {
            $scope.selectedIdea = payload;
        });

        $scope.$on('selectedIdea', function(event, payload) {
            $scope.selectedIdea = payload;
        });

        $scope.$on('nav-size', function(event, payload) {
            $scope.largeNav = payload === "large";
        });


        $scope.$on('selectedQualificationOptions', function(event, payload) {
            $scope.qualifyOptions = null;
            $scope.qualifyOptions = payload;

        });

        $scope.$on('selectedBoard', function(event, payload) {
            $scope.selectedBoard = payload;
            $scope.selectedHotTopics = [];

            // Check for any previously selected hot topics
            if (localStorageService.get("hotTopics")) {
                var hotTopics = localStorageService.get("hotTopics");

                if (hotTopics.boardId === $scope.selectedBoard._id) {
                    $scope.selectedHotTopics = hotTopics.selectedTopics;
                }
            }

            // Check to see if the user is an admin of this board
            $scope.adminOfBoard = false;

            for (var i = 0; i < $scope.selectedBoard.members.length; i++) {
                if ($scope.selectedBoard.members[i].userId === username) {
                    if ($scope.selectedBoard.members[i].admin) {
                        $scope.adminOfBoard = true;
                    }

                    break;
                }
            }


        });

        $scope.$on('clearFilters', function(event, payload) {
            $scope.selectedHotTopics = [];
        });

        $scope.$on('hotList', function(event, payload) {
            $scope.hotList = payload;
        });

        // Handle moving to a new board
        $scope.$on('selectedBoardChange', function(event, payload) {
            $scope.selectedBoard = payload;
        });

    }
]);