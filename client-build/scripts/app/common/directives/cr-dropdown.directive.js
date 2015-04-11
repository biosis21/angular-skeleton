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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL2FwcC9jb21tb24vZGlyZWN0aXZlcy9jci1kcm9wZG93bi5kaXJlY3RpdmUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSBBcHAuQ29tbW9uOmNyLWRyb3Bkb3duXG4gKlxuICogQHJlc3RyaWN0IEVcbiAqXG4gKiBAcmVxdWlyZXMgbmdNb2RlbFxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogVGhlIGl0ZW1zLWJvYXJkIGRpcmVjdGl2ZSBwcmVzZW50cyBzZWxlY3QgZWxlbWVudCB3aXRoIG9wdGlvbnMuXG4gKlxuICogQHBhcmFtIHthcnJheT19IGRkLWxpc3QgLSBBbiBleHRlcm5hbCBsaXN0IG9mIGl0ZW1zIHdoaWNoIHNob3VsZCBjb25zaXN0IG9mIGJlbG93IHN0cnVjdHVyZTpcbiAqIDxwcmU+XG4gKiAgIC4uLlxuICogIHtcbiAqICAgICAgaWQ6IDxOdW1iZXI+LFxuICogICAgICBuYW1lOiA8U3RyaW5nPlxuICogIH1cbiAqICAuLi5cbiAqIDwvcHJlPlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBkZC1jbGFzcyAtIGNzcyBzdHlsZSBmb3IgZHJvcGRvd24gZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gZGQtc3RhcnQtZnJvbSAtIHBvaW50IGluZGV4IGZvciBsaXN0LlxuICpcbiAqIEBleGFtcGxlXG4gKiA8cHJlPlxuICogPGNyLWRyb3Bkb3duIGRkLWxpc3Q9XCJbey4uLn0sLi4uXVwiIGRkLWNsYXNzPVwiYi1zZWxlY3RfY3VzdG9tXCIgZGQtY2hhbmdlPVwiZmlsdGVySGFuZGxlck9uQ2hhbmdlKG5ld1ZhbHVlKVwiPjwvY3ItZHJvcGRvd24+XG4gKiA8L3ByZT5cbiAqL1xuXG5kZWZpbmUoZnVuY3Rpb24oKXtcbiAgIFwidXNlIHN0cmljdFwiO1xuICAgIHJldHVybiBbJyRkb2N1bWVudCcsIGZ1bmN0aW9uKCRkb2N1bWVudCl7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgcmVxdWlyZTogJ25nTW9kZWwnLFxuICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICBkZENsYXNzOiAnQCcsXG4gICAgICAgICAgICAgICAgc3RhcnRGcm9tOiAnQGRkU3RhcnRGcm9tJyxcbiAgICAgICAgICAgICAgICBsaXN0OiAnPWRkTGlzdCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ3RlbXBsYXRlcy9hcHAvY29tbW9uL2NyLWRyb3Bkb3duLnRtcGwuaHRtbCcsXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbSwgYXR0cnMsIG5nTW9kZWwpIHtcblxuICAgICAgICAgICAgICAgIC8vIFNldCBzdGF0ZSBvZiBkcm9wIGRvd24gbWVudSBsaXN0IGlzIGhpZGUuXG4gICAgICAgICAgICAgICAgc2NvcGUuaXNPcGVuID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgc2NvcGUuc2VsZWN0ZWQgPSBzY29wZS5saXN0WzBdLm5hbWU7XG5cbiAgICAgICAgICAgICAgICB2YXIgdW53YXRjaExpc3QgPSBzY29wZS4kd2F0Y2goJ2xpc3QnLCBmdW5jdGlvbihuZXdWYWx1ZSl7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5saXN0ID0gbmV3VmFsdWUuc2xpY2Uoc2NvcGUuc3RhcnRGcm9tKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnNlbGVjdGVkID0gbmV3VmFsdWVbMF0ubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVud2F0Y2hMaXN0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgKiBIYW5kbGVyIGZpcmVzIG9uIGNsaWNrIGJ1dHRvbiAnRE9XTicgYW5kIGFmdGVyIHRoYXQgc2hvd3MvaGlkZXMgZHJvcC1kb3duIGVsZW1lbnQgbWVudS5cbiAgICAgICAgICAgICAgICAqKi9cbiAgICAgICAgICAgICAgICBzY29wZS50b2dnbGVWaXNpYmlsaXR5TWVudSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5pc09wZW4gPSAhc2NvcGUuaXNPcGVuO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBIYW5kbGVyIGZpcmVzIG9uIGNob29zZSBzdWNoIGVsZW1lbnQgaW4gZHJvcCBkb3duIGxpc3QuXG4gICAgICAgICAgICAgICAgICogSW5qZWN0cyBkYXRhIGluIGN1c3RvbSBuZ0NoYW5nZSBldmVudC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBzY29wZS5jaG9vc2VJdGVtID0gZnVuY3Rpb24gKCBpbmRleCApIHtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgZWwgPSBzY29wZS5saXN0W2luZGV4XTtcblxuICAgICAgICAgICAgICAgICAgICBzY29wZS5zZWxlY3RlZCA9IGVsLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmlzT3BlbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUoZWwuaWQpO1xuICAgICAgICAgICAgICAgICAgICBuZ01vZGVsLiRyZW5kZXIoKTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgLy8gQmluZHMgb25DbGljayBldmVudCB3aXRoIGN1cnJlbnQgZWxlbWVudC5cbiAgICAgICAgICAgICAgICBlbGVtLmJpbmQoJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBCaW5kcyBvbkNsaWNrIGV2ZW50IHdpdGggRG9jdW1lbnQuXG4gICAgICAgICAgICAgICAgICogSGlkZXMgZHJvcC1kb3duIGxpc3QuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgJGRvY3VtZW50LmJpbmQoJ2NsaWNrJywgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuaXNPcGVuID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XTtcbn0pOyJdLCJmaWxlIjoic2NyaXB0cy9hcHAvY29tbW9uL2RpcmVjdGl2ZXMvY3ItZHJvcGRvd24uZGlyZWN0aXZlLmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=