ideafunnelMainApp.controller('CreateIdeaBoardController', ['$scope', '$http', '$location',
    function($scope, $http, $location) {
        $scope.$emit('navChange', "boards");

        $scope.board = {};
        $scope.codeValid = false;
        $scope.board.allowAnonymous = true; // Default to true
        $scope.board._id = "";
        $scope.board.title = "";
        $scope.board.description = "";


        $scope.autogenerateId = function() {

            if (!$scope.board.title && $scope.board.title.length === 0) {
                $scope.board.title = "";
                return;
            }

            // Remove spaces and special characters
            var temp = $scope.board.title.replace(/[^A-Z0-9_-]+/ig, "");

            if (temp.length> 30) { //trim excess
                temp = temp.substr(0,28);
            }

            temp = temp.toLowerCase(); // convert all characters to lowercase

            $scope.board._id = temp;
            $scope.checkIdeaBoardCode();
        };

        $scope.checkCodeTimer = null;
        $scope.searchingForValidCode = false;

        $scope.checkIdeaBoardCode = function() {

            if ($scope.checkCodeTimer) {
                clearTimeout($scope.checkCodeTimer);
            }

            $scope.searchingForValidCode = true;
            $scope.errorMsg = "";
            $scope.codeValid = true;

            if ($scope.board._id.trim().length < 3 || $scope.board._id.trim().length > 30) {
                $scope.codeValid = false;
                $scope.errorMsg = "Board code must be between 3-30 characters";
            }

            if (new RegExp(/[A-Z]/).test($scope.board._id.trim())) { // Detect Uppercase letters
                $scope.codeValid = false;
                if ($scope.errorMsg.length !== 0) {
                    $scope.errorMsg += ", ";
                }
                $scope.errorMsg  += "Board code must contain lower case letters only";
            }

            if (!new RegExp(/^[a-zA-Z0-9-]*$/).test($scope.board._id)) { // Special characters
                $scope.codeValid = false;
                if ($scope.errorMsg.length !== 0) {
                    $scope.errorMsg += ", ";
                }
                $scope.errorMsg += "No special characters(!,|.&) or spaces allowed";
            }

            if (!$scope.codeValid) {
                $scope.searchingForValidCode = false;
                return;
            }

            $scope.checkCodeTimer = setTimeout(function() {

               // Make a call only if string doesn't contain invalid characters and has the appropriate length
                $http.get("/api/idea-boards/check-code?code=" + $scope.board._id).
                    success(function(responseData) {
                        if (responseData.status && responseData.status === "ok") {
                            $scope.codeValid = true;
                        } else {
                            $scope.codeValid = false;
                            $scope.errorMsg = responseData.error;
                        }

                        $scope.searchingForValidCode = false;

                    }).
                    error(function(data) {
                        handleError("Could not check code", data);
                        $scope.searchingForValidCode = false;
                    });

            }, 300);
        };

        $scope.createNow = function() {
            if ($scope.board.title && $scope.board._id && $scope.board.description) {
                $scope.creatingIdea = true;

                postWithErrorHandling($http, "/api/idea-boards/create", $scope.board, "Could not create Idea Board", function(err, ideaBoard) {
                    if (!err) {
                        $location.path("/boards/" + ideaBoard._id);
                    } else {
                        handleError(err);
                    }

                    $scope.creatingIdea = false;
                });
            } else {
                $scope.missingFields = true;
                handleError("Please fill in all fields before you can proceed");
            }

        };

        $scope.cancel = function() {
            $location.path("/boards");
        };
    }
]);