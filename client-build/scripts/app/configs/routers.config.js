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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL2FwcC9jb25maWdzL3JvdXRlcnMuY29uZmlnLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImRlZmluZShmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgcmV0dXJuIFsnJHN0YXRlUHJvdmlkZXInLCAnJHVybFJvdXRlclByb3ZpZGVyJywgJyRodHRwUHJvdmlkZXInLFxuICAgICAgICBmdW5jdGlvbiAoICRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsICRodHRwUHJvdmlkZXIgKSB7XG5cbiAgICAgICAgICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoXCIvbXktcm91dGVcIik7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVzY3JpcHRpb24gYWxsIHJvdXRlcnMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdtYWluJywge1xuICAgICAgICAgICAgICAgICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6ICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdoZWFkZXInOiAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAndGVtcGxhdGVzL2FwcC9tYWluL2hlYWRlci50bXBsLmh0bWwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGU6ICdDb250ZW50J1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdmb290ZXInOiAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAndGVtcGxhdGVzL2FwcC9tYWluL2Zvb3Rlci50bXBsLmh0bWwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfV07XG59KTsiXSwiZmlsZSI6InNjcmlwdHMvYXBwL2NvbmZpZ3Mvcm91dGVycy5jb25maWcuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==