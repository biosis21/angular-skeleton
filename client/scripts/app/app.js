define(function(require, exports, module) {
    "use strict";

    var angular = require('angular'),
        app;

    /**
     * Loading Global Modules and Dependencies
     */
    require('angularResource');
    require('angularRouter');
    require('angularTemplates');

    /**
     * @module app
     */
    app = angular.module('App', [

        /**
         * Require Vendor modules
         */
        'ui.router',
        'ngResource',
        'templates',

        /**
         * Require new Packages as Dependencies of the App Module
         */
        require('App.Main').name,
        require('App.MyModule').name
    ]);

    /**
     * Configuring App Module
     */
    app.constant("CONSTANTS", require('./configs/constants.config'))
        .config(require('./configs/routers.config'))
        .run(require('./configs/events.config'));

    angular.element(document.documentElement).ready(function () {
        angular.bootstrap(document, [app.name]);
    });

    module.exports = app;
});