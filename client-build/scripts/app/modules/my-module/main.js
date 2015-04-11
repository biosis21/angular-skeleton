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
        .controller('MyControllerCtrl', require('./controllers/my-controller.ctrl'));

});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL2FwcC9tb2R1bGVzL215LW1vZHVsZS9tYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImRlZmluZShmdW5jdGlvbiAoIHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSApIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIC8qKlxuICAgICAqIEBtb2R1bGUgQXBwLk15TW9kdWxlXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICovXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBhbmd1bGFyLm1vZHVsZSgnQXBwLk15TW9kdWxlJywgW10pXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlZmluZSBhbmQgUmVxdWlyZSBDb25maWdzLlxuICAgICAgICAgKi9cbiAgICAgICAgLmNvbmZpZyhyZXF1aXJlKCcuL2NvbmZpZ3Mvcm91dGVycy5jb25maWcnKSlcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVmaW5lIGFuZCBSZXF1aXJlIERpcmVjdGl2ZXMuXG4gICAgICAgICAqL1xuICAgICAgICAgLmRpcmVjdGl2ZSgnbXlEaXJlY3RpdmUnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvbXktZGlyZWN0aXZlLmRpcmVjdGl2ZScpKVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWZpbmUgYW5kIFJlcXVpcmUgQ29udHJvbGxlcnMuXG4gICAgICAgICAqL1xuICAgICAgICAuY29udHJvbGxlcignTXlDb250cm9sbGVyQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvbXktY29udHJvbGxlci5jdHJsJykpO1xuXG59KTsiXSwiZmlsZSI6InNjcmlwdHMvYXBwL21vZHVsZXMvbXktbW9kdWxlL21haW4uanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==