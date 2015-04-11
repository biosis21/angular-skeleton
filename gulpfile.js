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

gulp.task('build', ['clean'], function () {
    gulp.start(
        'copy',
        'sass',
        'script:mini',
        'html:mini');
});