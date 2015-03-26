var gulp   = require('gulp'),
    del    = require('del'),
    CONFIG = require('../config');

gulp.task('clean', function ( cb ) {
    del(CONFIG.build, cb);
});