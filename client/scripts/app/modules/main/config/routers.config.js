define(function () {
    "use strict";
    return ['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {

        $urlRouterProvider.otherwise("/my-route");

        /**
         * Description all routers.
         */
        $stateProvider
            .state('main', {
                abstract: true,
                url: '',
                views: {
                    '': {
                        templateUrl: 'templates/app/main/main.tmpl.html',
                        controller: 'MainCtrl'
                    },
                    'header@main': {
                        templateUrl: 'templates/app/main/header.tmpl.html',
                        controller: 'HeaderCtrl'
                    },
                    'content@main': 'content',
                    'footer@main': {
                        templateUrl: 'templates/app/main/footer.tmpl.html',
                        controller: 'FooterCtrl'
                    }
                }
            });
    }];
});
