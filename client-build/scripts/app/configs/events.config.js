/**
 * Created by smy on 5/16/2014.
 */
define(function () {
    "use strict";
    return ['$rootScope', '$state', '$stateParams',
        function ( $rootScope, $state, $stateParams) {

            var goTo404 = function () {

            };

            $rootScope.$on('$stateChangeStart', function () {});
            $rootScope.$on('$stateChangeSuccess', function () {});
            $rootScope.$on('$stateChangeError', goTo404);
            $rootScope.$on('$stateNotFound', goTo404);

            // For use $state in views
            $rootScope.$state = $state;
            $rootScope.$stateParams = $stateParams;

        }
    ];
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL2FwcC9jb25maWdzL2V2ZW50cy5jb25maWcuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDcmVhdGVkIGJ5IHNteSBvbiA1LzE2LzIwMTQuXG4gKi9cbmRlZmluZShmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgcmV0dXJuIFsnJHJvb3RTY29wZScsICckc3RhdGUnLCAnJHN0YXRlUGFyYW1zJyxcbiAgICAgICAgZnVuY3Rpb24gKCAkcm9vdFNjb3BlLCAkc3RhdGUsICRzdGF0ZVBhcmFtcykge1xuXG4gICAgICAgICAgICB2YXIgZ29UbzQwNCA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKCkge30pO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN1Y2Nlc3MnLCBmdW5jdGlvbiAoKSB7fSk7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlRXJyb3InLCBnb1RvNDA0KTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVOb3RGb3VuZCcsIGdvVG80MDQpO1xuXG4gICAgICAgICAgICAvLyBGb3IgdXNlICRzdGF0ZSBpbiB2aWV3c1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kc3RhdGUgPSAkc3RhdGU7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRzdGF0ZVBhcmFtcyA9ICRzdGF0ZVBhcmFtcztcblxuICAgICAgICB9XG4gICAgXTtcbn0pOyJdLCJmaWxlIjoic2NyaXB0cy9hcHAvY29uZmlncy9ldmVudHMuY29uZmlnLmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=