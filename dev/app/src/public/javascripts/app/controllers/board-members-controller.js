ideafunnelMainApp.controller('BoardMembersController', ['$scope', '$http', '$location', 'localStorageService', '$routeParams',
    function ($scope, $http, $location, localStorageService, $routeParams) {

        $("body").scrollTop(0);

        $scope.boardMembers = [];
        $scope.selectedUser = {};
        $scope.username = username;

        // Begin by loading the board
        getWithErrorHandling($http, "/api/idea-boards/view/" + $routeParams.boardId, "Could not load board", function(err, board) {
            $scope.board = board;
            $scope.$emit('selectedBoard', board);

            $scope.boardMembers = board.members;

            var usernames = [], i;

            for (i = 0; i < $scope.boardMembers.length; i++) {
                usernames.push($scope.boardMembers[i].userId);
            }

            $scope.adminOfBoard = false;

            for (i = 0; i < $scope.board.members.length; i++) {
                if ($scope.board.members[i].userId === username) {
                    if ($scope.board.members[i].admin) {
                        $scope.adminOfBoard = true;
                    }

                    break;
                }
            }


            // Load member names
            postWithErrorHandling($http, "/api/users/names", {usernames: usernames}, "Could not retrieve users' names", function(err, names) {
                if (!err) {
                    // Loop through and add in names
                    for (var i = 0; i < names.length; i++) {
                        for (var m = 0; m < $scope.board.members.length; m++) {
                            if ($scope.board.members[m].userId === names[i]._id) {
                                $scope.board.members[m].firstName = names[i].firstName;
                                $scope.board.members[m].surname = names[i].surname;
                                break;
                            }
                        }
                    }
                }

            });

        });

        var setPulseTimeoutForBoardMember = function(memberId) {
            setTimeout(function() {
                for (var i = 0; i < $scope.board.members.length; i++) {
                    if ($scope.board.members[i]._id === memberId) {
                        $scope.board.members[i].pulse = false;
                        break;
                    }
                }

            }, 1000);
        };

        $scope.removeMemberFromBoard = function(memberIndex) {
            var userId = $scope.board.members[memberIndex].userId;
            $scope.board.members.splice(memberIndex, 1);

            postWithErrorHandling($http, '/api/idea-boards/' + $scope.board._id + '/members/remove', {userId: userId}, "Could not remove user", function(err, board) {
                // Do nothing - error handled
            });

        };

        $scope.updateMemberRights = function(member) {
            // Change the admin status
            member.admin = !member.admin;

            postWithErrorHandling($http, '/api/idea-boards/' + $scope.board._id + '/members/add', {userId: member.userId, admin: member.admin}, "Could not update user rights", function(err, updated) {
                // Do nothing, error handled
            });

        };

        $scope.addMemberToBoard = function(newMember) {
            var found = false;

            // Check to see if this member has already been added
            for (var i = 0; i < $scope.board.members.length; i++) {
                if (newMember.originalObject._id === $scope.board.members[i].userId) {
                    found = true;
                    $scope.board.members[i].pulse = true;
                    setPulseTimeoutForBoardMember($scope.board.members[i].userId);
                    break;
                }
            }

            if (!found) {
                newMember.originalObject.pulse = true;
                newMember.originalObject.userId = newMember.originalObject._id;
                $scope.board.members.splice(0, 0, newMember.originalObject);
                setPulseTimeoutForBoardMember($scope.board.members[$scope.board.members.length - 1].userId);

                postWithErrorHandling($http, '/api/idea-boards/' + $scope.board._id + '/members/add', {userId: $scope.selectedUser.originalObject._id, admin: false}, "Could not add user to board", function(err, newBoard) {
                    // Do nothing - all handled
                });
            }

        };

        $scope.$watch("selectedUser", function(newValue) {
            if (newValue && newValue.originalObject) {
                $scope.addMemberToBoard(newValue);
                $scope.selectedUser = null;
            }
        });

    }
]);