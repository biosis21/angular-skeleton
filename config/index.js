module.exports = function () {
    return require(__dirname + '\\' + (process.env.NODE_ENV || 'local') + '.json');
}();