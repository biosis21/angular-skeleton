require.config({
    baseUrl: "./scripts/app",
    paths: {
        'angular':          '../vendors/angular/angular.min',
        'angularRouter':    '../vendors/angular-ui-router/release/angular-ui-router.min',
        'angularResource':  '../vendors/angular-resource/angular-resource.min',
        'angularMatch':     '../vendors/angular-match/angular-match.min',
        'angularTemplates': './templates/templates',
        'jquery':           '../vendors/jquery/dist/jquery'
    },
    priority: [
        'jquery', 'angular'
    ],
    shim: {
        'angular': {
            exports: 'angular',
            deps: ['jquery']
        },
        'angularRouter': ['angular'],
        'angularResource': ['angular'],
        'angularTemplates': ['angular'],
        'jquery': {
            exports: 'jQuery'
        },
        'App': ['angular', 'jquery']
    },
    packages: [
        {
            name:     'App.Main',
            location: './modules/main'
        },
        {
            name: 'App.Common',
            location: './common'
        },
        {
            name: 'App.MyModule',
            location: './modules/my-module'
        }
    ],
    deps: ['App']
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL2FwcC9ib290c3RyYXAuanMiXSwic291cmNlc0NvbnRlbnQiOlsicmVxdWlyZS5jb25maWcoe1xuICAgIGJhc2VVcmw6IFwiLi9zY3JpcHRzL2FwcFwiLFxuICAgIHBhdGhzOiB7XG4gICAgICAgICdhbmd1bGFyJzogICAgICAgICAgJy4uL3ZlbmRvcnMvYW5ndWxhci9hbmd1bGFyLm1pbicsXG4gICAgICAgICdhbmd1bGFyUm91dGVyJzogICAgJy4uL3ZlbmRvcnMvYW5ndWxhci11aS1yb3V0ZXIvcmVsZWFzZS9hbmd1bGFyLXVpLXJvdXRlci5taW4nLFxuICAgICAgICAnYW5ndWxhclJlc291cmNlJzogICcuLi92ZW5kb3JzL2FuZ3VsYXItcmVzb3VyY2UvYW5ndWxhci1yZXNvdXJjZS5taW4nLFxuICAgICAgICAnYW5ndWxhck1hdGNoJzogICAgICcuLi92ZW5kb3JzL2FuZ3VsYXItbWF0Y2gvYW5ndWxhci1tYXRjaC5taW4nLFxuICAgICAgICAnYW5ndWxhclRlbXBsYXRlcyc6ICcuL3RlbXBsYXRlcy90ZW1wbGF0ZXMnLFxuICAgICAgICAnanF1ZXJ5JzogICAgICAgICAgICcuLi92ZW5kb3JzL2pxdWVyeS9kaXN0L2pxdWVyeSdcbiAgICB9LFxuICAgIHByaW9yaXR5OiBbXG4gICAgICAgICdqcXVlcnknLCAnYW5ndWxhcidcbiAgICBdLFxuICAgIHNoaW06IHtcbiAgICAgICAgJ2FuZ3VsYXInOiB7XG4gICAgICAgICAgICBleHBvcnRzOiAnYW5ndWxhcicsXG4gICAgICAgICAgICBkZXBzOiBbJ2pxdWVyeSddXG4gICAgICAgIH0sXG4gICAgICAgICdhbmd1bGFyUm91dGVyJzogWydhbmd1bGFyJ10sXG4gICAgICAgICdhbmd1bGFyUmVzb3VyY2UnOiBbJ2FuZ3VsYXInXSxcbiAgICAgICAgJ2FuZ3VsYXJUZW1wbGF0ZXMnOiBbJ2FuZ3VsYXInXSxcbiAgICAgICAgJ2pxdWVyeSc6IHtcbiAgICAgICAgICAgIGV4cG9ydHM6ICdqUXVlcnknXG4gICAgICAgIH0sXG4gICAgICAgICdBcHAnOiBbJ2FuZ3VsYXInLCAnanF1ZXJ5J11cbiAgICB9LFxuICAgIHBhY2thZ2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6ICAgICAnQXBwLk1haW4nLFxuICAgICAgICAgICAgbG9jYXRpb246ICcuL21vZHVsZXMvbWFpbidcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogJ0FwcC5Db21tb24nLFxuICAgICAgICAgICAgbG9jYXRpb246ICcuL2NvbW1vbidcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogJ0FwcC5NeU1vZHVsZScsXG4gICAgICAgICAgICBsb2NhdGlvbjogJy4vbW9kdWxlcy9teS1tb2R1bGUnXG4gICAgICAgIH1cbiAgICBdLFxuICAgIGRlcHM6IFsnQXBwJ11cbn0pOyJdLCJmaWxlIjoic2NyaXB0cy9hcHAvYm9vdHN0cmFwLmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=