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