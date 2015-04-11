define(function ( require, exports, module ) {
    "use strict";

    /**
     * @module 'App.Common'
     * @description App.Common module.
     */
    module.exports = angular.module('App.Common', [])

        /**
         * Define and Require Services and Repositories.
         */
        .directive('crDropdown', require('./directives/cr-dropdown.directive'))

        /**
         * Define and Require Services and Repositories.
         */
        .service('commonService', require('./services/common.service'))
        .service('localStorageService', require('./services/local-storage.service'))
        .service('commonRepository', require('./services/common.repository'));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL2FwcC9jb21tb24vbWFpbi5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJkZWZpbmUoZnVuY3Rpb24gKCByZXF1aXJlLCBleHBvcnRzLCBtb2R1bGUgKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICAvKipcbiAgICAgKiBAbW9kdWxlICdBcHAuQ29tbW9uJ1xuICAgICAqIEBkZXNjcmlwdGlvbiBBcHAuQ29tbW9uIG1vZHVsZS5cbiAgICAgKi9cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGFuZ3VsYXIubW9kdWxlKCdBcHAuQ29tbW9uJywgW10pXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlZmluZSBhbmQgUmVxdWlyZSBTZXJ2aWNlcyBhbmQgUmVwb3NpdG9yaWVzLlxuICAgICAgICAgKi9cbiAgICAgICAgLmRpcmVjdGl2ZSgnY3JEcm9wZG93bicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9jci1kcm9wZG93bi5kaXJlY3RpdmUnKSlcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVmaW5lIGFuZCBSZXF1aXJlIFNlcnZpY2VzIGFuZCBSZXBvc2l0b3JpZXMuXG4gICAgICAgICAqL1xuICAgICAgICAuc2VydmljZSgnY29tbW9uU2VydmljZScsIHJlcXVpcmUoJy4vc2VydmljZXMvY29tbW9uLnNlcnZpY2UnKSlcbiAgICAgICAgLnNlcnZpY2UoJ2xvY2FsU3RvcmFnZVNlcnZpY2UnLCByZXF1aXJlKCcuL3NlcnZpY2VzL2xvY2FsLXN0b3JhZ2Uuc2VydmljZScpKVxuICAgICAgICAuc2VydmljZSgnY29tbW9uUmVwb3NpdG9yeScsIHJlcXVpcmUoJy4vc2VydmljZXMvY29tbW9uLnJlcG9zaXRvcnknKSk7XG59KTsiXSwiZmlsZSI6InNjcmlwdHMvYXBwL2NvbW1vbi9tYWluLmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=