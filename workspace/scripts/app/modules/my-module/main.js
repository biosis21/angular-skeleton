define(function ( require, exports, module ) {
    "use strict";

    /**
     * @module App.MyModule
     * @description
     */
    module.exports = angular.module('App.MyModule', [])

        /**
         * Define and Require Configs.
         */
        .config(require('./configs/routers.config'))

        /**
         * Define and Require Directives.
         */
         .directive('myDirective', require('./directives/my-directive.directive'))

        /**
         * Define and Require Controllers.
         */
        .controller('MyControllerCtrl', require('./controllers/my-controller.ctrl'))

});