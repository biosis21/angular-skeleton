/**
 * @ngdoc repository
 * @name App.Authorization:commonRepository
 *
 * @requires $resource
 *
 * @description This is a common repository.
 *
 * @author Nikolay Savenko <smy@ciklum.com>
 * @copyright 2014 Ciklum. All rights reserved.
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
