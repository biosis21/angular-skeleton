var gulp = require('gulp');

require('./gulp_tasks/clean');
require('./gulp_tasks/script');
require('./gulp_tasks/html');
require('./gulp_tasks/sass');
require('./gulp_tasks/copy');
require('./gulp_tasks/jshint');
require('./gulp_tasks/server');

gulp.task('default', ['clean'], function () {
    gulp.start(
        'copy',
        'html',
        'script',
        'jshint',
        'sass',
        'server',
        'watch-html',
        'watch-script',
        'watch-jshint',
        'watch-copy',
        'watch-sass');
});

gulp.task('staging', ['clean'], function () {
    gulp.start(
        'copy',
        'sass',
        'script:mini',
        'html:mini');
});

//
//     * Tests
//     */
//    var protractor = require('gulp-protractor').protractor;
//
//    // Start a standalone server
//    var webdriver_standalone = require("gulp-protractor").webdriver_standalone;
//
//    // Download and update the selenium driver
//    var webdriver_update = require('gulp-protractor').webdriver_update;
//
//    // Downloads the selenium webdriver
//    gulp.task('webdriver_update', webdriver_update);
//
//    // Start the standalone selenium server
//    // NOTE: This is not needed if you reference the
//    // seleniumServerJar in your protractor.conf.js
//    gulp.task('webdriver_standalone', webdriver_standalone);
//
//    // Setting up the test task
//    gulp.task('protractor', ['webdriver_update'], function(cb) {
//        gulp.src(["./tests/specs/e2e/**/*.spec.js"])
//            .pipe(protractor({
//                configFile: "tests/protractor.config.js",
//                args: ['--baseUrl', 'http://' + config.host + ':' + config.port]
//            })).on('error', function ( e ) {
//                console.log(e)
//            }).on('end', cb);
//    });
