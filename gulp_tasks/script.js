var gulp       = require('gulp'),
    watch      = require('gulp-watch'),
    connect    = require('gulp-connect'),
    sourcemaps = require('gulp-sourcemaps'),
    plumber    = require('gulp-plumber'),
    CONFIG     = require('../config'),
    browserSync = require("browser-sync").create();

gulp.task('script', function () {
    return gulp.src(CONFIG.script.src, {
            base: CONFIG.work
        })
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(CONFIG.script.dest))
        .pipe(browserSync.reload({stream:true}));
});

gulp.task('watch-script', ['script', 'browser-sync'], function () {
  gulp.watch(CONFIG.script.src, ['script']);
});

gulp.task('script:mini', function () {
    var requirejs = require('requirejs');

    return requirejs.optimize({
        baseUrl:                 './client/scripts/app',
        name:                    'bootstrap',
        out:                     './build/scripts/bootstrap.min.js',
        mainConfigFile:          './client/scripts/app/bootstrap.js',
        include:                 ['../vendors/requirejs/require'],
        waitSeconds:             0,
        optimize:                'uglify2',
        removeCombined:          true,
        keepBuildDir:            true,
        preserveLicenseComments: false,
        useStrict:               true
    });
});
