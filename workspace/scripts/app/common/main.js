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