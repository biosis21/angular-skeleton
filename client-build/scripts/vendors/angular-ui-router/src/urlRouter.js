/**
 * @ngdoc object
 * @name ui.router.router.$urlRouterProvider
 *
 * @requires ui.router.util.$urlMatcherFactoryProvider
 * @requires $locationProvider
 *
 * @description
 * `$urlRouterProvider` has the responsibility of watching `$location`. 
 * When `$location` changes it runs through a list of rules one by one until a 
 * match is found. `$urlRouterProvider` is used behind the scenes anytime you specify 
 * a url in a state configuration. All urls are compiled into a UrlMatcher object.
 *
 * There are several methods on `$urlRouterProvider` that make it useful to use directly
 * in your module config.
 */
$UrlRouterProvider.$inject = ['$locationProvider', '$urlMatcherFactoryProvider'];
function $UrlRouterProvider(   $locationProvider,   $urlMatcherFactory) {
  var rules = [], otherwise = null, interceptDeferred = false, listener;

  // Returns a string that is a prefix of all strings matching the RegExp
  function regExpPrefix(re) {
    var prefix = /^\^((?:\\[^a-zA-Z0-9]|[^\\\[\]\^$*+?.()|{}]+)*)/.exec(re.source);
    return (prefix != null) ? prefix[1].replace(/\\(.)/g, "$1") : '';
  }

  // Interpolates matched values into a String.replace()-style pattern
  function interpolate(pattern, match) {
    return pattern.replace(/\$(\$|\d{1,2})/, function (m, what) {
      return match[what === '$' ? 0 : Number(what)];
    });
  }

  /**
   * @ngdoc function
   * @name ui.router.router.$urlRouterProvider#rule
   * @methodOf ui.router.router.$urlRouterProvider
   *
   * @description
   * Defines rules that are used by `$urlRouterProvider` to find matches for
   * specific URLs.
   *
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.router']);
   *
   * app.config(function ($urlRouterProvider) {
   *   // Here's an example of how you might allow case insensitive urls
   *   $urlRouterProvider.rule(function ($injector, $location) {
   *     var path = $location.path(),
   *         normalized = path.toLowerCase();
   *
   *     if (path !== normalized) {
   *       return normalized;
   *     }
   *   });
   * });
   * </pre>
   *
   * @param {object} rule Handler function that takes `$injector` and `$location`
   * services as arguments. You can use them to return a valid path as a string.
   *
   * @return {object} `$urlRouterProvider` - `$urlRouterProvider` instance
   */
  this.rule = function (rule) {
    if (!isFunction(rule)) throw new Error("'rule' must be a function");
    rules.push(rule);
    return this;
  };

  /**
   * @ngdoc object
   * @name ui.router.router.$urlRouterProvider#otherwise
   * @methodOf ui.router.router.$urlRouterProvider
   *
   * @description
   * Defines a path that is used when an invalid route is requested.
   *
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.router']);
   *
   * app.config(function ($urlRouterProvider) {
   *   // if the path doesn't match any of the urls you configured
   *   // otherwise will take care of routing the user to the
   *   // specified url
   *   $urlRouterProvider.otherwise('/index');
   *
   *   // Example of using function rule as param
   *   $urlRouterProvider.otherwise(function ($injector, $location) {
   *     return '/a/valid/url';
   *   });
   * });
   * </pre>
   *
   * @param {string|object} rule The url path you want to redirect to or a function 
   * rule that returns the url path. The function version is passed two params: 
   * `$injector` and `$location` services, and must return a url string.
   *
   * @return {object} `$urlRouterProvider` - `$urlRouterProvider` instance
   */
  this.otherwise = function (rule) {
    if (isString(rule)) {
      var redirect = rule;
      rule = function () { return redirect; };
    }
    else if (!isFunction(rule)) throw new Error("'rule' must be a function");
    otherwise = rule;
    return this;
  };


  function handleIfMatch($injector, handler, match) {
    if (!match) return false;
    var result = $injector.invoke(handler, handler, { $match: match });
    return isDefined(result) ? result : true;
  }

  /**
   * @ngdoc function
   * @name ui.router.router.$urlRouterProvider#when
   * @methodOf ui.router.router.$urlRouterProvider
   *
   * @description
   * Registers a handler for a given url matching. if handle is a string, it is
   * treated as a redirect, and is interpolated according to the syntax of match
   * (i.e. like `String.replace()` for `RegExp`, or like a `UrlMatcher` pattern otherwise).
   *
   * If the handler is a function, it is injectable. It gets invoked if `$location`
   * matches. You have the option of inject the match object as `$match`.
   *
   * The handler can return
   *
   * - **falsy** to indicate that the rule didn't match after all, then `$urlRouter`
   *   will continue trying to find another one that matches.
   * - **string** which is treated as a redirect and passed to `$location.url()`
   * - **void** or any **truthy** value tells `$urlRouter` that the url was handled.
   *
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.router']);
   *
   * app.config(function ($urlRouterProvider) {
   *   $urlRouterProvider.when($state.url, function ($match, $stateParams) {
   *     if ($state.$current.navigable !== state ||
   *         !equalForKeys($match, $stateParams) {
   *      $state.transitionTo(state, $match, false);
   *     }
   *   });
   * });
   * </pre>
   *
   * @param {string|object} what The incoming path that you want to redirect.
   * @param {string|object} handler The path you want to redirect your user to.
   */
  this.when = function (what, handler) {
    var redirect, handlerIsString = isString(handler);
    if (isString(what)) what = $urlMatcherFactory.compile(what);

    if (!handlerIsString && !isFunction(handler) && !isArray(handler))
      throw new Error("invalid 'handler' in when()");

    var strategies = {
      matcher: function (what, handler) {
        if (handlerIsString) {
          redirect = $urlMatcherFactory.compile(handler);
          handler = ['$match', function ($match) { return redirect.format($match); }];
        }
        return extend(function ($injector, $location) {
          return handleIfMatch($injector, handler, what.exec($location.path(), $location.search()));
        }, {
          prefix: isString(what.prefix) ? what.prefix : ''
        });
      },
      regex: function (what, handler) {
        if (what.global || what.sticky) throw new Error("when() RegExp must not be global or sticky");

        if (handlerIsString) {
          redirect = handler;
          handler = ['$match', function ($match) { return interpolate(redirect, $match); }];
        }
        return extend(function ($injector, $location) {
          return handleIfMatch($injector, handler, what.exec($location.path()));
        }, {
          prefix: regExpPrefix(what)
        });
      }
    };

    var check = { matcher: $urlMatcherFactory.isMatcher(what), regex: what instanceof RegExp };

    for (var n in check) {
      if (check[n]) return this.rule(strategies[n](what, handler));
    }

    throw new Error("invalid 'what' in when()");
  };

  /**
   * @ngdoc function
   * @name ui.router.router.$urlRouterProvider#deferIntercept
   * @methodOf ui.router.router.$urlRouterProvider
   *
   * @description
   * Disables (or enables) deferring location change interception.
   *
   * If you wish to customize the behavior of syncing the URL (for example, if you wish to
   * defer a transition but maintain the current URL), call this method at configuration time.
   * Then, at run time, call `$urlRouter.listen()` after you have configured your own
   * `$locationChangeSuccess` event handler.
   *
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.router']);
   *
   * app.config(function ($urlRouterProvider) {
   *
   *   // Prevent $urlRouter from automatically intercepting URL changes;
   *   // this allows you to configure custom behavior in between
   *   // location changes and route synchronization:
   *   $urlRouterProvider.deferIntercept();
   *
   * }).run(function ($rootScope, $urlRouter, UserService) {
   *
   *   $rootScope.$on('$locationChangeSuccess', function(e) {
   *     // UserService is an example service for managing user state
   *     if (UserService.isLoggedIn()) return;
   *
   *     // Prevent $urlRouter's default handler from firing
   *     e.preventDefault();
   *
   *     UserService.handleLogin().then(function() {
   *       // Once the user has logged in, sync the current URL
   *       // to the router:
   *       $urlRouter.sync();
   *     });
   *   });
   *
   *   // Configures $urlRouter's listener *after* your custom listener
   *   $urlRouter.listen();
   * });
   * </pre>
   *
   * @param {boolean} defer Indicates whether to defer location change interception. Passing
            no parameter is equivalent to `true`.
   */
  this.deferIntercept = function (defer) {
    if (defer === undefined) defer = true;
    interceptDeferred = defer;
  };

  /**
   * @ngdoc object
   * @name ui.router.router.$urlRouter
   *
   * @requires $location
   * @requires $rootScope
   * @requires $injector
   * @requires $browser
   *
   * @description
   *
   */
  this.$get = $get;
  $get.$inject = ['$location', '$rootScope', '$injector', '$browser'];
  function $get(   $location,   $rootScope,   $injector,   $browser) {

    var baseHref = $browser.baseHref(), location = $location.url(), lastPushedUrl;

    function appendBasePath(url, isHtml5, absolute) {
      if (baseHref === '/') return url;
      if (isHtml5) return baseHref.slice(0, -1) + url;
      if (absolute) return baseHref.slice(1) + url;
      return url;
    }

    // TODO: Optimize groups of rules with non-empty prefix into some sort of decision tree
    function update(evt) {
      if (evt && evt.defaultPrevented) return;
      var ignoreUpdate = lastPushedUrl && $location.url() === lastPushedUrl;
      lastPushedUrl = undefined;
      if (ignoreUpdate) return true;

      function check(rule) {
        var handled = rule($injector, $location);

        if (!handled) return false;
        if (isString(handled)) $location.replace().url(handled);
        return true;
      }
      var n = rules.length, i;

      for (i = 0; i < n; i++) {
        if (check(rules[i])) return;
      }
      // always check otherwise last to allow dynamic updates to the set of rules
      if (otherwise) check(otherwise);
    }

    function listen() {
      listener = listener || $rootScope.$on('$locationChangeSuccess', update);
      return listener;
    }

    if (!interceptDeferred) listen();

    return {
      /**
       * @ngdoc function
       * @name ui.router.router.$urlRouter#sync
       * @methodOf ui.router.router.$urlRouter
       *
       * @description
       * Triggers an update; the same update that happens when the address bar url changes, aka `$locationChangeSuccess`.
       * This method is useful when you need to use `preventDefault()` on the `$locationChangeSuccess` event,
       * perform some custom logic (route protection, auth, config, redirection, etc) and then finally proceed
       * with the transition by calling `$urlRouter.sync()`.
       *
       * @example
       * <pre>
       * angular.module('app', ['ui.router'])
       *   .run(function($rootScope, $urlRouter) {
       *     $rootScope.$on('$locationChangeSuccess', function(evt) {
       *       // Halt state change from even starting
       *       evt.preventDefault();
       *       // Perform custom logic
       *       var meetsRequirement = ...
       *       // Continue with the update and state transition if logic allows
       *       if (meetsRequirement) $urlRouter.sync();
       *     });
       * });
       * </pre>
       */
      sync: function() {
        update();
      },

      listen: function() {
        return listen();
      },

      update: function(read) {
        if (read) {
          location = $location.url();
          return;
        }
        if ($location.url() === location) return;

        $location.url(location);
        $location.replace();
      },

      push: function(urlMatcher, params, options) {
        $location.url(urlMatcher.format(params || {}));
        lastPushedUrl = options && options.$$avoidResync ? $location.url() : undefined;
        if (options && options.replace) $location.replace();
      },

      /**
       * @ngdoc function
       * @name ui.router.router.$urlRouter#href
       * @methodOf ui.router.router.$urlRouter
       *
       * @description
       * A URL generation method that returns the compiled URL for a given
       * {@link ui.router.util.type:UrlMatcher `UrlMatcher`}, populated with the provided parameters.
       *
       * @example
       * <pre>
       * $bob = $urlRouter.href(new UrlMatcher("/about/:person"), {
       *   person: "bob"
       * });
       * // $bob == "/about/bob";
       * </pre>
       *
       * @param {UrlMatcher} urlMatcher The `UrlMatcher` object which is used as the template of the URL to generate.
       * @param {object=} params An object of parameter values to fill the matcher's required parameters.
       * @param {object=} options Options object. The options are:
       *
       * - **`absolute`** - {boolean=false},  If true will generate an absolute url, e.g. "http://www.example.com/fullurl".
       *
       * @returns {string} Returns the fully compiled URL, or `null` if `params` fail validation against `urlMatcher`
       */
      href: function(urlMatcher, params, options) {
        if (!urlMatcher.validates(params)) return null;

        var isHtml5 = $locationProvider.html5Mode();
        if (angular.isObject(isHtml5)) {
          isHtml5 = isHtml5.enabled;
        }
        
        var url = urlMatcher.format(params);
        options = options || {};

        if (!isHtml5 && url !== null) {
          url = "#" + $locationProvider.hashPrefix() + url;
        }
        url = appendBasePath(url, isHtml5, options.absolute);

        if (!options.absolute || !url) {
          return url;
        }

        var slash = (!isHtml5 && url ? '/' : ''), port = $location.port();
        port = (port === 80 || port === 443 ? '' : ':' + port);

        return [$location.protocol(), '://', $location.host(), port, slash, url].join('');
      }
    };
  }
}

