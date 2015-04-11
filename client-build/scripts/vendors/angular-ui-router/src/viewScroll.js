/**
 * @ngdoc object
 * @name ui.router.state.$uiViewScrollProvider
 *
 * @description
 * Provider that returns the {@link ui.router.state.$uiViewScroll} service function.
 */
function $ViewScrollProvider() {

  var useAnchorScroll = false;

  /**
   * @ngdoc function
   * @name ui.router.state.$uiViewScrollProvider#useAnchorScroll
   * @methodOf ui.router.state.$uiViewScrollProvider
   *
   * @description
   * Reverts back to using the core [`$anchorScroll`](http://docs.angularjs.org/api/ng.$anchorScroll) service for
   * scrolling based on the url anchor.
   */
  this.useAnchorScroll = function () {
    useAnchorScroll = true;
  };

  /**
   * @ngdoc object
   * @name ui.router.state.$uiViewScroll
   *
   * @requires $anchorScroll
   * @requires $timeout
   *
   * @description
   * When called with a jqLite element, it scrolls the element into view (after a
   * `$timeout` so the DOM has time to refresh).
   *
   * If you prefer to rely on `$anchorScroll` to scroll the view to the anchor,
   * this can be enabled by calling {@link ui.router.state.$uiViewScrollProvider#methods_useAnchorScroll `$uiViewScrollProvider.useAnchorScroll()`}.
   */
  this.$get = ['$anchorScroll', '$timeout', function ($anchorScroll, $timeout) {
    if (useAnchorScroll) {
      return $anchorScroll;
    }

    return function ($element) {
      $timeout(function () {
        $element[0].scrollIntoView();
      }, 0, false);
    };
  }];
}

angular.module('ui.router.state').provider('$uiViewScroll', $ViewScrollProvider);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL3ZlbmRvcnMvYW5ndWxhci11aS1yb3V0ZXIvc3JjL3ZpZXdTY3JvbGwuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbmdkb2Mgb2JqZWN0XG4gKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHVpVmlld1Njcm9sbFByb3ZpZGVyXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBQcm92aWRlciB0aGF0IHJldHVybnMgdGhlIHtAbGluayB1aS5yb3V0ZXIuc3RhdGUuJHVpVmlld1Njcm9sbH0gc2VydmljZSBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gJFZpZXdTY3JvbGxQcm92aWRlcigpIHtcblxuICB2YXIgdXNlQW5jaG9yU2Nyb2xsID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHVpVmlld1Njcm9sbFByb3ZpZGVyI3VzZUFuY2hvclNjcm9sbFxuICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnN0YXRlLiR1aVZpZXdTY3JvbGxQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogUmV2ZXJ0cyBiYWNrIHRvIHVzaW5nIHRoZSBjb3JlIFtgJGFuY2hvclNjcm9sbGBdKGh0dHA6Ly9kb2NzLmFuZ3VsYXJqcy5vcmcvYXBpL25nLiRhbmNob3JTY3JvbGwpIHNlcnZpY2UgZm9yXG4gICAqIHNjcm9sbGluZyBiYXNlZCBvbiB0aGUgdXJsIGFuY2hvci5cbiAgICovXG4gIHRoaXMudXNlQW5jaG9yU2Nyb2xsID0gZnVuY3Rpb24gKCkge1xuICAgIHVzZUFuY2hvclNjcm9sbCA9IHRydWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBvYmplY3RcbiAgICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiR1aVZpZXdTY3JvbGxcbiAgICpcbiAgICogQHJlcXVpcmVzICRhbmNob3JTY3JvbGxcbiAgICogQHJlcXVpcmVzICR0aW1lb3V0XG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBXaGVuIGNhbGxlZCB3aXRoIGEganFMaXRlIGVsZW1lbnQsIGl0IHNjcm9sbHMgdGhlIGVsZW1lbnQgaW50byB2aWV3IChhZnRlciBhXG4gICAqIGAkdGltZW91dGAgc28gdGhlIERPTSBoYXMgdGltZSB0byByZWZyZXNoKS5cbiAgICpcbiAgICogSWYgeW91IHByZWZlciB0byByZWx5IG9uIGAkYW5jaG9yU2Nyb2xsYCB0byBzY3JvbGwgdGhlIHZpZXcgdG8gdGhlIGFuY2hvcixcbiAgICogdGhpcyBjYW4gYmUgZW5hYmxlZCBieSBjYWxsaW5nIHtAbGluayB1aS5yb3V0ZXIuc3RhdGUuJHVpVmlld1Njcm9sbFByb3ZpZGVyI21ldGhvZHNfdXNlQW5jaG9yU2Nyb2xsIGAkdWlWaWV3U2Nyb2xsUHJvdmlkZXIudXNlQW5jaG9yU2Nyb2xsKClgfS5cbiAgICovXG4gIHRoaXMuJGdldCA9IFsnJGFuY2hvclNjcm9sbCcsICckdGltZW91dCcsIGZ1bmN0aW9uICgkYW5jaG9yU2Nyb2xsLCAkdGltZW91dCkge1xuICAgIGlmICh1c2VBbmNob3JTY3JvbGwpIHtcbiAgICAgIHJldHVybiAkYW5jaG9yU2Nyb2xsO1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiAoJGVsZW1lbnQpIHtcbiAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJGVsZW1lbnRbMF0uc2Nyb2xsSW50b1ZpZXcoKTtcbiAgICAgIH0sIDAsIGZhbHNlKTtcbiAgICB9O1xuICB9XTtcbn1cblxuYW5ndWxhci5tb2R1bGUoJ3VpLnJvdXRlci5zdGF0ZScpLnByb3ZpZGVyKCckdWlWaWV3U2Nyb2xsJywgJFZpZXdTY3JvbGxQcm92aWRlcik7XG4iXSwiZmlsZSI6InNjcmlwdHMvdmVuZG9ycy9hbmd1bGFyLXVpLXJvdXRlci9zcmMvdmlld1Njcm9sbC5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9