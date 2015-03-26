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