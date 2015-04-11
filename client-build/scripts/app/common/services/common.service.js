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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL2FwcC9jb21tb24vc2VydmljZXMvY29tbW9uLnNlcnZpY2UuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbmdkb2MgU2VydmljZVxuICogQG5hbWUgQ29tbW9uU2VydmljZVxuICogQG1lbWJlck9mIDxBcHAuU2VydmljZXM+XG4gKiBAYXV0aG9yIE5pa29sYXkgU2F2ZW5rbyA8Ymlvc2lzQGdtYWlsLmNvbT5cbiAqIEBkZXNjcmlwdGlvbiBUaGlzIGlzIGEgY29tbW9uIHNlcnZpY2UuXG4gKi9cblxuZGVmaW5lKGZ1bmN0aW9uICgpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICByZXR1cm4gWydjb21tb25SZXBvc2l0b3J5JyxcbiAgICAgICAgZnVuY3Rpb24gKGNvbW1vblJlcG9zaXRvcnkpIHtcblxuICAgICAgICAgICAgcmV0dXJuIHtcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEdldCBsaXN0LlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvbWlzZXwqfVxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGdldE15TGlzdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29tbW9uUmVwb3NpdG9yeS5nZXRNeUxpc3QoKS4kcHJvbWlzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgXTtcbn0pOyJdLCJmaWxlIjoic2NyaXB0cy9hcHAvY29tbW9uL3NlcnZpY2VzL2NvbW1vbi5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=