define(function ( require, exports, module ) {
    "use strict";

    /**
     * @module App.Main
     * @description
     */
    module.exports = angular.module('App.Main', [])

        .config(require('./config/routers.config'))
        .controller('MainCtrl', require('./controllers/main.ctrl'))
        .controller('HeaderCtrl', require('./controllers/header.ctrl'))
        .controller('FooterCtrl', require('./controllers/footer.ctrl'));

});