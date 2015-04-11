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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL2FwcC9hcHAuanMiXSwic291cmNlc0NvbnRlbnQiOlsiZGVmaW5lKGZ1bmN0aW9uKHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIGFuZ3VsYXIgPSByZXF1aXJlKCdhbmd1bGFyJyksXG4gICAgICAgIGFwcDtcblxuICAgIC8qKlxuICAgICAqIExvYWRpbmcgR2xvYmFsIE1vZHVsZXMgYW5kIERlcGVuZGVuY2llc1xuICAgICAqL1xuICAgIHJlcXVpcmUoJ2FuZ3VsYXJSZXNvdXJjZScpO1xuICAgIHJlcXVpcmUoJ2FuZ3VsYXJSb3V0ZXInKTtcbiAgICByZXF1aXJlKCdhbmd1bGFyVGVtcGxhdGVzJyk7XG5cbiAgICAvKipcbiAgICAgKiBAbW9kdWxlIGFwcFxuICAgICAqL1xuICAgIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdBcHAnLCBbXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlcXVpcmUgVmVuZG9yIG1vZHVsZXNcbiAgICAgICAgICovXG4gICAgICAgICd1aS5yb3V0ZXInLFxuICAgICAgICAnbmdSZXNvdXJjZScsXG4gICAgICAgICd0ZW1wbGF0ZXMnLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXF1aXJlIG5ldyBQYWNrYWdlcyBhcyBEZXBlbmRlbmNpZXMgb2YgdGhlIEFwcCBNb2R1bGVcbiAgICAgICAgICovXG4gICAgICAgIHJlcXVpcmUoJ0FwcC5NYWluJykubmFtZSxcbiAgICAgICAgcmVxdWlyZSgnQXBwLk15TW9kdWxlJykubmFtZVxuICAgIF0pO1xuXG4gICAgLyoqXG4gICAgICogQ29uZmlndXJpbmcgQXBwIE1vZHVsZVxuICAgICAqL1xuICAgIGFwcC5jb25zdGFudChcIkNPTlNUQU5UU1wiLCByZXF1aXJlKCcuL2NvbmZpZ3MvY29uc3RhbnRzLmNvbmZpZycpKVxuICAgICAgICAuY29uZmlnKHJlcXVpcmUoJy4vY29uZmlncy9yb3V0ZXJzLmNvbmZpZycpKVxuICAgICAgICAucnVuKHJlcXVpcmUoJy4vY29uZmlncy9ldmVudHMuY29uZmlnJykpO1xuXG4gICAgYW5ndWxhci5lbGVtZW50KGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkucmVhZHkoZnVuY3Rpb24gKCkge1xuICAgICAgICBhbmd1bGFyLmJvb3RzdHJhcChkb2N1bWVudCwgW2FwcC5uYW1lXSk7XG4gICAgfSk7XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGFwcDtcbn0pOyJdLCJmaWxlIjoic2NyaXB0cy9hcHAvYXBwLmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=