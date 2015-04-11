function parseStateRef(ref, current) {
  var preparsed = ref.match(/^\s*({[^}]*})\s*$/), parsed;
  if (preparsed) ref = current + '(' + preparsed[1] + ')';
  parsed = ref.replace(/\n/g, " ").match(/^([^(]+?)\s*(\((.*)\))?$/);
  if (!parsed || parsed.length !== 4) throw new Error("Invalid state ref '" + ref + "'");
  return { state: parsed[1], paramExpr: parsed[3] || null };
}

function stateContext(el) {
  var stateData = el.parent().inheritedData('$uiView');

  if (stateData && stateData.state && stateData.state.name) {
    return stateData.state;
  }
}

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-sref
 *
 * @requires ui.router.state.$state
 * @requires $timeout
 *
 * @restrict A
 *
 * @description
 * A directive that binds a link (`<a>` tag) to a state. If the state has an associated 
 * URL, the directive will automatically generate & update the `href` attribute via 
 * the {@link ui.router.state.$state#methods_href $state.href()} method. Clicking 
 * the link will trigger a state transition with optional parameters. 
 *
 * Also middle-clicking, right-clicking, and ctrl-clicking on the link will be 
 * handled natively by the browser.
 *
 * You can also use relative state paths within ui-sref, just like the relative 
 * paths passed to `$state.go()`. You just need to be aware that the path is relative
 * to the state that the link lives in, in other words the state that loaded the 
 * template containing the link.
 *
 * You can specify options to pass to {@link ui.router.state.$state#go $state.go()}
 * using the `ui-sref-opts` attribute. Options are restricted to `location`, `inherit`,
 * and `reload`.
 *
 * @example
 * Here's an example of how you'd use ui-sref and how it would compile. If you have the 
 * following template:
 * <pre>
 * <a ui-sref="home">Home</a> | <a ui-sref="about">About</a> | <a ui-sref="{page: 2}">Next page</a>
 * 
 * <ul>
 *     <li ng-repeat="contact in contacts">
 *         <a ui-sref="contacts.detail({ id: contact.id })">{{ contact.name }}</a>
 *     </li>
 * </ul>
 * </pre>
 * 
 * Then the compiled html would be (assuming Html5Mode is off and current state is contacts):
 * <pre>
 * <a href="#/home" ui-sref="home">Home</a> | <a href="#/about" ui-sref="about">About</a> | <a href="#/contacts?page=2" ui-sref="{page: 2}">Next page</a>
 * 
 * <ul>
 *     <li ng-repeat="contact in contacts">
 *         <a href="#/contacts/1" ui-sref="contacts.detail({ id: contact.id })">Joe</a>
 *     </li>
 *     <li ng-repeat="contact in contacts">
 *         <a href="#/contacts/2" ui-sref="contacts.detail({ id: contact.id })">Alice</a>
 *     </li>
 *     <li ng-repeat="contact in contacts">
 *         <a href="#/contacts/3" ui-sref="contacts.detail({ id: contact.id })">Bob</a>
 *     </li>
 * </ul>
 *
 * <a ui-sref="home" ui-sref-opts="{reload: true}">Home</a>
 * </pre>
 *
 * @param {string} ui-sref 'stateName' can be any valid absolute or relative state
 * @param {Object} ui-sref-opts options to pass to {@link ui.router.state.$state#go $state.go()}
 */
$StateRefDirective.$inject = ['$state', '$timeout'];
function $StateRefDirective($state, $timeout) {
  var allowedOptions = ['location', 'inherit', 'reload'];

  return {
    restrict: 'A',
    require: ['?^uiSrefActive', '?^uiSrefActiveEq'],
    link: function(scope, element, attrs, uiSrefActive) {
      var ref = parseStateRef(attrs.uiSref, $state.current.name);
      var params = null, url = null, base = stateContext(element) || $state.$current;
      var newHref = null, isAnchor = element.prop("tagName") === "A";
      var isForm = element[0].nodeName === "FORM";
      var attr = isForm ? "action" : "href", nav = true;

      var options = { relative: base, inherit: true };
      var optionsOverride = scope.$eval(attrs.uiSrefOpts) || {};

      angular.forEach(allowedOptions, function(option) {
        if (option in optionsOverride) {
          options[option] = optionsOverride[option];
        }
      });

      var update = function(newVal) {
        if (newVal) params = angular.copy(newVal);
        if (!nav) return;

        newHref = $state.href(ref.state, params, options);

        var activeDirective = uiSrefActive[1] || uiSrefActive[0];
        if (activeDirective) {
          activeDirective.$$setStateInfo(ref.state, params);
        }
        if (newHref === null) {
          nav = false;
          return false;
        }
        attrs.$set(attr, newHref);
      };

      if (ref.paramExpr) {
        scope.$watch(ref.paramExpr, function(newVal, oldVal) {
          if (newVal !== params) update(newVal);
        }, true);
        params = angular.copy(scope.$eval(ref.paramExpr));
      }
      update();

      if (isForm) return;

      element.bind("click", function(e) {
        var button = e.which || e.button;
        if ( !(button > 1 || e.ctrlKey || e.metaKey || e.shiftKey || element.attr('target')) ) {
          // HACK: This is to allow ng-clicks to be processed before the transition is initiated:
          var transition = $timeout(function() {
            $state.go(ref.state, params, options);
          });
          e.preventDefault();

          // if the state has no URL, ignore one preventDefault from the <a> directive.
          var ignorePreventDefaultCount = isAnchor && !newHref ? 1: 0;
          e.preventDefault = function() {
            if (ignorePreventDefaultCount-- <= 0)
              $timeout.cancel(transition);
          };
        }
      });
    }
  };
}

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-sref-active
 *
 * @requires ui.router.state.$state
 * @requires ui.router.state.$stateParams
 * @requires $interpolate
 *
 * @restrict A
 *
 * @description
 * A directive working alongside ui-sref to add classes to an element when the
 * related ui-sref directive's state is active, and removing them when it is inactive.
 * The primary use-case is to simplify the special appearance of navigation menus
 * relying on `ui-sref`, by having the "active" state's menu button appear different,
 * distinguishing it from the inactive menu items.
 *
 * ui-sref-active can live on the same element as ui-sref or on a parent element. The first
 * ui-sref-active found at the same level or above the ui-sref will be used.
 *
 * Will activate when the ui-sref's target state or any child state is active. If you
 * need to activate only when the ui-sref target state is active and *not* any of
 * it's children, then you will use
 * {@link ui.router.state.directive:ui-sref-active-eq ui-sref-active-eq}
 *
 * @example
 * Given the following template:
 * <pre>
 * <ul>
 *   <li ui-sref-active="active" class="item">
 *     <a href ui-sref="app.user({user: 'bilbobaggins'})">@bilbobaggins</a>
 *   </li>
 * </ul>
 * </pre>
 *
 *
 * When the app state is "app.user" (or any children states), and contains the state parameter "user" with value "bilbobaggins",
 * the resulting HTML will appear as (note the 'active' class):
 * <pre>
 * <ul>
 *   <li ui-sref-active="active" class="item active">
 *     <a ui-sref="app.user({user: 'bilbobaggins'})" href="/users/bilbobaggins">@bilbobaggins</a>
 *   </li>
 * </ul>
 * </pre>
 *
 * The class name is interpolated **once** during the directives link time (any further changes to the
 * interpolated value are ignored).
 *
 * Multiple classes may be specified in a space-separated format:
 * <pre>
 * <ul>
 *   <li ui-sref-active='class1 class2 class3'>
 *     <a ui-sref="app.user">link</a>
 *   </li>
 * </ul>
 * </pre>
 */

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-sref-active-eq
 *
 * @requires ui.router.state.$state
 * @requires ui.router.state.$stateParams
 * @requires $interpolate
 *
 * @restrict A
 *
 * @description
 * The same as {@link ui.router.state.directive:ui-sref-active ui-sref-active} but will only activate
 * when the exact target state used in the `ui-sref` is active; no child states.
 *
 */
$StateRefActiveDirective.$inject = ['$state', '$stateParams', '$interpolate'];
function $StateRefActiveDirective($state, $stateParams, $interpolate) {
  return  {
    restrict: "A",
    controller: ['$scope', '$element', '$attrs', function ($scope, $element, $attrs) {
      var state, params, activeClass;

      // There probably isn't much point in $observing this
      // uiSrefActive and uiSrefActiveEq share the same directive object with some
      // slight difference in logic routing
      activeClass = $interpolate($attrs.uiSrefActiveEq || $attrs.uiSrefActive || '', false)($scope);

      // Allow uiSref to communicate with uiSrefActive[Equals]
      this.$$setStateInfo = function (newState, newParams) {
        state = $state.get(newState, stateContext($element));
        params = newParams;
        update();
      };

      $scope.$on('$stateChangeSuccess', update);

      // Update route state
      function update() {
        if (isMatch()) {
          $element.addClass(activeClass);
        } else {
          $element.removeClass(activeClass);
        }
      }

      function isMatch() {
        if (typeof $attrs.uiSrefActiveEq !== 'undefined') {
          return state && $state.is(state.name, params);
        } else {
          return state && $state.includes(state.name, params);
        }
      }
    }]
  };
}

angular.module('ui.router.state')
  .directive('uiSref', $StateRefDirective)
  .directive('uiSrefActive', $StateRefActiveDirective)
  .directive('uiSrefActiveEq', $StateRefActiveDirective);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL3ZlbmRvcnMvYW5ndWxhci11aS1yb3V0ZXIvc3JjL3N0YXRlRGlyZWN0aXZlcy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJmdW5jdGlvbiBwYXJzZVN0YXRlUmVmKHJlZiwgY3VycmVudCkge1xuICB2YXIgcHJlcGFyc2VkID0gcmVmLm1hdGNoKC9eXFxzKih7W159XSp9KVxccyokLyksIHBhcnNlZDtcbiAgaWYgKHByZXBhcnNlZCkgcmVmID0gY3VycmVudCArICcoJyArIHByZXBhcnNlZFsxXSArICcpJztcbiAgcGFyc2VkID0gcmVmLnJlcGxhY2UoL1xcbi9nLCBcIiBcIikubWF0Y2goL14oW14oXSs/KVxccyooXFwoKC4qKVxcKSk/JC8pO1xuICBpZiAoIXBhcnNlZCB8fCBwYXJzZWQubGVuZ3RoICE9PSA0KSB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHN0YXRlIHJlZiAnXCIgKyByZWYgKyBcIidcIik7XG4gIHJldHVybiB7IHN0YXRlOiBwYXJzZWRbMV0sIHBhcmFtRXhwcjogcGFyc2VkWzNdIHx8IG51bGwgfTtcbn1cblxuZnVuY3Rpb24gc3RhdGVDb250ZXh0KGVsKSB7XG4gIHZhciBzdGF0ZURhdGEgPSBlbC5wYXJlbnQoKS5pbmhlcml0ZWREYXRhKCckdWlWaWV3Jyk7XG5cbiAgaWYgKHN0YXRlRGF0YSAmJiBzdGF0ZURhdGEuc3RhdGUgJiYgc3RhdGVEYXRhLnN0YXRlLm5hbWUpIHtcbiAgICByZXR1cm4gc3RhdGVEYXRhLnN0YXRlO1xuICB9XG59XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdWkucm91dGVyLnN0YXRlLmRpcmVjdGl2ZTp1aS1zcmVmXG4gKlxuICogQHJlcXVpcmVzIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVcbiAqIEByZXF1aXJlcyAkdGltZW91dFxuICpcbiAqIEByZXN0cmljdCBBXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBBIGRpcmVjdGl2ZSB0aGF0IGJpbmRzIGEgbGluayAoYDxhPmAgdGFnKSB0byBhIHN0YXRlLiBJZiB0aGUgc3RhdGUgaGFzIGFuIGFzc29jaWF0ZWQgXG4gKiBVUkwsIHRoZSBkaXJlY3RpdmUgd2lsbCBhdXRvbWF0aWNhbGx5IGdlbmVyYXRlICYgdXBkYXRlIHRoZSBgaHJlZmAgYXR0cmlidXRlIHZpYSBcbiAqIHRoZSB7QGxpbmsgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSNtZXRob2RzX2hyZWYgJHN0YXRlLmhyZWYoKX0gbWV0aG9kLiBDbGlja2luZyBcbiAqIHRoZSBsaW5rIHdpbGwgdHJpZ2dlciBhIHN0YXRlIHRyYW5zaXRpb24gd2l0aCBvcHRpb25hbCBwYXJhbWV0ZXJzLiBcbiAqXG4gKiBBbHNvIG1pZGRsZS1jbGlja2luZywgcmlnaHQtY2xpY2tpbmcsIGFuZCBjdHJsLWNsaWNraW5nIG9uIHRoZSBsaW5rIHdpbGwgYmUgXG4gKiBoYW5kbGVkIG5hdGl2ZWx5IGJ5IHRoZSBicm93c2VyLlxuICpcbiAqIFlvdSBjYW4gYWxzbyB1c2UgcmVsYXRpdmUgc3RhdGUgcGF0aHMgd2l0aGluIHVpLXNyZWYsIGp1c3QgbGlrZSB0aGUgcmVsYXRpdmUgXG4gKiBwYXRocyBwYXNzZWQgdG8gYCRzdGF0ZS5nbygpYC4gWW91IGp1c3QgbmVlZCB0byBiZSBhd2FyZSB0aGF0IHRoZSBwYXRoIGlzIHJlbGF0aXZlXG4gKiB0byB0aGUgc3RhdGUgdGhhdCB0aGUgbGluayBsaXZlcyBpbiwgaW4gb3RoZXIgd29yZHMgdGhlIHN0YXRlIHRoYXQgbG9hZGVkIHRoZSBcbiAqIHRlbXBsYXRlIGNvbnRhaW5pbmcgdGhlIGxpbmsuXG4gKlxuICogWW91IGNhbiBzcGVjaWZ5IG9wdGlvbnMgdG8gcGFzcyB0byB7QGxpbmsgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSNnbyAkc3RhdGUuZ28oKX1cbiAqIHVzaW5nIHRoZSBgdWktc3JlZi1vcHRzYCBhdHRyaWJ1dGUuIE9wdGlvbnMgYXJlIHJlc3RyaWN0ZWQgdG8gYGxvY2F0aW9uYCwgYGluaGVyaXRgLFxuICogYW5kIGByZWxvYWRgLlxuICpcbiAqIEBleGFtcGxlXG4gKiBIZXJlJ3MgYW4gZXhhbXBsZSBvZiBob3cgeW91J2QgdXNlIHVpLXNyZWYgYW5kIGhvdyBpdCB3b3VsZCBjb21waWxlLiBJZiB5b3UgaGF2ZSB0aGUgXG4gKiBmb2xsb3dpbmcgdGVtcGxhdGU6XG4gKiA8cHJlPlxuICogPGEgdWktc3JlZj1cImhvbWVcIj5Ib21lPC9hPiB8IDxhIHVpLXNyZWY9XCJhYm91dFwiPkFib3V0PC9hPiB8IDxhIHVpLXNyZWY9XCJ7cGFnZTogMn1cIj5OZXh0IHBhZ2U8L2E+XG4gKiBcbiAqIDx1bD5cbiAqICAgICA8bGkgbmctcmVwZWF0PVwiY29udGFjdCBpbiBjb250YWN0c1wiPlxuICogICAgICAgICA8YSB1aS1zcmVmPVwiY29udGFjdHMuZGV0YWlsKHsgaWQ6IGNvbnRhY3QuaWQgfSlcIj57eyBjb250YWN0Lm5hbWUgfX08L2E+XG4gKiAgICAgPC9saT5cbiAqIDwvdWw+XG4gKiA8L3ByZT5cbiAqIFxuICogVGhlbiB0aGUgY29tcGlsZWQgaHRtbCB3b3VsZCBiZSAoYXNzdW1pbmcgSHRtbDVNb2RlIGlzIG9mZiBhbmQgY3VycmVudCBzdGF0ZSBpcyBjb250YWN0cyk6XG4gKiA8cHJlPlxuICogPGEgaHJlZj1cIiMvaG9tZVwiIHVpLXNyZWY9XCJob21lXCI+SG9tZTwvYT4gfCA8YSBocmVmPVwiIy9hYm91dFwiIHVpLXNyZWY9XCJhYm91dFwiPkFib3V0PC9hPiB8IDxhIGhyZWY9XCIjL2NvbnRhY3RzP3BhZ2U9MlwiIHVpLXNyZWY9XCJ7cGFnZTogMn1cIj5OZXh0IHBhZ2U8L2E+XG4gKiBcbiAqIDx1bD5cbiAqICAgICA8bGkgbmctcmVwZWF0PVwiY29udGFjdCBpbiBjb250YWN0c1wiPlxuICogICAgICAgICA8YSBocmVmPVwiIy9jb250YWN0cy8xXCIgdWktc3JlZj1cImNvbnRhY3RzLmRldGFpbCh7IGlkOiBjb250YWN0LmlkIH0pXCI+Sm9lPC9hPlxuICogICAgIDwvbGk+XG4gKiAgICAgPGxpIG5nLXJlcGVhdD1cImNvbnRhY3QgaW4gY29udGFjdHNcIj5cbiAqICAgICAgICAgPGEgaHJlZj1cIiMvY29udGFjdHMvMlwiIHVpLXNyZWY9XCJjb250YWN0cy5kZXRhaWwoeyBpZDogY29udGFjdC5pZCB9KVwiPkFsaWNlPC9hPlxuICogICAgIDwvbGk+XG4gKiAgICAgPGxpIG5nLXJlcGVhdD1cImNvbnRhY3QgaW4gY29udGFjdHNcIj5cbiAqICAgICAgICAgPGEgaHJlZj1cIiMvY29udGFjdHMvM1wiIHVpLXNyZWY9XCJjb250YWN0cy5kZXRhaWwoeyBpZDogY29udGFjdC5pZCB9KVwiPkJvYjwvYT5cbiAqICAgICA8L2xpPlxuICogPC91bD5cbiAqXG4gKiA8YSB1aS1zcmVmPVwiaG9tZVwiIHVpLXNyZWYtb3B0cz1cIntyZWxvYWQ6IHRydWV9XCI+SG9tZTwvYT5cbiAqIDwvcHJlPlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB1aS1zcmVmICdzdGF0ZU5hbWUnIGNhbiBiZSBhbnkgdmFsaWQgYWJzb2x1dGUgb3IgcmVsYXRpdmUgc3RhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSB1aS1zcmVmLW9wdHMgb3B0aW9ucyB0byBwYXNzIHRvIHtAbGluayB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlI2dvICRzdGF0ZS5nbygpfVxuICovXG4kU3RhdGVSZWZEaXJlY3RpdmUuJGluamVjdCA9IFsnJHN0YXRlJywgJyR0aW1lb3V0J107XG5mdW5jdGlvbiAkU3RhdGVSZWZEaXJlY3RpdmUoJHN0YXRlLCAkdGltZW91dCkge1xuICB2YXIgYWxsb3dlZE9wdGlvbnMgPSBbJ2xvY2F0aW9uJywgJ2luaGVyaXQnLCAncmVsb2FkJ107XG5cbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIHJlcXVpcmU6IFsnP151aVNyZWZBY3RpdmUnLCAnP151aVNyZWZBY3RpdmVFcSddLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgdWlTcmVmQWN0aXZlKSB7XG4gICAgICB2YXIgcmVmID0gcGFyc2VTdGF0ZVJlZihhdHRycy51aVNyZWYsICRzdGF0ZS5jdXJyZW50Lm5hbWUpO1xuICAgICAgdmFyIHBhcmFtcyA9IG51bGwsIHVybCA9IG51bGwsIGJhc2UgPSBzdGF0ZUNvbnRleHQoZWxlbWVudCkgfHwgJHN0YXRlLiRjdXJyZW50O1xuICAgICAgdmFyIG5ld0hyZWYgPSBudWxsLCBpc0FuY2hvciA9IGVsZW1lbnQucHJvcChcInRhZ05hbWVcIikgPT09IFwiQVwiO1xuICAgICAgdmFyIGlzRm9ybSA9IGVsZW1lbnRbMF0ubm9kZU5hbWUgPT09IFwiRk9STVwiO1xuICAgICAgdmFyIGF0dHIgPSBpc0Zvcm0gPyBcImFjdGlvblwiIDogXCJocmVmXCIsIG5hdiA9IHRydWU7XG5cbiAgICAgIHZhciBvcHRpb25zID0geyByZWxhdGl2ZTogYmFzZSwgaW5oZXJpdDogdHJ1ZSB9O1xuICAgICAgdmFyIG9wdGlvbnNPdmVycmlkZSA9IHNjb3BlLiRldmFsKGF0dHJzLnVpU3JlZk9wdHMpIHx8IHt9O1xuXG4gICAgICBhbmd1bGFyLmZvckVhY2goYWxsb3dlZE9wdGlvbnMsIGZ1bmN0aW9uKG9wdGlvbikge1xuICAgICAgICBpZiAob3B0aW9uIGluIG9wdGlvbnNPdmVycmlkZSkge1xuICAgICAgICAgIG9wdGlvbnNbb3B0aW9uXSA9IG9wdGlvbnNPdmVycmlkZVtvcHRpb25dO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgdmFyIHVwZGF0ZSA9IGZ1bmN0aW9uKG5ld1ZhbCkge1xuICAgICAgICBpZiAobmV3VmFsKSBwYXJhbXMgPSBhbmd1bGFyLmNvcHkobmV3VmFsKTtcbiAgICAgICAgaWYgKCFuYXYpIHJldHVybjtcblxuICAgICAgICBuZXdIcmVmID0gJHN0YXRlLmhyZWYocmVmLnN0YXRlLCBwYXJhbXMsIG9wdGlvbnMpO1xuXG4gICAgICAgIHZhciBhY3RpdmVEaXJlY3RpdmUgPSB1aVNyZWZBY3RpdmVbMV0gfHwgdWlTcmVmQWN0aXZlWzBdO1xuICAgICAgICBpZiAoYWN0aXZlRGlyZWN0aXZlKSB7XG4gICAgICAgICAgYWN0aXZlRGlyZWN0aXZlLiQkc2V0U3RhdGVJbmZvKHJlZi5zdGF0ZSwgcGFyYW1zKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobmV3SHJlZiA9PT0gbnVsbCkge1xuICAgICAgICAgIG5hdiA9IGZhbHNlO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBhdHRycy4kc2V0KGF0dHIsIG5ld0hyZWYpO1xuICAgICAgfTtcblxuICAgICAgaWYgKHJlZi5wYXJhbUV4cHIpIHtcbiAgICAgICAgc2NvcGUuJHdhdGNoKHJlZi5wYXJhbUV4cHIsIGZ1bmN0aW9uKG5ld1ZhbCwgb2xkVmFsKSB7XG4gICAgICAgICAgaWYgKG5ld1ZhbCAhPT0gcGFyYW1zKSB1cGRhdGUobmV3VmFsKTtcbiAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICAgIHBhcmFtcyA9IGFuZ3VsYXIuY29weShzY29wZS4kZXZhbChyZWYucGFyYW1FeHByKSk7XG4gICAgICB9XG4gICAgICB1cGRhdGUoKTtcblxuICAgICAgaWYgKGlzRm9ybSkgcmV0dXJuO1xuXG4gICAgICBlbGVtZW50LmJpbmQoXCJjbGlja1wiLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIHZhciBidXR0b24gPSBlLndoaWNoIHx8IGUuYnV0dG9uO1xuICAgICAgICBpZiAoICEoYnV0dG9uID4gMSB8fCBlLmN0cmxLZXkgfHwgZS5tZXRhS2V5IHx8IGUuc2hpZnRLZXkgfHwgZWxlbWVudC5hdHRyKCd0YXJnZXQnKSkgKSB7XG4gICAgICAgICAgLy8gSEFDSzogVGhpcyBpcyB0byBhbGxvdyBuZy1jbGlja3MgdG8gYmUgcHJvY2Vzc2VkIGJlZm9yZSB0aGUgdHJhbnNpdGlvbiBpcyBpbml0aWF0ZWQ6XG4gICAgICAgICAgdmFyIHRyYW5zaXRpb24gPSAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbyhyZWYuc3RhdGUsIHBhcmFtcywgb3B0aW9ucyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgLy8gaWYgdGhlIHN0YXRlIGhhcyBubyBVUkwsIGlnbm9yZSBvbmUgcHJldmVudERlZmF1bHQgZnJvbSB0aGUgPGE+IGRpcmVjdGl2ZS5cbiAgICAgICAgICB2YXIgaWdub3JlUHJldmVudERlZmF1bHRDb3VudCA9IGlzQW5jaG9yICYmICFuZXdIcmVmID8gMTogMDtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoaWdub3JlUHJldmVudERlZmF1bHRDb3VudC0tIDw9IDApXG4gICAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbCh0cmFuc2l0aW9uKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdWkucm91dGVyLnN0YXRlLmRpcmVjdGl2ZTp1aS1zcmVmLWFjdGl2ZVxuICpcbiAqIEByZXF1aXJlcyB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlXG4gKiBAcmVxdWlyZXMgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVBhcmFtc1xuICogQHJlcXVpcmVzICRpbnRlcnBvbGF0ZVxuICpcbiAqIEByZXN0cmljdCBBXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBBIGRpcmVjdGl2ZSB3b3JraW5nIGFsb25nc2lkZSB1aS1zcmVmIHRvIGFkZCBjbGFzc2VzIHRvIGFuIGVsZW1lbnQgd2hlbiB0aGVcbiAqIHJlbGF0ZWQgdWktc3JlZiBkaXJlY3RpdmUncyBzdGF0ZSBpcyBhY3RpdmUsIGFuZCByZW1vdmluZyB0aGVtIHdoZW4gaXQgaXMgaW5hY3RpdmUuXG4gKiBUaGUgcHJpbWFyeSB1c2UtY2FzZSBpcyB0byBzaW1wbGlmeSB0aGUgc3BlY2lhbCBhcHBlYXJhbmNlIG9mIG5hdmlnYXRpb24gbWVudXNcbiAqIHJlbHlpbmcgb24gYHVpLXNyZWZgLCBieSBoYXZpbmcgdGhlIFwiYWN0aXZlXCIgc3RhdGUncyBtZW51IGJ1dHRvbiBhcHBlYXIgZGlmZmVyZW50LFxuICogZGlzdGluZ3Vpc2hpbmcgaXQgZnJvbSB0aGUgaW5hY3RpdmUgbWVudSBpdGVtcy5cbiAqXG4gKiB1aS1zcmVmLWFjdGl2ZSBjYW4gbGl2ZSBvbiB0aGUgc2FtZSBlbGVtZW50IGFzIHVpLXNyZWYgb3Igb24gYSBwYXJlbnQgZWxlbWVudC4gVGhlIGZpcnN0XG4gKiB1aS1zcmVmLWFjdGl2ZSBmb3VuZCBhdCB0aGUgc2FtZSBsZXZlbCBvciBhYm92ZSB0aGUgdWktc3JlZiB3aWxsIGJlIHVzZWQuXG4gKlxuICogV2lsbCBhY3RpdmF0ZSB3aGVuIHRoZSB1aS1zcmVmJ3MgdGFyZ2V0IHN0YXRlIG9yIGFueSBjaGlsZCBzdGF0ZSBpcyBhY3RpdmUuIElmIHlvdVxuICogbmVlZCB0byBhY3RpdmF0ZSBvbmx5IHdoZW4gdGhlIHVpLXNyZWYgdGFyZ2V0IHN0YXRlIGlzIGFjdGl2ZSBhbmQgKm5vdCogYW55IG9mXG4gKiBpdCdzIGNoaWxkcmVuLCB0aGVuIHlvdSB3aWxsIHVzZVxuICoge0BsaW5rIHVpLnJvdXRlci5zdGF0ZS5kaXJlY3RpdmU6dWktc3JlZi1hY3RpdmUtZXEgdWktc3JlZi1hY3RpdmUtZXF9XG4gKlxuICogQGV4YW1wbGVcbiAqIEdpdmVuIHRoZSBmb2xsb3dpbmcgdGVtcGxhdGU6XG4gKiA8cHJlPlxuICogPHVsPlxuICogICA8bGkgdWktc3JlZi1hY3RpdmU9XCJhY3RpdmVcIiBjbGFzcz1cIml0ZW1cIj5cbiAqICAgICA8YSBocmVmIHVpLXNyZWY9XCJhcHAudXNlcih7dXNlcjogJ2JpbGJvYmFnZ2lucyd9KVwiPkBiaWxib2JhZ2dpbnM8L2E+XG4gKiAgIDwvbGk+XG4gKiA8L3VsPlxuICogPC9wcmU+XG4gKlxuICpcbiAqIFdoZW4gdGhlIGFwcCBzdGF0ZSBpcyBcImFwcC51c2VyXCIgKG9yIGFueSBjaGlsZHJlbiBzdGF0ZXMpLCBhbmQgY29udGFpbnMgdGhlIHN0YXRlIHBhcmFtZXRlciBcInVzZXJcIiB3aXRoIHZhbHVlIFwiYmlsYm9iYWdnaW5zXCIsXG4gKiB0aGUgcmVzdWx0aW5nIEhUTUwgd2lsbCBhcHBlYXIgYXMgKG5vdGUgdGhlICdhY3RpdmUnIGNsYXNzKTpcbiAqIDxwcmU+XG4gKiA8dWw+XG4gKiAgIDxsaSB1aS1zcmVmLWFjdGl2ZT1cImFjdGl2ZVwiIGNsYXNzPVwiaXRlbSBhY3RpdmVcIj5cbiAqICAgICA8YSB1aS1zcmVmPVwiYXBwLnVzZXIoe3VzZXI6ICdiaWxib2JhZ2dpbnMnfSlcIiBocmVmPVwiL3VzZXJzL2JpbGJvYmFnZ2luc1wiPkBiaWxib2JhZ2dpbnM8L2E+XG4gKiAgIDwvbGk+XG4gKiA8L3VsPlxuICogPC9wcmU+XG4gKlxuICogVGhlIGNsYXNzIG5hbWUgaXMgaW50ZXJwb2xhdGVkICoqb25jZSoqIGR1cmluZyB0aGUgZGlyZWN0aXZlcyBsaW5rIHRpbWUgKGFueSBmdXJ0aGVyIGNoYW5nZXMgdG8gdGhlXG4gKiBpbnRlcnBvbGF0ZWQgdmFsdWUgYXJlIGlnbm9yZWQpLlxuICpcbiAqIE11bHRpcGxlIGNsYXNzZXMgbWF5IGJlIHNwZWNpZmllZCBpbiBhIHNwYWNlLXNlcGFyYXRlZCBmb3JtYXQ6XG4gKiA8cHJlPlxuICogPHVsPlxuICogICA8bGkgdWktc3JlZi1hY3RpdmU9J2NsYXNzMSBjbGFzczIgY2xhc3MzJz5cbiAqICAgICA8YSB1aS1zcmVmPVwiYXBwLnVzZXJcIj5saW5rPC9hPlxuICogICA8L2xpPlxuICogPC91bD5cbiAqIDwvcHJlPlxuICovXG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdWkucm91dGVyLnN0YXRlLmRpcmVjdGl2ZTp1aS1zcmVmLWFjdGl2ZS1lcVxuICpcbiAqIEByZXF1aXJlcyB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlXG4gKiBAcmVxdWlyZXMgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVBhcmFtc1xuICogQHJlcXVpcmVzICRpbnRlcnBvbGF0ZVxuICpcbiAqIEByZXN0cmljdCBBXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBUaGUgc2FtZSBhcyB7QGxpbmsgdWkucm91dGVyLnN0YXRlLmRpcmVjdGl2ZTp1aS1zcmVmLWFjdGl2ZSB1aS1zcmVmLWFjdGl2ZX0gYnV0IHdpbGwgb25seSBhY3RpdmF0ZVxuICogd2hlbiB0aGUgZXhhY3QgdGFyZ2V0IHN0YXRlIHVzZWQgaW4gdGhlIGB1aS1zcmVmYCBpcyBhY3RpdmU7IG5vIGNoaWxkIHN0YXRlcy5cbiAqXG4gKi9cbiRTdGF0ZVJlZkFjdGl2ZURpcmVjdGl2ZS4kaW5qZWN0ID0gWyckc3RhdGUnLCAnJHN0YXRlUGFyYW1zJywgJyRpbnRlcnBvbGF0ZSddO1xuZnVuY3Rpb24gJFN0YXRlUmVmQWN0aXZlRGlyZWN0aXZlKCRzdGF0ZSwgJHN0YXRlUGFyYW1zLCAkaW50ZXJwb2xhdGUpIHtcbiAgcmV0dXJuICB7XG4gICAgcmVzdHJpY3Q6IFwiQVwiLFxuICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJyRlbGVtZW50JywgJyRhdHRycycsIGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMpIHtcbiAgICAgIHZhciBzdGF0ZSwgcGFyYW1zLCBhY3RpdmVDbGFzcztcblxuICAgICAgLy8gVGhlcmUgcHJvYmFibHkgaXNuJ3QgbXVjaCBwb2ludCBpbiAkb2JzZXJ2aW5nIHRoaXNcbiAgICAgIC8vIHVpU3JlZkFjdGl2ZSBhbmQgdWlTcmVmQWN0aXZlRXEgc2hhcmUgdGhlIHNhbWUgZGlyZWN0aXZlIG9iamVjdCB3aXRoIHNvbWVcbiAgICAgIC8vIHNsaWdodCBkaWZmZXJlbmNlIGluIGxvZ2ljIHJvdXRpbmdcbiAgICAgIGFjdGl2ZUNsYXNzID0gJGludGVycG9sYXRlKCRhdHRycy51aVNyZWZBY3RpdmVFcSB8fCAkYXR0cnMudWlTcmVmQWN0aXZlIHx8ICcnLCBmYWxzZSkoJHNjb3BlKTtcblxuICAgICAgLy8gQWxsb3cgdWlTcmVmIHRvIGNvbW11bmljYXRlIHdpdGggdWlTcmVmQWN0aXZlW0VxdWFsc11cbiAgICAgIHRoaXMuJCRzZXRTdGF0ZUluZm8gPSBmdW5jdGlvbiAobmV3U3RhdGUsIG5ld1BhcmFtcykge1xuICAgICAgICBzdGF0ZSA9ICRzdGF0ZS5nZXQobmV3U3RhdGUsIHN0YXRlQ29udGV4dCgkZWxlbWVudCkpO1xuICAgICAgICBwYXJhbXMgPSBuZXdQYXJhbXM7XG4gICAgICAgIHVwZGF0ZSgpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3VjY2VzcycsIHVwZGF0ZSk7XG5cbiAgICAgIC8vIFVwZGF0ZSByb3V0ZSBzdGF0ZVxuICAgICAgZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgICAgICBpZiAoaXNNYXRjaCgpKSB7XG4gICAgICAgICAgJGVsZW1lbnQuYWRkQ2xhc3MoYWN0aXZlQ2xhc3MpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICRlbGVtZW50LnJlbW92ZUNsYXNzKGFjdGl2ZUNsYXNzKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBpc01hdGNoKCkge1xuICAgICAgICBpZiAodHlwZW9mICRhdHRycy51aVNyZWZBY3RpdmVFcSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICByZXR1cm4gc3RhdGUgJiYgJHN0YXRlLmlzKHN0YXRlLm5hbWUsIHBhcmFtcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHN0YXRlICYmICRzdGF0ZS5pbmNsdWRlcyhzdGF0ZS5uYW1lLCBwYXJhbXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfV1cbiAgfTtcbn1cblxuYW5ndWxhci5tb2R1bGUoJ3VpLnJvdXRlci5zdGF0ZScpXG4gIC5kaXJlY3RpdmUoJ3VpU3JlZicsICRTdGF0ZVJlZkRpcmVjdGl2ZSlcbiAgLmRpcmVjdGl2ZSgndWlTcmVmQWN0aXZlJywgJFN0YXRlUmVmQWN0aXZlRGlyZWN0aXZlKVxuICAuZGlyZWN0aXZlKCd1aVNyZWZBY3RpdmVFcScsICRTdGF0ZVJlZkFjdGl2ZURpcmVjdGl2ZSk7XG4iXSwiZmlsZSI6InNjcmlwdHMvdmVuZG9ycy9hbmd1bGFyLXVpLXJvdXRlci9zcmMvc3RhdGVEaXJlY3RpdmVzLmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=