/**
 * @ngdoc Service
 * @name CommonService
 * @memberOf <App.Services>
 * @author Nikolay Savenko <smy@ciklum.com>
 * @description This is a common service.
 * @copyright 2014 Ciklum. All rights reserved.
 */

define(function () {
    "use strict";
    return [function () {

        var LS = window.localStorage;

        return {

            /**
             *
             * @param headerName {string}
             */
            get: function ( headerName ) {
                return LS.getItem(headerName);
            },

            /**
             *
             * @param headerName {string}
             */
            clear: function ( headerName ) {
                return LS.setItem(headerName, '');
            },

            /**
             *
             * @param headerName
             * @param value
             */
            set: function ( headerName, value ) {
                return LS.setItem(headerName, value);
            },

            /**
             *
             * @param headerName {string}
             */
            has: function ( headerName ) {
                return LS.getItem(headerName);
            }
        };
    }];
});