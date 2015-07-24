define(function () {
    "use strict";
    return ['$stateProvider', function ($stateProvider) {

        /**
         * Description all routers.
         */
        $stateProvider

            // Authorization list Page.
            .state('my-route', {
                url: '/my-route',
                parent: 'main',
                views: {
                    'content': {
                        controller: 'MyControllerCtrl',
                        templateUrl: 'templates/app/my-module/my-template.tmpl.html'
                    }
                }
            });
    }];
});