/**
 * Anguprofile
 * Anguprofile directive for AngularJS that lets you quickly drag an image for uploading
 * By Daryl Rowland
 */

angular.module('anguprofile', [] )
    .directive('anguprofile', function ($parse, $http) {
    return {
        restrict: 'EA',
        scope: {
            "id": "@imgid",
            "imgSrc": "@imgsrc",
            "imgClass": "@imgclass",
            "uploadUrl": "@uploadurl"
        },
        template: '<img class="{{imgClass}}" id="{{id}}" ng-src="{{imgSrc}}" ng-click="fileUploadClick()"/><input type="file" id="fileuploader_{{id}}" ng-model-instant style="display: none;"/>',
        controller: function ($scope) {

            $scope.blah = function(files) {
                console.log("in blah");
            };


            $scope.uploadFromClick = function(evt) {
                console.log(evt.srcElement.files);
                $scope.handleFiles(evt.srcElement.files);
            };

            $scope.fileUploadClick = function() {
                $("#fileuploader_" + $scope.id).click();
            };

            $scope.handleFiles = function(files) {
                $("#" + $scope.id).addClass("anguprofile-uploading");
                var file;
                for (var i = 0; file = files[i]; i++) {

                    if (true) {
                        var reader = new FileReader();
                        reader.onload = (function (tFile) {
                            return function (evt) {
                                $("#" + $scope.id).attr("src", evt.target.result);
                            };
                        } (file));
                        reader.readAsDataURL(file);
                    }

                    $scope.resizeAndUpload(file);

                }
            };

            $scope.fileSelect = function(evt) {
                evt.stopPropagation();
                evt.preventDefault();
                if (window.File && window.FileReader && window.FileList && window.Blob) {
                    var files = evt.dataTransfer.files;
                    $scope.handleFiles(files);
                } else {
                    alert('The File APIs are not fully supported in this browser.');
                }
            };

            $scope.dragOver = function(evt) {
                //console.log("Drag over worked");
                evt.stopPropagation();
                evt.preventDefault();
                evt.dataTransfer.dropEffect = 'copy';
            };

            $scope.resizeAndUpload = function(file) {
                var reader = new FileReader();
                reader.onloadend = function() {

                    var tempImg = new Image();
                    tempImg.src = reader.result;
                    tempImg.onload = function() {

                        var MAX_WIDTH = 500;
                        var MAX_HEIGHT = 500;
                        var tempW = tempImg.width;
                        var tempH = tempImg.height;
                        if (tempW > tempH) {
                            if (tempW > MAX_WIDTH) {
                                tempH *= MAX_WIDTH / tempW;
                                tempW = MAX_WIDTH;
                            }
                        } else {
                            if (tempH > MAX_HEIGHT) {
                                tempW *= MAX_HEIGHT / tempH;
                                tempH = MAX_HEIGHT;
                            }
                        }

                        var canvas = document.createElement('canvas');
                        canvas.width = tempW;
                        canvas.height = tempH;
                        var ctx = canvas.getContext("2d");
                        ctx.drawImage(this, 0, 0, tempW, tempH);
                        var dataURL = canvas.toDataURL("image/jpeg");

                        $.post($scope.uploadUrl, {image: dataURL}, function(res) {
                            //var newImg = res.data;
                            //$("#" + $scope.id).attr("src", $scope.imgSrc + "?id=" + new Date().getMilliseconds());
                            $scope.imgSrc = $scope.imgSrc + "?id=" + new Date().getMilliseconds();
                            $scope.$apply();
                            $("#" + $scope.id).removeClass("anguprofile-uploading");

                        });

                    };

                };
                reader.readAsDataURL(file);
            };


        },
        link: function($scope, element, attrs) {
            element[0].firstChild.addEventListener('dragover', $scope.dragOver, false);
            element[0].firstChild.addEventListener('drop', $scope.fileSelect, false);

            element[0].children[1].addEventListener('change', $scope.uploadFromClick, false);


        }
    };
});