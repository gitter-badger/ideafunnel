angular.module('timeago', []).directive('timeago', function() {
    return {
        restrict: 'EA',
        scope: {
            "date": "@date"
        },
        template: '<span>{{formattedDate}}</span>', // load the template file
        controller: function ($scope) {
            $scope.formattedDate = moment($scope.date).fromNow();
        }
    };
});