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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL2FwcC9tb2R1bGVzL215LW1vZHVsZS9kaXJlY3RpdmVzL215LWRpcmVjdGl2ZS5kaXJlY3RpdmUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSBBcHAuTWFpbjo8bXktZGlyZWN0aXZlPlxuICpcbiAqIEByZXN0cmljdCBFXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG1kLWNvdW50XG4gKlxuICogQGV4YW1wbGVcbiAqIDxwcmU+XG4gKiA8bXktZGlyZWN0aXZlIG1kLWNvdW50PVwiNVwiPjwvbXktZGlyZWN0aXZlPlxuICogPC9wcmU+XG4gKi9cblxuZGVmaW5lKGZ1bmN0aW9uICgpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICByZXR1cm4gW2Z1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiBcIkVcIixcbiAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgY291bnQ6ICdAbWRDb3VudCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ3RlbXBsYXRlcy9hcHAvbWFpbi9teS1kaXJlY3RpdmUudG1wbC5odG1sJyxcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICggJHNjb3BlLCBlbGVtZW50LCBhdHRycywgY3RybCApIHtcblxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1dO1xufSk7Il0sImZpbGUiOiJzY3JpcHRzL2FwcC9tb2R1bGVzL215LW1vZHVsZS9kaXJlY3RpdmVzL215LWRpcmVjdGl2ZS5kaXJlY3RpdmUuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==