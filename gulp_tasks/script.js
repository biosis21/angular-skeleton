var gulp       = require('gulp'),
    watch      = require('gulp-watch'),
    connect    = require('gulp-connect'),
    sourcemaps = require('gulp-sourcemaps'),
    plumber    = require('gulp-plumber'),
    CONFIG     = require('../config');

gulp.task('script', function () {
    return gulp.src(CONFIG.script.src, {
            base: CONFIG.work
        })
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(CONFIG.script.dest))
        .pipe(connect.reload());
});

gulp.task('watch-script', function () {
    watch(CONFIG.script.src, {
        base: CONFIG.work
    }, function () {
        gulp.start('script')
    });
});

gulp.task('script:mini', function () {
    var requirejs = require('requirejs');

    return requirejs.optimize({
        baseUrl:                 './workspace/scripts/app',
        name:                    'bootstrap',
        out:                     './build/scripts/bootstrap.min.js',
        mainConfigFile:          './workspace/scripts/app/bootstrap.js',
        include:                 ['../vendors/requirejs/require'],
        waitSeconds:             0,
        optimize:                'uglify2',
        removeCombined:          true,
        keepBuildDir:            true,
        preserveLicenseComments: false,
        useStrict:               true
    });
});
