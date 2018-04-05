ideafunnelApp.controller('SignupController', ['$scope', '$http',
    function($scope, $http) {
        //----- initialise vars --------------------------------------------------------------------------------------//

        $scope.usernameValidity = {};
        $scope.emailValidity = {};

        //----- end initialise vars ----------------------------------------------------------------------------------//
        $scope.initPage = function(name, surname, email, username){
            $scope.user = {firstName: name, lastName: surname, email: email, username: username, password: "", password2: ""};
        };

        $scope.checkUsername = function() {
            if ($scope.user.username && $scope.user.username.length !== 0) {

                $http.post('/signup/username-check/', {username: $scope.user.username})
                    .success(function(responseData) {
                        if (responseData.status && responseData.status === "ok") {
                            $scope.usernameValidity = {status: true};
                        } else {
                            $scope.usernameValidity = {status: false, error: responseData.error};
                        }
                    })
                    .error(function(data) {
                        handleError("An error occurred checking your username", data);
                    });
            }

        };

        $scope.checkEmail = function() {
            if ($scope.user.email && $scope.user.email.length !== 0) {
                $http.post('/api/signup/check-email/', {email: $scope.user.email})
                    .success(function(responseData) {
                        if (responseData.status && responseData.status === "ok") {
                            $scope.emailValidity = {status: true};
                        } else {
                            $scope.emailValidity = {status: false, error: responseData.error};
                        }
                    })
                    .error(function(data) {
                        handleError("An error occurred checking your email", data);
                    });
            }

        };

        // Check is passwords match
        $scope.checkPasswords = function() {
            return (!$scope.user.password || !$scope.user.password2 || $scope.user.password.length === 0 || $scope.user.password2.length === 0) || ($scope.user.password === $scope.user.password2);
        };

        // Check if complete button should be active
        $scope.checkSubmit = function () {
            return ($scope.user.password && $scope.user.password2 && $scope.user.password.length !== 0 && $scope.checkPasswords() && ($scope.emailValidity.status && $scope.usernameValidity.status));
        };
    }
]);
