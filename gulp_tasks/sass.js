var gulp       = require('gulp'),
    sass       = require('gulp-sass'),
    sourcemaps = require('gulp-sourcemaps'),
    plumber    = require('gulp-plumber'),
    CONFIG     = require('../config'),
    browserSync = require('browser-sync'),
    reload      = browserSync.reload;

gulp.task('sass', function () {
    return gulp.src(CONFIG.sass.src)
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(sass({
            errLogToConsole: true
        }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(CONFIG.sass.dest))
        .pipe(reload({stream:true}));
});

gulp.task('watch-sass', ['sass', 'browser-sync'], function () {
    gulp.watch(CONFIG.sass.src, ['sass']);
});