/**
 * @ngdoc repository
 * @name App.Authorization:commonRepository
 *
 * @requires $resource
 *
 * @description This is a common repository.
 *
 * @author Nikolay Savenko <biosis@gmail.com>
 */

define(function () {
    "use strict";
    return ['$resource', function ($resource) {
        return $resource('', null, {

            /**
             * This provides properties used for requests.
             * @prop {Object} getCauses - The values for getting list of the Causes.
             * @prop {Object} getNeeds - The values for getting list of the Needs.
             * @prop {Object} getCharityType - The values for getting list of the Charities.
             * @prop {Object} signUp - The values for sign up new user.
             */

            getCauses: {
                method: 'GET',
                url: '/api/wizard/cause'
            },
            getNeeds: {
                method: 'GET',
                url: '/api/wizard/need'
            },
            getCharityType: {
                method: 'GET',
                url: '/api/wizard/charitytype'
            },
            signUp: {
                method: 'POST',
                url: '/api/wizard/account/Register'
            },
            confirmEmail: {
                method: 'GET',
                url: '/api/wizard/account/ConfirmEmail'
            },
            forgotPassword: {
                method: 'POST',
                url: '/api/wizard/account/ForgotPassword'
            },
            resetPassword: {
                method: 'POST',
                url: '/api/wizard/account/ResetPassword'
            },

            signIn: {
                method: 'POST',
                url: '/api/wizard/token',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                }
            }
        });
    }];
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL2FwcC9jb21tb24vc2VydmljZXMvY29tbW9uLnJlcG9zaXRvcnkuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbmdkb2MgcmVwb3NpdG9yeVxuICogQG5hbWUgQXBwLkF1dGhvcml6YXRpb246Y29tbW9uUmVwb3NpdG9yeVxuICpcbiAqIEByZXF1aXJlcyAkcmVzb3VyY2VcbiAqXG4gKiBAZGVzY3JpcHRpb24gVGhpcyBpcyBhIGNvbW1vbiByZXBvc2l0b3J5LlxuICpcbiAqIEBhdXRob3IgTmlrb2xheSBTYXZlbmtvIDxiaW9zaXNAZ21haWwuY29tPlxuICovXG5cbmRlZmluZShmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgcmV0dXJuIFsnJHJlc291cmNlJywgZnVuY3Rpb24gKCRyZXNvdXJjZSkge1xuICAgICAgICByZXR1cm4gJHJlc291cmNlKCcnLCBudWxsLCB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhpcyBwcm92aWRlcyBwcm9wZXJ0aWVzIHVzZWQgZm9yIHJlcXVlc3RzLlxuICAgICAgICAgICAgICogQHByb3Age09iamVjdH0gZ2V0Q2F1c2VzIC0gVGhlIHZhbHVlcyBmb3IgZ2V0dGluZyBsaXN0IG9mIHRoZSBDYXVzZXMuXG4gICAgICAgICAgICAgKiBAcHJvcCB7T2JqZWN0fSBnZXROZWVkcyAtIFRoZSB2YWx1ZXMgZm9yIGdldHRpbmcgbGlzdCBvZiB0aGUgTmVlZHMuXG4gICAgICAgICAgICAgKiBAcHJvcCB7T2JqZWN0fSBnZXRDaGFyaXR5VHlwZSAtIFRoZSB2YWx1ZXMgZm9yIGdldHRpbmcgbGlzdCBvZiB0aGUgQ2hhcml0aWVzLlxuICAgICAgICAgICAgICogQHByb3Age09iamVjdH0gc2lnblVwIC0gVGhlIHZhbHVlcyBmb3Igc2lnbiB1cCBuZXcgdXNlci5cbiAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICBnZXRDYXVzZXM6IHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIHVybDogJy9hcGkvd2l6YXJkL2NhdXNlJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldE5lZWRzOiB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICB1cmw6ICcvYXBpL3dpemFyZC9uZWVkJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldENoYXJpdHlUeXBlOiB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICB1cmw6ICcvYXBpL3dpemFyZC9jaGFyaXR5dHlwZSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzaWduVXA6IHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICB1cmw6ICcvYXBpL3dpemFyZC9hY2NvdW50L1JlZ2lzdGVyJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbmZpcm1FbWFpbDoge1xuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgdXJsOiAnL2FwaS93aXphcmQvYWNjb3VudC9Db25maXJtRW1haWwnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZm9yZ290UGFzc3dvcmQ6IHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICB1cmw6ICcvYXBpL3dpemFyZC9hY2NvdW50L0ZvcmdvdFBhc3N3b3JkJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlc2V0UGFzc3dvcmQ6IHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICB1cmw6ICcvYXBpL3dpemFyZC9hY2NvdW50L1Jlc2V0UGFzc3dvcmQnXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBzaWduSW46IHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICB1cmw6ICcvYXBpL3dpemFyZC90b2tlbicsXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDsgY2hhcnNldD1VVEYtOCdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1dO1xufSk7XG4iXSwiZmlsZSI6InNjcmlwdHMvYXBwL2NvbW1vbi9zZXJ2aWNlcy9jb21tb24ucmVwb3NpdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9