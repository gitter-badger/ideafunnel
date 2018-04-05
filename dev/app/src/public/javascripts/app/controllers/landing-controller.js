ideafunnelApp.controller('LandingController', ['$scope',
    function ($scope) {

        var TOP_BAR_HEIGHT = 30;
        var FLICK_STEP_PAUSE = 100;
        var QUALIFY_STEP_PAUSE = 200;
        var WRITING_STEP_PAUSE = 50;
        var VIEWPORT_ANIMATE_OFFSET = 100;
        var FLICK_STEPS = [1200, 1200, 1200, 1150, 1100, 1000, 900, 900, 900];
        var QUALIFY_STEPS = [815, 815, 815, 815, 815, 915, 1015, 1015, 1015, 1015, 1015];
        var LINE1_FINAL_TEXT = "Here is my";
        var LINE2_FINAL_TEXT = "new idea";

        $scope.flickStep = 0;
        $scope.qualifyStep = 0;
        $scope.flickTimer = null;
        $scope.writingTimer = null;
        $scope.writingStep = 0;
        $scope.viewportHeight = $(window).height() - TOP_BAR_HEIGHT;
        $scope.handFlicked = false;
        $scope.textFlicked = false;
        $scope.textWritten = false;
        $scope.textCompleted = false;
        $scope.graphic = 1;

        $scope.nextFlickStep = function() {
            if ($scope.flickStep >= FLICK_STEPS.length) {
                clearInterval($scope.flickTimer);
                $scope.flickStep = 0;
                $scope.flickTimer = null;
                $("#hand").fadeOut();
                $("#postit_mac").fadeIn();
                $("#iphone_line1").text("");
                $("#iphone_line2").text("");


                $scope.textFlicked = true;
            } else {
                $("#hand").attr("transform", "translate(2359.500000, " + FLICK_STEPS[$scope.flickStep] + ") rotate(-21.000000) translate(-2359.500000, -1201.500000) translate(2186.000000, 908.000000)");

                if ($scope.flickStep === 0) {
                    $("#hand").show();
                }

                $scope.flickStep ++;
            }
        };

        $scope.nextWritingStep = function() {
            if ($scope.writingStep >= LINE1_FINAL_TEXT.length + LINE2_FINAL_TEXT.length) {
                clearInterval($scope.writingTimer);
                $scope.writingTimer = null;
                $scope.textCompleted = true;
            } else {
                if ($scope.writingStep < LINE1_FINAL_TEXT.length) {
                    $("#iphone_line1").text(LINE1_FINAL_TEXT.substr(0, $scope.writingStep + 1));

                } else {
                    $("#iphone_line2").text(LINE2_FINAL_TEXT.substr(0, $scope.writingStep - LINE1_FINAL_TEXT.length + 1));
                }

                $scope.writingStep ++;
            }
        };

        $scope.nextQualifyStep = function() {
            if ($scope.qualifyStep >= QUALIFY_STEPS.length) {
                clearInterval($scope.qualifyTimer);
                $scope.qualifyStep = 0;
                $scope.qualifyTimer = null;
                $("#hand_2").fadeOut();
                $("#cost_dropdown").hide();
                $("#qualify_score").text("28");
                $("#medium_selector").hide();
            } else {
                $("#hand_2").attr("transform", "translate(710.842803, " + QUALIFY_STEPS[$scope.qualifyStep] + ") rotate(-21.000000) translate(-710.842803, -815.500000) translate(537.342803, 522.000000)");

                if ($scope.qualifyStep === 0) {
                    $("#hand_2").show();
                    $("#cost_dropdown").hide();
                    $("#medium_selector").hide();
                    $("#qualify_score").text("0");
                }

                if ($scope.qualifyStep === 2) {
                    $("#cost_dropdown").fadeIn();
                }

                if ($scope.qualifyStep === 5) {
                    $("#medium_is_selected").fadeIn();
                    $("#medium_selector").fadeIn();
                }

                $scope.qualifyStep ++;
            }
        };

        $scope.gotoSignUp = function () {
            window.location = "/signup";
        };

        // Detect window resize
        $(window).resize(function() {
            $scope.viewportHeight = $(window).height() - TOP_BAR_HEIGHT;
            $scope.$apply();
        });

        $("#postit_mac").hide();


        $(window).on("scroll", function() {
            var scrollPos = $(window).scrollTop();

            if (scrollPos > 50) {

                if (!$scope.textWritten && !$scope.textCompleted && !$scope.textFlicked && !$scope.handFlicked) {
                    //$("#iphone_line1").text("Here is my")
                    //$("#iphone_line2").text("new idea")
                    if (!$scope.writingTimer) {


                        $("#iphone_line1").text("");
                        $("#iphone_line2").text("");


                        $scope.writingTimer = setInterval(function() {
                            $("#iphone_line1").show();
                            $("#iphone_line2").show();
                            $scope.nextWritingStep();
                        }, WRITING_STEP_PAUSE);

                    }
                }
            } else {

                $scope.textWritten = false;
                $scope.writingStep = 0;

                if (scrollPos < 50) {
                    $("#iphone_line1").hide();
                    $("#iphone_line2").hide();
                }

                clearInterval($scope.writingTimer);
                $scope.writingTimer = null;
                $scope.textCompleted = false;

            }


            if (scrollPos > ($scope.viewportHeight - VIEWPORT_ANIMATE_OFFSET)) {
                if (!$scope.flickTimer && !$scope.handFlicked) {
                    $scope.flickStep = 0;

                    $scope.flickTimer = setInterval(function() {
                        $scope.nextFlickStep();
                    }, FLICK_STEP_PAUSE);

                    $scope.handFlicked = true;
                    $scope.textFlicked = false;
                }
            } else {
                if ($scope.flickTimer) {
                    clearInterval($scope.flickTimer);
                    $scope.flickTimer = null;
                    $scope.flickStep = 0;
                    $("#hand").attr("transform", "translate(2359.500000, 1201.500000) rotate(-21.000000) translate(-2359.500000, -1201.500000) translate(2186.000000, 908.000000)");
                }

                $scope.handFlicked = false;
                $scope.textFlicked = false;
                $("#hand").hide();
                $("#postit_mac").hide();

            }


            // What graphic to show?
            if (scrollPos > (($scope.viewportHeight * 2) - (VIEWPORT_ANIMATE_OFFSET * 2))) {
                if ($scope.graphic === 1) {
                    // Fade in and fade out
                    $("#graphic1").hide();
                    $("#graphic2").show();

                    $scope.qualifyTimer = setInterval(function() {
                        $scope.nextQualifyStep();
                    }, QUALIFY_STEP_PAUSE);

                }

                $scope.graphic = 2;
                $scope.$apply();



            } else {
                if ($scope.graphic === 2) {
                    // Fade in and fade out
                    $("#graphic2").hide();
                    $("#graphic1").fadeIn();
                }

                $scope.graphic = 1;
                $scope.$apply();
            }

            //cost_dropdown
            //medium_is_selected
            //medium_selector


        });

    }]);