var gulp    = require('gulp'),
    jshint  = require('gulp-jshint'),
    plumber = require('gulp-plumber');

var hintPath = [
    './workspace/scripts/**/*.js',
    '!./workspace/scripts/vendors/**/*'
];

gulp.task('jshint', function() {
    return gulp.src(hintPath)
        .pipe(plumber())
        .pipe(jshint())
        .pipe(jshint.reporter());
});

gulp.task('watch-jshint', function() {
    gulp.watch(hintPath, ['jshint']);
});