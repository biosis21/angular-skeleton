// Karma configuration
// Generated on Tue Jan 27 2015 14:10:28 GMT+0200 (FLE Standard Time)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '../',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine', 'requirejs'],


    // list of files / patterns to load in the browser
    files: [
      'workspace/scripts/vendors/angular/angular.min.js',
      'workspace/scripts/vendors/angular-mocks/angular-mocks.js',
      'workspace/scripts/vendors/angular-ui-router/release/angular-ui-router.min.js',
      'workspace/scripts/vendors/jquery/dist/jquery.min.js',
      'workspace/scripts/vendors/requirejs/require.js',
      'tests/test-main.js',
      'workspace/index.html',
      'workspace/styles/index.css',
      'workspace/scripts/app/**/*.js',
      'tests/specs/unit/**/*.spec.js'
    ],


    // list of files to exclude
    exclude: [
       // 'workspace/scripts/app/index.js'
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome'], //, 'PhantomJS'


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  });
};