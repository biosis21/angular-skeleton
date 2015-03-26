define(function () {
    "use strict";
    return ['$stateProvider', '$urlRouterProvider', '$httpProvider',
        function ( $stateProvider, $urlRouterProvider, $httpProvider ) {

            $urlRouterProvider.otherwise("/my-route");

            /**
             * Description all routers.
             */
            $stateProvider
                .state('main', {
                    abstract: true,
                    views:    {
                        'header':  {
                            templateUrl: 'templates/app/main/header.tmpl.html'
                        },
                        'content': {
                            template: 'Content'
                        },
                        'footer':  {
                            templateUrl: 'templates/app/main/footer.tmpl.html'
                        }
                    }
                });
        }];
});