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
    return ['commonRepository',
        function (commonRepository) {

            return {

                /**
                 * Get list.
                 * @returns {$promise|*}
                 */
                getMyList: function () {
                    return commonRepository.getMyList().$promise;
                }
            };
        }
    ];
});