angular.module('ui.router.router').provider('$urlRouter', $UrlRouterProvider);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL3ZlbmRvcnMvYW5ndWxhci11aS1yb3V0ZXIvc3JjL3VybFJvdXRlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBuZ2RvYyBvYmplY3RcbiAqIEBuYW1lIHVpLnJvdXRlci5yb3V0ZXIuJHVybFJvdXRlclByb3ZpZGVyXG4gKlxuICogQHJlcXVpcmVzIHVpLnJvdXRlci51dGlsLiR1cmxNYXRjaGVyRmFjdG9yeVByb3ZpZGVyXG4gKiBAcmVxdWlyZXMgJGxvY2F0aW9uUHJvdmlkZXJcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIGAkdXJsUm91dGVyUHJvdmlkZXJgIGhhcyB0aGUgcmVzcG9uc2liaWxpdHkgb2Ygd2F0Y2hpbmcgYCRsb2NhdGlvbmAuIFxuICogV2hlbiBgJGxvY2F0aW9uYCBjaGFuZ2VzIGl0IHJ1bnMgdGhyb3VnaCBhIGxpc3Qgb2YgcnVsZXMgb25lIGJ5IG9uZSB1bnRpbCBhIFxuICogbWF0Y2ggaXMgZm91bmQuIGAkdXJsUm91dGVyUHJvdmlkZXJgIGlzIHVzZWQgYmVoaW5kIHRoZSBzY2VuZXMgYW55dGltZSB5b3Ugc3BlY2lmeSBcbiAqIGEgdXJsIGluIGEgc3RhdGUgY29uZmlndXJhdGlvbi4gQWxsIHVybHMgYXJlIGNvbXBpbGVkIGludG8gYSBVcmxNYXRjaGVyIG9iamVjdC5cbiAqXG4gKiBUaGVyZSBhcmUgc2V2ZXJhbCBtZXRob2RzIG9uIGAkdXJsUm91dGVyUHJvdmlkZXJgIHRoYXQgbWFrZSBpdCB1c2VmdWwgdG8gdXNlIGRpcmVjdGx5XG4gKiBpbiB5b3VyIG1vZHVsZSBjb25maWcuXG4gKi9cbiRVcmxSb3V0ZXJQcm92aWRlci4kaW5qZWN0ID0gWyckbG9jYXRpb25Qcm92aWRlcicsICckdXJsTWF0Y2hlckZhY3RvcnlQcm92aWRlciddO1xuZnVuY3Rpb24gJFVybFJvdXRlclByb3ZpZGVyKCAgICRsb2NhdGlvblByb3ZpZGVyLCAgICR1cmxNYXRjaGVyRmFjdG9yeSkge1xuICB2YXIgcnVsZXMgPSBbXSwgb3RoZXJ3aXNlID0gbnVsbCwgaW50ZXJjZXB0RGVmZXJyZWQgPSBmYWxzZSwgbGlzdGVuZXI7XG5cbiAgLy8gUmV0dXJucyBhIHN0cmluZyB0aGF0IGlzIGEgcHJlZml4IG9mIGFsbCBzdHJpbmdzIG1hdGNoaW5nIHRoZSBSZWdFeHBcbiAgZnVuY3Rpb24gcmVnRXhwUHJlZml4KHJlKSB7XG4gICAgdmFyIHByZWZpeCA9IC9eXFxeKCg/OlxcXFxbXmEtekEtWjAtOV18W15cXFxcXFxbXFxdXFxeJCorPy4oKXx7fV0rKSopLy5leGVjKHJlLnNvdXJjZSk7XG4gICAgcmV0dXJuIChwcmVmaXggIT0gbnVsbCkgPyBwcmVmaXhbMV0ucmVwbGFjZSgvXFxcXCguKS9nLCBcIiQxXCIpIDogJyc7XG4gIH1cblxuICAvLyBJbnRlcnBvbGF0ZXMgbWF0Y2hlZCB2YWx1ZXMgaW50byBhIFN0cmluZy5yZXBsYWNlKCktc3R5bGUgcGF0dGVyblxuICBmdW5jdGlvbiBpbnRlcnBvbGF0ZShwYXR0ZXJuLCBtYXRjaCkge1xuICAgIHJldHVybiBwYXR0ZXJuLnJlcGxhY2UoL1xcJChcXCR8XFxkezEsMn0pLywgZnVuY3Rpb24gKG0sIHdoYXQpIHtcbiAgICAgIHJldHVybiBtYXRjaFt3aGF0ID09PSAnJCcgPyAwIDogTnVtYmVyKHdoYXQpXTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgdWkucm91dGVyLnJvdXRlci4kdXJsUm91dGVyUHJvdmlkZXIjcnVsZVxuICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnJvdXRlci4kdXJsUm91dGVyUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIERlZmluZXMgcnVsZXMgdGhhdCBhcmUgdXNlZCBieSBgJHVybFJvdXRlclByb3ZpZGVyYCB0byBmaW5kIG1hdGNoZXMgZm9yXG4gICAqIHNwZWNpZmljIFVSTHMuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIDxwcmU+XG4gICAqIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnYXBwJywgWyd1aS5yb3V0ZXIucm91dGVyJ10pO1xuICAgKlxuICAgKiBhcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIpIHtcbiAgICogICAvLyBIZXJlJ3MgYW4gZXhhbXBsZSBvZiBob3cgeW91IG1pZ2h0IGFsbG93IGNhc2UgaW5zZW5zaXRpdmUgdXJsc1xuICAgKiAgICR1cmxSb3V0ZXJQcm92aWRlci5ydWxlKGZ1bmN0aW9uICgkaW5qZWN0b3IsICRsb2NhdGlvbikge1xuICAgKiAgICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpLFxuICAgKiAgICAgICAgIG5vcm1hbGl6ZWQgPSBwYXRoLnRvTG93ZXJDYXNlKCk7XG4gICAqXG4gICAqICAgICBpZiAocGF0aCAhPT0gbm9ybWFsaXplZCkge1xuICAgKiAgICAgICByZXR1cm4gbm9ybWFsaXplZDtcbiAgICogICAgIH1cbiAgICogICB9KTtcbiAgICogfSk7XG4gICAqIDwvcHJlPlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gcnVsZSBIYW5kbGVyIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYCRpbmplY3RvcmAgYW5kIGAkbG9jYXRpb25gXG4gICAqIHNlcnZpY2VzIGFzIGFyZ3VtZW50cy4gWW91IGNhbiB1c2UgdGhlbSB0byByZXR1cm4gYSB2YWxpZCBwYXRoIGFzIGEgc3RyaW5nLlxuICAgKlxuICAgKiBAcmV0dXJuIHtvYmplY3R9IGAkdXJsUm91dGVyUHJvdmlkZXJgIC0gYCR1cmxSb3V0ZXJQcm92aWRlcmAgaW5zdGFuY2VcbiAgICovXG4gIHRoaXMucnVsZSA9IGZ1bmN0aW9uIChydWxlKSB7XG4gICAgaWYgKCFpc0Z1bmN0aW9uKHJ1bGUpKSB0aHJvdyBuZXcgRXJyb3IoXCIncnVsZScgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIHJ1bGVzLnB1c2gocnVsZSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBvYmplY3RcbiAgICogQG5hbWUgdWkucm91dGVyLnJvdXRlci4kdXJsUm91dGVyUHJvdmlkZXIjb3RoZXJ3aXNlXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIucm91dGVyLiR1cmxSb3V0ZXJQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogRGVmaW5lcyBhIHBhdGggdGhhdCBpcyB1c2VkIHdoZW4gYW4gaW52YWxpZCByb3V0ZSBpcyByZXF1ZXN0ZWQuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIDxwcmU+XG4gICAqIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnYXBwJywgWyd1aS5yb3V0ZXIucm91dGVyJ10pO1xuICAgKlxuICAgKiBhcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIpIHtcbiAgICogICAvLyBpZiB0aGUgcGF0aCBkb2Vzbid0IG1hdGNoIGFueSBvZiB0aGUgdXJscyB5b3UgY29uZmlndXJlZFxuICAgKiAgIC8vIG90aGVyd2lzZSB3aWxsIHRha2UgY2FyZSBvZiByb3V0aW5nIHRoZSB1c2VyIHRvIHRoZVxuICAgKiAgIC8vIHNwZWNpZmllZCB1cmxcbiAgICogICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvaW5kZXgnKTtcbiAgICpcbiAgICogICAvLyBFeGFtcGxlIG9mIHVzaW5nIGZ1bmN0aW9uIHJ1bGUgYXMgcGFyYW1cbiAgICogICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKGZ1bmN0aW9uICgkaW5qZWN0b3IsICRsb2NhdGlvbikge1xuICAgKiAgICAgcmV0dXJuICcvYS92YWxpZC91cmwnO1xuICAgKiAgIH0pO1xuICAgKiB9KTtcbiAgICogPC9wcmU+XG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gcnVsZSBUaGUgdXJsIHBhdGggeW91IHdhbnQgdG8gcmVkaXJlY3QgdG8gb3IgYSBmdW5jdGlvbiBcbiAgICogcnVsZSB0aGF0IHJldHVybnMgdGhlIHVybCBwYXRoLiBUaGUgZnVuY3Rpb24gdmVyc2lvbiBpcyBwYXNzZWQgdHdvIHBhcmFtczogXG4gICAqIGAkaW5qZWN0b3JgIGFuZCBgJGxvY2F0aW9uYCBzZXJ2aWNlcywgYW5kIG11c3QgcmV0dXJuIGEgdXJsIHN0cmluZy5cbiAgICpcbiAgICogQHJldHVybiB7b2JqZWN0fSBgJHVybFJvdXRlclByb3ZpZGVyYCAtIGAkdXJsUm91dGVyUHJvdmlkZXJgIGluc3RhbmNlXG4gICAqL1xuICB0aGlzLm90aGVyd2lzZSA9IGZ1bmN0aW9uIChydWxlKSB7XG4gICAgaWYgKGlzU3RyaW5nKHJ1bGUpKSB7XG4gICAgICB2YXIgcmVkaXJlY3QgPSBydWxlO1xuICAgICAgcnVsZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHJlZGlyZWN0OyB9O1xuICAgIH1cbiAgICBlbHNlIGlmICghaXNGdW5jdGlvbihydWxlKSkgdGhyb3cgbmV3IEVycm9yKFwiJ3J1bGUnIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICBvdGhlcndpc2UgPSBydWxlO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG5cbiAgZnVuY3Rpb24gaGFuZGxlSWZNYXRjaCgkaW5qZWN0b3IsIGhhbmRsZXIsIG1hdGNoKSB7XG4gICAgaWYgKCFtYXRjaCkgcmV0dXJuIGZhbHNlO1xuICAgIHZhciByZXN1bHQgPSAkaW5qZWN0b3IuaW52b2tlKGhhbmRsZXIsIGhhbmRsZXIsIHsgJG1hdGNoOiBtYXRjaCB9KTtcbiAgICByZXR1cm4gaXNEZWZpbmVkKHJlc3VsdCkgPyByZXN1bHQgOiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIucm91dGVyLiR1cmxSb3V0ZXJQcm92aWRlciN3aGVuXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIucm91dGVyLiR1cmxSb3V0ZXJQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogUmVnaXN0ZXJzIGEgaGFuZGxlciBmb3IgYSBnaXZlbiB1cmwgbWF0Y2hpbmcuIGlmIGhhbmRsZSBpcyBhIHN0cmluZywgaXQgaXNcbiAgICogdHJlYXRlZCBhcyBhIHJlZGlyZWN0LCBhbmQgaXMgaW50ZXJwb2xhdGVkIGFjY29yZGluZyB0byB0aGUgc3ludGF4IG9mIG1hdGNoXG4gICAqIChpLmUuIGxpa2UgYFN0cmluZy5yZXBsYWNlKClgIGZvciBgUmVnRXhwYCwgb3IgbGlrZSBhIGBVcmxNYXRjaGVyYCBwYXR0ZXJuIG90aGVyd2lzZSkuXG4gICAqXG4gICAqIElmIHRoZSBoYW5kbGVyIGlzIGEgZnVuY3Rpb24sIGl0IGlzIGluamVjdGFibGUuIEl0IGdldHMgaW52b2tlZCBpZiBgJGxvY2F0aW9uYFxuICAgKiBtYXRjaGVzLiBZb3UgaGF2ZSB0aGUgb3B0aW9uIG9mIGluamVjdCB0aGUgbWF0Y2ggb2JqZWN0IGFzIGAkbWF0Y2hgLlxuICAgKlxuICAgKiBUaGUgaGFuZGxlciBjYW4gcmV0dXJuXG4gICAqXG4gICAqIC0gKipmYWxzeSoqIHRvIGluZGljYXRlIHRoYXQgdGhlIHJ1bGUgZGlkbid0IG1hdGNoIGFmdGVyIGFsbCwgdGhlbiBgJHVybFJvdXRlcmBcbiAgICogICB3aWxsIGNvbnRpbnVlIHRyeWluZyB0byBmaW5kIGFub3RoZXIgb25lIHRoYXQgbWF0Y2hlcy5cbiAgICogLSAqKnN0cmluZyoqIHdoaWNoIGlzIHRyZWF0ZWQgYXMgYSByZWRpcmVjdCBhbmQgcGFzc2VkIHRvIGAkbG9jYXRpb24udXJsKClgXG4gICAqIC0gKip2b2lkKiogb3IgYW55ICoqdHJ1dGh5KiogdmFsdWUgdGVsbHMgYCR1cmxSb3V0ZXJgIHRoYXQgdGhlIHVybCB3YXMgaGFuZGxlZC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogPHByZT5cbiAgICogdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbJ3VpLnJvdXRlci5yb3V0ZXInXSk7XG4gICAqXG4gICAqIGFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlcikge1xuICAgKiAgICR1cmxSb3V0ZXJQcm92aWRlci53aGVuKCRzdGF0ZS51cmwsIGZ1bmN0aW9uICgkbWF0Y2gsICRzdGF0ZVBhcmFtcykge1xuICAgKiAgICAgaWYgKCRzdGF0ZS4kY3VycmVudC5uYXZpZ2FibGUgIT09IHN0YXRlIHx8XG4gICAqICAgICAgICAgIWVxdWFsRm9yS2V5cygkbWF0Y2gsICRzdGF0ZVBhcmFtcykge1xuICAgKiAgICAgICRzdGF0ZS50cmFuc2l0aW9uVG8oc3RhdGUsICRtYXRjaCwgZmFsc2UpO1xuICAgKiAgICAgfVxuICAgKiAgIH0pO1xuICAgKiB9KTtcbiAgICogPC9wcmU+XG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gd2hhdCBUaGUgaW5jb21pbmcgcGF0aCB0aGF0IHlvdSB3YW50IHRvIHJlZGlyZWN0LlxuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IGhhbmRsZXIgVGhlIHBhdGggeW91IHdhbnQgdG8gcmVkaXJlY3QgeW91ciB1c2VyIHRvLlxuICAgKi9cbiAgdGhpcy53aGVuID0gZnVuY3Rpb24gKHdoYXQsIGhhbmRsZXIpIHtcbiAgICB2YXIgcmVkaXJlY3QsIGhhbmRsZXJJc1N0cmluZyA9IGlzU3RyaW5nKGhhbmRsZXIpO1xuICAgIGlmIChpc1N0cmluZyh3aGF0KSkgd2hhdCA9ICR1cmxNYXRjaGVyRmFjdG9yeS5jb21waWxlKHdoYXQpO1xuXG4gICAgaWYgKCFoYW5kbGVySXNTdHJpbmcgJiYgIWlzRnVuY3Rpb24oaGFuZGxlcikgJiYgIWlzQXJyYXkoaGFuZGxlcikpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnZhbGlkICdoYW5kbGVyJyBpbiB3aGVuKClcIik7XG5cbiAgICB2YXIgc3RyYXRlZ2llcyA9IHtcbiAgICAgIG1hdGNoZXI6IGZ1bmN0aW9uICh3aGF0LCBoYW5kbGVyKSB7XG4gICAgICAgIGlmIChoYW5kbGVySXNTdHJpbmcpIHtcbiAgICAgICAgICByZWRpcmVjdCA9ICR1cmxNYXRjaGVyRmFjdG9yeS5jb21waWxlKGhhbmRsZXIpO1xuICAgICAgICAgIGhhbmRsZXIgPSBbJyRtYXRjaCcsIGZ1bmN0aW9uICgkbWF0Y2gpIHsgcmV0dXJuIHJlZGlyZWN0LmZvcm1hdCgkbWF0Y2gpOyB9XTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXh0ZW5kKGZ1bmN0aW9uICgkaW5qZWN0b3IsICRsb2NhdGlvbikge1xuICAgICAgICAgIHJldHVybiBoYW5kbGVJZk1hdGNoKCRpbmplY3RvciwgaGFuZGxlciwgd2hhdC5leGVjKCRsb2NhdGlvbi5wYXRoKCksICRsb2NhdGlvbi5zZWFyY2goKSkpO1xuICAgICAgICB9LCB7XG4gICAgICAgICAgcHJlZml4OiBpc1N0cmluZyh3aGF0LnByZWZpeCkgPyB3aGF0LnByZWZpeCA6ICcnXG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICAgIHJlZ2V4OiBmdW5jdGlvbiAod2hhdCwgaGFuZGxlcikge1xuICAgICAgICBpZiAod2hhdC5nbG9iYWwgfHwgd2hhdC5zdGlja3kpIHRocm93IG5ldyBFcnJvcihcIndoZW4oKSBSZWdFeHAgbXVzdCBub3QgYmUgZ2xvYmFsIG9yIHN0aWNreVwiKTtcblxuICAgICAgICBpZiAoaGFuZGxlcklzU3RyaW5nKSB7XG4gICAgICAgICAgcmVkaXJlY3QgPSBoYW5kbGVyO1xuICAgICAgICAgIGhhbmRsZXIgPSBbJyRtYXRjaCcsIGZ1bmN0aW9uICgkbWF0Y2gpIHsgcmV0dXJuIGludGVycG9sYXRlKHJlZGlyZWN0LCAkbWF0Y2gpOyB9XTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXh0ZW5kKGZ1bmN0aW9uICgkaW5qZWN0b3IsICRsb2NhdGlvbikge1xuICAgICAgICAgIHJldHVybiBoYW5kbGVJZk1hdGNoKCRpbmplY3RvciwgaGFuZGxlciwgd2hhdC5leGVjKCRsb2NhdGlvbi5wYXRoKCkpKTtcbiAgICAgICAgfSwge1xuICAgICAgICAgIHByZWZpeDogcmVnRXhwUHJlZml4KHdoYXQpXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgY2hlY2sgPSB7IG1hdGNoZXI6ICR1cmxNYXRjaGVyRmFjdG9yeS5pc01hdGNoZXIod2hhdCksIHJlZ2V4OiB3aGF0IGluc3RhbmNlb2YgUmVnRXhwIH07XG5cbiAgICBmb3IgKHZhciBuIGluIGNoZWNrKSB7XG4gICAgICBpZiAoY2hlY2tbbl0pIHJldHVybiB0aGlzLnJ1bGUoc3RyYXRlZ2llc1tuXSh3aGF0LCBoYW5kbGVyKSk7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCAnd2hhdCcgaW4gd2hlbigpXCIpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgdWkucm91dGVyLnJvdXRlci4kdXJsUm91dGVyUHJvdmlkZXIjZGVmZXJJbnRlcmNlcHRcbiAgICogQG1ldGhvZE9mIHVpLnJvdXRlci5yb3V0ZXIuJHVybFJvdXRlclByb3ZpZGVyXG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBEaXNhYmxlcyAob3IgZW5hYmxlcykgZGVmZXJyaW5nIGxvY2F0aW9uIGNoYW5nZSBpbnRlcmNlcHRpb24uXG4gICAqXG4gICAqIElmIHlvdSB3aXNoIHRvIGN1c3RvbWl6ZSB0aGUgYmVoYXZpb3Igb2Ygc3luY2luZyB0aGUgVVJMIChmb3IgZXhhbXBsZSwgaWYgeW91IHdpc2ggdG9cbiAgICogZGVmZXIgYSB0cmFuc2l0aW9uIGJ1dCBtYWludGFpbiB0aGUgY3VycmVudCBVUkwpLCBjYWxsIHRoaXMgbWV0aG9kIGF0IGNvbmZpZ3VyYXRpb24gdGltZS5cbiAgICogVGhlbiwgYXQgcnVuIHRpbWUsIGNhbGwgYCR1cmxSb3V0ZXIubGlzdGVuKClgIGFmdGVyIHlvdSBoYXZlIGNvbmZpZ3VyZWQgeW91ciBvd25cbiAgICogYCRsb2NhdGlvbkNoYW5nZVN1Y2Nlc3NgIGV2ZW50IGhhbmRsZXIuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIDxwcmU+XG4gICAqIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnYXBwJywgWyd1aS5yb3V0ZXIucm91dGVyJ10pO1xuICAgKlxuICAgKiBhcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIpIHtcbiAgICpcbiAgICogICAvLyBQcmV2ZW50ICR1cmxSb3V0ZXIgZnJvbSBhdXRvbWF0aWNhbGx5IGludGVyY2VwdGluZyBVUkwgY2hhbmdlcztcbiAgICogICAvLyB0aGlzIGFsbG93cyB5b3UgdG8gY29uZmlndXJlIGN1c3RvbSBiZWhhdmlvciBpbiBiZXR3ZWVuXG4gICAqICAgLy8gbG9jYXRpb24gY2hhbmdlcyBhbmQgcm91dGUgc3luY2hyb25pemF0aW9uOlxuICAgKiAgICR1cmxSb3V0ZXJQcm92aWRlci5kZWZlckludGVyY2VwdCgpO1xuICAgKlxuICAgKiB9KS5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsICR1cmxSb3V0ZXIsIFVzZXJTZXJ2aWNlKSB7XG4gICAqXG4gICAqICAgJHJvb3RTY29wZS4kb24oJyRsb2NhdGlvbkNoYW5nZVN1Y2Nlc3MnLCBmdW5jdGlvbihlKSB7XG4gICAqICAgICAvLyBVc2VyU2VydmljZSBpcyBhbiBleGFtcGxlIHNlcnZpY2UgZm9yIG1hbmFnaW5nIHVzZXIgc3RhdGVcbiAgICogICAgIGlmIChVc2VyU2VydmljZS5pc0xvZ2dlZEluKCkpIHJldHVybjtcbiAgICpcbiAgICogICAgIC8vIFByZXZlbnQgJHVybFJvdXRlcidzIGRlZmF1bHQgaGFuZGxlciBmcm9tIGZpcmluZ1xuICAgKiAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgKlxuICAgKiAgICAgVXNlclNlcnZpY2UuaGFuZGxlTG9naW4oKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgKiAgICAgICAvLyBPbmNlIHRoZSB1c2VyIGhhcyBsb2dnZWQgaW4sIHN5bmMgdGhlIGN1cnJlbnQgVVJMXG4gICAqICAgICAgIC8vIHRvIHRoZSByb3V0ZXI6XG4gICAqICAgICAgICR1cmxSb3V0ZXIuc3luYygpO1xuICAgKiAgICAgfSk7XG4gICAqICAgfSk7XG4gICAqXG4gICAqICAgLy8gQ29uZmlndXJlcyAkdXJsUm91dGVyJ3MgbGlzdGVuZXIgKmFmdGVyKiB5b3VyIGN1c3RvbSBsaXN0ZW5lclxuICAgKiAgICR1cmxSb3V0ZXIubGlzdGVuKCk7XG4gICAqIH0pO1xuICAgKiA8L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFufSBkZWZlciBJbmRpY2F0ZXMgd2hldGhlciB0byBkZWZlciBsb2NhdGlvbiBjaGFuZ2UgaW50ZXJjZXB0aW9uLiBQYXNzaW5nXG4gICAgICAgICAgICBubyBwYXJhbWV0ZXIgaXMgZXF1aXZhbGVudCB0byBgdHJ1ZWAuXG4gICAqL1xuICB0aGlzLmRlZmVySW50ZXJjZXB0ID0gZnVuY3Rpb24gKGRlZmVyKSB7XG4gICAgaWYgKGRlZmVyID09PSB1bmRlZmluZWQpIGRlZmVyID0gdHJ1ZTtcbiAgICBpbnRlcmNlcHREZWZlcnJlZCA9IGRlZmVyO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2Mgb2JqZWN0XG4gICAqIEBuYW1lIHVpLnJvdXRlci5yb3V0ZXIuJHVybFJvdXRlclxuICAgKlxuICAgKiBAcmVxdWlyZXMgJGxvY2F0aW9uXG4gICAqIEByZXF1aXJlcyAkcm9vdFNjb3BlXG4gICAqIEByZXF1aXJlcyAkaW5qZWN0b3JcbiAgICogQHJlcXVpcmVzICRicm93c2VyXG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKlxuICAgKi9cbiAgdGhpcy4kZ2V0ID0gJGdldDtcbiAgJGdldC4kaW5qZWN0ID0gWyckbG9jYXRpb24nLCAnJHJvb3RTY29wZScsICckaW5qZWN0b3InLCAnJGJyb3dzZXInXTtcbiAgZnVuY3Rpb24gJGdldCggICAkbG9jYXRpb24sICAgJHJvb3RTY29wZSwgICAkaW5qZWN0b3IsICAgJGJyb3dzZXIpIHtcblxuICAgIHZhciBiYXNlSHJlZiA9ICRicm93c2VyLmJhc2VIcmVmKCksIGxvY2F0aW9uID0gJGxvY2F0aW9uLnVybCgpLCBsYXN0UHVzaGVkVXJsO1xuXG4gICAgZnVuY3Rpb24gYXBwZW5kQmFzZVBhdGgodXJsLCBpc0h0bWw1LCBhYnNvbHV0ZSkge1xuICAgICAgaWYgKGJhc2VIcmVmID09PSAnLycpIHJldHVybiB1cmw7XG4gICAgICBpZiAoaXNIdG1sNSkgcmV0dXJuIGJhc2VIcmVmLnNsaWNlKDAsIC0xKSArIHVybDtcbiAgICAgIGlmIChhYnNvbHV0ZSkgcmV0dXJuIGJhc2VIcmVmLnNsaWNlKDEpICsgdXJsO1xuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBPcHRpbWl6ZSBncm91cHMgb2YgcnVsZXMgd2l0aCBub24tZW1wdHkgcHJlZml4IGludG8gc29tZSBzb3J0IG9mIGRlY2lzaW9uIHRyZWVcbiAgICBmdW5jdGlvbiB1cGRhdGUoZXZ0KSB7XG4gICAgICBpZiAoZXZ0ICYmIGV2dC5kZWZhdWx0UHJldmVudGVkKSByZXR1cm47XG4gICAgICB2YXIgaWdub3JlVXBkYXRlID0gbGFzdFB1c2hlZFVybCAmJiAkbG9jYXRpb24udXJsKCkgPT09IGxhc3RQdXNoZWRVcmw7XG4gICAgICBsYXN0UHVzaGVkVXJsID0gdW5kZWZpbmVkO1xuICAgICAgaWYgKGlnbm9yZVVwZGF0ZSkgcmV0dXJuIHRydWU7XG5cbiAgICAgIGZ1bmN0aW9uIGNoZWNrKHJ1bGUpIHtcbiAgICAgICAgdmFyIGhhbmRsZWQgPSBydWxlKCRpbmplY3RvciwgJGxvY2F0aW9uKTtcblxuICAgICAgICBpZiAoIWhhbmRsZWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKGlzU3RyaW5nKGhhbmRsZWQpKSAkbG9jYXRpb24ucmVwbGFjZSgpLnVybChoYW5kbGVkKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICB2YXIgbiA9IHJ1bGVzLmxlbmd0aCwgaTtcblxuICAgICAgZm9yIChpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICBpZiAoY2hlY2socnVsZXNbaV0pKSByZXR1cm47XG4gICAgICB9XG4gICAgICAvLyBhbHdheXMgY2hlY2sgb3RoZXJ3aXNlIGxhc3QgdG8gYWxsb3cgZHluYW1pYyB1cGRhdGVzIHRvIHRoZSBzZXQgb2YgcnVsZXNcbiAgICAgIGlmIChvdGhlcndpc2UpIGNoZWNrKG90aGVyd2lzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdGVuKCkge1xuICAgICAgbGlzdGVuZXIgPSBsaXN0ZW5lciB8fCAkcm9vdFNjb3BlLiRvbignJGxvY2F0aW9uQ2hhbmdlU3VjY2VzcycsIHVwZGF0ZSk7XG4gICAgICByZXR1cm4gbGlzdGVuZXI7XG4gICAgfVxuXG4gICAgaWYgKCFpbnRlcmNlcHREZWZlcnJlZCkgbGlzdGVuKCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgLyoqXG4gICAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgICAqIEBuYW1lIHVpLnJvdXRlci5yb3V0ZXIuJHVybFJvdXRlciNzeW5jXG4gICAgICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnJvdXRlci4kdXJsUm91dGVyXG4gICAgICAgKlxuICAgICAgICogQGRlc2NyaXB0aW9uXG4gICAgICAgKiBUcmlnZ2VycyBhbiB1cGRhdGU7IHRoZSBzYW1lIHVwZGF0ZSB0aGF0IGhhcHBlbnMgd2hlbiB0aGUgYWRkcmVzcyBiYXIgdXJsIGNoYW5nZXMsIGFrYSBgJGxvY2F0aW9uQ2hhbmdlU3VjY2Vzc2AuXG4gICAgICAgKiBUaGlzIG1ldGhvZCBpcyB1c2VmdWwgd2hlbiB5b3UgbmVlZCB0byB1c2UgYHByZXZlbnREZWZhdWx0KClgIG9uIHRoZSBgJGxvY2F0aW9uQ2hhbmdlU3VjY2Vzc2AgZXZlbnQsXG4gICAgICAgKiBwZXJmb3JtIHNvbWUgY3VzdG9tIGxvZ2ljIChyb3V0ZSBwcm90ZWN0aW9uLCBhdXRoLCBjb25maWcsIHJlZGlyZWN0aW9uLCBldGMpIGFuZCB0aGVuIGZpbmFsbHkgcHJvY2VlZFxuICAgICAgICogd2l0aCB0aGUgdHJhbnNpdGlvbiBieSBjYWxsaW5nIGAkdXJsUm91dGVyLnN5bmMoKWAuXG4gICAgICAgKlxuICAgICAgICogQGV4YW1wbGVcbiAgICAgICAqIDxwcmU+XG4gICAgICAgKiBhbmd1bGFyLm1vZHVsZSgnYXBwJywgWyd1aS5yb3V0ZXInXSlcbiAgICAgICAqICAgLnJ1bihmdW5jdGlvbigkcm9vdFNjb3BlLCAkdXJsUm91dGVyKSB7XG4gICAgICAgKiAgICAgJHJvb3RTY29wZS4kb24oJyRsb2NhdGlvbkNoYW5nZVN1Y2Nlc3MnLCBmdW5jdGlvbihldnQpIHtcbiAgICAgICAqICAgICAgIC8vIEhhbHQgc3RhdGUgY2hhbmdlIGZyb20gZXZlbiBzdGFydGluZ1xuICAgICAgICogICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgKiAgICAgICAvLyBQZXJmb3JtIGN1c3RvbSBsb2dpY1xuICAgICAgICogICAgICAgdmFyIG1lZXRzUmVxdWlyZW1lbnQgPSAuLi5cbiAgICAgICAqICAgICAgIC8vIENvbnRpbnVlIHdpdGggdGhlIHVwZGF0ZSBhbmQgc3RhdGUgdHJhbnNpdGlvbiBpZiBsb2dpYyBhbGxvd3NcbiAgICAgICAqICAgICAgIGlmIChtZWV0c1JlcXVpcmVtZW50KSAkdXJsUm91dGVyLnN5bmMoKTtcbiAgICAgICAqICAgICB9KTtcbiAgICAgICAqIH0pO1xuICAgICAgICogPC9wcmU+XG4gICAgICAgKi9cbiAgICAgIHN5bmM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB1cGRhdGUoKTtcbiAgICAgIH0sXG5cbiAgICAgIGxpc3RlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBsaXN0ZW4oKTtcbiAgICAgIH0sXG5cbiAgICAgIHVwZGF0ZTogZnVuY3Rpb24ocmVhZCkge1xuICAgICAgICBpZiAocmVhZCkge1xuICAgICAgICAgIGxvY2F0aW9uID0gJGxvY2F0aW9uLnVybCgpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoJGxvY2F0aW9uLnVybCgpID09PSBsb2NhdGlvbikgcmV0dXJuO1xuXG4gICAgICAgICRsb2NhdGlvbi51cmwobG9jYXRpb24pO1xuICAgICAgICAkbG9jYXRpb24ucmVwbGFjZSgpO1xuICAgICAgfSxcblxuICAgICAgcHVzaDogZnVuY3Rpb24odXJsTWF0Y2hlciwgcGFyYW1zLCBvcHRpb25zKSB7XG4gICAgICAgICRsb2NhdGlvbi51cmwodXJsTWF0Y2hlci5mb3JtYXQocGFyYW1zIHx8IHt9KSk7XG4gICAgICAgIGxhc3RQdXNoZWRVcmwgPSBvcHRpb25zICYmIG9wdGlvbnMuJCRhdm9pZFJlc3luYyA/ICRsb2NhdGlvbi51cmwoKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5yZXBsYWNlKSAkbG9jYXRpb24ucmVwbGFjZSgpO1xuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgICAqIEBuYW1lIHVpLnJvdXRlci5yb3V0ZXIuJHVybFJvdXRlciNocmVmXG4gICAgICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnJvdXRlci4kdXJsUm91dGVyXG4gICAgICAgKlxuICAgICAgICogQGRlc2NyaXB0aW9uXG4gICAgICAgKiBBIFVSTCBnZW5lcmF0aW9uIG1ldGhvZCB0aGF0IHJldHVybnMgdGhlIGNvbXBpbGVkIFVSTCBmb3IgYSBnaXZlblxuICAgICAgICoge0BsaW5rIHVpLnJvdXRlci51dGlsLnR5cGU6VXJsTWF0Y2hlciBgVXJsTWF0Y2hlcmB9LCBwb3B1bGF0ZWQgd2l0aCB0aGUgcHJvdmlkZWQgcGFyYW1ldGVycy5cbiAgICAgICAqXG4gICAgICAgKiBAZXhhbXBsZVxuICAgICAgICogPHByZT5cbiAgICAgICAqICRib2IgPSAkdXJsUm91dGVyLmhyZWYobmV3IFVybE1hdGNoZXIoXCIvYWJvdXQvOnBlcnNvblwiKSwge1xuICAgICAgICogICBwZXJzb246IFwiYm9iXCJcbiAgICAgICAqIH0pO1xuICAgICAgICogLy8gJGJvYiA9PSBcIi9hYm91dC9ib2JcIjtcbiAgICAgICAqIDwvcHJlPlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7VXJsTWF0Y2hlcn0gdXJsTWF0Y2hlciBUaGUgYFVybE1hdGNoZXJgIG9iamVjdCB3aGljaCBpcyB1c2VkIGFzIHRoZSB0ZW1wbGF0ZSBvZiB0aGUgVVJMIHRvIGdlbmVyYXRlLlxuICAgICAgICogQHBhcmFtIHtvYmplY3Q9fSBwYXJhbXMgQW4gb2JqZWN0IG9mIHBhcmFtZXRlciB2YWx1ZXMgdG8gZmlsbCB0aGUgbWF0Y2hlcidzIHJlcXVpcmVkIHBhcmFtZXRlcnMuXG4gICAgICAgKiBAcGFyYW0ge29iamVjdD19IG9wdGlvbnMgT3B0aW9ucyBvYmplY3QuIFRoZSBvcHRpb25zIGFyZTpcbiAgICAgICAqXG4gICAgICAgKiAtICoqYGFic29sdXRlYCoqIC0ge2Jvb2xlYW49ZmFsc2V9LCAgSWYgdHJ1ZSB3aWxsIGdlbmVyYXRlIGFuIGFic29sdXRlIHVybCwgZS5nLiBcImh0dHA6Ly93d3cuZXhhbXBsZS5jb20vZnVsbHVybFwiLlxuICAgICAgICpcbiAgICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIGZ1bGx5IGNvbXBpbGVkIFVSTCwgb3IgYG51bGxgIGlmIGBwYXJhbXNgIGZhaWwgdmFsaWRhdGlvbiBhZ2FpbnN0IGB1cmxNYXRjaGVyYFxuICAgICAgICovXG4gICAgICBocmVmOiBmdW5jdGlvbih1cmxNYXRjaGVyLCBwYXJhbXMsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKCF1cmxNYXRjaGVyLnZhbGlkYXRlcyhwYXJhbXMpKSByZXR1cm4gbnVsbDtcblxuICAgICAgICB2YXIgaXNIdG1sNSA9ICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSgpO1xuICAgICAgICBpZiAoYW5ndWxhci5pc09iamVjdChpc0h0bWw1KSkge1xuICAgICAgICAgIGlzSHRtbDUgPSBpc0h0bWw1LmVuYWJsZWQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciB1cmwgPSB1cmxNYXRjaGVyLmZvcm1hdChwYXJhbXMpO1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICBpZiAoIWlzSHRtbDUgJiYgdXJsICE9PSBudWxsKSB7XG4gICAgICAgICAgdXJsID0gXCIjXCIgKyAkbG9jYXRpb25Qcm92aWRlci5oYXNoUHJlZml4KCkgKyB1cmw7XG4gICAgICAgIH1cbiAgICAgICAgdXJsID0gYXBwZW5kQmFzZVBhdGgodXJsLCBpc0h0bWw1LCBvcHRpb25zLmFic29sdXRlKTtcblxuICAgICAgICBpZiAoIW9wdGlvbnMuYWJzb2x1dGUgfHwgIXVybCkge1xuICAgICAgICAgIHJldHVybiB1cmw7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc2xhc2ggPSAoIWlzSHRtbDUgJiYgdXJsID8gJy8nIDogJycpLCBwb3J0ID0gJGxvY2F0aW9uLnBvcnQoKTtcbiAgICAgICAgcG9ydCA9IChwb3J0ID09PSA4MCB8fCBwb3J0ID09PSA0NDMgPyAnJyA6ICc6JyArIHBvcnQpO1xuXG4gICAgICAgIHJldHVybiBbJGxvY2F0aW9uLnByb3RvY29sKCksICc6Ly8nLCAkbG9jYXRpb24uaG9zdCgpLCBwb3J0LCBzbGFzaCwgdXJsXS5qb2luKCcnKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG59XG5cbmFuZ3VsYXIubW9kdWxlKCd1aS5yb3V0ZXIucm91dGVyJykucHJvdmlkZXIoJyR1cmxSb3V0ZXInLCAkVXJsUm91dGVyUHJvdmlkZXIpO1xuIl0sImZpbGUiOiJzY3JpcHRzL3ZlbmRvcnMvYW5ndWxhci11aS1yb3V0ZXIvc3JjL3VybFJvdXRlci5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9