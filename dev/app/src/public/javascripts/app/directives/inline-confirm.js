angular.module('inlineConfirm', []).directive('inlineConfirm', function() {
    return {
        restrict: 'EA',
        scope: {
            "text": "@text",
            "type": "@type",
            "mainClass": "@mainclass",
            "confirmFunction": "&confirmfunction",
            "iconClasses": "@icon",
            "hideOnYes": "@hideOnYes"
        },
        template: '<span ng-show="show"><span class="{{mainClass}}" ng-if="type == \'text\'"><i ng-click="showConfirmOptions($event)" ng-if="iconClasses" style="cursor: pointer;" class="{{iconClasses}}"></i><a href="" ng-click="showConfirmOptions()">{{text}}</a> <span ng-show="showConfirm"><span style="margin-left: 5px;"><a href="" ng-click="yesClick($event)">Yes</a></span> <span style="margin-left: 5px;"><a href="" ng-click="noClick($event)">No</a></span></span> </span><button ng-if="type == \'button\'" ng-click="showConfirmOptions()" class="{{mainClass}}"><i ng-if="iconClasses" style="margin-right: 5px; cursor: pointer;" class="{{iconClasses}}"></i> {{text}} <span style="margin-left: 10px;" ng-show="showConfirm"><span ng-click="yesClick($event)">Yes</span> <span style="margin-left: 10px;" ng-click="noClick($event)">No</span></span></button></span>', // load the template file
        controller: function ( $scope ) {
            $scope.show = true;

            $scope.showConfirmOptions = function(e) {
                $scope.showConfirm = true;
                e.preventDefault();
                e.stopPropagation();
            };

            $scope.noClick = function(e) {
                $scope.showConfirm = false;
                e.preventDefault();
                e.stopPropagation();
            };

            $scope.yesClick = function(e) {
                $scope.showConfirm = false;
                $scope.confirmFunction();

                if ($scope.hideOnYes && $scope.hideOnYes === "true") {
                    $scope.show = false;
                }
            };
        }
    };
});