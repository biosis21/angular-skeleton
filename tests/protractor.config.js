/**
 * Jasmine Reporters types:
 *
 * JUnitXmlReporter - Report test results to a file in JUnit XML Report format.
 * NUnitXmlReporter - Report test results to a file in NUnit XML Report format.
 * TapReporter - Test Anything Protocol, report tests results to console.
 * TeamcityReporter - Basic reporter that outputs spec results to for the Teamcity build system.
 * TerminalReporter - Logs to a terminal (including colors) with variable verbosity.
 */

exports.config = {

    //seleniumAddress: (process.env.SELENIUM_URL || 'http://localhost:4444/wd/hub'),
    //
    //baseUrl: 'http://localhost:8888/',

    // The address of a running selenium server.
    seleniumServerJar: '../node_modules/protractor/selenium/selenium-server-standalone-2.44.0.jar',

    chromeOnly: true,
    directConnect: true,
    chromeDriver: '../node_modules/protractor/selenium/chromedriver',

    // Capabilities to be passed to the webdriver instance.
    capabilities: {
        'browserName': 'chrome'
        //'browserName': 'phantomjs',
        //'phantomjs.binary.path': require('phantomjs').path,
        //'phantomjs.ghostdriver.cli.args': ['--logfile=phantom.log', '--loglevel=DEBUG']
        //'chromeOptions': {
        //    'args': ['show-fps-counter']
        //}
    },

    rootElement: 'html',

    //Specify the name of the specs files.
    //specs: ['specs/e2e/**/*.spec.js'],

    // Spec patterns are relative to this directory.
    suites: {
        e2e: 'specs/e2e/**/*.spec.js'
    },

    framework: 'jasmine',

    onPrepare: function () {

        global.Helpers = require('./specs/e2e/helpers');

        require('jasmine-reporters');

        jasmine.getEnv().addReporter(
            new jasmine.JUnitXmlReporter('tests/reports', true, true, 'reports')
        );

        //browser.driver.manage().window().maximize();

        browser.driver.manage().timeouts().pageLoadTimeout(40000);
        browser.driver.manage().timeouts().implicitlyWait(25000);
    },

    jasmineNodeOpts: {
        // If true, print colors to the terminal.
        showColors: true,
        // If true, include stack traces in failures.
        includeStackTrace: true,
        // Time to wait in milliseconds before a test automatically fails
        defaultTimeoutInterval: 30000,
        // If true, display spec and suite names.
        isVerbose: true
    }
};