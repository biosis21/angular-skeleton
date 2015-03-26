var gulp    = require('gulp'),
    connect = require('gulp-connect'),
    CONFIG  = require('../config');

gulp.task('server', function () {

    connect.server({
        root:       CONFIG.build,
        host:       CONFIG.server.host,
        port:       CONFIG.server.port,
        livereload: CONFIG.server.livereload
    });
});