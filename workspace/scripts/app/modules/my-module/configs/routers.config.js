define(function () {
    "use strict";
    return ['$stateProvider', function ($stateProvider) {

        /**
         * Description all routers.
         */
        $stateProvider

            // Authorization list Page.
            .state('main.my-route', {
                url: '/my-route',
                views: {
                    'content@': {
                        controller: 'MyControllerCtrl',
                        templateUrl: 'templates/app/my-module/my-template.tmpl.html'
                    }
                }
            });
    }];
});