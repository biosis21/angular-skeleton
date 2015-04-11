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

    var a  = 1;
    var b   = 3;

    return ['$scope', function ($scope) {

        // $scope, myService
        var z = 2;
        var x = z++;


        var x = {
            a   : 1
            , bcd : 2,
            ef  : 'str'
        };

        var bbb = function () {


        };

        function bb () {

        }

        var c = [{
            a: 1
        }];

        bb(1, 2);

        if (1 == a) {
            return;
        }

        if (a == 1) {
            return;
        }

        if (true) { doSomething(); doSomethingElse(); }
        if (true) {
            doSomething();
            doSomethingElse();
        }

        x = 1 + 2;
    }];
});