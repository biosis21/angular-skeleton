var gulp   = require('gulp'),
    watch  = require('gulp-watch'),
    del    = require('del'),
    CONFIG = require('../config');

gulp.task('copy', ['clean-copy'], function () {
    return gulp.src(CONFIG.copy.src, {
        base: CONFIG.work
    }).pipe(gulp.dest(CONFIG.build));
});

gulp.task('watch-copy', function () {
    watch(CONFIG.copy.src, {
        base: CONFIG.work
    }, function () {
        gulp.start('copy');
    });
});

gulp.task('clean-copy', function ( cb ) {
    del(CONFIG.copy.dest, cb);
});