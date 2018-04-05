ideafunnelApp.controller('GenerateIdeasController', ['$scope',
    function($scope) {
        $scope.board = {};

        var hammer = Hammer(document.getElementById("swipeArea"));

        // the whole area
        hammer.on("swipeup", function(ev) {
            $("#bigCard").addClass("animated slideOutUp");

            setTimeout(function() {
                $("#bigCard").removeClass("animated slideOutUp");
            }, 700);

        });

    }

]);