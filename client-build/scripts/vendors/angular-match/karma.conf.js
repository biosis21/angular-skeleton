module.exports = function (config) {
  config.set({
    plugins: [
      'karma-mocha',
      'karma-chrome-launcher',
      'karma-firefox-launcher'
    ],
    frameworks: ['mocha'],
    singleRun: false,
    autoWatch: true,
    colors: true,
    reporters: ['dots'],
    browsers: [process.env.TRAVIS ? 'Firefox' : 'Chrome'],
    files: [
      'bower_components/angular/angular.js',
      'bower_components/jquery/dist/jquery.js',
      'bower_components/angular-mocks/angular-mocks.js',

      'node_modules/chai/chai.js',
      'node_modules/chai-jquery/chai-jquery.js',

      'angular-match.js',
      'test.js'
    ],
    logLevel: config.LOG_ERROR
  });
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL3ZlbmRvcnMvYW5ndWxhci1tYXRjaC9rYXJtYS5jb25mLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGNvbmZpZykge1xuICBjb25maWcuc2V0KHtcbiAgICBwbHVnaW5zOiBbXG4gICAgICAna2FybWEtbW9jaGEnLFxuICAgICAgJ2thcm1hLWNocm9tZS1sYXVuY2hlcicsXG4gICAgICAna2FybWEtZmlyZWZveC1sYXVuY2hlcidcbiAgICBdLFxuICAgIGZyYW1ld29ya3M6IFsnbW9jaGEnXSxcbiAgICBzaW5nbGVSdW46IGZhbHNlLFxuICAgIGF1dG9XYXRjaDogdHJ1ZSxcbiAgICBjb2xvcnM6IHRydWUsXG4gICAgcmVwb3J0ZXJzOiBbJ2RvdHMnXSxcbiAgICBicm93c2VyczogW3Byb2Nlc3MuZW52LlRSQVZJUyA/ICdGaXJlZm94JyA6ICdDaHJvbWUnXSxcbiAgICBmaWxlczogW1xuICAgICAgJ2Jvd2VyX2NvbXBvbmVudHMvYW5ndWxhci9hbmd1bGFyLmpzJyxcbiAgICAgICdib3dlcl9jb21wb25lbnRzL2pxdWVyeS9kaXN0L2pxdWVyeS5qcycsXG4gICAgICAnYm93ZXJfY29tcG9uZW50cy9hbmd1bGFyLW1vY2tzL2FuZ3VsYXItbW9ja3MuanMnLFxuXG4gICAgICAnbm9kZV9tb2R1bGVzL2NoYWkvY2hhaS5qcycsXG4gICAgICAnbm9kZV9tb2R1bGVzL2NoYWktanF1ZXJ5L2NoYWktanF1ZXJ5LmpzJyxcblxuICAgICAgJ2FuZ3VsYXItbWF0Y2guanMnLFxuICAgICAgJ3Rlc3QuanMnXG4gICAgXSxcbiAgICBsb2dMZXZlbDogY29uZmlnLkxPR19FUlJPUlxuICB9KTtcbn07Il0sImZpbGUiOiJzY3JpcHRzL3ZlbmRvcnMvYW5ndWxhci1tYXRjaC9rYXJtYS5jb25mLmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=