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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL2FwcC9jb21tb24vc2VydmljZXMvbG9jYWwtc3RvcmFnZS5zZXJ2aWNlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQG5nZG9jIFNlcnZpY2VcbiAqIEBuYW1lIENvbW1vblNlcnZpY2VcbiAqIEBtZW1iZXJPZiA8QXBwLlNlcnZpY2VzPlxuICogQGF1dGhvciBOaWtvbGF5IFNhdmVua28gPHNteUBjaWtsdW0uY29tPlxuICogQGRlc2NyaXB0aW9uIFRoaXMgaXMgYSBjb21tb24gc2VydmljZS5cbiAqIEBjb3B5cmlnaHQgMjAxNCBDaWtsdW0uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKi9cblxuZGVmaW5lKGZ1bmN0aW9uICgpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICByZXR1cm4gW2Z1bmN0aW9uICgpIHtcblxuICAgICAgICB2YXIgTFMgPSB3aW5kb3cubG9jYWxTdG9yYWdlO1xuXG4gICAgICAgIHJldHVybiB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAqIEBwYXJhbSBoZWFkZXJOYW1lIHtzdHJpbmd9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCBoZWFkZXJOYW1lICkge1xuICAgICAgICAgICAgICAgIHJldHVybiBMUy5nZXRJdGVtKGhlYWRlck5hbWUpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKlxuICAgICAgICAgICAgICogQHBhcmFtIGhlYWRlck5hbWUge3N0cmluZ31cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY2xlYXI6IGZ1bmN0aW9uICggaGVhZGVyTmFtZSApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gTFMuc2V0SXRlbShoZWFkZXJOYW1lLCAnJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiBAcGFyYW0gaGVhZGVyTmFtZVxuICAgICAgICAgICAgICogQHBhcmFtIHZhbHVlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24gKCBoZWFkZXJOYW1lLCB2YWx1ZSApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gTFMuc2V0SXRlbShoZWFkZXJOYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiBAcGFyYW0gaGVhZGVyTmFtZSB7c3RyaW5nfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBoYXM6IGZ1bmN0aW9uICggaGVhZGVyTmFtZSApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gTFMuZ2V0SXRlbShoZWFkZXJOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XTtcbn0pOyJdLCJmaWxlIjoic2NyaXB0cy9hcHAvY29tbW9uL3NlcnZpY2VzL2xvY2FsLXN0b3JhZ2Uuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9