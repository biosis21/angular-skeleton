/**
 * @ngdoc controller
 * @name App.MyModule:MyControllerCtrl
 *
 * @requires $scope
 *
 * @description
 *
 * @author Nikolay Savenko <biosis@gmail.com>
 */

define(function () {
    "use strict";

    return ['$scope', function ($scope) {
      $scope.title = "New title 2";
    }];
});