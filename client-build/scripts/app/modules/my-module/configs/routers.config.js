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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL2FwcC9tb2R1bGVzL215LW1vZHVsZS9jb25maWdzL3JvdXRlcnMuY29uZmlnLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImRlZmluZShmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgcmV0dXJuIFsnJHN0YXRlUHJvdmlkZXInLCBmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVzY3JpcHRpb24gYWxsIHJvdXRlcnMuXG4gICAgICAgICAqL1xuICAgICAgICAkc3RhdGVQcm92aWRlclxuXG4gICAgICAgICAgICAvLyBBdXRob3JpemF0aW9uIGxpc3QgUGFnZS5cbiAgICAgICAgICAgIC5zdGF0ZSgnbWFpbi5teS1yb3V0ZScsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvbXktcm91dGUnLFxuICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICdjb250ZW50QCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdNeUNvbnRyb2xsZXJDdHJsJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAndGVtcGxhdGVzL2FwcC9teS1tb2R1bGUvbXktdGVtcGxhdGUudG1wbC5odG1sJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgfV07XG59KTsiXSwiZmlsZSI6InNjcmlwdHMvYXBwL21vZHVsZXMvbXktbW9kdWxlL2NvbmZpZ3Mvcm91dGVycy5jb25maWcuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==