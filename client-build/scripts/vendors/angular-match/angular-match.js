/*! Angular match v1.0.1 | (c) 2014 Greg Bergé | License MIT */

angular
.module('match', [])
.directive('match', ['$parse', matchDirective]);

/**
 * Match directive.
 *
 * @example
 * <input type="password" ng-match="password">
 */

function matchDirective($parse) {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function (scope, element, attrs, ctrl) {
      scope.$watch(function () {
        return [scope.$eval(attrs.match), ctrl.$viewValue];
      }, function (values) {
        ctrl.$setValidity('match', values[0] === values[1]);
      }, true);
    }
  };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL3ZlbmRvcnMvYW5ndWxhci1tYXRjaC9hbmd1bGFyLW1hdGNoLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qISBBbmd1bGFyIG1hdGNoIHYxLjAuMSB8IChjKSAyMDE0IEdyZWcgQmVyZ8OpIHwgTGljZW5zZSBNSVQgKi9cblxuYW5ndWxhclxuLm1vZHVsZSgnbWF0Y2gnLCBbXSlcbi5kaXJlY3RpdmUoJ21hdGNoJywgWyckcGFyc2UnLCBtYXRjaERpcmVjdGl2ZV0pO1xuXG4vKipcbiAqIE1hdGNoIGRpcmVjdGl2ZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogPGlucHV0IHR5cGU9XCJwYXNzd29yZFwiIG5nLW1hdGNoPVwicGFzc3dvcmRcIj5cbiAqL1xuXG5mdW5jdGlvbiBtYXRjaERpcmVjdGl2ZSgkcGFyc2UpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIHJlcXVpcmU6ICduZ01vZGVsJyxcbiAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJsKSB7XG4gICAgICBzY29wZS4kd2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gW3Njb3BlLiRldmFsKGF0dHJzLm1hdGNoKSwgY3RybC4kdmlld1ZhbHVlXTtcbiAgICAgIH0sIGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgICAgICAgY3RybC4kc2V0VmFsaWRpdHkoJ21hdGNoJywgdmFsdWVzWzBdID09PSB2YWx1ZXNbMV0pO1xuICAgICAgfSwgdHJ1ZSk7XG4gICAgfVxuICB9O1xufSJdLCJmaWxlIjoic2NyaXB0cy92ZW5kb3JzL2FuZ3VsYXItbWF0Y2gvYW5ndWxhci1tYXRjaC5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9