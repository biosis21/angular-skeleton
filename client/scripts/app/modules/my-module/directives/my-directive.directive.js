/**
 * @ngdoc directive
 * @name App.Main:<my-directive>
 *
 * @restrict E
 *
 * @description
 *
 * @param {string} md-count
 *
 * @example
 * <pre>
 * <my-directive md-count="5"></my-directive>
 * </pre>
 */

define(function () {
    "use strict";
    return [function () {
        return {
            restrict: "E",
            scope: {
                count: '@mdCount'
            },
            templateUrl: 'templates/app/main/my-directive.tmpl.html',
            link: function ( $scope, element, attrs, ctrl ) {

            }
        };
    }];
});