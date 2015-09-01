var gulp    = require('gulp'),
    jshint  = require('gulp-jshint'),
    jscs = require('gulp-jscs'),
    plumber = require('gulp-plumber'),
    stylish = require('gulp-jscs-stylish');

var hintPath = [
    './client/scripts/**/*.js',
    '!./client/scripts/vendors/**/*'
];

gulp.task('jshint', function() {
    return gulp.src(hintPath)
        .pipe(plumber())
        .pipe(jshint())
        .pipe(jscs())
        .pipe(stylish())
        .pipe(stylish.combineWithHintResults());
});

gulp.task('watch-jshint', function() {
    gulp.watch(hintPath, ['jshint']);
});