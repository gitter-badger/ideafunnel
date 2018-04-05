ideafunnelMainApp.controller('MeController', ['$scope', '$http', '$routeParams',
    function($scope, $http, $routeParams) {

        $scope.profilePic = "/images/ideafunnel_noprofile.png";

        if ($routeParams.userId) {
            $scope.userId = $routeParams.userId;

            $scope.canEdit = $scope.userId === username;

        } else {
            $scope.userId = username;
            $scope.canEdit = true;
        }


        $scope.loadStats = function() {
            getWithErrorHandling($http, "/api/user/:username/stats?userId=" + $scope.userId, "Could not load user stats", function(err, stats) {
                $scope.stats = stats;
            });
        };

        $scope.loadStats();

        $scope.initMePage = function(userId, fullName, profilePicPresent) {
            $scope.userId = userId;
            $scope.fullName = fullName;
            $scope.profilePicPresent = profilePicPresent;

            if ($scope.profilePicPresent) {
                $scope.profilePic = "/" + userId + ".jpg";
            } else {
                $scope.profilePic = "/images/ideafunnel_noprofile.png";
            }
        };

        $scope.loadUser = function() {
            $http.get('/api/user/' + $scope.username + '/view', {}).
                success(function(responseData) {
                    if (responseData.status && responseData.status === "ok") {
                        $scope.user = responseData.data;
                    } else {
                        handleError("Could not load user", responseData);
                    }

                    $scope.loadingUser = false;

                }).
                error(function(data) {
                    handleError("An error occurred loading your user details", data);
                    $scope.loadingUser = false;
                });
        };

    }
]);