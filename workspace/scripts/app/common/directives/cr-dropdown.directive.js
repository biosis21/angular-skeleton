/**
 * @ngdoc directive
 * @name App.Common:cr-dropdown
 *
 * @restrict E
 *
 * @requires ngModel
 *
 * @description
 * The items-board directive presents select element with options.
 *
 * @param {array=} dd-list - An external list of items which should consist of below structure:
 * <pre>
 *   ...
 *  {
 *      id: <Number>,
 *      name: <String>
 *  }
 *  ...
 * </pre>
 *
 * @param {string} dd-class - css style for dropdown element.
 *
 * @param {string} dd-start-from - point index for list.
 *
 * @example
 * <pre>
 * <cr-dropdown dd-list="[{...},...]" dd-class="b-select_custom" dd-change="filterHandlerOnChange(newValue)"></cr-dropdown>
 * </pre>
 */

define(function(){
   "use strict";
    return ['$document', function($document){
        return {
            restrict: 'E',
            require: 'ngModel',
            scope: {
                ddClass: '@',
                startFrom: '@ddStartFrom',
                list: '=ddList'
            },
            templateUrl: 'templates/app/common/cr-dropdown.tmpl.html',
            link: function(scope, elem, attrs, ngModel) {

                // Set state of drop down menu list is hide.
                scope.isOpen = false;
                scope.selected = scope.list[0].name;

                var unwatchList = scope.$watch('list', function(newValue){
                    if (newValue.length > 1) {
                        scope.list = newValue.slice(scope.startFrom);
                        scope.selected = newValue[0].name;
                        unwatchList();
                    }
                });

                /*
                * Handler fires on click button 'DOWN' and after that shows/hides drop-down element menu.
                **/
                scope.toggleVisibilityMenu = function() {
                    scope.isOpen = !scope.isOpen;
                };

                /**
                 * Handler fires on choose such element in drop down list.
                 * Injects data in custom ngChange event.
                 * @param index
                 */
                scope.chooseItem = function ( index ) {

                    var el = scope.list[index];

                    scope.selected = el.name;
                    scope.isOpen = false;
                    ngModel.$setViewValue(el.id);
                    ngModel.$render();
                };

                // Binds onClick event with current element.
                elem.bind('click', function(event) {
                    event.stopPropagation();
                });

                /**
                 * Binds onClick event with Document.
                 * Hides drop-down list.
                 */
                $document.bind('click', function(){
                    scope.isOpen = false;
                    scope.$apply();
                });
             }
        };
    }];
});