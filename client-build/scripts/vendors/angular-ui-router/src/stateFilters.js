/**
 * @ngdoc filter
 * @name ui.router.state.filter:isState
 *
 * @requires ui.router.state.$state
 *
 * @description
 * Translates to {@link ui.router.state.$state#methods_is $state.is("stateName")}.
 */
$IsStateFilter.$inject = ['$state'];
function $IsStateFilter($state) {
  var isFilter = function (state) {
    return $state.is(state);
  };
  isFilter.$stateful = true;
  return isFilter;
}

/**
 * @ngdoc filter
 * @name ui.router.state.filter:includedByState
 *
 * @requires ui.router.state.$state
 *
 * @description
 * Translates to {@link ui.router.state.$state#methods_includes $state.includes('fullOrPartialStateName')}.
 */
$IncludedByStateFilter.$inject = ['$state'];
function $IncludedByStateFilter($state) {
  var includesFilter = function (state) {
    return $state.includes(state);
  };
  includesFilter.$stateful = true;
  return  includesFilter;
}

angular.module('ui.router.state')
  .filter('isState', $IsStateFilter)
  .filter('includedByState', $IncludedByStateFilter);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL3ZlbmRvcnMvYW5ndWxhci11aS1yb3V0ZXIvc3JjL3N0YXRlRmlsdGVycy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBuZ2RvYyBmaWx0ZXJcbiAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS5maWx0ZXI6aXNTdGF0ZVxuICpcbiAqIEByZXF1aXJlcyB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBUcmFuc2xhdGVzIHRvIHtAbGluayB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlI21ldGhvZHNfaXMgJHN0YXRlLmlzKFwic3RhdGVOYW1lXCIpfS5cbiAqL1xuJElzU3RhdGVGaWx0ZXIuJGluamVjdCA9IFsnJHN0YXRlJ107XG5mdW5jdGlvbiAkSXNTdGF0ZUZpbHRlcigkc3RhdGUpIHtcbiAgdmFyIGlzRmlsdGVyID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgcmV0dXJuICRzdGF0ZS5pcyhzdGF0ZSk7XG4gIH07XG4gIGlzRmlsdGVyLiRzdGF0ZWZ1bCA9IHRydWU7XG4gIHJldHVybiBpc0ZpbHRlcjtcbn1cblxuLyoqXG4gKiBAbmdkb2MgZmlsdGVyXG4gKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuZmlsdGVyOmluY2x1ZGVkQnlTdGF0ZVxuICpcbiAqIEByZXF1aXJlcyB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBUcmFuc2xhdGVzIHRvIHtAbGluayB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlI21ldGhvZHNfaW5jbHVkZXMgJHN0YXRlLmluY2x1ZGVzKCdmdWxsT3JQYXJ0aWFsU3RhdGVOYW1lJyl9LlxuICovXG4kSW5jbHVkZWRCeVN0YXRlRmlsdGVyLiRpbmplY3QgPSBbJyRzdGF0ZSddO1xuZnVuY3Rpb24gJEluY2x1ZGVkQnlTdGF0ZUZpbHRlcigkc3RhdGUpIHtcbiAgdmFyIGluY2x1ZGVzRmlsdGVyID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgcmV0dXJuICRzdGF0ZS5pbmNsdWRlcyhzdGF0ZSk7XG4gIH07XG4gIGluY2x1ZGVzRmlsdGVyLiRzdGF0ZWZ1bCA9IHRydWU7XG4gIHJldHVybiAgaW5jbHVkZXNGaWx0ZXI7XG59XG5cbmFuZ3VsYXIubW9kdWxlKCd1aS5yb3V0ZXIuc3RhdGUnKVxuICAuZmlsdGVyKCdpc1N0YXRlJywgJElzU3RhdGVGaWx0ZXIpXG4gIC5maWx0ZXIoJ2luY2x1ZGVkQnlTdGF0ZScsICRJbmNsdWRlZEJ5U3RhdGVGaWx0ZXIpO1xuIl0sImZpbGUiOiJzY3JpcHRzL3ZlbmRvcnMvYW5ndWxhci11aS1yb3V0ZXIvc3JjL3N0YXRlRmlsdGVycy5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9