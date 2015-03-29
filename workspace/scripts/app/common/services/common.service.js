/**
 * @ngdoc Service
 * @name CommonService
 * @memberOf <App.Services>
 * @author Nikolay Savenko <biosis@gmail.com>
 * @description This is a common service.
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