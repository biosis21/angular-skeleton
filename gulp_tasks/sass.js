var gulp       = require('gulp'),
    sass       = require('gulp-sass'),
    watch      = require('gulp-watch'),
    connect    = require('gulp-connect'),
    sourcemaps = require('gulp-sourcemaps'),
    CONFIG     = require('../config');

gulp.task('sass', function () {
    return gulp.src(CONFIG.sass.src)
        .pipe(sourcemaps.init())
        .pipe(sass({
            errLogToConsole: true
        }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(CONFIG.sass.dest))
        .pipe(connect.reload());
});

gulp.task('watch-sass', function () {
    watch(CONFIG.sass.src, function () {
        gulp.start('sass')
    });
});