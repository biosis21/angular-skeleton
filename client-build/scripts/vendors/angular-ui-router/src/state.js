/**
 * @ngdoc object
 * @name ui.router.state.$stateProvider
 *
 * @requires ui.router.router.$urlRouterProvider
 * @requires ui.router.util.$urlMatcherFactoryProvider
 *
 * @description
 * The new `$stateProvider` works similar to Angular's v1 router, but it focuses purely
 * on state.
 *
 * A state corresponds to a "place" in the application in terms of the overall UI and
 * navigation. A state describes (via the controller / template / view properties) what
 * the UI looks like and does at that place.
 *
 * States often have things in common, and the primary way of factoring out these
 * commonalities in this model is via the state hierarchy, i.e. parent/child states aka
 * nested states.
 *
 * The `$stateProvider` provides interfaces to declare these states for your app.
 */
$StateProvider.$inject = ['$urlRouterProvider', '$urlMatcherFactoryProvider'];
function $StateProvider(   $urlRouterProvider,   $urlMatcherFactory) {

  var root, states = {}, $state, queue = {}, abstractKey = 'abstract';

  // Builds state properties from definition passed to registerState()
  var stateBuilder = {

    // Derive parent state from a hierarchical name only if 'parent' is not explicitly defined.
    // state.children = [];
    // if (parent) parent.children.push(state);
    parent: function(state) {
      if (isDefined(state.parent) && state.parent) return findState(state.parent);
      // regex matches any valid composite state name
      // would match "contact.list" but not "contacts"
      var compositeName = /^(.+)\.[^.]+$/.exec(state.name);
      return compositeName ? findState(compositeName[1]) : root;
    },

    // inherit 'data' from parent and override by own values (if any)
    data: function(state) {
      if (state.parent && state.parent.data) {
        state.data = state.self.data = extend({}, state.parent.data, state.data);
      }
      return state.data;
    },

    // Build a URLMatcher if necessary, either via a relative or absolute URL
    url: function(state) {
      var url = state.url, config = { params: state.params || {} };

      if (isString(url)) {
        if (url.charAt(0) == '^') return $urlMatcherFactory.compile(url.substring(1), config);
        return (state.parent.navigable || root).url.concat(url, config);
      }

      if (!url || $urlMatcherFactory.isMatcher(url)) return url;
      throw new Error("Invalid url '" + url + "' in state '" + state + "'");
    },

    // Keep track of the closest ancestor state that has a URL (i.e. is navigable)
    navigable: function(state) {
      return state.url ? state : (state.parent ? state.parent.navigable : null);
    },

    // Own parameters for this state. state.url.params is already built at this point. Create and add non-url params
    ownParams: function(state) {
      var params = state.url && state.url.params || new $$UMFP.ParamSet();
      forEach(state.params || {}, function(config, id) {
        if (!params[id]) params[id] = new $$UMFP.Param(id, null, config, "config");
      });
      return params;
    },

    // Derive parameters for this state and ensure they're a super-set of parent's parameters
    params: function(state) {
      return state.parent && state.parent.params ? extend(state.parent.params.$$new(), state.ownParams) : new $$UMFP.ParamSet();
    },

    // If there is no explicit multi-view configuration, make one up so we don't have
    // to handle both cases in the view directive later. Note that having an explicit
    // 'views' property will mean the default unnamed view properties are ignored. This
    // is also a good time to resolve view names to absolute names, so everything is a
    // straight lookup at link time.
    views: function(state) {
      var views = {};

      forEach(isDefined(state.views) ? state.views : { '': state }, function (view, name) {
        if (name.indexOf('@') < 0) name += '@' + state.parent.name;
        views[name] = view;
      });
      return views;
    },

    // Keep a full path from the root down to this state as this is needed for state activation.
    path: function(state) {
      return state.parent ? state.parent.path.concat(state) : []; // exclude root from path
    },

    // Speed up $state.contains() as it's used a lot
    includes: function(state) {
      var includes = state.parent ? extend({}, state.parent.includes) : {};
      includes[state.name] = true;
      return includes;
    },

    $delegates: {}
  };

  function isRelative(stateName) {
    return stateName.indexOf(".") === 0 || stateName.indexOf("^") === 0;
  }

  function findState(stateOrName, base) {
    if (!stateOrName) return undefined;

    var isStr = isString(stateOrName),
        name  = isStr ? stateOrName : stateOrName.name,
        path  = isRelative(name);

    if (path) {
      if (!base) throw new Error("No reference point given for path '"  + name + "'");
      base = findState(base);
      
      var rel = name.split("."), i = 0, pathLength = rel.length, current = base;

      for (; i < pathLength; i++) {
        if (rel[i] === "" && i === 0) {
          current = base;
          continue;
        }
        if (rel[i] === "^") {
          if (!current.parent) throw new Error("Path '" + name + "' not valid for state '" + base.name + "'");
          current = current.parent;
          continue;
        }
        break;
      }
      rel = rel.slice(i).join(".");
      name = current.name + (current.name && rel ? "." : "") + rel;
    }
    var state = states[name];

    if (state && (isStr || (!isStr && (state === stateOrName || state.self === stateOrName)))) {
      return state;
    }
    return undefined;
  }

  function queueState(parentName, state) {
    if (!queue[parentName]) {
      queue[parentName] = [];
    }
    queue[parentName].push(state);
  }

  function flushQueuedChildren(parentName) {
    var queued = queue[parentName] || [];
    while(queued.length) {
      registerState(queued.shift());
    }
  }

  function registerState(state) {
    // Wrap a new object around the state so we can store our private details easily.
    state = inherit(state, {
      self: state,
      resolve: state.resolve || {},
      toString: function() { return this.name; }
    });

    var name = state.name;
    if (!isString(name) || name.indexOf('@') >= 0) throw new Error("State must have a valid name");
    if (states.hasOwnProperty(name)) throw new Error("State '" + name + "'' is already defined");

    // Get parent name
    var parentName = (name.indexOf('.') !== -1) ? name.substring(0, name.lastIndexOf('.'))
        : (isString(state.parent)) ? state.parent
        : (isObject(state.parent) && isString(state.parent.name)) ? state.parent.name
        : '';

    // If parent is not registered yet, add state to queue and register later
    if (parentName && !states[parentName]) {
      return queueState(parentName, state.self);
    }

    for (var key in stateBuilder) {
      if (isFunction(stateBuilder[key])) state[key] = stateBuilder[key](state, stateBuilder.$delegates[key]);
    }
    states[name] = state;

    // Register the state in the global state list and with $urlRouter if necessary.
    if (!state[abstractKey] && state.url) {
      $urlRouterProvider.when(state.url, ['$match', '$stateParams', function ($match, $stateParams) {
        if ($state.$current.navigable != state || !equalForKeys($match, $stateParams)) {
          $state.transitionTo(state, $match, { inherit: true, location: false });
        }
      }]);
    }

    // Register any queued children
    flushQueuedChildren(name);

    return state;
  }

  // Checks text to see if it looks like a glob.
  function isGlob (text) {
    return text.indexOf('*') > -1;
  }

  // Returns true if glob matches current $state name.
  function doesStateMatchGlob (glob) {
    var globSegments = glob.split('.'),
        segments = $state.$current.name.split('.');

    //match greedy starts
    if (globSegments[0] === '**') {
       segments = segments.slice(indexOf(segments, globSegments[1]));
       segments.unshift('**');
    }
    //match greedy ends
    if (globSegments[globSegments.length - 1] === '**') {
       segments.splice(indexOf(segments, globSegments[globSegments.length - 2]) + 1, Number.MAX_VALUE);
       segments.push('**');
    }

    if (globSegments.length != segments.length) {
      return false;
    }

    //match single stars
    for (var i = 0, l = globSegments.length; i < l; i++) {
      if (globSegments[i] === '*') {
        segments[i] = '*';
      }
    }

    return segments.join('') === globSegments.join('');
  }


  // Implicit root state that is always active
  root = registerState({
    name: '',
    url: '^',
    views: null,
    'abstract': true
  });
  root.navigable = null;


  /**
   * @ngdoc function
   * @name ui.router.state.$stateProvider#decorator
   * @methodOf ui.router.state.$stateProvider
   *
   * @description
   * Allows you to extend (carefully) or override (at your own peril) the 
   * `stateBuilder` object used internally by `$stateProvider`. This can be used 
   * to add custom functionality to ui-router, for example inferring templateUrl 
   * based on the state name.
   *
   * When passing only a name, it returns the current (original or decorated) builder
   * function that matches `name`.
   *
   * The builder functions that can be decorated are listed below. Though not all
   * necessarily have a good use case for decoration, that is up to you to decide.
   *
   * In addition, users can attach custom decorators, which will generate new 
   * properties within the state's internal definition. There is currently no clear 
   * use-case for this beyond accessing internal states (i.e. $state.$current), 
   * however, expect this to become increasingly relevant as we introduce additional 
   * meta-programming features.
   *
   * **Warning**: Decorators should not be interdependent because the order of 
   * execution of the builder functions in non-deterministic. Builder functions 
   * should only be dependent on the state definition object and super function.
   *
   *
   * Existing builder functions and current return values:
   *
   * - **parent** `{object}` - returns the parent state object.
   * - **data** `{object}` - returns state data, including any inherited data that is not
   *   overridden by own values (if any).
   * - **url** `{object}` - returns a {@link ui.router.util.type:UrlMatcher UrlMatcher}
   *   or `null`.
   * - **navigable** `{object}` - returns closest ancestor state that has a URL (aka is 
   *   navigable).
   * - **params** `{object}` - returns an array of state params that are ensured to 
   *   be a super-set of parent's params.
   * - **views** `{object}` - returns a views object where each key is an absolute view 
   *   name (i.e. "viewName@stateName") and each value is the config object 
   *   (template, controller) for the view. Even when you don't use the views object 
   *   explicitly on a state config, one is still created for you internally.
   *   So by decorating this builder function you have access to decorating template 
   *   and controller properties.
   * - **ownParams** `{object}` - returns an array of params that belong to the state, 
   *   not including any params defined by ancestor states.
   * - **path** `{string}` - returns the full path from the root down to this state. 
   *   Needed for state activation.
   * - **includes** `{object}` - returns an object that includes every state that 
   *   would pass a `$state.includes()` test.
   *
   * @example
   * <pre>
   * // Override the internal 'views' builder with a function that takes the state
   * // definition, and a reference to the internal function being overridden:
   * $stateProvider.decorator('views', function (state, parent) {
   *   var result = {},
   *       views = parent(state);
   *
   *   angular.forEach(views, function (config, name) {
   *     var autoName = (state.name + '.' + name).replace('.', '/');
   *     config.templateUrl = config.templateUrl || '/partials/' + autoName + '.html';
   *     result[name] = config;
   *   });
   *   return result;
   * });
   *
   * $stateProvider.state('home', {
   *   views: {
   *     'contact.list': { controller: 'ListController' },
   *     'contact.item': { controller: 'ItemController' }
   *   }
   * });
   *
   * // ...
   *
   * $state.go('home');
   * // Auto-populates list and item views with /partials/home/contact/list.html,
   * // and /partials/home/contact/item.html, respectively.
   * </pre>
   *
   * @param {string} name The name of the builder function to decorate. 
   * @param {object} func A function that is responsible for decorating the original 
   * builder function. The function receives two parameters:
   *
   *   - `{object}` - state - The state config object.
   *   - `{object}` - super - The original builder function.
   *
   * @return {object} $stateProvider - $stateProvider instance
   */
  this.decorator = decorator;
  function decorator(name, func) {
    /*jshint validthis: true */
    if (isString(name) && !isDefined(func)) {
      return stateBuilder[name];
    }
    if (!isFunction(func) || !isString(name)) {
      return this;
    }
    if (stateBuilder[name] && !stateBuilder.$delegates[name]) {
      stateBuilder.$delegates[name] = stateBuilder[name];
    }
    stateBuilder[name] = func;
    return this;
  }

  /**
   * @ngdoc function
   * @name ui.router.state.$stateProvider#state
   * @methodOf ui.router.state.$stateProvider
   *
   * @description
   * Registers a state configuration under a given state name. The stateConfig object
   * has the following acceptable properties.
   *
   * @param {string} name A unique state name, e.g. "home", "about", "contacts".
   * To create a parent/child state use a dot, e.g. "about.sales", "home.newest".
   * @param {object} stateConfig State configuration object.
   * @param {string|function=} stateConfig.template
   * <a id='template'></a>
   *   html template as a string or a function that returns
   *   an html template as a string which should be used by the uiView directives. This property 
   *   takes precedence over templateUrl.
   *   
   *   If `template` is a function, it will be called with the following parameters:
   *
   *   - {array.&lt;object&gt;} - state parameters extracted from the current $location.path() by
   *     applying the current state
   *
   * <pre>template:
   *   "<h1>inline template definition</h1>" +
   *   "<div ui-view></div>"</pre>
   * <pre>template: function(params) {
   *       return "<h1>generated template</h1>"; }</pre>
   * </div>
   *
   * @param {string|function=} stateConfig.templateUrl
   * <a id='templateUrl'></a>
   *
   *   path or function that returns a path to an html
   *   template that should be used by uiView.
   *   
   *   If `templateUrl` is a function, it will be called with the following parameters:
   *
   *   - {array.&lt;object&gt;} - state parameters extracted from the current $location.path() by 
   *     applying the current state
   *
   * <pre>templateUrl: "home.html"</pre>
   * <pre>templateUrl: function(params) {
   *     return myTemplates[params.pageId]; }</pre>
   *
   * @param {function=} stateConfig.templateProvider
   * <a id='templateProvider'></a>
   *    Provider function that returns HTML content string.
   * <pre> templateProvider:
   *       function(MyTemplateService, params) {
   *         return MyTemplateService.getTemplate(params.pageId);
   *       }</pre>
   *
   * @param {string|function=} stateConfig.controller
   * <a id='controller'></a>
   *
   *  Controller fn that should be associated with newly
   *   related scope or the name of a registered controller if passed as a string.
   *   Optionally, the ControllerAs may be declared here.
   * <pre>controller: "MyRegisteredController"</pre>
   * <pre>controller:
   *     "MyRegisteredController as fooCtrl"}</pre>
   * <pre>controller: function($scope, MyService) {
   *     $scope.data = MyService.getData(); }</pre>
   *
   * @param {function=} stateConfig.controllerProvider
   * <a id='controllerProvider'></a>
   *
   * Injectable provider function that returns the actual controller or string.
   * <pre>controllerProvider:
   *   function(MyResolveData) {
   *     if (MyResolveData.foo)
   *       return "FooCtrl"
   *     else if (MyResolveData.bar)
   *       return "BarCtrl";
   *     else return function($scope) {
   *       $scope.baz = "Qux";
   *     }
   *   }</pre>
   *
   * @param {string=} stateConfig.controllerAs
   * <a id='controllerAs'></a>
   * 
   * A controller alias name. If present the controller will be
   *   published to scope under the controllerAs name.
   * <pre>controllerAs: "myCtrl"</pre>
   *
   * @param {object=} stateConfig.resolve
   * <a id='resolve'></a>
   *
   * An optional map&lt;string, function&gt; of dependencies which
   *   should be injected into the controller. If any of these dependencies are promises, 
   *   the router will wait for them all to be resolved before the controller is instantiated.
   *   If all the promises are resolved successfully, the $stateChangeSuccess event is fired
   *   and the values of the resolved promises are injected into any controllers that reference them.
   *   If any  of the promises are rejected the $stateChangeError event is fired.
   *
   *   The map object is:
   *   
   *   - key - {string}: name of dependency to be injected into controller
   *   - factory - {string|function}: If string then it is alias for service. Otherwise if function, 
   *     it is injected and return value it treated as dependency. If result is a promise, it is 
   *     resolved before its value is injected into controller.
   *
   * <pre>resolve: {
   *     myResolve1:
   *       function($http, $stateParams) {
   *         return $http.get("/api/foos/"+stateParams.fooID);
   *       }
   *     }</pre>
   *
   * @param {string=} stateConfig.url
   * <a id='url'></a>
   *
   *   A url fragment with optional parameters. When a state is navigated or
   *   transitioned to, the `$stateParams` service will be populated with any 
   *   parameters that were passed.
   *
   * examples:
   * <pre>url: "/home"
   * url: "/users/:userid"
   * url: "/books/{bookid:[a-zA-Z_-]}"
   * url: "/books/{categoryid:int}"
   * url: "/books/{publishername:string}/{categoryid:int}"
   * url: "/messages?before&after"
   * url: "/messages?{before:date}&{after:date}"</pre>
   * url: "/messages/:mailboxid?{before:date}&{after:date}"
   *
   * @param {object=} stateConfig.views
   * <a id='views'></a>
   * an optional map&lt;string, object&gt; which defined multiple views, or targets views
   * manually/explicitly.
   *
   * Examples:
   *
   * Targets three named `ui-view`s in the parent state's template
   * <pre>views: {
   *     header: {
   *       controller: "headerCtrl",
   *       templateUrl: "header.html"
   *     }, body: {
   *       controller: "bodyCtrl",
   *       templateUrl: "body.html"
   *     }, footer: {
   *       controller: "footCtrl",
   *       templateUrl: "footer.html"
   *     }
   *   }</pre>
   *
   * Targets named `ui-view="header"` from grandparent state 'top''s template, and named `ui-view="body" from parent state's template.
   * <pre>views: {
   *     'header@top': {
   *       controller: "msgHeaderCtrl",
   *       templateUrl: "msgHeader.html"
   *     }, 'body': {
   *       controller: "messagesCtrl",
   *       templateUrl: "messages.html"
   *     }
   *   }</pre>
   *
   * @param {boolean=} [stateConfig.abstract=false]
   * <a id='abstract'></a>
   * An abstract state will never be directly activated,
   *   but can provide inherited properties to its common children states.
   * <pre>abstract: true</pre>
   *
   * @param {function=} stateConfig.onEnter
   * <a id='onEnter'></a>
   *
   * Callback function for when a state is entered. Good way
   *   to trigger an action or dispatch an event, such as opening a dialog.
   * If minifying your scripts, make sure to explictly annotate this function,
   * because it won't be automatically annotated by your build tools.
   *
   * <pre>onEnter: function(MyService, $stateParams) {
   *     MyService.foo($stateParams.myParam);
   * }</pre>
   *
   * @param {function=} stateConfig.onExit
   * <a id='onExit'></a>
   *
   * Callback function for when a state is exited. Good way to
   *   trigger an action or dispatch an event, such as opening a dialog.
   * If minifying your scripts, make sure to explictly annotate this function,
   * because it won't be automatically annotated by your build tools.
   *
   * <pre>onExit: function(MyService, $stateParams) {
   *     MyService.cleanup($stateParams.myParam);
   * }</pre>
   *
   * @param {boolean=} [stateConfig.reloadOnSearch=true]
   * <a id='reloadOnSearch'></a>
   *
   * If `false`, will not retrigger the same state
   *   just because a search/query parameter has changed (via $location.search() or $location.hash()). 
   *   Useful for when you'd like to modify $location.search() without triggering a reload.
   * <pre>reloadOnSearch: false</pre>
   *
   * @param {object=} stateConfig.data
   * <a id='data'></a>
   *
   * Arbitrary data object, useful for custom configuration.  The parent state's `data` is
   *   prototypally inherited.  In other words, adding a data property to a state adds it to
   *   the entire subtree via prototypal inheritance.
   *
   * <pre>data: {
   *     requiredRole: 'foo'
   * } </pre>
   *
   * @param {object=} stateConfig.params
   * <a id='params'></a>
   *
   * A map which optionally configures parameters declared in the `url`, or
   *   defines additional non-url parameters.  For each parameter being
   *   configured, add a configuration object keyed to the name of the parameter.
   *
   *   Each parameter configuration object may contain the following properties:
   *
   *   - ** value ** - {object|function=}: specifies the default value for this
   *     parameter.  This implicitly sets this parameter as optional.
   *
   *     When UI-Router routes to a state and no value is
   *     specified for this parameter in the URL or transition, the
   *     default value will be used instead.  If `value` is a function,
   *     it will be injected and invoked, and the return value used.
   *
   *     *Note*: `undefined` is treated as "no default value" while `null`
   *     is treated as "the default value is `null`".
   *
   *     *Shorthand*: If you only need to configure the default value of the
   *     parameter, you may use a shorthand syntax.   In the **`params`**
   *     map, instead mapping the param name to a full parameter configuration
   *     object, simply set map it to the default parameter value, e.g.:
   *
   * <pre>// define a parameter's default value
   * params: {
   *     param1: { value: "defaultValue" }
   * }
   * // shorthand default values
   * params: {
   *     param1: "defaultValue",
   *     param2: "param2Default"
   * }</pre>
   *
   *   - ** array ** - {boolean=}: *(default: false)* If true, the param value will be
   *     treated as an array of values.  If you specified a Type, the value will be
   *     treated as an array of the specified Type.  Note: query parameter values
   *     default to a special `"auto"` mode.
   *
   *     For query parameters in `"auto"` mode, if multiple  values for a single parameter
   *     are present in the URL (e.g.: `/foo?bar=1&bar=2&bar=3`) then the values
   *     are mapped to an array (e.g.: `{ foo: [ '1', '2', '3' ] }`).  However, if
   *     only one value is present (e.g.: `/foo?bar=1`) then the value is treated as single
   *     value (e.g.: `{ foo: '1' }`).
   *
   * <pre>params: {
   *     param1: { array: true }
   * }</pre>
   *
   *   - ** squash ** - {bool|string=}: `squash` configures how a default parameter value is represented in the URL when
   *     the current parameter value is the same as the default value. If `squash` is not set, it uses the
   *     configured default squash policy.
   *     (See {@link ui.router.util.$urlMatcherFactory#methods_defaultSquashPolicy `defaultSquashPolicy()`})
   *
   *   There are three squash settings:
   *
   *     - false: The parameter's default value is not squashed.  It is encoded and included in the URL
   *     - true: The parameter's default value is omitted from the URL.  If the parameter is preceeded and followed
   *       by slashes in the state's `url` declaration, then one of those slashes are omitted.
   *       This can allow for cleaner looking URLs.
   *     - `"<arbitrary string>"`: The parameter's default value is replaced with an arbitrary placeholder of  your choice.
   *
   * <pre>params: {
   *     param1: {
   *       value: "defaultId",
   *       squash: true
   * } }
   * // squash "defaultValue" to "~"
   * params: {
   *     param1: {
   *       value: "defaultValue",
   *       squash: "~"
   * } }
   * </pre>
   *
   *
   * @example
   * <pre>
   * // Some state name examples
   *
   * // stateName can be a single top-level name (must be unique).
   * $stateProvider.state("home", {});
   *
   * // Or it can be a nested state name. This state is a child of the
   * // above "home" state.
   * $stateProvider.state("home.newest", {});
   *
   * // Nest states as deeply as needed.
   * $stateProvider.state("home.newest.abc.xyz.inception", {});
   *
   * // state() returns $stateProvider, so you can chain state declarations.
   * $stateProvider
   *   .state("home", {})
   *   .state("about", {})
   *   .state("contacts", {});
   * </pre>
   *
   */
  this.state = state;
  function state(name, definition) {
    /*jshint validthis: true */
    if (isObject(name)) definition = name;
    else definition.name = name;
    registerState(definition);
    return this;
  }

  /**
   * @ngdoc object
   * @name ui.router.state.$state
   *
   * @requires $rootScope
   * @requires $q
   * @requires ui.router.state.$view
   * @requires $injector
   * @requires ui.router.util.$resolve
   * @requires ui.router.state.$stateParams
   * @requires ui.router.router.$urlRouter
   *
   * @property {object} params A param object, e.g. {sectionId: section.id)}, that 
   * you'd like to test against the current active state.
   * @property {object} current A reference to the state's config object. However 
   * you passed it in. Useful for accessing custom data.
   * @property {object} transition Currently pending transition. A promise that'll 
   * resolve or reject.
   *
   * @description
   * `$state` service is responsible for representing states as well as transitioning
   * between them. It also provides interfaces to ask for current state or even states
   * you're coming from.
   */
  this.$get = $get;
  $get.$inject = ['$rootScope', '$q', '$view', '$injector', '$resolve', '$stateParams', '$urlRouter', '$location', '$urlMatcherFactory'];
  function $get(   $rootScope,   $q,   $view,   $injector,   $resolve,   $stateParams,   $urlRouter,   $location,   $urlMatcherFactory) {

    var TransitionSuperseded = $q.reject(new Error('transition superseded'));
    var TransitionPrevented = $q.reject(new Error('transition prevented'));
    var TransitionAborted = $q.reject(new Error('transition aborted'));
    var TransitionFailed = $q.reject(new Error('transition failed'));

    // Handles the case where a state which is the target of a transition is not found, and the user
    // can optionally retry or defer the transition
    function handleRedirect(redirect, state, params, options) {
      /**
       * @ngdoc event
       * @name ui.router.state.$state#$stateNotFound
       * @eventOf ui.router.state.$state
       * @eventType broadcast on root scope
       * @description
       * Fired when a requested state **cannot be found** using the provided state name during transition.
       * The event is broadcast allowing any handlers a single chance to deal with the error (usually by
       * lazy-loading the unfound state). A special `unfoundState` object is passed to the listener handler,
       * you can see its three properties in the example. You can use `event.preventDefault()` to abort the
       * transition and the promise returned from `go` will be rejected with a `'transition aborted'` value.
       *
       * @param {Object} event Event object.
       * @param {Object} unfoundState Unfound State information. Contains: `to, toParams, options` properties.
       * @param {State} fromState Current state object.
       * @param {Object} fromParams Current state params.
       *
       * @example
       *
       * <pre>
       * // somewhere, assume lazy.state has not been defined
       * $state.go("lazy.state", {a:1, b:2}, {inherit:false});
       *
       * // somewhere else
       * $scope.$on('$stateNotFound',
       * function(event, unfoundState, fromState, fromParams){
       *     console.log(unfoundState.to); // "lazy.state"
       *     console.log(unfoundState.toParams); // {a:1, b:2}
       *     console.log(unfoundState.options); // {inherit:false} + default options
       * })
       * </pre>
       */
      var evt = $rootScope.$broadcast('$stateNotFound', redirect, state, params);

      if (evt.defaultPrevented) {
        $urlRouter.update();
        return TransitionAborted;
      }

      if (!evt.retry) {
        return null;
      }

      // Allow the handler to return a promise to defer state lookup retry
      if (options.$retry) {
        $urlRouter.update();
        return TransitionFailed;
      }
      var retryTransition = $state.transition = $q.when(evt.retry);

      retryTransition.then(function() {
        if (retryTransition !== $state.transition) return TransitionSuperseded;
        redirect.options.$retry = true;
        return $state.transitionTo(redirect.to, redirect.toParams, redirect.options);
      }, function() {
        return TransitionAborted;
      });
      $urlRouter.update();

      return retryTransition;
    }

    root.locals = { resolve: null, globals: { $stateParams: {} } };

    $state = {
      params: {},
      current: root.self,
      $current: root,
      transition: null
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#reload
     * @methodOf ui.router.state.$state
     *
     * @description
     * A method that force reloads the current state. All resolves are re-resolved, events are not re-fired, 
     * and controllers reinstantiated (bug with controllers reinstantiating right now, fixing soon).
     *
     * @example
     * <pre>
     * var app angular.module('app', ['ui.router']);
     *
     * app.controller('ctrl', function ($scope, $state) {
     *   $scope.reload = function(){
     *     $state.reload();
     *   }
     * });
     * </pre>
     *
     * `reload()` is just an alias for:
     * <pre>
     * $state.transitionTo($state.current, $stateParams, { 
     *   reload: true, inherit: false, notify: true
     * });
     * </pre>
     *
     * @returns {promise} A promise representing the state of the new transition. See
     * {@link ui.router.state.$state#methods_go $state.go}.
     */
    $state.reload = function reload() {
      return $state.transitionTo($state.current, $stateParams, { reload: true, inherit: false, notify: true });
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#go
     * @methodOf ui.router.state.$state
     *
     * @description
     * Convenience method for transitioning to a new state. `$state.go` calls 
     * `$state.transitionTo` internally but automatically sets options to 
     * `{ location: true, inherit: true, relative: $state.$current, notify: true }`. 
     * This allows you to easily use an absolute or relative to path and specify 
     * only the parameters you'd like to update (while letting unspecified parameters 
     * inherit from the currently active ancestor states).
     *
     * @example
     * <pre>
     * var app = angular.module('app', ['ui.router']);
     *
     * app.controller('ctrl', function ($scope, $state) {
     *   $scope.changeState = function () {
     *     $state.go('contact.detail');
     *   };
     * });
     * </pre>
     * <img src='../ngdoc_assets/StateGoExamples.png'/>
     *
     * @param {string} to Absolute state name or relative state path. Some examples:
     *
     * - `$state.go('contact.detail')` - will go to the `contact.detail` state
     * - `$state.go('^')` - will go to a parent state
     * - `$state.go('^.sibling')` - will go to a sibling state
     * - `$state.go('.child.grandchild')` - will go to grandchild state
     *
     * @param {object=} params A map of the parameters that will be sent to the state, 
     * will populate $stateParams. Any parameters that are not specified will be inherited from currently 
     * defined parameters. This allows, for example, going to a sibling state that shares parameters
     * specified in a parent state. Parameter inheritance only works between common ancestor states, I.e.
     * transitioning to a sibling will get you the parameters for all parents, transitioning to a child
     * will get you all current parameters, etc.
     * @param {object=} options Options object. The options are:
     *
     * - **`location`** - {boolean=true|string=} - If `true` will update the url in the location bar, if `false`
     *    will not. If string, must be `"replace"`, which will update url and also replace last history record.
     * - **`inherit`** - {boolean=true}, If `true` will inherit url parameters from current url.
     * - **`relative`** - {object=$state.$current}, When transitioning with relative path (e.g '^'), 
     *    defines which state to be relative from.
     * - **`notify`** - {boolean=true}, If `true` will broadcast $stateChangeStart and $stateChangeSuccess events.
     * - **`reload`** (v0.2.5) - {boolean=false}, If `true` will force transition even if the state or params 
     *    have not changed, aka a reload of the same state. It differs from reloadOnSearch because you'd
     *    use this when you want to force a reload when *everything* is the same, including search params.
     *
     * @returns {promise} A promise representing the state of the new transition.
     *
     * Possible success values:
     *
     * - $state.current
     *
     * <br/>Possible rejection values:
     *
     * - 'transition superseded' - when a newer transition has been started after this one
     * - 'transition prevented' - when `event.preventDefault()` has been called in a `$stateChangeStart` listener
     * - 'transition aborted' - when `event.preventDefault()` has been called in a `$stateNotFound` listener or
     *   when a `$stateNotFound` `event.retry` promise errors.
     * - 'transition failed' - when a state has been unsuccessfully found after 2 tries.
     * - *resolve error* - when an error has occurred with a `resolve`
     *
     */
    $state.go = function go(to, params, options) {
      return $state.transitionTo(to, params, extend({ inherit: true, relative: $state.$current }, options));
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#transitionTo
     * @methodOf ui.router.state.$state
     *
     * @description
     * Low-level method for transitioning to a new state. {@link ui.router.state.$state#methods_go $state.go}
     * uses `transitionTo` internally. `$state.go` is recommended in most situations.
     *
     * @example
     * <pre>
     * var app = angular.module('app', ['ui.router']);
     *
     * app.controller('ctrl', function ($scope, $state) {
     *   $scope.changeState = function () {
     *     $state.transitionTo('contact.detail');
     *   };
     * });
     * </pre>
     *
     * @param {string} to State name.
     * @param {object=} toParams A map of the parameters that will be sent to the state,
     * will populate $stateParams.
     * @param {object=} options Options object. The options are:
     *
     * - **`location`** - {boolean=true|string=} - If `true` will update the url in the location bar, if `false`
     *    will not. If string, must be `"replace"`, which will update url and also replace last history record.
     * - **`inherit`** - {boolean=false}, If `true` will inherit url parameters from current url.
     * - **`relative`** - {object=}, When transitioning with relative path (e.g '^'), 
     *    defines which state to be relative from.
     * - **`notify`** - {boolean=true}, If `true` will broadcast $stateChangeStart and $stateChangeSuccess events.
     * - **`reload`** (v0.2.5) - {boolean=false}, If `true` will force transition even if the state or params 
     *    have not changed, aka a reload of the same state. It differs from reloadOnSearch because you'd
     *    use this when you want to force a reload when *everything* is the same, including search params.
     *
     * @returns {promise} A promise representing the state of the new transition. See
     * {@link ui.router.state.$state#methods_go $state.go}.
     */
    $state.transitionTo = function transitionTo(to, toParams, options) {
      toParams = toParams || {};
      options = extend({
        location: true, inherit: false, relative: null, notify: true, reload: false, $retry: false
      }, options || {});

      var from = $state.$current, fromParams = $state.params, fromPath = from.path;
      var evt, toState = findState(to, options.relative);

      if (!isDefined(toState)) {
        var redirect = { to: to, toParams: toParams, options: options };
        var redirectResult = handleRedirect(redirect, from.self, fromParams, options);

        if (redirectResult) {
          return redirectResult;
        }

        // Always retry once if the $stateNotFound was not prevented
        // (handles either redirect changed or state lazy-definition)
        to = redirect.to;
        toParams = redirect.toParams;
        options = redirect.options;
        toState = findState(to, options.relative);

        if (!isDefined(toState)) {
          if (!options.relative) throw new Error("No such state '" + to + "'");
          throw new Error("Could not resolve '" + to + "' from state '" + options.relative + "'");
        }
      }
      if (toState[abstractKey]) throw new Error("Cannot transition to abstract state '" + to + "'");
      if (options.inherit) toParams = inheritParams($stateParams, toParams || {}, $state.$current, toState);
      if (!toState.params.$$validates(toParams)) return TransitionFailed;

      toParams = toState.params.$$values(toParams);
      to = toState;

      var toPath = to.path;

      // Starting from the root of the path, keep all levels that haven't changed
      var keep = 0, state = toPath[keep], locals = root.locals, toLocals = [];

      if (!options.reload) {
        while (state && state === fromPath[keep] && state.ownParams.$$equals(toParams, fromParams)) {
          locals = toLocals[keep] = state.locals;
          keep++;
          state = toPath[keep];
        }
      }

      // If we're going to the same state and all locals are kept, we've got nothing to do.
      // But clear 'transition', as we still want to cancel any other pending transitions.
      // TODO: We may not want to bump 'transition' if we're called from a location change
      // that we've initiated ourselves, because we might accidentally abort a legitimate
      // transition initiated from code?
      if (shouldTriggerReload(to, from, locals, options)) {
        if (to.self.reloadOnSearch !== false) $urlRouter.update();
        $state.transition = null;
        return $q.when($state.current);
      }

      // Filter parameters before we pass them to event handlers etc.
      toParams = filterByKeys(to.params.$$keys(), toParams || {});

      // Broadcast start event and cancel the transition if requested
      if (options.notify) {
        /**
         * @ngdoc event
         * @name ui.router.state.$state#$stateChangeStart
         * @eventOf ui.router.state.$state
         * @eventType broadcast on root scope
         * @description
         * Fired when the state transition **begins**. You can use `event.preventDefault()`
         * to prevent the transition from happening and then the transition promise will be
         * rejected with a `'transition prevented'` value.
         *
         * @param {Object} event Event object.
         * @param {State} toState The state being transitioned to.
         * @param {Object} toParams The params supplied to the `toState`.
         * @param {State} fromState The current state, pre-transition.
         * @param {Object} fromParams The params supplied to the `fromState`.
         *
         * @example
         *
         * <pre>
         * $rootScope.$on('$stateChangeStart',
         * function(event, toState, toParams, fromState, fromParams){
         *     event.preventDefault();
         *     // transitionTo() promise will be rejected with
         *     // a 'transition prevented' error
         * })
         * </pre>
         */
        if ($rootScope.$broadcast('$stateChangeStart', to.self, toParams, from.self, fromParams).defaultPrevented) {
          $urlRouter.update();
          return TransitionPrevented;
        }
      }

      // Resolve locals for the remaining states, but don't update any global state just
      // yet -- if anything fails to resolve the current state needs to remain untouched.
      // We also set up an inheritance chain for the locals here. This allows the view directive
      // to quickly look up the correct definition for each view in the current state. Even
      // though we create the locals object itself outside resolveState(), it is initially
      // empty and gets filled asynchronously. We need to keep track of the promise for the
      // (fully resolved) current locals, and pass this down the chain.
      var resolved = $q.when(locals);

      for (var l = keep; l < toPath.length; l++, state = toPath[l]) {
        locals = toLocals[l] = inherit(locals);
        resolved = resolveState(state, toParams, state === to, resolved, locals, options);
      }

      // Once everything is resolved, we are ready to perform the actual transition
      // and return a promise for the new state. We also keep track of what the
      // current promise is, so that we can detect overlapping transitions and
      // keep only the outcome of the last transition.
      var transition = $state.transition = resolved.then(function () {
        var l, entering, exiting;

        if ($state.transition !== transition) return TransitionSuperseded;

        // Exit 'from' states not kept
        for (l = fromPath.length - 1; l >= keep; l--) {
          exiting = fromPath[l];
          if (exiting.self.onExit) {
            $injector.invoke(exiting.self.onExit, exiting.self, exiting.locals.globals);
          }
          exiting.locals = null;
        }

        // Enter 'to' states not kept
        for (l = keep; l < toPath.length; l++) {
          entering = toPath[l];
          entering.locals = toLocals[l];
          if (entering.self.onEnter) {
            $injector.invoke(entering.self.onEnter, entering.self, entering.locals.globals);
          }
        }

        // Run it again, to catch any transitions in callbacks
        if ($state.transition !== transition) return TransitionSuperseded;

        // Update globals in $state
        $state.$current = to;
        $state.current = to.self;
        $state.params = toParams;
        copy($state.params, $stateParams);
        $state.transition = null;

        if (options.location && to.navigable) {
          $urlRouter.push(to.navigable.url, to.navigable.locals.globals.$stateParams, {
            $$avoidResync: true, replace: options.location === 'replace'
          });
        }

        if (options.notify) {
        /**
         * @ngdoc event
         * @name ui.router.state.$state#$stateChangeSuccess
         * @eventOf ui.router.state.$state
         * @eventType broadcast on root scope
         * @description
         * Fired once the state transition is **complete**.
         *
         * @param {Object} event Event object.
         * @param {State} toState The state being transitioned to.
         * @param {Object} toParams The params supplied to the `toState`.
         * @param {State} fromState The current state, pre-transition.
         * @param {Object} fromParams The params supplied to the `fromState`.
         */
          $rootScope.$broadcast('$stateChangeSuccess', to.self, toParams, from.self, fromParams);
        }
        $urlRouter.update(true);

        return $state.current;
      }, function (error) {
        if ($state.transition !== transition) return TransitionSuperseded;

        $state.transition = null;
        /**
         * @ngdoc event
         * @name ui.router.state.$state#$stateChangeError
         * @eventOf ui.router.state.$state
         * @eventType broadcast on root scope
         * @description
         * Fired when an **error occurs** during transition. It's important to note that if you
         * have any errors in your resolve functions (javascript errors, non-existent services, etc)
         * they will not throw traditionally. You must listen for this $stateChangeError event to
         * catch **ALL** errors.
         *
         * @param {Object} event Event object.
         * @param {State} toState The state being transitioned to.
         * @param {Object} toParams The params supplied to the `toState`.
         * @param {State} fromState The current state, pre-transition.
         * @param {Object} fromParams The params supplied to the `fromState`.
         * @param {Error} error The resolve error object.
         */
        evt = $rootScope.$broadcast('$stateChangeError', to.self, toParams, from.self, fromParams, error);

        if (!evt.defaultPrevented) {
            $urlRouter.update();
        }

        return $q.reject(error);
      });

      return transition;
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#is
     * @methodOf ui.router.state.$state
     *
     * @description
     * Similar to {@link ui.router.state.$state#methods_includes $state.includes},
     * but only checks for the full state name. If params is supplied then it will be
     * tested for strict equality against the current active params object, so all params
     * must match with none missing and no extras.
     *
     * @example
     * <pre>
     * $state.$current.name = 'contacts.details.item';
     *
     * // absolute name
     * $state.is('contact.details.item'); // returns true
     * $state.is(contactDetailItemStateObject); // returns true
     *
     * // relative name (. and ^), typically from a template
     * // E.g. from the 'contacts.details' template
     * <div ng-class="{highlighted: $state.is('.item')}">Item</div>
     * </pre>
     *
     * @param {string|object} stateOrName The state name (absolute or relative) or state object you'd like to check.
     * @param {object=} params A param object, e.g. `{sectionId: section.id}`, that you'd like
     * to test against the current active state.
     * @param {object=} options An options object.  The options are:
     *
     * - **`relative`** - {string|object} -  If `stateOrName` is a relative state name and `options.relative` is set, .is will
     * test relative to `options.relative` state (or name).
     *
     * @returns {boolean} Returns true if it is the state.
     */
    $state.is = function is(stateOrName, params, options) {
      options = extend({ relative: $state.$current }, options || {});
      var state = findState(stateOrName, options.relative);

      if (!isDefined(state)) { return undefined; }
      if ($state.$current !== state) { return false; }
      return params ? equalForKeys(state.params.$$values(params), $stateParams) : true;
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#includes
     * @methodOf ui.router.state.$state
     *
     * @description
     * A method to determine if the current active state is equal to or is the child of the
     * state stateName. If any params are passed then they will be tested for a match as well.
     * Not all the parameters need to be passed, just the ones you'd like to test for equality.
     *
     * @example
     * Partial and relative names
     * <pre>
     * $state.$current.name = 'contacts.details.item';
     *
     * // Using partial names
     * $state.includes("contacts"); // returns true
     * $state.includes("contacts.details"); // returns true
     * $state.includes("contacts.details.item"); // returns true
     * $state.includes("contacts.list"); // returns false
     * $state.includes("about"); // returns false
     *
     * // Using relative names (. and ^), typically from a template
     * // E.g. from the 'contacts.details' template
     * <div ng-class="{highlighted: $state.includes('.item')}">Item</div>
     * </pre>
     *
     * Basic globbing patterns
     * <pre>
     * $state.$current.name = 'contacts.details.item.url';
     *
     * $state.includes("*.details.*.*"); // returns true
     * $state.includes("*.details.**"); // returns true
     * $state.includes("**.item.**"); // returns true
     * $state.includes("*.details.item.url"); // returns true
     * $state.includes("*.details.*.url"); // returns true
     * $state.includes("*.details.*"); // returns false
     * $state.includes("item.**"); // returns false
     * </pre>
     *
     * @param {string} stateOrName A partial name, relative name, or glob pattern
     * to be searched for within the current state name.
     * @param {object=} params A param object, e.g. `{sectionId: section.id}`,
     * that you'd like to test against the current active state.
     * @param {object=} options An options object.  The options are:
     *
     * - **`relative`** - {string|object=} -  If `stateOrName` is a relative state reference and `options.relative` is set,
     * .includes will test relative to `options.relative` state (or name).
     *
     * @returns {boolean} Returns true if it does include the state
     */
    $state.includes = function includes(stateOrName, params, options) {
      options = extend({ relative: $state.$current }, options || {});
      if (isString(stateOrName) && isGlob(stateOrName)) {
        if (!doesStateMatchGlob(stateOrName)) {
          return false;
        }
        stateOrName = $state.$current.name;
      }

      var state = findState(stateOrName, options.relative);
      if (!isDefined(state)) { return undefined; }
      if (!isDefined($state.$current.includes[state.name])) { return false; }
      return params ? equalForKeys(state.params.$$values(params), $stateParams, objectKeys(params)) : true;
    };


    /**
     * @ngdoc function
     * @name ui.router.state.$state#href
     * @methodOf ui.router.state.$state
     *
     * @description
     * A url generation method that returns the compiled url for the given state populated with the given params.
     *
     * @example
     * <pre>
     * expect($state.href("about.person", { person: "bob" })).toEqual("/about/bob");
     * </pre>
     *
     * @param {string|object} stateOrName The state name or state object you'd like to generate a url from.
     * @param {object=} params An object of parameter values to fill the state's required parameters.
     * @param {object=} options Options object. The options are:
     *
     * - **`lossy`** - {boolean=true} -  If true, and if there is no url associated with the state provided in the
     *    first parameter, then the constructed href url will be built from the first navigable ancestor (aka
     *    ancestor with a valid url).
     * - **`inherit`** - {boolean=true}, If `true` will inherit url parameters from current url.
     * - **`relative`** - {object=$state.$current}, When transitioning with relative path (e.g '^'), 
     *    defines which state to be relative from.
     * - **`absolute`** - {boolean=false},  If true will generate an absolute url, e.g. "http://www.example.com/fullurl".
     * 
     * @returns {string} compiled state url
     */
    $state.href = function href(stateOrName, params, options) {
      options = extend({
        lossy:    true,
        inherit:  true,
        absolute: false,
        relative: $state.$current
      }, options || {});

      var state = findState(stateOrName, options.relative);

      if (!isDefined(state)) return null;
      if (options.inherit) params = inheritParams($stateParams, params || {}, $state.$current, state);
      
      var nav = (state && options.lossy) ? state.navigable : state;

      if (!nav || nav.url === undefined || nav.url === null) {
        return null;
      }
      return $urlRouter.href(nav.url, filterByKeys(state.params.$$keys(), params || {}), {
        absolute: options.absolute
      });
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#get
     * @methodOf ui.router.state.$state
     *
     * @description
     * Returns the state configuration object for any specific state or all states.
     *
     * @param {string|object=} stateOrName (absolute or relative) If provided, will only get the config for
     * the requested state. If not provided, returns an array of ALL state configs.
     * @param {string|object=} context When stateOrName is a relative state reference, the state will be retrieved relative to context.
     * @returns {Object|Array} State configuration object or array of all objects.
     */
    $state.get = function (stateOrName, context) {
      if (arguments.length === 0) return map(objectKeys(states), function(name) { return states[name].self; });
      var state = findState(stateOrName, context || $state.$current);
      return (state && state.self) ? state.self : null;
    };

    function resolveState(state, params, paramsAreFiltered, inherited, dst, options) {
      // Make a restricted $stateParams with only the parameters that apply to this state if
      // necessary. In addition to being available to the controller and onEnter/onExit callbacks,
      // we also need $stateParams to be available for any $injector calls we make during the
      // dependency resolution process.
      var $stateParams = (paramsAreFiltered) ? params : filterByKeys(state.params.$$keys(), params);
      var locals = { $stateParams: $stateParams };

      // Resolve 'global' dependencies for the state, i.e. those not specific to a view.
      // We're also including $stateParams in this; that way the parameters are restricted
      // to the set that should be visible to the state, and are independent of when we update
      // the global $state and $stateParams values.
      dst.resolve = $resolve.resolve(state.resolve, locals, dst.resolve, state);
      var promises = [dst.resolve.then(function (globals) {
        dst.globals = globals;
      })];
      if (inherited) promises.push(inherited);

      // Resolve template and dependencies for all views.
      forEach(state.views, function (view, name) {
        var injectables = (view.resolve && view.resolve !== state.resolve ? view.resolve : {});
        injectables.$template = [ function () {
          return $view.load(name, { view: view, locals: locals, params: $stateParams, notify: options.notify }) || '';
        }];

        promises.push($resolve.resolve(injectables, locals, dst.resolve, state).then(function (result) {
          // References to the controller (only instantiated at link time)
          if (isFunction(view.controllerProvider) || isArray(view.controllerProvider)) {
            var injectLocals = angular.extend({}, injectables, locals);
            result.$$controller = $injector.invoke(view.controllerProvider, null, injectLocals);
          } else {
            result.$$controller = view.controller;
          }
          // Provide access to the state itself for internal use
          result.$$state = state;
          result.$$controllerAs = view.controllerAs;
          dst[name] = result;
        }));
      });

      // Wait for all the promises and then return the activation object
      return $q.all(promises).then(function (values) {
        return dst;
      });
    }

    return $state;
  }

  function shouldTriggerReload(to, from, locals, options) {
    if (to === from && ((locals === from.locals && !options.reload) || (to.self.reloadOnSearch === false))) {
      return true;
    }
  }
}

angular.module('ui.router.state')
  .value('$stateParams', {})
  .provider('$state', $StateProvider);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL3ZlbmRvcnMvYW5ndWxhci11aS1yb3V0ZXIvc3JjL3N0YXRlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQG5nZG9jIG9iamVjdFxuICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVByb3ZpZGVyXG4gKlxuICogQHJlcXVpcmVzIHVpLnJvdXRlci5yb3V0ZXIuJHVybFJvdXRlclByb3ZpZGVyXG4gKiBAcmVxdWlyZXMgdWkucm91dGVyLnV0aWwuJHVybE1hdGNoZXJGYWN0b3J5UHJvdmlkZXJcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFRoZSBuZXcgYCRzdGF0ZVByb3ZpZGVyYCB3b3JrcyBzaW1pbGFyIHRvIEFuZ3VsYXIncyB2MSByb3V0ZXIsIGJ1dCBpdCBmb2N1c2VzIHB1cmVseVxuICogb24gc3RhdGUuXG4gKlxuICogQSBzdGF0ZSBjb3JyZXNwb25kcyB0byBhIFwicGxhY2VcIiBpbiB0aGUgYXBwbGljYXRpb24gaW4gdGVybXMgb2YgdGhlIG92ZXJhbGwgVUkgYW5kXG4gKiBuYXZpZ2F0aW9uLiBBIHN0YXRlIGRlc2NyaWJlcyAodmlhIHRoZSBjb250cm9sbGVyIC8gdGVtcGxhdGUgLyB2aWV3IHByb3BlcnRpZXMpIHdoYXRcbiAqIHRoZSBVSSBsb29rcyBsaWtlIGFuZCBkb2VzIGF0IHRoYXQgcGxhY2UuXG4gKlxuICogU3RhdGVzIG9mdGVuIGhhdmUgdGhpbmdzIGluIGNvbW1vbiwgYW5kIHRoZSBwcmltYXJ5IHdheSBvZiBmYWN0b3Jpbmcgb3V0IHRoZXNlXG4gKiBjb21tb25hbGl0aWVzIGluIHRoaXMgbW9kZWwgaXMgdmlhIHRoZSBzdGF0ZSBoaWVyYXJjaHksIGkuZS4gcGFyZW50L2NoaWxkIHN0YXRlcyBha2FcbiAqIG5lc3RlZCBzdGF0ZXMuXG4gKlxuICogVGhlIGAkc3RhdGVQcm92aWRlcmAgcHJvdmlkZXMgaW50ZXJmYWNlcyB0byBkZWNsYXJlIHRoZXNlIHN0YXRlcyBmb3IgeW91ciBhcHAuXG4gKi9cbiRTdGF0ZVByb3ZpZGVyLiRpbmplY3QgPSBbJyR1cmxSb3V0ZXJQcm92aWRlcicsICckdXJsTWF0Y2hlckZhY3RvcnlQcm92aWRlciddO1xuZnVuY3Rpb24gJFN0YXRlUHJvdmlkZXIoICAgJHVybFJvdXRlclByb3ZpZGVyLCAgICR1cmxNYXRjaGVyRmFjdG9yeSkge1xuXG4gIHZhciByb290LCBzdGF0ZXMgPSB7fSwgJHN0YXRlLCBxdWV1ZSA9IHt9LCBhYnN0cmFjdEtleSA9ICdhYnN0cmFjdCc7XG5cbiAgLy8gQnVpbGRzIHN0YXRlIHByb3BlcnRpZXMgZnJvbSBkZWZpbml0aW9uIHBhc3NlZCB0byByZWdpc3RlclN0YXRlKClcbiAgdmFyIHN0YXRlQnVpbGRlciA9IHtcblxuICAgIC8vIERlcml2ZSBwYXJlbnQgc3RhdGUgZnJvbSBhIGhpZXJhcmNoaWNhbCBuYW1lIG9ubHkgaWYgJ3BhcmVudCcgaXMgbm90IGV4cGxpY2l0bHkgZGVmaW5lZC5cbiAgICAvLyBzdGF0ZS5jaGlsZHJlbiA9IFtdO1xuICAgIC8vIGlmIChwYXJlbnQpIHBhcmVudC5jaGlsZHJlbi5wdXNoKHN0YXRlKTtcbiAgICBwYXJlbnQ6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICBpZiAoaXNEZWZpbmVkKHN0YXRlLnBhcmVudCkgJiYgc3RhdGUucGFyZW50KSByZXR1cm4gZmluZFN0YXRlKHN0YXRlLnBhcmVudCk7XG4gICAgICAvLyByZWdleCBtYXRjaGVzIGFueSB2YWxpZCBjb21wb3NpdGUgc3RhdGUgbmFtZVxuICAgICAgLy8gd291bGQgbWF0Y2ggXCJjb250YWN0Lmxpc3RcIiBidXQgbm90IFwiY29udGFjdHNcIlxuICAgICAgdmFyIGNvbXBvc2l0ZU5hbWUgPSAvXiguKylcXC5bXi5dKyQvLmV4ZWMoc3RhdGUubmFtZSk7XG4gICAgICByZXR1cm4gY29tcG9zaXRlTmFtZSA/IGZpbmRTdGF0ZShjb21wb3NpdGVOYW1lWzFdKSA6IHJvb3Q7XG4gICAgfSxcblxuICAgIC8vIGluaGVyaXQgJ2RhdGEnIGZyb20gcGFyZW50IGFuZCBvdmVycmlkZSBieSBvd24gdmFsdWVzIChpZiBhbnkpXG4gICAgZGF0YTogZnVuY3Rpb24oc3RhdGUpIHtcbiAgICAgIGlmIChzdGF0ZS5wYXJlbnQgJiYgc3RhdGUucGFyZW50LmRhdGEpIHtcbiAgICAgICAgc3RhdGUuZGF0YSA9IHN0YXRlLnNlbGYuZGF0YSA9IGV4dGVuZCh7fSwgc3RhdGUucGFyZW50LmRhdGEsIHN0YXRlLmRhdGEpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0YXRlLmRhdGE7XG4gICAgfSxcblxuICAgIC8vIEJ1aWxkIGEgVVJMTWF0Y2hlciBpZiBuZWNlc3NhcnksIGVpdGhlciB2aWEgYSByZWxhdGl2ZSBvciBhYnNvbHV0ZSBVUkxcbiAgICB1cmw6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICB2YXIgdXJsID0gc3RhdGUudXJsLCBjb25maWcgPSB7IHBhcmFtczogc3RhdGUucGFyYW1zIHx8IHt9IH07XG5cbiAgICAgIGlmIChpc1N0cmluZyh1cmwpKSB7XG4gICAgICAgIGlmICh1cmwuY2hhckF0KDApID09ICdeJykgcmV0dXJuICR1cmxNYXRjaGVyRmFjdG9yeS5jb21waWxlKHVybC5zdWJzdHJpbmcoMSksIGNvbmZpZyk7XG4gICAgICAgIHJldHVybiAoc3RhdGUucGFyZW50Lm5hdmlnYWJsZSB8fCByb290KS51cmwuY29uY2F0KHVybCwgY29uZmlnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCF1cmwgfHwgJHVybE1hdGNoZXJGYWN0b3J5LmlzTWF0Y2hlcih1cmwpKSByZXR1cm4gdXJsO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCB1cmwgJ1wiICsgdXJsICsgXCInIGluIHN0YXRlICdcIiArIHN0YXRlICsgXCInXCIpO1xuICAgIH0sXG5cbiAgICAvLyBLZWVwIHRyYWNrIG9mIHRoZSBjbG9zZXN0IGFuY2VzdG9yIHN0YXRlIHRoYXQgaGFzIGEgVVJMIChpLmUuIGlzIG5hdmlnYWJsZSlcbiAgICBuYXZpZ2FibGU6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICByZXR1cm4gc3RhdGUudXJsID8gc3RhdGUgOiAoc3RhdGUucGFyZW50ID8gc3RhdGUucGFyZW50Lm5hdmlnYWJsZSA6IG51bGwpO1xuICAgIH0sXG5cbiAgICAvLyBPd24gcGFyYW1ldGVycyBmb3IgdGhpcyBzdGF0ZS4gc3RhdGUudXJsLnBhcmFtcyBpcyBhbHJlYWR5IGJ1aWx0IGF0IHRoaXMgcG9pbnQuIENyZWF0ZSBhbmQgYWRkIG5vbi11cmwgcGFyYW1zXG4gICAgb3duUGFyYW1zOiBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgdmFyIHBhcmFtcyA9IHN0YXRlLnVybCAmJiBzdGF0ZS51cmwucGFyYW1zIHx8IG5ldyAkJFVNRlAuUGFyYW1TZXQoKTtcbiAgICAgIGZvckVhY2goc3RhdGUucGFyYW1zIHx8IHt9LCBmdW5jdGlvbihjb25maWcsIGlkKSB7XG4gICAgICAgIGlmICghcGFyYW1zW2lkXSkgcGFyYW1zW2lkXSA9IG5ldyAkJFVNRlAuUGFyYW0oaWQsIG51bGwsIGNvbmZpZywgXCJjb25maWdcIik7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBwYXJhbXM7XG4gICAgfSxcblxuICAgIC8vIERlcml2ZSBwYXJhbWV0ZXJzIGZvciB0aGlzIHN0YXRlIGFuZCBlbnN1cmUgdGhleSdyZSBhIHN1cGVyLXNldCBvZiBwYXJlbnQncyBwYXJhbWV0ZXJzXG4gICAgcGFyYW1zOiBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgcmV0dXJuIHN0YXRlLnBhcmVudCAmJiBzdGF0ZS5wYXJlbnQucGFyYW1zID8gZXh0ZW5kKHN0YXRlLnBhcmVudC5wYXJhbXMuJCRuZXcoKSwgc3RhdGUub3duUGFyYW1zKSA6IG5ldyAkJFVNRlAuUGFyYW1TZXQoKTtcbiAgICB9LFxuXG4gICAgLy8gSWYgdGhlcmUgaXMgbm8gZXhwbGljaXQgbXVsdGktdmlldyBjb25maWd1cmF0aW9uLCBtYWtlIG9uZSB1cCBzbyB3ZSBkb24ndCBoYXZlXG4gICAgLy8gdG8gaGFuZGxlIGJvdGggY2FzZXMgaW4gdGhlIHZpZXcgZGlyZWN0aXZlIGxhdGVyLiBOb3RlIHRoYXQgaGF2aW5nIGFuIGV4cGxpY2l0XG4gICAgLy8gJ3ZpZXdzJyBwcm9wZXJ0eSB3aWxsIG1lYW4gdGhlIGRlZmF1bHQgdW5uYW1lZCB2aWV3IHByb3BlcnRpZXMgYXJlIGlnbm9yZWQuIFRoaXNcbiAgICAvLyBpcyBhbHNvIGEgZ29vZCB0aW1lIHRvIHJlc29sdmUgdmlldyBuYW1lcyB0byBhYnNvbHV0ZSBuYW1lcywgc28gZXZlcnl0aGluZyBpcyBhXG4gICAgLy8gc3RyYWlnaHQgbG9va3VwIGF0IGxpbmsgdGltZS5cbiAgICB2aWV3czogZnVuY3Rpb24oc3RhdGUpIHtcbiAgICAgIHZhciB2aWV3cyA9IHt9O1xuXG4gICAgICBmb3JFYWNoKGlzRGVmaW5lZChzdGF0ZS52aWV3cykgPyBzdGF0ZS52aWV3cyA6IHsgJyc6IHN0YXRlIH0sIGZ1bmN0aW9uICh2aWV3LCBuYW1lKSB7XG4gICAgICAgIGlmIChuYW1lLmluZGV4T2YoJ0AnKSA8IDApIG5hbWUgKz0gJ0AnICsgc3RhdGUucGFyZW50Lm5hbWU7XG4gICAgICAgIHZpZXdzW25hbWVdID0gdmlldztcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHZpZXdzO1xuICAgIH0sXG5cbiAgICAvLyBLZWVwIGEgZnVsbCBwYXRoIGZyb20gdGhlIHJvb3QgZG93biB0byB0aGlzIHN0YXRlIGFzIHRoaXMgaXMgbmVlZGVkIGZvciBzdGF0ZSBhY3RpdmF0aW9uLlxuICAgIHBhdGg6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICByZXR1cm4gc3RhdGUucGFyZW50ID8gc3RhdGUucGFyZW50LnBhdGguY29uY2F0KHN0YXRlKSA6IFtdOyAvLyBleGNsdWRlIHJvb3QgZnJvbSBwYXRoXG4gICAgfSxcblxuICAgIC8vIFNwZWVkIHVwICRzdGF0ZS5jb250YWlucygpIGFzIGl0J3MgdXNlZCBhIGxvdFxuICAgIGluY2x1ZGVzOiBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgdmFyIGluY2x1ZGVzID0gc3RhdGUucGFyZW50ID8gZXh0ZW5kKHt9LCBzdGF0ZS5wYXJlbnQuaW5jbHVkZXMpIDoge307XG4gICAgICBpbmNsdWRlc1tzdGF0ZS5uYW1lXSA9IHRydWU7XG4gICAgICByZXR1cm4gaW5jbHVkZXM7XG4gICAgfSxcblxuICAgICRkZWxlZ2F0ZXM6IHt9XG4gIH07XG5cbiAgZnVuY3Rpb24gaXNSZWxhdGl2ZShzdGF0ZU5hbWUpIHtcbiAgICByZXR1cm4gc3RhdGVOYW1lLmluZGV4T2YoXCIuXCIpID09PSAwIHx8IHN0YXRlTmFtZS5pbmRleE9mKFwiXlwiKSA9PT0gMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbmRTdGF0ZShzdGF0ZU9yTmFtZSwgYmFzZSkge1xuICAgIGlmICghc3RhdGVPck5hbWUpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICB2YXIgaXNTdHIgPSBpc1N0cmluZyhzdGF0ZU9yTmFtZSksXG4gICAgICAgIG5hbWUgID0gaXNTdHIgPyBzdGF0ZU9yTmFtZSA6IHN0YXRlT3JOYW1lLm5hbWUsXG4gICAgICAgIHBhdGggID0gaXNSZWxhdGl2ZShuYW1lKTtcblxuICAgIGlmIChwYXRoKSB7XG4gICAgICBpZiAoIWJhc2UpIHRocm93IG5ldyBFcnJvcihcIk5vIHJlZmVyZW5jZSBwb2ludCBnaXZlbiBmb3IgcGF0aCAnXCIgICsgbmFtZSArIFwiJ1wiKTtcbiAgICAgIGJhc2UgPSBmaW5kU3RhdGUoYmFzZSk7XG4gICAgICBcbiAgICAgIHZhciByZWwgPSBuYW1lLnNwbGl0KFwiLlwiKSwgaSA9IDAsIHBhdGhMZW5ndGggPSByZWwubGVuZ3RoLCBjdXJyZW50ID0gYmFzZTtcblxuICAgICAgZm9yICg7IGkgPCBwYXRoTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHJlbFtpXSA9PT0gXCJcIiAmJiBpID09PSAwKSB7XG4gICAgICAgICAgY3VycmVudCA9IGJhc2U7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlbFtpXSA9PT0gXCJeXCIpIHtcbiAgICAgICAgICBpZiAoIWN1cnJlbnQucGFyZW50KSB0aHJvdyBuZXcgRXJyb3IoXCJQYXRoICdcIiArIG5hbWUgKyBcIicgbm90IHZhbGlkIGZvciBzdGF0ZSAnXCIgKyBiYXNlLm5hbWUgKyBcIidcIik7XG4gICAgICAgICAgY3VycmVudCA9IGN1cnJlbnQucGFyZW50O1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgcmVsID0gcmVsLnNsaWNlKGkpLmpvaW4oXCIuXCIpO1xuICAgICAgbmFtZSA9IGN1cnJlbnQubmFtZSArIChjdXJyZW50Lm5hbWUgJiYgcmVsID8gXCIuXCIgOiBcIlwiKSArIHJlbDtcbiAgICB9XG4gICAgdmFyIHN0YXRlID0gc3RhdGVzW25hbWVdO1xuXG4gICAgaWYgKHN0YXRlICYmIChpc1N0ciB8fCAoIWlzU3RyICYmIChzdGF0ZSA9PT0gc3RhdGVPck5hbWUgfHwgc3RhdGUuc2VsZiA9PT0gc3RhdGVPck5hbWUpKSkpIHtcbiAgICAgIHJldHVybiBzdGF0ZTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHF1ZXVlU3RhdGUocGFyZW50TmFtZSwgc3RhdGUpIHtcbiAgICBpZiAoIXF1ZXVlW3BhcmVudE5hbWVdKSB7XG4gICAgICBxdWV1ZVtwYXJlbnROYW1lXSA9IFtdO1xuICAgIH1cbiAgICBxdWV1ZVtwYXJlbnROYW1lXS5wdXNoKHN0YXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZsdXNoUXVldWVkQ2hpbGRyZW4ocGFyZW50TmFtZSkge1xuICAgIHZhciBxdWV1ZWQgPSBxdWV1ZVtwYXJlbnROYW1lXSB8fCBbXTtcbiAgICB3aGlsZShxdWV1ZWQubGVuZ3RoKSB7XG4gICAgICByZWdpc3RlclN0YXRlKHF1ZXVlZC5zaGlmdCgpKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZWdpc3RlclN0YXRlKHN0YXRlKSB7XG4gICAgLy8gV3JhcCBhIG5ldyBvYmplY3QgYXJvdW5kIHRoZSBzdGF0ZSBzbyB3ZSBjYW4gc3RvcmUgb3VyIHByaXZhdGUgZGV0YWlscyBlYXNpbHkuXG4gICAgc3RhdGUgPSBpbmhlcml0KHN0YXRlLCB7XG4gICAgICBzZWxmOiBzdGF0ZSxcbiAgICAgIHJlc29sdmU6IHN0YXRlLnJlc29sdmUgfHwge30sXG4gICAgICB0b1N0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLm5hbWU7IH1cbiAgICB9KTtcblxuICAgIHZhciBuYW1lID0gc3RhdGUubmFtZTtcbiAgICBpZiAoIWlzU3RyaW5nKG5hbWUpIHx8IG5hbWUuaW5kZXhPZignQCcpID49IDApIHRocm93IG5ldyBFcnJvcihcIlN0YXRlIG11c3QgaGF2ZSBhIHZhbGlkIG5hbWVcIik7XG4gICAgaWYgKHN0YXRlcy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkgdGhyb3cgbmV3IEVycm9yKFwiU3RhdGUgJ1wiICsgbmFtZSArIFwiJycgaXMgYWxyZWFkeSBkZWZpbmVkXCIpO1xuXG4gICAgLy8gR2V0IHBhcmVudCBuYW1lXG4gICAgdmFyIHBhcmVudE5hbWUgPSAobmFtZS5pbmRleE9mKCcuJykgIT09IC0xKSA/IG5hbWUuc3Vic3RyaW5nKDAsIG5hbWUubGFzdEluZGV4T2YoJy4nKSlcbiAgICAgICAgOiAoaXNTdHJpbmcoc3RhdGUucGFyZW50KSkgPyBzdGF0ZS5wYXJlbnRcbiAgICAgICAgOiAoaXNPYmplY3Qoc3RhdGUucGFyZW50KSAmJiBpc1N0cmluZyhzdGF0ZS5wYXJlbnQubmFtZSkpID8gc3RhdGUucGFyZW50Lm5hbWVcbiAgICAgICAgOiAnJztcblxuICAgIC8vIElmIHBhcmVudCBpcyBub3QgcmVnaXN0ZXJlZCB5ZXQsIGFkZCBzdGF0ZSB0byBxdWV1ZSBhbmQgcmVnaXN0ZXIgbGF0ZXJcbiAgICBpZiAocGFyZW50TmFtZSAmJiAhc3RhdGVzW3BhcmVudE5hbWVdKSB7XG4gICAgICByZXR1cm4gcXVldWVTdGF0ZShwYXJlbnROYW1lLCBzdGF0ZS5zZWxmKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gc3RhdGVCdWlsZGVyKSB7XG4gICAgICBpZiAoaXNGdW5jdGlvbihzdGF0ZUJ1aWxkZXJba2V5XSkpIHN0YXRlW2tleV0gPSBzdGF0ZUJ1aWxkZXJba2V5XShzdGF0ZSwgc3RhdGVCdWlsZGVyLiRkZWxlZ2F0ZXNba2V5XSk7XG4gICAgfVxuICAgIHN0YXRlc1tuYW1lXSA9IHN0YXRlO1xuXG4gICAgLy8gUmVnaXN0ZXIgdGhlIHN0YXRlIGluIHRoZSBnbG9iYWwgc3RhdGUgbGlzdCBhbmQgd2l0aCAkdXJsUm91dGVyIGlmIG5lY2Vzc2FyeS5cbiAgICBpZiAoIXN0YXRlW2Fic3RyYWN0S2V5XSAmJiBzdGF0ZS51cmwpIHtcbiAgICAgICR1cmxSb3V0ZXJQcm92aWRlci53aGVuKHN0YXRlLnVybCwgWyckbWF0Y2gnLCAnJHN0YXRlUGFyYW1zJywgZnVuY3Rpb24gKCRtYXRjaCwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgIGlmICgkc3RhdGUuJGN1cnJlbnQubmF2aWdhYmxlICE9IHN0YXRlIHx8ICFlcXVhbEZvcktleXMoJG1hdGNoLCAkc3RhdGVQYXJhbXMpKSB7XG4gICAgICAgICAgJHN0YXRlLnRyYW5zaXRpb25UbyhzdGF0ZSwgJG1hdGNoLCB7IGluaGVyaXQ6IHRydWUsIGxvY2F0aW9uOiBmYWxzZSB9KTtcbiAgICAgICAgfVxuICAgICAgfV0pO1xuICAgIH1cblxuICAgIC8vIFJlZ2lzdGVyIGFueSBxdWV1ZWQgY2hpbGRyZW5cbiAgICBmbHVzaFF1ZXVlZENoaWxkcmVuKG5hbWUpO1xuXG4gICAgcmV0dXJuIHN0YXRlO1xuICB9XG5cbiAgLy8gQ2hlY2tzIHRleHQgdG8gc2VlIGlmIGl0IGxvb2tzIGxpa2UgYSBnbG9iLlxuICBmdW5jdGlvbiBpc0dsb2IgKHRleHQpIHtcbiAgICByZXR1cm4gdGV4dC5pbmRleE9mKCcqJykgPiAtMTtcbiAgfVxuXG4gIC8vIFJldHVybnMgdHJ1ZSBpZiBnbG9iIG1hdGNoZXMgY3VycmVudCAkc3RhdGUgbmFtZS5cbiAgZnVuY3Rpb24gZG9lc1N0YXRlTWF0Y2hHbG9iIChnbG9iKSB7XG4gICAgdmFyIGdsb2JTZWdtZW50cyA9IGdsb2Iuc3BsaXQoJy4nKSxcbiAgICAgICAgc2VnbWVudHMgPSAkc3RhdGUuJGN1cnJlbnQubmFtZS5zcGxpdCgnLicpO1xuXG4gICAgLy9tYXRjaCBncmVlZHkgc3RhcnRzXG4gICAgaWYgKGdsb2JTZWdtZW50c1swXSA9PT0gJyoqJykge1xuICAgICAgIHNlZ21lbnRzID0gc2VnbWVudHMuc2xpY2UoaW5kZXhPZihzZWdtZW50cywgZ2xvYlNlZ21lbnRzWzFdKSk7XG4gICAgICAgc2VnbWVudHMudW5zaGlmdCgnKionKTtcbiAgICB9XG4gICAgLy9tYXRjaCBncmVlZHkgZW5kc1xuICAgIGlmIChnbG9iU2VnbWVudHNbZ2xvYlNlZ21lbnRzLmxlbmd0aCAtIDFdID09PSAnKionKSB7XG4gICAgICAgc2VnbWVudHMuc3BsaWNlKGluZGV4T2Yoc2VnbWVudHMsIGdsb2JTZWdtZW50c1tnbG9iU2VnbWVudHMubGVuZ3RoIC0gMl0pICsgMSwgTnVtYmVyLk1BWF9WQUxVRSk7XG4gICAgICAgc2VnbWVudHMucHVzaCgnKionKTtcbiAgICB9XG5cbiAgICBpZiAoZ2xvYlNlZ21lbnRzLmxlbmd0aCAhPSBzZWdtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvL21hdGNoIHNpbmdsZSBzdGFyc1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gZ2xvYlNlZ21lbnRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgaWYgKGdsb2JTZWdtZW50c1tpXSA9PT0gJyonKSB7XG4gICAgICAgIHNlZ21lbnRzW2ldID0gJyonO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzZWdtZW50cy5qb2luKCcnKSA9PT0gZ2xvYlNlZ21lbnRzLmpvaW4oJycpO1xuICB9XG5cblxuICAvLyBJbXBsaWNpdCByb290IHN0YXRlIHRoYXQgaXMgYWx3YXlzIGFjdGl2ZVxuICByb290ID0gcmVnaXN0ZXJTdGF0ZSh7XG4gICAgbmFtZTogJycsXG4gICAgdXJsOiAnXicsXG4gICAgdmlld3M6IG51bGwsXG4gICAgJ2Fic3RyYWN0JzogdHJ1ZVxuICB9KTtcbiAgcm9vdC5uYXZpZ2FibGUgPSBudWxsO1xuXG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlUHJvdmlkZXIjZGVjb3JhdG9yXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIEFsbG93cyB5b3UgdG8gZXh0ZW5kIChjYXJlZnVsbHkpIG9yIG92ZXJyaWRlIChhdCB5b3VyIG93biBwZXJpbCkgdGhlIFxuICAgKiBgc3RhdGVCdWlsZGVyYCBvYmplY3QgdXNlZCBpbnRlcm5hbGx5IGJ5IGAkc3RhdGVQcm92aWRlcmAuIFRoaXMgY2FuIGJlIHVzZWQgXG4gICAqIHRvIGFkZCBjdXN0b20gZnVuY3Rpb25hbGl0eSB0byB1aS1yb3V0ZXIsIGZvciBleGFtcGxlIGluZmVycmluZyB0ZW1wbGF0ZVVybCBcbiAgICogYmFzZWQgb24gdGhlIHN0YXRlIG5hbWUuXG4gICAqXG4gICAqIFdoZW4gcGFzc2luZyBvbmx5IGEgbmFtZSwgaXQgcmV0dXJucyB0aGUgY3VycmVudCAob3JpZ2luYWwgb3IgZGVjb3JhdGVkKSBidWlsZGVyXG4gICAqIGZ1bmN0aW9uIHRoYXQgbWF0Y2hlcyBgbmFtZWAuXG4gICAqXG4gICAqIFRoZSBidWlsZGVyIGZ1bmN0aW9ucyB0aGF0IGNhbiBiZSBkZWNvcmF0ZWQgYXJlIGxpc3RlZCBiZWxvdy4gVGhvdWdoIG5vdCBhbGxcbiAgICogbmVjZXNzYXJpbHkgaGF2ZSBhIGdvb2QgdXNlIGNhc2UgZm9yIGRlY29yYXRpb24sIHRoYXQgaXMgdXAgdG8geW91IHRvIGRlY2lkZS5cbiAgICpcbiAgICogSW4gYWRkaXRpb24sIHVzZXJzIGNhbiBhdHRhY2ggY3VzdG9tIGRlY29yYXRvcnMsIHdoaWNoIHdpbGwgZ2VuZXJhdGUgbmV3IFxuICAgKiBwcm9wZXJ0aWVzIHdpdGhpbiB0aGUgc3RhdGUncyBpbnRlcm5hbCBkZWZpbml0aW9uLiBUaGVyZSBpcyBjdXJyZW50bHkgbm8gY2xlYXIgXG4gICAqIHVzZS1jYXNlIGZvciB0aGlzIGJleW9uZCBhY2Nlc3NpbmcgaW50ZXJuYWwgc3RhdGVzIChpLmUuICRzdGF0ZS4kY3VycmVudCksIFxuICAgKiBob3dldmVyLCBleHBlY3QgdGhpcyB0byBiZWNvbWUgaW5jcmVhc2luZ2x5IHJlbGV2YW50IGFzIHdlIGludHJvZHVjZSBhZGRpdGlvbmFsIFxuICAgKiBtZXRhLXByb2dyYW1taW5nIGZlYXR1cmVzLlxuICAgKlxuICAgKiAqKldhcm5pbmcqKjogRGVjb3JhdG9ycyBzaG91bGQgbm90IGJlIGludGVyZGVwZW5kZW50IGJlY2F1c2UgdGhlIG9yZGVyIG9mIFxuICAgKiBleGVjdXRpb24gb2YgdGhlIGJ1aWxkZXIgZnVuY3Rpb25zIGluIG5vbi1kZXRlcm1pbmlzdGljLiBCdWlsZGVyIGZ1bmN0aW9ucyBcbiAgICogc2hvdWxkIG9ubHkgYmUgZGVwZW5kZW50IG9uIHRoZSBzdGF0ZSBkZWZpbml0aW9uIG9iamVjdCBhbmQgc3VwZXIgZnVuY3Rpb24uXG4gICAqXG4gICAqXG4gICAqIEV4aXN0aW5nIGJ1aWxkZXIgZnVuY3Rpb25zIGFuZCBjdXJyZW50IHJldHVybiB2YWx1ZXM6XG4gICAqXG4gICAqIC0gKipwYXJlbnQqKiBge29iamVjdH1gIC0gcmV0dXJucyB0aGUgcGFyZW50IHN0YXRlIG9iamVjdC5cbiAgICogLSAqKmRhdGEqKiBge29iamVjdH1gIC0gcmV0dXJucyBzdGF0ZSBkYXRhLCBpbmNsdWRpbmcgYW55IGluaGVyaXRlZCBkYXRhIHRoYXQgaXMgbm90XG4gICAqICAgb3ZlcnJpZGRlbiBieSBvd24gdmFsdWVzIChpZiBhbnkpLlxuICAgKiAtICoqdXJsKiogYHtvYmplY3R9YCAtIHJldHVybnMgYSB7QGxpbmsgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyIFVybE1hdGNoZXJ9XG4gICAqICAgb3IgYG51bGxgLlxuICAgKiAtICoqbmF2aWdhYmxlKiogYHtvYmplY3R9YCAtIHJldHVybnMgY2xvc2VzdCBhbmNlc3RvciBzdGF0ZSB0aGF0IGhhcyBhIFVSTCAoYWthIGlzIFxuICAgKiAgIG5hdmlnYWJsZSkuXG4gICAqIC0gKipwYXJhbXMqKiBge29iamVjdH1gIC0gcmV0dXJucyBhbiBhcnJheSBvZiBzdGF0ZSBwYXJhbXMgdGhhdCBhcmUgZW5zdXJlZCB0byBcbiAgICogICBiZSBhIHN1cGVyLXNldCBvZiBwYXJlbnQncyBwYXJhbXMuXG4gICAqIC0gKip2aWV3cyoqIGB7b2JqZWN0fWAgLSByZXR1cm5zIGEgdmlld3Mgb2JqZWN0IHdoZXJlIGVhY2gga2V5IGlzIGFuIGFic29sdXRlIHZpZXcgXG4gICAqICAgbmFtZSAoaS5lLiBcInZpZXdOYW1lQHN0YXRlTmFtZVwiKSBhbmQgZWFjaCB2YWx1ZSBpcyB0aGUgY29uZmlnIG9iamVjdCBcbiAgICogICAodGVtcGxhdGUsIGNvbnRyb2xsZXIpIGZvciB0aGUgdmlldy4gRXZlbiB3aGVuIHlvdSBkb24ndCB1c2UgdGhlIHZpZXdzIG9iamVjdCBcbiAgICogICBleHBsaWNpdGx5IG9uIGEgc3RhdGUgY29uZmlnLCBvbmUgaXMgc3RpbGwgY3JlYXRlZCBmb3IgeW91IGludGVybmFsbHkuXG4gICAqICAgU28gYnkgZGVjb3JhdGluZyB0aGlzIGJ1aWxkZXIgZnVuY3Rpb24geW91IGhhdmUgYWNjZXNzIHRvIGRlY29yYXRpbmcgdGVtcGxhdGUgXG4gICAqICAgYW5kIGNvbnRyb2xsZXIgcHJvcGVydGllcy5cbiAgICogLSAqKm93blBhcmFtcyoqIGB7b2JqZWN0fWAgLSByZXR1cm5zIGFuIGFycmF5IG9mIHBhcmFtcyB0aGF0IGJlbG9uZyB0byB0aGUgc3RhdGUsIFxuICAgKiAgIG5vdCBpbmNsdWRpbmcgYW55IHBhcmFtcyBkZWZpbmVkIGJ5IGFuY2VzdG9yIHN0YXRlcy5cbiAgICogLSAqKnBhdGgqKiBge3N0cmluZ31gIC0gcmV0dXJucyB0aGUgZnVsbCBwYXRoIGZyb20gdGhlIHJvb3QgZG93biB0byB0aGlzIHN0YXRlLiBcbiAgICogICBOZWVkZWQgZm9yIHN0YXRlIGFjdGl2YXRpb24uXG4gICAqIC0gKippbmNsdWRlcyoqIGB7b2JqZWN0fWAgLSByZXR1cm5zIGFuIG9iamVjdCB0aGF0IGluY2x1ZGVzIGV2ZXJ5IHN0YXRlIHRoYXQgXG4gICAqICAgd291bGQgcGFzcyBhIGAkc3RhdGUuaW5jbHVkZXMoKWAgdGVzdC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogPHByZT5cbiAgICogLy8gT3ZlcnJpZGUgdGhlIGludGVybmFsICd2aWV3cycgYnVpbGRlciB3aXRoIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyB0aGUgc3RhdGVcbiAgICogLy8gZGVmaW5pdGlvbiwgYW5kIGEgcmVmZXJlbmNlIHRvIHRoZSBpbnRlcm5hbCBmdW5jdGlvbiBiZWluZyBvdmVycmlkZGVuOlxuICAgKiAkc3RhdGVQcm92aWRlci5kZWNvcmF0b3IoJ3ZpZXdzJywgZnVuY3Rpb24gKHN0YXRlLCBwYXJlbnQpIHtcbiAgICogICB2YXIgcmVzdWx0ID0ge30sXG4gICAqICAgICAgIHZpZXdzID0gcGFyZW50KHN0YXRlKTtcbiAgICpcbiAgICogICBhbmd1bGFyLmZvckVhY2godmlld3MsIGZ1bmN0aW9uIChjb25maWcsIG5hbWUpIHtcbiAgICogICAgIHZhciBhdXRvTmFtZSA9IChzdGF0ZS5uYW1lICsgJy4nICsgbmFtZSkucmVwbGFjZSgnLicsICcvJyk7XG4gICAqICAgICBjb25maWcudGVtcGxhdGVVcmwgPSBjb25maWcudGVtcGxhdGVVcmwgfHwgJy9wYXJ0aWFscy8nICsgYXV0b05hbWUgKyAnLmh0bWwnO1xuICAgKiAgICAgcmVzdWx0W25hbWVdID0gY29uZmlnO1xuICAgKiAgIH0pO1xuICAgKiAgIHJldHVybiByZXN1bHQ7XG4gICAqIH0pO1xuICAgKlxuICAgKiAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbiAgICogICB2aWV3czoge1xuICAgKiAgICAgJ2NvbnRhY3QubGlzdCc6IHsgY29udHJvbGxlcjogJ0xpc3RDb250cm9sbGVyJyB9LFxuICAgKiAgICAgJ2NvbnRhY3QuaXRlbSc6IHsgY29udHJvbGxlcjogJ0l0ZW1Db250cm9sbGVyJyB9XG4gICAqICAgfVxuICAgKiB9KTtcbiAgICpcbiAgICogLy8gLi4uXG4gICAqXG4gICAqICRzdGF0ZS5nbygnaG9tZScpO1xuICAgKiAvLyBBdXRvLXBvcHVsYXRlcyBsaXN0IGFuZCBpdGVtIHZpZXdzIHdpdGggL3BhcnRpYWxzL2hvbWUvY29udGFjdC9saXN0Lmh0bWwsXG4gICAqIC8vIGFuZCAvcGFydGlhbHMvaG9tZS9jb250YWN0L2l0ZW0uaHRtbCwgcmVzcGVjdGl2ZWx5LlxuICAgKiA8L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIGJ1aWxkZXIgZnVuY3Rpb24gdG8gZGVjb3JhdGUuIFxuICAgKiBAcGFyYW0ge29iamVjdH0gZnVuYyBBIGZ1bmN0aW9uIHRoYXQgaXMgcmVzcG9uc2libGUgZm9yIGRlY29yYXRpbmcgdGhlIG9yaWdpbmFsIFxuICAgKiBidWlsZGVyIGZ1bmN0aW9uLiBUaGUgZnVuY3Rpb24gcmVjZWl2ZXMgdHdvIHBhcmFtZXRlcnM6XG4gICAqXG4gICAqICAgLSBge29iamVjdH1gIC0gc3RhdGUgLSBUaGUgc3RhdGUgY29uZmlnIG9iamVjdC5cbiAgICogICAtIGB7b2JqZWN0fWAgLSBzdXBlciAtIFRoZSBvcmlnaW5hbCBidWlsZGVyIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJuIHtvYmplY3R9ICRzdGF0ZVByb3ZpZGVyIC0gJHN0YXRlUHJvdmlkZXIgaW5zdGFuY2VcbiAgICovXG4gIHRoaXMuZGVjb3JhdG9yID0gZGVjb3JhdG9yO1xuICBmdW5jdGlvbiBkZWNvcmF0b3IobmFtZSwgZnVuYykge1xuICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIGlmIChpc1N0cmluZyhuYW1lKSAmJiAhaXNEZWZpbmVkKGZ1bmMpKSB7XG4gICAgICByZXR1cm4gc3RhdGVCdWlsZGVyW25hbWVdO1xuICAgIH1cbiAgICBpZiAoIWlzRnVuY3Rpb24oZnVuYykgfHwgIWlzU3RyaW5nKG5hbWUpKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgaWYgKHN0YXRlQnVpbGRlcltuYW1lXSAmJiAhc3RhdGVCdWlsZGVyLiRkZWxlZ2F0ZXNbbmFtZV0pIHtcbiAgICAgIHN0YXRlQnVpbGRlci4kZGVsZWdhdGVzW25hbWVdID0gc3RhdGVCdWlsZGVyW25hbWVdO1xuICAgIH1cbiAgICBzdGF0ZUJ1aWxkZXJbbmFtZV0gPSBmdW5jO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlUHJvdmlkZXIjc3RhdGVcbiAgICogQG1ldGhvZE9mIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogUmVnaXN0ZXJzIGEgc3RhdGUgY29uZmlndXJhdGlvbiB1bmRlciBhIGdpdmVuIHN0YXRlIG5hbWUuIFRoZSBzdGF0ZUNvbmZpZyBvYmplY3RcbiAgICogaGFzIHRoZSBmb2xsb3dpbmcgYWNjZXB0YWJsZSBwcm9wZXJ0aWVzLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBBIHVuaXF1ZSBzdGF0ZSBuYW1lLCBlLmcuIFwiaG9tZVwiLCBcImFib3V0XCIsIFwiY29udGFjdHNcIi5cbiAgICogVG8gY3JlYXRlIGEgcGFyZW50L2NoaWxkIHN0YXRlIHVzZSBhIGRvdCwgZS5nLiBcImFib3V0LnNhbGVzXCIsIFwiaG9tZS5uZXdlc3RcIi5cbiAgICogQHBhcmFtIHtvYmplY3R9IHN0YXRlQ29uZmlnIFN0YXRlIGNvbmZpZ3VyYXRpb24gb2JqZWN0LlxuICAgKiBAcGFyYW0ge3N0cmluZ3xmdW5jdGlvbj19IHN0YXRlQ29uZmlnLnRlbXBsYXRlXG4gICAqIDxhIGlkPSd0ZW1wbGF0ZSc+PC9hPlxuICAgKiAgIGh0bWwgdGVtcGxhdGUgYXMgYSBzdHJpbmcgb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnNcbiAgICogICBhbiBodG1sIHRlbXBsYXRlIGFzIGEgc3RyaW5nIHdoaWNoIHNob3VsZCBiZSB1c2VkIGJ5IHRoZSB1aVZpZXcgZGlyZWN0aXZlcy4gVGhpcyBwcm9wZXJ0eSBcbiAgICogICB0YWtlcyBwcmVjZWRlbmNlIG92ZXIgdGVtcGxhdGVVcmwuXG4gICAqICAgXG4gICAqICAgSWYgYHRlbXBsYXRlYCBpcyBhIGZ1bmN0aW9uLCBpdCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRoZSBmb2xsb3dpbmcgcGFyYW1ldGVyczpcbiAgICpcbiAgICogICAtIHthcnJheS4mbHQ7b2JqZWN0Jmd0O30gLSBzdGF0ZSBwYXJhbWV0ZXJzIGV4dHJhY3RlZCBmcm9tIHRoZSBjdXJyZW50ICRsb2NhdGlvbi5wYXRoKCkgYnlcbiAgICogICAgIGFwcGx5aW5nIHRoZSBjdXJyZW50IHN0YXRlXG4gICAqXG4gICAqIDxwcmU+dGVtcGxhdGU6XG4gICAqICAgXCI8aDE+aW5saW5lIHRlbXBsYXRlIGRlZmluaXRpb248L2gxPlwiICtcbiAgICogICBcIjxkaXYgdWktdmlldz48L2Rpdj5cIjwvcHJlPlxuICAgKiA8cHJlPnRlbXBsYXRlOiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICogICAgICAgcmV0dXJuIFwiPGgxPmdlbmVyYXRlZCB0ZW1wbGF0ZTwvaDE+XCI7IH08L3ByZT5cbiAgICogPC9kaXY+XG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfGZ1bmN0aW9uPX0gc3RhdGVDb25maWcudGVtcGxhdGVVcmxcbiAgICogPGEgaWQ9J3RlbXBsYXRlVXJsJz48L2E+XG4gICAqXG4gICAqICAgcGF0aCBvciBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBwYXRoIHRvIGFuIGh0bWxcbiAgICogICB0ZW1wbGF0ZSB0aGF0IHNob3VsZCBiZSB1c2VkIGJ5IHVpVmlldy5cbiAgICogICBcbiAgICogICBJZiBgdGVtcGxhdGVVcmxgIGlzIGEgZnVuY3Rpb24sIGl0IHdpbGwgYmUgY2FsbGVkIHdpdGggdGhlIGZvbGxvd2luZyBwYXJhbWV0ZXJzOlxuICAgKlxuICAgKiAgIC0ge2FycmF5LiZsdDtvYmplY3QmZ3Q7fSAtIHN0YXRlIHBhcmFtZXRlcnMgZXh0cmFjdGVkIGZyb20gdGhlIGN1cnJlbnQgJGxvY2F0aW9uLnBhdGgoKSBieSBcbiAgICogICAgIGFwcGx5aW5nIHRoZSBjdXJyZW50IHN0YXRlXG4gICAqXG4gICAqIDxwcmU+dGVtcGxhdGVVcmw6IFwiaG9tZS5odG1sXCI8L3ByZT5cbiAgICogPHByZT50ZW1wbGF0ZVVybDogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAqICAgICByZXR1cm4gbXlUZW1wbGF0ZXNbcGFyYW1zLnBhZ2VJZF07IH08L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbj19IHN0YXRlQ29uZmlnLnRlbXBsYXRlUHJvdmlkZXJcbiAgICogPGEgaWQ9J3RlbXBsYXRlUHJvdmlkZXInPjwvYT5cbiAgICogICAgUHJvdmlkZXIgZnVuY3Rpb24gdGhhdCByZXR1cm5zIEhUTUwgY29udGVudCBzdHJpbmcuXG4gICAqIDxwcmU+IHRlbXBsYXRlUHJvdmlkZXI6XG4gICAqICAgICAgIGZ1bmN0aW9uKE15VGVtcGxhdGVTZXJ2aWNlLCBwYXJhbXMpIHtcbiAgICogICAgICAgICByZXR1cm4gTXlUZW1wbGF0ZVNlcnZpY2UuZ2V0VGVtcGxhdGUocGFyYW1zLnBhZ2VJZCk7XG4gICAqICAgICAgIH08L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd8ZnVuY3Rpb249fSBzdGF0ZUNvbmZpZy5jb250cm9sbGVyXG4gICAqIDxhIGlkPSdjb250cm9sbGVyJz48L2E+XG4gICAqXG4gICAqICBDb250cm9sbGVyIGZuIHRoYXQgc2hvdWxkIGJlIGFzc29jaWF0ZWQgd2l0aCBuZXdseVxuICAgKiAgIHJlbGF0ZWQgc2NvcGUgb3IgdGhlIG5hbWUgb2YgYSByZWdpc3RlcmVkIGNvbnRyb2xsZXIgaWYgcGFzc2VkIGFzIGEgc3RyaW5nLlxuICAgKiAgIE9wdGlvbmFsbHksIHRoZSBDb250cm9sbGVyQXMgbWF5IGJlIGRlY2xhcmVkIGhlcmUuXG4gICAqIDxwcmU+Y29udHJvbGxlcjogXCJNeVJlZ2lzdGVyZWRDb250cm9sbGVyXCI8L3ByZT5cbiAgICogPHByZT5jb250cm9sbGVyOlxuICAgKiAgICAgXCJNeVJlZ2lzdGVyZWRDb250cm9sbGVyIGFzIGZvb0N0cmxcIn08L3ByZT5cbiAgICogPHByZT5jb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIE15U2VydmljZSkge1xuICAgKiAgICAgJHNjb3BlLmRhdGEgPSBNeVNlcnZpY2UuZ2V0RGF0YSgpOyB9PC9wcmU+XG4gICAqXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb249fSBzdGF0ZUNvbmZpZy5jb250cm9sbGVyUHJvdmlkZXJcbiAgICogPGEgaWQ9J2NvbnRyb2xsZXJQcm92aWRlcic+PC9hPlxuICAgKlxuICAgKiBJbmplY3RhYmxlIHByb3ZpZGVyIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgYWN0dWFsIGNvbnRyb2xsZXIgb3Igc3RyaW5nLlxuICAgKiA8cHJlPmNvbnRyb2xsZXJQcm92aWRlcjpcbiAgICogICBmdW5jdGlvbihNeVJlc29sdmVEYXRhKSB7XG4gICAqICAgICBpZiAoTXlSZXNvbHZlRGF0YS5mb28pXG4gICAqICAgICAgIHJldHVybiBcIkZvb0N0cmxcIlxuICAgKiAgICAgZWxzZSBpZiAoTXlSZXNvbHZlRGF0YS5iYXIpXG4gICAqICAgICAgIHJldHVybiBcIkJhckN0cmxcIjtcbiAgICogICAgIGVsc2UgcmV0dXJuIGZ1bmN0aW9uKCRzY29wZSkge1xuICAgKiAgICAgICAkc2NvcGUuYmF6ID0gXCJRdXhcIjtcbiAgICogICAgIH1cbiAgICogICB9PC9wcmU+XG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nPX0gc3RhdGVDb25maWcuY29udHJvbGxlckFzXG4gICAqIDxhIGlkPSdjb250cm9sbGVyQXMnPjwvYT5cbiAgICogXG4gICAqIEEgY29udHJvbGxlciBhbGlhcyBuYW1lLiBJZiBwcmVzZW50IHRoZSBjb250cm9sbGVyIHdpbGwgYmVcbiAgICogICBwdWJsaXNoZWQgdG8gc2NvcGUgdW5kZXIgdGhlIGNvbnRyb2xsZXJBcyBuYW1lLlxuICAgKiA8cHJlPmNvbnRyb2xsZXJBczogXCJteUN0cmxcIjwvcHJlPlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdD19IHN0YXRlQ29uZmlnLnJlc29sdmVcbiAgICogPGEgaWQ9J3Jlc29sdmUnPjwvYT5cbiAgICpcbiAgICogQW4gb3B0aW9uYWwgbWFwJmx0O3N0cmluZywgZnVuY3Rpb24mZ3Q7IG9mIGRlcGVuZGVuY2llcyB3aGljaFxuICAgKiAgIHNob3VsZCBiZSBpbmplY3RlZCBpbnRvIHRoZSBjb250cm9sbGVyLiBJZiBhbnkgb2YgdGhlc2UgZGVwZW5kZW5jaWVzIGFyZSBwcm9taXNlcywgXG4gICAqICAgdGhlIHJvdXRlciB3aWxsIHdhaXQgZm9yIHRoZW0gYWxsIHRvIGJlIHJlc29sdmVkIGJlZm9yZSB0aGUgY29udHJvbGxlciBpcyBpbnN0YW50aWF0ZWQuXG4gICAqICAgSWYgYWxsIHRoZSBwcm9taXNlcyBhcmUgcmVzb2x2ZWQgc3VjY2Vzc2Z1bGx5LCB0aGUgJHN0YXRlQ2hhbmdlU3VjY2VzcyBldmVudCBpcyBmaXJlZFxuICAgKiAgIGFuZCB0aGUgdmFsdWVzIG9mIHRoZSByZXNvbHZlZCBwcm9taXNlcyBhcmUgaW5qZWN0ZWQgaW50byBhbnkgY29udHJvbGxlcnMgdGhhdCByZWZlcmVuY2UgdGhlbS5cbiAgICogICBJZiBhbnkgIG9mIHRoZSBwcm9taXNlcyBhcmUgcmVqZWN0ZWQgdGhlICRzdGF0ZUNoYW5nZUVycm9yIGV2ZW50IGlzIGZpcmVkLlxuICAgKlxuICAgKiAgIFRoZSBtYXAgb2JqZWN0IGlzOlxuICAgKiAgIFxuICAgKiAgIC0ga2V5IC0ge3N0cmluZ306IG5hbWUgb2YgZGVwZW5kZW5jeSB0byBiZSBpbmplY3RlZCBpbnRvIGNvbnRyb2xsZXJcbiAgICogICAtIGZhY3RvcnkgLSB7c3RyaW5nfGZ1bmN0aW9ufTogSWYgc3RyaW5nIHRoZW4gaXQgaXMgYWxpYXMgZm9yIHNlcnZpY2UuIE90aGVyd2lzZSBpZiBmdW5jdGlvbiwgXG4gICAqICAgICBpdCBpcyBpbmplY3RlZCBhbmQgcmV0dXJuIHZhbHVlIGl0IHRyZWF0ZWQgYXMgZGVwZW5kZW5jeS4gSWYgcmVzdWx0IGlzIGEgcHJvbWlzZSwgaXQgaXMgXG4gICAqICAgICByZXNvbHZlZCBiZWZvcmUgaXRzIHZhbHVlIGlzIGluamVjdGVkIGludG8gY29udHJvbGxlci5cbiAgICpcbiAgICogPHByZT5yZXNvbHZlOiB7XG4gICAqICAgICBteVJlc29sdmUxOlxuICAgKiAgICAgICBmdW5jdGlvbigkaHR0cCwgJHN0YXRlUGFyYW1zKSB7XG4gICAqICAgICAgICAgcmV0dXJuICRodHRwLmdldChcIi9hcGkvZm9vcy9cIitzdGF0ZVBhcmFtcy5mb29JRCk7XG4gICAqICAgICAgIH1cbiAgICogICAgIH08L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmc9fSBzdGF0ZUNvbmZpZy51cmxcbiAgICogPGEgaWQ9J3VybCc+PC9hPlxuICAgKlxuICAgKiAgIEEgdXJsIGZyYWdtZW50IHdpdGggb3B0aW9uYWwgcGFyYW1ldGVycy4gV2hlbiBhIHN0YXRlIGlzIG5hdmlnYXRlZCBvclxuICAgKiAgIHRyYW5zaXRpb25lZCB0bywgdGhlIGAkc3RhdGVQYXJhbXNgIHNlcnZpY2Ugd2lsbCBiZSBwb3B1bGF0ZWQgd2l0aCBhbnkgXG4gICAqICAgcGFyYW1ldGVycyB0aGF0IHdlcmUgcGFzc2VkLlxuICAgKlxuICAgKiBleGFtcGxlczpcbiAgICogPHByZT51cmw6IFwiL2hvbWVcIlxuICAgKiB1cmw6IFwiL3VzZXJzLzp1c2VyaWRcIlxuICAgKiB1cmw6IFwiL2Jvb2tzL3tib29raWQ6W2EtekEtWl8tXX1cIlxuICAgKiB1cmw6IFwiL2Jvb2tzL3tjYXRlZ29yeWlkOmludH1cIlxuICAgKiB1cmw6IFwiL2Jvb2tzL3twdWJsaXNoZXJuYW1lOnN0cmluZ30ve2NhdGVnb3J5aWQ6aW50fVwiXG4gICAqIHVybDogXCIvbWVzc2FnZXM/YmVmb3JlJmFmdGVyXCJcbiAgICogdXJsOiBcIi9tZXNzYWdlcz97YmVmb3JlOmRhdGV9JnthZnRlcjpkYXRlfVwiPC9wcmU+XG4gICAqIHVybDogXCIvbWVzc2FnZXMvOm1haWxib3hpZD97YmVmb3JlOmRhdGV9JnthZnRlcjpkYXRlfVwiXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0PX0gc3RhdGVDb25maWcudmlld3NcbiAgICogPGEgaWQ9J3ZpZXdzJz48L2E+XG4gICAqIGFuIG9wdGlvbmFsIG1hcCZsdDtzdHJpbmcsIG9iamVjdCZndDsgd2hpY2ggZGVmaW5lZCBtdWx0aXBsZSB2aWV3cywgb3IgdGFyZ2V0cyB2aWV3c1xuICAgKiBtYW51YWxseS9leHBsaWNpdGx5LlxuICAgKlxuICAgKiBFeGFtcGxlczpcbiAgICpcbiAgICogVGFyZ2V0cyB0aHJlZSBuYW1lZCBgdWktdmlld2BzIGluIHRoZSBwYXJlbnQgc3RhdGUncyB0ZW1wbGF0ZVxuICAgKiA8cHJlPnZpZXdzOiB7XG4gICAqICAgICBoZWFkZXI6IHtcbiAgICogICAgICAgY29udHJvbGxlcjogXCJoZWFkZXJDdHJsXCIsXG4gICAqICAgICAgIHRlbXBsYXRlVXJsOiBcImhlYWRlci5odG1sXCJcbiAgICogICAgIH0sIGJvZHk6IHtcbiAgICogICAgICAgY29udHJvbGxlcjogXCJib2R5Q3RybFwiLFxuICAgKiAgICAgICB0ZW1wbGF0ZVVybDogXCJib2R5Lmh0bWxcIlxuICAgKiAgICAgfSwgZm9vdGVyOiB7XG4gICAqICAgICAgIGNvbnRyb2xsZXI6IFwiZm9vdEN0cmxcIixcbiAgICogICAgICAgdGVtcGxhdGVVcmw6IFwiZm9vdGVyLmh0bWxcIlxuICAgKiAgICAgfVxuICAgKiAgIH08L3ByZT5cbiAgICpcbiAgICogVGFyZ2V0cyBuYW1lZCBgdWktdmlldz1cImhlYWRlclwiYCBmcm9tIGdyYW5kcGFyZW50IHN0YXRlICd0b3AnJ3MgdGVtcGxhdGUsIGFuZCBuYW1lZCBgdWktdmlldz1cImJvZHlcIiBmcm9tIHBhcmVudCBzdGF0ZSdzIHRlbXBsYXRlLlxuICAgKiA8cHJlPnZpZXdzOiB7XG4gICAqICAgICAnaGVhZGVyQHRvcCc6IHtcbiAgICogICAgICAgY29udHJvbGxlcjogXCJtc2dIZWFkZXJDdHJsXCIsXG4gICAqICAgICAgIHRlbXBsYXRlVXJsOiBcIm1zZ0hlYWRlci5odG1sXCJcbiAgICogICAgIH0sICdib2R5Jzoge1xuICAgKiAgICAgICBjb250cm9sbGVyOiBcIm1lc3NhZ2VzQ3RybFwiLFxuICAgKiAgICAgICB0ZW1wbGF0ZVVybDogXCJtZXNzYWdlcy5odG1sXCJcbiAgICogICAgIH1cbiAgICogICB9PC9wcmU+XG4gICAqXG4gICAqIEBwYXJhbSB7Ym9vbGVhbj19IFtzdGF0ZUNvbmZpZy5hYnN0cmFjdD1mYWxzZV1cbiAgICogPGEgaWQ9J2Fic3RyYWN0Jz48L2E+XG4gICAqIEFuIGFic3RyYWN0IHN0YXRlIHdpbGwgbmV2ZXIgYmUgZGlyZWN0bHkgYWN0aXZhdGVkLFxuICAgKiAgIGJ1dCBjYW4gcHJvdmlkZSBpbmhlcml0ZWQgcHJvcGVydGllcyB0byBpdHMgY29tbW9uIGNoaWxkcmVuIHN0YXRlcy5cbiAgICogPHByZT5hYnN0cmFjdDogdHJ1ZTwvcHJlPlxuICAgKlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9uPX0gc3RhdGVDb25maWcub25FbnRlclxuICAgKiA8YSBpZD0nb25FbnRlcic+PC9hPlxuICAgKlxuICAgKiBDYWxsYmFjayBmdW5jdGlvbiBmb3Igd2hlbiBhIHN0YXRlIGlzIGVudGVyZWQuIEdvb2Qgd2F5XG4gICAqICAgdG8gdHJpZ2dlciBhbiBhY3Rpb24gb3IgZGlzcGF0Y2ggYW4gZXZlbnQsIHN1Y2ggYXMgb3BlbmluZyBhIGRpYWxvZy5cbiAgICogSWYgbWluaWZ5aW5nIHlvdXIgc2NyaXB0cywgbWFrZSBzdXJlIHRvIGV4cGxpY3RseSBhbm5vdGF0ZSB0aGlzIGZ1bmN0aW9uLFxuICAgKiBiZWNhdXNlIGl0IHdvbid0IGJlIGF1dG9tYXRpY2FsbHkgYW5ub3RhdGVkIGJ5IHlvdXIgYnVpbGQgdG9vbHMuXG4gICAqXG4gICAqIDxwcmU+b25FbnRlcjogZnVuY3Rpb24oTXlTZXJ2aWNlLCAkc3RhdGVQYXJhbXMpIHtcbiAgICogICAgIE15U2VydmljZS5mb28oJHN0YXRlUGFyYW1zLm15UGFyYW0pO1xuICAgKiB9PC9wcmU+XG4gICAqXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb249fSBzdGF0ZUNvbmZpZy5vbkV4aXRcbiAgICogPGEgaWQ9J29uRXhpdCc+PC9hPlxuICAgKlxuICAgKiBDYWxsYmFjayBmdW5jdGlvbiBmb3Igd2hlbiBhIHN0YXRlIGlzIGV4aXRlZC4gR29vZCB3YXkgdG9cbiAgICogICB0cmlnZ2VyIGFuIGFjdGlvbiBvciBkaXNwYXRjaCBhbiBldmVudCwgc3VjaCBhcyBvcGVuaW5nIGEgZGlhbG9nLlxuICAgKiBJZiBtaW5pZnlpbmcgeW91ciBzY3JpcHRzLCBtYWtlIHN1cmUgdG8gZXhwbGljdGx5IGFubm90YXRlIHRoaXMgZnVuY3Rpb24sXG4gICAqIGJlY2F1c2UgaXQgd29uJ3QgYmUgYXV0b21hdGljYWxseSBhbm5vdGF0ZWQgYnkgeW91ciBidWlsZCB0b29scy5cbiAgICpcbiAgICogPHByZT5vbkV4aXQ6IGZ1bmN0aW9uKE15U2VydmljZSwgJHN0YXRlUGFyYW1zKSB7XG4gICAqICAgICBNeVNlcnZpY2UuY2xlYW51cCgkc3RhdGVQYXJhbXMubXlQYXJhbSk7XG4gICAqIH08L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFuPX0gW3N0YXRlQ29uZmlnLnJlbG9hZE9uU2VhcmNoPXRydWVdXG4gICAqIDxhIGlkPSdyZWxvYWRPblNlYXJjaCc+PC9hPlxuICAgKlxuICAgKiBJZiBgZmFsc2VgLCB3aWxsIG5vdCByZXRyaWdnZXIgdGhlIHNhbWUgc3RhdGVcbiAgICogICBqdXN0IGJlY2F1c2UgYSBzZWFyY2gvcXVlcnkgcGFyYW1ldGVyIGhhcyBjaGFuZ2VkICh2aWEgJGxvY2F0aW9uLnNlYXJjaCgpIG9yICRsb2NhdGlvbi5oYXNoKCkpLiBcbiAgICogICBVc2VmdWwgZm9yIHdoZW4geW91J2QgbGlrZSB0byBtb2RpZnkgJGxvY2F0aW9uLnNlYXJjaCgpIHdpdGhvdXQgdHJpZ2dlcmluZyBhIHJlbG9hZC5cbiAgICogPHByZT5yZWxvYWRPblNlYXJjaDogZmFsc2U8L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3Q9fSBzdGF0ZUNvbmZpZy5kYXRhXG4gICAqIDxhIGlkPSdkYXRhJz48L2E+XG4gICAqXG4gICAqIEFyYml0cmFyeSBkYXRhIG9iamVjdCwgdXNlZnVsIGZvciBjdXN0b20gY29uZmlndXJhdGlvbi4gIFRoZSBwYXJlbnQgc3RhdGUncyBgZGF0YWAgaXNcbiAgICogICBwcm90b3R5cGFsbHkgaW5oZXJpdGVkLiAgSW4gb3RoZXIgd29yZHMsIGFkZGluZyBhIGRhdGEgcHJvcGVydHkgdG8gYSBzdGF0ZSBhZGRzIGl0IHRvXG4gICAqICAgdGhlIGVudGlyZSBzdWJ0cmVlIHZpYSBwcm90b3R5cGFsIGluaGVyaXRhbmNlLlxuICAgKlxuICAgKiA8cHJlPmRhdGE6IHtcbiAgICogICAgIHJlcXVpcmVkUm9sZTogJ2ZvbydcbiAgICogfSA8L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3Q9fSBzdGF0ZUNvbmZpZy5wYXJhbXNcbiAgICogPGEgaWQ9J3BhcmFtcyc+PC9hPlxuICAgKlxuICAgKiBBIG1hcCB3aGljaCBvcHRpb25hbGx5IGNvbmZpZ3VyZXMgcGFyYW1ldGVycyBkZWNsYXJlZCBpbiB0aGUgYHVybGAsIG9yXG4gICAqICAgZGVmaW5lcyBhZGRpdGlvbmFsIG5vbi11cmwgcGFyYW1ldGVycy4gIEZvciBlYWNoIHBhcmFtZXRlciBiZWluZ1xuICAgKiAgIGNvbmZpZ3VyZWQsIGFkZCBhIGNvbmZpZ3VyYXRpb24gb2JqZWN0IGtleWVkIHRvIHRoZSBuYW1lIG9mIHRoZSBwYXJhbWV0ZXIuXG4gICAqXG4gICAqICAgRWFjaCBwYXJhbWV0ZXIgY29uZmlndXJhdGlvbiBvYmplY3QgbWF5IGNvbnRhaW4gdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICAgKlxuICAgKiAgIC0gKiogdmFsdWUgKiogLSB7b2JqZWN0fGZ1bmN0aW9uPX06IHNwZWNpZmllcyB0aGUgZGVmYXVsdCB2YWx1ZSBmb3IgdGhpc1xuICAgKiAgICAgcGFyYW1ldGVyLiAgVGhpcyBpbXBsaWNpdGx5IHNldHMgdGhpcyBwYXJhbWV0ZXIgYXMgb3B0aW9uYWwuXG4gICAqXG4gICAqICAgICBXaGVuIFVJLVJvdXRlciByb3V0ZXMgdG8gYSBzdGF0ZSBhbmQgbm8gdmFsdWUgaXNcbiAgICogICAgIHNwZWNpZmllZCBmb3IgdGhpcyBwYXJhbWV0ZXIgaW4gdGhlIFVSTCBvciB0cmFuc2l0aW9uLCB0aGVcbiAgICogICAgIGRlZmF1bHQgdmFsdWUgd2lsbCBiZSB1c2VkIGluc3RlYWQuICBJZiBgdmFsdWVgIGlzIGEgZnVuY3Rpb24sXG4gICAqICAgICBpdCB3aWxsIGJlIGluamVjdGVkIGFuZCBpbnZva2VkLCBhbmQgdGhlIHJldHVybiB2YWx1ZSB1c2VkLlxuICAgKlxuICAgKiAgICAgKk5vdGUqOiBgdW5kZWZpbmVkYCBpcyB0cmVhdGVkIGFzIFwibm8gZGVmYXVsdCB2YWx1ZVwiIHdoaWxlIGBudWxsYFxuICAgKiAgICAgaXMgdHJlYXRlZCBhcyBcInRoZSBkZWZhdWx0IHZhbHVlIGlzIGBudWxsYFwiLlxuICAgKlxuICAgKiAgICAgKlNob3J0aGFuZCo6IElmIHlvdSBvbmx5IG5lZWQgdG8gY29uZmlndXJlIHRoZSBkZWZhdWx0IHZhbHVlIG9mIHRoZVxuICAgKiAgICAgcGFyYW1ldGVyLCB5b3UgbWF5IHVzZSBhIHNob3J0aGFuZCBzeW50YXguICAgSW4gdGhlICoqYHBhcmFtc2AqKlxuICAgKiAgICAgbWFwLCBpbnN0ZWFkIG1hcHBpbmcgdGhlIHBhcmFtIG5hbWUgdG8gYSBmdWxsIHBhcmFtZXRlciBjb25maWd1cmF0aW9uXG4gICAqICAgICBvYmplY3QsIHNpbXBseSBzZXQgbWFwIGl0IHRvIHRoZSBkZWZhdWx0IHBhcmFtZXRlciB2YWx1ZSwgZS5nLjpcbiAgICpcbiAgICogPHByZT4vLyBkZWZpbmUgYSBwYXJhbWV0ZXIncyBkZWZhdWx0IHZhbHVlXG4gICAqIHBhcmFtczoge1xuICAgKiAgICAgcGFyYW0xOiB7IHZhbHVlOiBcImRlZmF1bHRWYWx1ZVwiIH1cbiAgICogfVxuICAgKiAvLyBzaG9ydGhhbmQgZGVmYXVsdCB2YWx1ZXNcbiAgICogcGFyYW1zOiB7XG4gICAqICAgICBwYXJhbTE6IFwiZGVmYXVsdFZhbHVlXCIsXG4gICAqICAgICBwYXJhbTI6IFwicGFyYW0yRGVmYXVsdFwiXG4gICAqIH08L3ByZT5cbiAgICpcbiAgICogICAtICoqIGFycmF5ICoqIC0ge2Jvb2xlYW49fTogKihkZWZhdWx0OiBmYWxzZSkqIElmIHRydWUsIHRoZSBwYXJhbSB2YWx1ZSB3aWxsIGJlXG4gICAqICAgICB0cmVhdGVkIGFzIGFuIGFycmF5IG9mIHZhbHVlcy4gIElmIHlvdSBzcGVjaWZpZWQgYSBUeXBlLCB0aGUgdmFsdWUgd2lsbCBiZVxuICAgKiAgICAgdHJlYXRlZCBhcyBhbiBhcnJheSBvZiB0aGUgc3BlY2lmaWVkIFR5cGUuICBOb3RlOiBxdWVyeSBwYXJhbWV0ZXIgdmFsdWVzXG4gICAqICAgICBkZWZhdWx0IHRvIGEgc3BlY2lhbCBgXCJhdXRvXCJgIG1vZGUuXG4gICAqXG4gICAqICAgICBGb3IgcXVlcnkgcGFyYW1ldGVycyBpbiBgXCJhdXRvXCJgIG1vZGUsIGlmIG11bHRpcGxlICB2YWx1ZXMgZm9yIGEgc2luZ2xlIHBhcmFtZXRlclxuICAgKiAgICAgYXJlIHByZXNlbnQgaW4gdGhlIFVSTCAoZS5nLjogYC9mb28/YmFyPTEmYmFyPTImYmFyPTNgKSB0aGVuIHRoZSB2YWx1ZXNcbiAgICogICAgIGFyZSBtYXBwZWQgdG8gYW4gYXJyYXkgKGUuZy46IGB7IGZvbzogWyAnMScsICcyJywgJzMnIF0gfWApLiAgSG93ZXZlciwgaWZcbiAgICogICAgIG9ubHkgb25lIHZhbHVlIGlzIHByZXNlbnQgKGUuZy46IGAvZm9vP2Jhcj0xYCkgdGhlbiB0aGUgdmFsdWUgaXMgdHJlYXRlZCBhcyBzaW5nbGVcbiAgICogICAgIHZhbHVlIChlLmcuOiBgeyBmb286ICcxJyB9YCkuXG4gICAqXG4gICAqIDxwcmU+cGFyYW1zOiB7XG4gICAqICAgICBwYXJhbTE6IHsgYXJyYXk6IHRydWUgfVxuICAgKiB9PC9wcmU+XG4gICAqXG4gICAqICAgLSAqKiBzcXVhc2ggKiogLSB7Ym9vbHxzdHJpbmc9fTogYHNxdWFzaGAgY29uZmlndXJlcyBob3cgYSBkZWZhdWx0IHBhcmFtZXRlciB2YWx1ZSBpcyByZXByZXNlbnRlZCBpbiB0aGUgVVJMIHdoZW5cbiAgICogICAgIHRoZSBjdXJyZW50IHBhcmFtZXRlciB2YWx1ZSBpcyB0aGUgc2FtZSBhcyB0aGUgZGVmYXVsdCB2YWx1ZS4gSWYgYHNxdWFzaGAgaXMgbm90IHNldCwgaXQgdXNlcyB0aGVcbiAgICogICAgIGNvbmZpZ3VyZWQgZGVmYXVsdCBzcXVhc2ggcG9saWN5LlxuICAgKiAgICAgKFNlZSB7QGxpbmsgdWkucm91dGVyLnV0aWwuJHVybE1hdGNoZXJGYWN0b3J5I21ldGhvZHNfZGVmYXVsdFNxdWFzaFBvbGljeSBgZGVmYXVsdFNxdWFzaFBvbGljeSgpYH0pXG4gICAqXG4gICAqICAgVGhlcmUgYXJlIHRocmVlIHNxdWFzaCBzZXR0aW5nczpcbiAgICpcbiAgICogICAgIC0gZmFsc2U6IFRoZSBwYXJhbWV0ZXIncyBkZWZhdWx0IHZhbHVlIGlzIG5vdCBzcXVhc2hlZC4gIEl0IGlzIGVuY29kZWQgYW5kIGluY2x1ZGVkIGluIHRoZSBVUkxcbiAgICogICAgIC0gdHJ1ZTogVGhlIHBhcmFtZXRlcidzIGRlZmF1bHQgdmFsdWUgaXMgb21pdHRlZCBmcm9tIHRoZSBVUkwuICBJZiB0aGUgcGFyYW1ldGVyIGlzIHByZWNlZWRlZCBhbmQgZm9sbG93ZWRcbiAgICogICAgICAgYnkgc2xhc2hlcyBpbiB0aGUgc3RhdGUncyBgdXJsYCBkZWNsYXJhdGlvbiwgdGhlbiBvbmUgb2YgdGhvc2Ugc2xhc2hlcyBhcmUgb21pdHRlZC5cbiAgICogICAgICAgVGhpcyBjYW4gYWxsb3cgZm9yIGNsZWFuZXIgbG9va2luZyBVUkxzLlxuICAgKiAgICAgLSBgXCI8YXJiaXRyYXJ5IHN0cmluZz5cImA6IFRoZSBwYXJhbWV0ZXIncyBkZWZhdWx0IHZhbHVlIGlzIHJlcGxhY2VkIHdpdGggYW4gYXJiaXRyYXJ5IHBsYWNlaG9sZGVyIG9mICB5b3VyIGNob2ljZS5cbiAgICpcbiAgICogPHByZT5wYXJhbXM6IHtcbiAgICogICAgIHBhcmFtMToge1xuICAgKiAgICAgICB2YWx1ZTogXCJkZWZhdWx0SWRcIixcbiAgICogICAgICAgc3F1YXNoOiB0cnVlXG4gICAqIH0gfVxuICAgKiAvLyBzcXVhc2ggXCJkZWZhdWx0VmFsdWVcIiB0byBcIn5cIlxuICAgKiBwYXJhbXM6IHtcbiAgICogICAgIHBhcmFtMToge1xuICAgKiAgICAgICB2YWx1ZTogXCJkZWZhdWx0VmFsdWVcIixcbiAgICogICAgICAgc3F1YXNoOiBcIn5cIlxuICAgKiB9IH1cbiAgICogPC9wcmU+XG4gICAqXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIDxwcmU+XG4gICAqIC8vIFNvbWUgc3RhdGUgbmFtZSBleGFtcGxlc1xuICAgKlxuICAgKiAvLyBzdGF0ZU5hbWUgY2FuIGJlIGEgc2luZ2xlIHRvcC1sZXZlbCBuYW1lIChtdXN0IGJlIHVuaXF1ZSkuXG4gICAqICRzdGF0ZVByb3ZpZGVyLnN0YXRlKFwiaG9tZVwiLCB7fSk7XG4gICAqXG4gICAqIC8vIE9yIGl0IGNhbiBiZSBhIG5lc3RlZCBzdGF0ZSBuYW1lLiBUaGlzIHN0YXRlIGlzIGEgY2hpbGQgb2YgdGhlXG4gICAqIC8vIGFib3ZlIFwiaG9tZVwiIHN0YXRlLlxuICAgKiAkc3RhdGVQcm92aWRlci5zdGF0ZShcImhvbWUubmV3ZXN0XCIsIHt9KTtcbiAgICpcbiAgICogLy8gTmVzdCBzdGF0ZXMgYXMgZGVlcGx5IGFzIG5lZWRlZC5cbiAgICogJHN0YXRlUHJvdmlkZXIuc3RhdGUoXCJob21lLm5ld2VzdC5hYmMueHl6LmluY2VwdGlvblwiLCB7fSk7XG4gICAqXG4gICAqIC8vIHN0YXRlKCkgcmV0dXJucyAkc3RhdGVQcm92aWRlciwgc28geW91IGNhbiBjaGFpbiBzdGF0ZSBkZWNsYXJhdGlvbnMuXG4gICAqICRzdGF0ZVByb3ZpZGVyXG4gICAqICAgLnN0YXRlKFwiaG9tZVwiLCB7fSlcbiAgICogICAuc3RhdGUoXCJhYm91dFwiLCB7fSlcbiAgICogICAuc3RhdGUoXCJjb250YWN0c1wiLCB7fSk7XG4gICAqIDwvcHJlPlxuICAgKlxuICAgKi9cbiAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xuICBmdW5jdGlvbiBzdGF0ZShuYW1lLCBkZWZpbml0aW9uKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgaWYgKGlzT2JqZWN0KG5hbWUpKSBkZWZpbml0aW9uID0gbmFtZTtcbiAgICBlbHNlIGRlZmluaXRpb24ubmFtZSA9IG5hbWU7XG4gICAgcmVnaXN0ZXJTdGF0ZShkZWZpbml0aW9uKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmdkb2Mgb2JqZWN0XG4gICAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVcbiAgICpcbiAgICogQHJlcXVpcmVzICRyb290U2NvcGVcbiAgICogQHJlcXVpcmVzICRxXG4gICAqIEByZXF1aXJlcyB1aS5yb3V0ZXIuc3RhdGUuJHZpZXdcbiAgICogQHJlcXVpcmVzICRpbmplY3RvclxuICAgKiBAcmVxdWlyZXMgdWkucm91dGVyLnV0aWwuJHJlc29sdmVcbiAgICogQHJlcXVpcmVzIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVQYXJhbXNcbiAgICogQHJlcXVpcmVzIHVpLnJvdXRlci5yb3V0ZXIuJHVybFJvdXRlclxuICAgKlxuICAgKiBAcHJvcGVydHkge29iamVjdH0gcGFyYW1zIEEgcGFyYW0gb2JqZWN0LCBlLmcuIHtzZWN0aW9uSWQ6IHNlY3Rpb24uaWQpfSwgdGhhdCBcbiAgICogeW91J2QgbGlrZSB0byB0ZXN0IGFnYWluc3QgdGhlIGN1cnJlbnQgYWN0aXZlIHN0YXRlLlxuICAgKiBAcHJvcGVydHkge29iamVjdH0gY3VycmVudCBBIHJlZmVyZW5jZSB0byB0aGUgc3RhdGUncyBjb25maWcgb2JqZWN0LiBIb3dldmVyIFxuICAgKiB5b3UgcGFzc2VkIGl0IGluLiBVc2VmdWwgZm9yIGFjY2Vzc2luZyBjdXN0b20gZGF0YS5cbiAgICogQHByb3BlcnR5IHtvYmplY3R9IHRyYW5zaXRpb24gQ3VycmVudGx5IHBlbmRpbmcgdHJhbnNpdGlvbi4gQSBwcm9taXNlIHRoYXQnbGwgXG4gICAqIHJlc29sdmUgb3IgcmVqZWN0LlxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogYCRzdGF0ZWAgc2VydmljZSBpcyByZXNwb25zaWJsZSBmb3IgcmVwcmVzZW50aW5nIHN0YXRlcyBhcyB3ZWxsIGFzIHRyYW5zaXRpb25pbmdcbiAgICogYmV0d2VlbiB0aGVtLiBJdCBhbHNvIHByb3ZpZGVzIGludGVyZmFjZXMgdG8gYXNrIGZvciBjdXJyZW50IHN0YXRlIG9yIGV2ZW4gc3RhdGVzXG4gICAqIHlvdSdyZSBjb21pbmcgZnJvbS5cbiAgICovXG4gIHRoaXMuJGdldCA9ICRnZXQ7XG4gICRnZXQuJGluamVjdCA9IFsnJHJvb3RTY29wZScsICckcScsICckdmlldycsICckaW5qZWN0b3InLCAnJHJlc29sdmUnLCAnJHN0YXRlUGFyYW1zJywgJyR1cmxSb3V0ZXInLCAnJGxvY2F0aW9uJywgJyR1cmxNYXRjaGVyRmFjdG9yeSddO1xuICBmdW5jdGlvbiAkZ2V0KCAgICRyb290U2NvcGUsICAgJHEsICAgJHZpZXcsICAgJGluamVjdG9yLCAgICRyZXNvbHZlLCAgICRzdGF0ZVBhcmFtcywgICAkdXJsUm91dGVyLCAgICRsb2NhdGlvbiwgICAkdXJsTWF0Y2hlckZhY3RvcnkpIHtcblxuICAgIHZhciBUcmFuc2l0aW9uU3VwZXJzZWRlZCA9ICRxLnJlamVjdChuZXcgRXJyb3IoJ3RyYW5zaXRpb24gc3VwZXJzZWRlZCcpKTtcbiAgICB2YXIgVHJhbnNpdGlvblByZXZlbnRlZCA9ICRxLnJlamVjdChuZXcgRXJyb3IoJ3RyYW5zaXRpb24gcHJldmVudGVkJykpO1xuICAgIHZhciBUcmFuc2l0aW9uQWJvcnRlZCA9ICRxLnJlamVjdChuZXcgRXJyb3IoJ3RyYW5zaXRpb24gYWJvcnRlZCcpKTtcbiAgICB2YXIgVHJhbnNpdGlvbkZhaWxlZCA9ICRxLnJlamVjdChuZXcgRXJyb3IoJ3RyYW5zaXRpb24gZmFpbGVkJykpO1xuXG4gICAgLy8gSGFuZGxlcyB0aGUgY2FzZSB3aGVyZSBhIHN0YXRlIHdoaWNoIGlzIHRoZSB0YXJnZXQgb2YgYSB0cmFuc2l0aW9uIGlzIG5vdCBmb3VuZCwgYW5kIHRoZSB1c2VyXG4gICAgLy8gY2FuIG9wdGlvbmFsbHkgcmV0cnkgb3IgZGVmZXIgdGhlIHRyYW5zaXRpb25cbiAgICBmdW5jdGlvbiBoYW5kbGVSZWRpcmVjdChyZWRpcmVjdCwgc3RhdGUsIHBhcmFtcywgb3B0aW9ucykge1xuICAgICAgLyoqXG4gICAgICAgKiBAbmdkb2MgZXZlbnRcbiAgICAgICAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGUjJHN0YXRlTm90Rm91bmRcbiAgICAgICAqIEBldmVudE9mIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVcbiAgICAgICAqIEBldmVudFR5cGUgYnJvYWRjYXN0IG9uIHJvb3Qgc2NvcGVcbiAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICogRmlyZWQgd2hlbiBhIHJlcXVlc3RlZCBzdGF0ZSAqKmNhbm5vdCBiZSBmb3VuZCoqIHVzaW5nIHRoZSBwcm92aWRlZCBzdGF0ZSBuYW1lIGR1cmluZyB0cmFuc2l0aW9uLlxuICAgICAgICogVGhlIGV2ZW50IGlzIGJyb2FkY2FzdCBhbGxvd2luZyBhbnkgaGFuZGxlcnMgYSBzaW5nbGUgY2hhbmNlIHRvIGRlYWwgd2l0aCB0aGUgZXJyb3IgKHVzdWFsbHkgYnlcbiAgICAgICAqIGxhenktbG9hZGluZyB0aGUgdW5mb3VuZCBzdGF0ZSkuIEEgc3BlY2lhbCBgdW5mb3VuZFN0YXRlYCBvYmplY3QgaXMgcGFzc2VkIHRvIHRoZSBsaXN0ZW5lciBoYW5kbGVyLFxuICAgICAgICogeW91IGNhbiBzZWUgaXRzIHRocmVlIHByb3BlcnRpZXMgaW4gdGhlIGV4YW1wbGUuIFlvdSBjYW4gdXNlIGBldmVudC5wcmV2ZW50RGVmYXVsdCgpYCB0byBhYm9ydCB0aGVcbiAgICAgICAqIHRyYW5zaXRpb24gYW5kIHRoZSBwcm9taXNlIHJldHVybmVkIGZyb20gYGdvYCB3aWxsIGJlIHJlamVjdGVkIHdpdGggYSBgJ3RyYW5zaXRpb24gYWJvcnRlZCdgIHZhbHVlLlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBldmVudCBFdmVudCBvYmplY3QuXG4gICAgICAgKiBAcGFyYW0ge09iamVjdH0gdW5mb3VuZFN0YXRlIFVuZm91bmQgU3RhdGUgaW5mb3JtYXRpb24uIENvbnRhaW5zOiBgdG8sIHRvUGFyYW1zLCBvcHRpb25zYCBwcm9wZXJ0aWVzLlxuICAgICAgICogQHBhcmFtIHtTdGF0ZX0gZnJvbVN0YXRlIEN1cnJlbnQgc3RhdGUgb2JqZWN0LlxuICAgICAgICogQHBhcmFtIHtPYmplY3R9IGZyb21QYXJhbXMgQ3VycmVudCBzdGF0ZSBwYXJhbXMuXG4gICAgICAgKlxuICAgICAgICogQGV4YW1wbGVcbiAgICAgICAqXG4gICAgICAgKiA8cHJlPlxuICAgICAgICogLy8gc29tZXdoZXJlLCBhc3N1bWUgbGF6eS5zdGF0ZSBoYXMgbm90IGJlZW4gZGVmaW5lZFxuICAgICAgICogJHN0YXRlLmdvKFwibGF6eS5zdGF0ZVwiLCB7YToxLCBiOjJ9LCB7aW5oZXJpdDpmYWxzZX0pO1xuICAgICAgICpcbiAgICAgICAqIC8vIHNvbWV3aGVyZSBlbHNlXG4gICAgICAgKiAkc2NvcGUuJG9uKCckc3RhdGVOb3RGb3VuZCcsXG4gICAgICAgKiBmdW5jdGlvbihldmVudCwgdW5mb3VuZFN0YXRlLCBmcm9tU3RhdGUsIGZyb21QYXJhbXMpe1xuICAgICAgICogICAgIGNvbnNvbGUubG9nKHVuZm91bmRTdGF0ZS50byk7IC8vIFwibGF6eS5zdGF0ZVwiXG4gICAgICAgKiAgICAgY29uc29sZS5sb2codW5mb3VuZFN0YXRlLnRvUGFyYW1zKTsgLy8ge2E6MSwgYjoyfVxuICAgICAgICogICAgIGNvbnNvbGUubG9nKHVuZm91bmRTdGF0ZS5vcHRpb25zKTsgLy8ge2luaGVyaXQ6ZmFsc2V9ICsgZGVmYXVsdCBvcHRpb25zXG4gICAgICAgKiB9KVxuICAgICAgICogPC9wcmU+XG4gICAgICAgKi9cbiAgICAgIHZhciBldnQgPSAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJyRzdGF0ZU5vdEZvdW5kJywgcmVkaXJlY3QsIHN0YXRlLCBwYXJhbXMpO1xuXG4gICAgICBpZiAoZXZ0LmRlZmF1bHRQcmV2ZW50ZWQpIHtcbiAgICAgICAgJHVybFJvdXRlci51cGRhdGUoKTtcbiAgICAgICAgcmV0dXJuIFRyYW5zaXRpb25BYm9ydGVkO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWV2dC5yZXRyeSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgLy8gQWxsb3cgdGhlIGhhbmRsZXIgdG8gcmV0dXJuIGEgcHJvbWlzZSB0byBkZWZlciBzdGF0ZSBsb29rdXAgcmV0cnlcbiAgICAgIGlmIChvcHRpb25zLiRyZXRyeSkge1xuICAgICAgICAkdXJsUm91dGVyLnVwZGF0ZSgpO1xuICAgICAgICByZXR1cm4gVHJhbnNpdGlvbkZhaWxlZDtcbiAgICAgIH1cbiAgICAgIHZhciByZXRyeVRyYW5zaXRpb24gPSAkc3RhdGUudHJhbnNpdGlvbiA9ICRxLndoZW4oZXZ0LnJldHJ5KTtcblxuICAgICAgcmV0cnlUcmFuc2l0aW9uLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChyZXRyeVRyYW5zaXRpb24gIT09ICRzdGF0ZS50cmFuc2l0aW9uKSByZXR1cm4gVHJhbnNpdGlvblN1cGVyc2VkZWQ7XG4gICAgICAgIHJlZGlyZWN0Lm9wdGlvbnMuJHJldHJ5ID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuICRzdGF0ZS50cmFuc2l0aW9uVG8ocmVkaXJlY3QudG8sIHJlZGlyZWN0LnRvUGFyYW1zLCByZWRpcmVjdC5vcHRpb25zKTtcbiAgICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gVHJhbnNpdGlvbkFib3J0ZWQ7XG4gICAgICB9KTtcbiAgICAgICR1cmxSb3V0ZXIudXBkYXRlKCk7XG5cbiAgICAgIHJldHVybiByZXRyeVRyYW5zaXRpb247XG4gICAgfVxuXG4gICAgcm9vdC5sb2NhbHMgPSB7IHJlc29sdmU6IG51bGwsIGdsb2JhbHM6IHsgJHN0YXRlUGFyYW1zOiB7fSB9IH07XG5cbiAgICAkc3RhdGUgPSB7XG4gICAgICBwYXJhbXM6IHt9LFxuICAgICAgY3VycmVudDogcm9vdC5zZWxmLFxuICAgICAgJGN1cnJlbnQ6IHJvb3QsXG4gICAgICB0cmFuc2l0aW9uOiBudWxsXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGUjcmVsb2FkXG4gICAgICogQG1ldGhvZE9mIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVcbiAgICAgKlxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIEEgbWV0aG9kIHRoYXQgZm9yY2UgcmVsb2FkcyB0aGUgY3VycmVudCBzdGF0ZS4gQWxsIHJlc29sdmVzIGFyZSByZS1yZXNvbHZlZCwgZXZlbnRzIGFyZSBub3QgcmUtZmlyZWQsIFxuICAgICAqIGFuZCBjb250cm9sbGVycyByZWluc3RhbnRpYXRlZCAoYnVnIHdpdGggY29udHJvbGxlcnMgcmVpbnN0YW50aWF0aW5nIHJpZ2h0IG5vdywgZml4aW5nIHNvb24pLlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiA8cHJlPlxuICAgICAqIHZhciBhcHAgYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFsndWkucm91dGVyJ10pO1xuICAgICAqXG4gICAgICogYXBwLmNvbnRyb2xsZXIoJ2N0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCAkc3RhdGUpIHtcbiAgICAgKiAgICRzY29wZS5yZWxvYWQgPSBmdW5jdGlvbigpe1xuICAgICAqICAgICAkc3RhdGUucmVsb2FkKCk7XG4gICAgICogICB9XG4gICAgICogfSk7XG4gICAgICogPC9wcmU+XG4gICAgICpcbiAgICAgKiBgcmVsb2FkKClgIGlzIGp1c3QgYW4gYWxpYXMgZm9yOlxuICAgICAqIDxwcmU+XG4gICAgICogJHN0YXRlLnRyYW5zaXRpb25Ubygkc3RhdGUuY3VycmVudCwgJHN0YXRlUGFyYW1zLCB7IFxuICAgICAqICAgcmVsb2FkOiB0cnVlLCBpbmhlcml0OiBmYWxzZSwgbm90aWZ5OiB0cnVlXG4gICAgICogfSk7XG4gICAgICogPC9wcmU+XG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7cHJvbWlzZX0gQSBwcm9taXNlIHJlcHJlc2VudGluZyB0aGUgc3RhdGUgb2YgdGhlIG5ldyB0cmFuc2l0aW9uLiBTZWVcbiAgICAgKiB7QGxpbmsgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSNtZXRob2RzX2dvICRzdGF0ZS5nb30uXG4gICAgICovXG4gICAgJHN0YXRlLnJlbG9hZCA9IGZ1bmN0aW9uIHJlbG9hZCgpIHtcbiAgICAgIHJldHVybiAkc3RhdGUudHJhbnNpdGlvblRvKCRzdGF0ZS5jdXJyZW50LCAkc3RhdGVQYXJhbXMsIHsgcmVsb2FkOiB0cnVlLCBpbmhlcml0OiBmYWxzZSwgbm90aWZ5OiB0cnVlIH0pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlI2dvXG4gICAgICogQG1ldGhvZE9mIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVcbiAgICAgKlxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIENvbnZlbmllbmNlIG1ldGhvZCBmb3IgdHJhbnNpdGlvbmluZyB0byBhIG5ldyBzdGF0ZS4gYCRzdGF0ZS5nb2AgY2FsbHMgXG4gICAgICogYCRzdGF0ZS50cmFuc2l0aW9uVG9gIGludGVybmFsbHkgYnV0IGF1dG9tYXRpY2FsbHkgc2V0cyBvcHRpb25zIHRvIFxuICAgICAqIGB7IGxvY2F0aW9uOiB0cnVlLCBpbmhlcml0OiB0cnVlLCByZWxhdGl2ZTogJHN0YXRlLiRjdXJyZW50LCBub3RpZnk6IHRydWUgfWAuIFxuICAgICAqIFRoaXMgYWxsb3dzIHlvdSB0byBlYXNpbHkgdXNlIGFuIGFic29sdXRlIG9yIHJlbGF0aXZlIHRvIHBhdGggYW5kIHNwZWNpZnkgXG4gICAgICogb25seSB0aGUgcGFyYW1ldGVycyB5b3UnZCBsaWtlIHRvIHVwZGF0ZSAod2hpbGUgbGV0dGluZyB1bnNwZWNpZmllZCBwYXJhbWV0ZXJzIFxuICAgICAqIGluaGVyaXQgZnJvbSB0aGUgY3VycmVudGx5IGFjdGl2ZSBhbmNlc3RvciBzdGF0ZXMpLlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiA8cHJlPlxuICAgICAqIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnYXBwJywgWyd1aS5yb3V0ZXInXSk7XG4gICAgICpcbiAgICAgKiBhcHAuY29udHJvbGxlcignY3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsICRzdGF0ZSkge1xuICAgICAqICAgJHNjb3BlLmNoYW5nZVN0YXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAqICAgICAkc3RhdGUuZ28oJ2NvbnRhY3QuZGV0YWlsJyk7XG4gICAgICogICB9O1xuICAgICAqIH0pO1xuICAgICAqIDwvcHJlPlxuICAgICAqIDxpbWcgc3JjPScuLi9uZ2RvY19hc3NldHMvU3RhdGVHb0V4YW1wbGVzLnBuZycvPlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRvIEFic29sdXRlIHN0YXRlIG5hbWUgb3IgcmVsYXRpdmUgc3RhdGUgcGF0aC4gU29tZSBleGFtcGxlczpcbiAgICAgKlxuICAgICAqIC0gYCRzdGF0ZS5nbygnY29udGFjdC5kZXRhaWwnKWAgLSB3aWxsIGdvIHRvIHRoZSBgY29udGFjdC5kZXRhaWxgIHN0YXRlXG4gICAgICogLSBgJHN0YXRlLmdvKCdeJylgIC0gd2lsbCBnbyB0byBhIHBhcmVudCBzdGF0ZVxuICAgICAqIC0gYCRzdGF0ZS5nbygnXi5zaWJsaW5nJylgIC0gd2lsbCBnbyB0byBhIHNpYmxpbmcgc3RhdGVcbiAgICAgKiAtIGAkc3RhdGUuZ28oJy5jaGlsZC5ncmFuZGNoaWxkJylgIC0gd2lsbCBnbyB0byBncmFuZGNoaWxkIHN0YXRlXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdD19IHBhcmFtcyBBIG1hcCBvZiB0aGUgcGFyYW1ldGVycyB0aGF0IHdpbGwgYmUgc2VudCB0byB0aGUgc3RhdGUsIFxuICAgICAqIHdpbGwgcG9wdWxhdGUgJHN0YXRlUGFyYW1zLiBBbnkgcGFyYW1ldGVycyB0aGF0IGFyZSBub3Qgc3BlY2lmaWVkIHdpbGwgYmUgaW5oZXJpdGVkIGZyb20gY3VycmVudGx5IFxuICAgICAqIGRlZmluZWQgcGFyYW1ldGVycy4gVGhpcyBhbGxvd3MsIGZvciBleGFtcGxlLCBnb2luZyB0byBhIHNpYmxpbmcgc3RhdGUgdGhhdCBzaGFyZXMgcGFyYW1ldGVyc1xuICAgICAqIHNwZWNpZmllZCBpbiBhIHBhcmVudCBzdGF0ZS4gUGFyYW1ldGVyIGluaGVyaXRhbmNlIG9ubHkgd29ya3MgYmV0d2VlbiBjb21tb24gYW5jZXN0b3Igc3RhdGVzLCBJLmUuXG4gICAgICogdHJhbnNpdGlvbmluZyB0byBhIHNpYmxpbmcgd2lsbCBnZXQgeW91IHRoZSBwYXJhbWV0ZXJzIGZvciBhbGwgcGFyZW50cywgdHJhbnNpdGlvbmluZyB0byBhIGNoaWxkXG4gICAgICogd2lsbCBnZXQgeW91IGFsbCBjdXJyZW50IHBhcmFtZXRlcnMsIGV0Yy5cbiAgICAgKiBAcGFyYW0ge29iamVjdD19IG9wdGlvbnMgT3B0aW9ucyBvYmplY3QuIFRoZSBvcHRpb25zIGFyZTpcbiAgICAgKlxuICAgICAqIC0gKipgbG9jYXRpb25gKiogLSB7Ym9vbGVhbj10cnVlfHN0cmluZz19IC0gSWYgYHRydWVgIHdpbGwgdXBkYXRlIHRoZSB1cmwgaW4gdGhlIGxvY2F0aW9uIGJhciwgaWYgYGZhbHNlYFxuICAgICAqICAgIHdpbGwgbm90LiBJZiBzdHJpbmcsIG11c3QgYmUgYFwicmVwbGFjZVwiYCwgd2hpY2ggd2lsbCB1cGRhdGUgdXJsIGFuZCBhbHNvIHJlcGxhY2UgbGFzdCBoaXN0b3J5IHJlY29yZC5cbiAgICAgKiAtICoqYGluaGVyaXRgKiogLSB7Ym9vbGVhbj10cnVlfSwgSWYgYHRydWVgIHdpbGwgaW5oZXJpdCB1cmwgcGFyYW1ldGVycyBmcm9tIGN1cnJlbnQgdXJsLlxuICAgICAqIC0gKipgcmVsYXRpdmVgKiogLSB7b2JqZWN0PSRzdGF0ZS4kY3VycmVudH0sIFdoZW4gdHJhbnNpdGlvbmluZyB3aXRoIHJlbGF0aXZlIHBhdGggKGUuZyAnXicpLCBcbiAgICAgKiAgICBkZWZpbmVzIHdoaWNoIHN0YXRlIHRvIGJlIHJlbGF0aXZlIGZyb20uXG4gICAgICogLSAqKmBub3RpZnlgKiogLSB7Ym9vbGVhbj10cnVlfSwgSWYgYHRydWVgIHdpbGwgYnJvYWRjYXN0ICRzdGF0ZUNoYW5nZVN0YXJ0IGFuZCAkc3RhdGVDaGFuZ2VTdWNjZXNzIGV2ZW50cy5cbiAgICAgKiAtICoqYHJlbG9hZGAqKiAodjAuMi41KSAtIHtib29sZWFuPWZhbHNlfSwgSWYgYHRydWVgIHdpbGwgZm9yY2UgdHJhbnNpdGlvbiBldmVuIGlmIHRoZSBzdGF0ZSBvciBwYXJhbXMgXG4gICAgICogICAgaGF2ZSBub3QgY2hhbmdlZCwgYWthIGEgcmVsb2FkIG9mIHRoZSBzYW1lIHN0YXRlLiBJdCBkaWZmZXJzIGZyb20gcmVsb2FkT25TZWFyY2ggYmVjYXVzZSB5b3UnZFxuICAgICAqICAgIHVzZSB0aGlzIHdoZW4geW91IHdhbnQgdG8gZm9yY2UgYSByZWxvYWQgd2hlbiAqZXZlcnl0aGluZyogaXMgdGhlIHNhbWUsIGluY2x1ZGluZyBzZWFyY2ggcGFyYW1zLlxuICAgICAqXG4gICAgICogQHJldHVybnMge3Byb21pc2V9IEEgcHJvbWlzZSByZXByZXNlbnRpbmcgdGhlIHN0YXRlIG9mIHRoZSBuZXcgdHJhbnNpdGlvbi5cbiAgICAgKlxuICAgICAqIFBvc3NpYmxlIHN1Y2Nlc3MgdmFsdWVzOlxuICAgICAqXG4gICAgICogLSAkc3RhdGUuY3VycmVudFxuICAgICAqXG4gICAgICogPGJyLz5Qb3NzaWJsZSByZWplY3Rpb24gdmFsdWVzOlxuICAgICAqXG4gICAgICogLSAndHJhbnNpdGlvbiBzdXBlcnNlZGVkJyAtIHdoZW4gYSBuZXdlciB0cmFuc2l0aW9uIGhhcyBiZWVuIHN0YXJ0ZWQgYWZ0ZXIgdGhpcyBvbmVcbiAgICAgKiAtICd0cmFuc2l0aW9uIHByZXZlbnRlZCcgLSB3aGVuIGBldmVudC5wcmV2ZW50RGVmYXVsdCgpYCBoYXMgYmVlbiBjYWxsZWQgaW4gYSBgJHN0YXRlQ2hhbmdlU3RhcnRgIGxpc3RlbmVyXG4gICAgICogLSAndHJhbnNpdGlvbiBhYm9ydGVkJyAtIHdoZW4gYGV2ZW50LnByZXZlbnREZWZhdWx0KClgIGhhcyBiZWVuIGNhbGxlZCBpbiBhIGAkc3RhdGVOb3RGb3VuZGAgbGlzdGVuZXIgb3JcbiAgICAgKiAgIHdoZW4gYSBgJHN0YXRlTm90Rm91bmRgIGBldmVudC5yZXRyeWAgcHJvbWlzZSBlcnJvcnMuXG4gICAgICogLSAndHJhbnNpdGlvbiBmYWlsZWQnIC0gd2hlbiBhIHN0YXRlIGhhcyBiZWVuIHVuc3VjY2Vzc2Z1bGx5IGZvdW5kIGFmdGVyIDIgdHJpZXMuXG4gICAgICogLSAqcmVzb2x2ZSBlcnJvciogLSB3aGVuIGFuIGVycm9yIGhhcyBvY2N1cnJlZCB3aXRoIGEgYHJlc29sdmVgXG4gICAgICpcbiAgICAgKi9cbiAgICAkc3RhdGUuZ28gPSBmdW5jdGlvbiBnbyh0bywgcGFyYW1zLCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gJHN0YXRlLnRyYW5zaXRpb25Ubyh0bywgcGFyYW1zLCBleHRlbmQoeyBpbmhlcml0OiB0cnVlLCByZWxhdGl2ZTogJHN0YXRlLiRjdXJyZW50IH0sIG9wdGlvbnMpKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSN0cmFuc2l0aW9uVG9cbiAgICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICAgICAqXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogTG93LWxldmVsIG1ldGhvZCBmb3IgdHJhbnNpdGlvbmluZyB0byBhIG5ldyBzdGF0ZS4ge0BsaW5rIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGUjbWV0aG9kc19nbyAkc3RhdGUuZ299XG4gICAgICogdXNlcyBgdHJhbnNpdGlvblRvYCBpbnRlcm5hbGx5LiBgJHN0YXRlLmdvYCBpcyByZWNvbW1lbmRlZCBpbiBtb3N0IHNpdHVhdGlvbnMuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIDxwcmU+XG4gICAgICogdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbJ3VpLnJvdXRlciddKTtcbiAgICAgKlxuICAgICAqIGFwcC5jb250cm9sbGVyKCdjdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlKSB7XG4gICAgICogICAkc2NvcGUuY2hhbmdlU3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICogICAgICRzdGF0ZS50cmFuc2l0aW9uVG8oJ2NvbnRhY3QuZGV0YWlsJyk7XG4gICAgICogICB9O1xuICAgICAqIH0pO1xuICAgICAqIDwvcHJlPlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRvIFN0YXRlIG5hbWUuXG4gICAgICogQHBhcmFtIHtvYmplY3Q9fSB0b1BhcmFtcyBBIG1hcCBvZiB0aGUgcGFyYW1ldGVycyB0aGF0IHdpbGwgYmUgc2VudCB0byB0aGUgc3RhdGUsXG4gICAgICogd2lsbCBwb3B1bGF0ZSAkc3RhdGVQYXJhbXMuXG4gICAgICogQHBhcmFtIHtvYmplY3Q9fSBvcHRpb25zIE9wdGlvbnMgb2JqZWN0LiBUaGUgb3B0aW9ucyBhcmU6XG4gICAgICpcbiAgICAgKiAtICoqYGxvY2F0aW9uYCoqIC0ge2Jvb2xlYW49dHJ1ZXxzdHJpbmc9fSAtIElmIGB0cnVlYCB3aWxsIHVwZGF0ZSB0aGUgdXJsIGluIHRoZSBsb2NhdGlvbiBiYXIsIGlmIGBmYWxzZWBcbiAgICAgKiAgICB3aWxsIG5vdC4gSWYgc3RyaW5nLCBtdXN0IGJlIGBcInJlcGxhY2VcImAsIHdoaWNoIHdpbGwgdXBkYXRlIHVybCBhbmQgYWxzbyByZXBsYWNlIGxhc3QgaGlzdG9yeSByZWNvcmQuXG4gICAgICogLSAqKmBpbmhlcml0YCoqIC0ge2Jvb2xlYW49ZmFsc2V9LCBJZiBgdHJ1ZWAgd2lsbCBpbmhlcml0IHVybCBwYXJhbWV0ZXJzIGZyb20gY3VycmVudCB1cmwuXG4gICAgICogLSAqKmByZWxhdGl2ZWAqKiAtIHtvYmplY3Q9fSwgV2hlbiB0cmFuc2l0aW9uaW5nIHdpdGggcmVsYXRpdmUgcGF0aCAoZS5nICdeJyksIFxuICAgICAqICAgIGRlZmluZXMgd2hpY2ggc3RhdGUgdG8gYmUgcmVsYXRpdmUgZnJvbS5cbiAgICAgKiAtICoqYG5vdGlmeWAqKiAtIHtib29sZWFuPXRydWV9LCBJZiBgdHJ1ZWAgd2lsbCBicm9hZGNhc3QgJHN0YXRlQ2hhbmdlU3RhcnQgYW5kICRzdGF0ZUNoYW5nZVN1Y2Nlc3MgZXZlbnRzLlxuICAgICAqIC0gKipgcmVsb2FkYCoqICh2MC4yLjUpIC0ge2Jvb2xlYW49ZmFsc2V9LCBJZiBgdHJ1ZWAgd2lsbCBmb3JjZSB0cmFuc2l0aW9uIGV2ZW4gaWYgdGhlIHN0YXRlIG9yIHBhcmFtcyBcbiAgICAgKiAgICBoYXZlIG5vdCBjaGFuZ2VkLCBha2EgYSByZWxvYWQgb2YgdGhlIHNhbWUgc3RhdGUuIEl0IGRpZmZlcnMgZnJvbSByZWxvYWRPblNlYXJjaCBiZWNhdXNlIHlvdSdkXG4gICAgICogICAgdXNlIHRoaXMgd2hlbiB5b3Ugd2FudCB0byBmb3JjZSBhIHJlbG9hZCB3aGVuICpldmVyeXRoaW5nKiBpcyB0aGUgc2FtZSwgaW5jbHVkaW5nIHNlYXJjaCBwYXJhbXMuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7cHJvbWlzZX0gQSBwcm9taXNlIHJlcHJlc2VudGluZyB0aGUgc3RhdGUgb2YgdGhlIG5ldyB0cmFuc2l0aW9uLiBTZWVcbiAgICAgKiB7QGxpbmsgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSNtZXRob2RzX2dvICRzdGF0ZS5nb30uXG4gICAgICovXG4gICAgJHN0YXRlLnRyYW5zaXRpb25UbyA9IGZ1bmN0aW9uIHRyYW5zaXRpb25Ubyh0bywgdG9QYXJhbXMsIG9wdGlvbnMpIHtcbiAgICAgIHRvUGFyYW1zID0gdG9QYXJhbXMgfHwge307XG4gICAgICBvcHRpb25zID0gZXh0ZW5kKHtcbiAgICAgICAgbG9jYXRpb246IHRydWUsIGluaGVyaXQ6IGZhbHNlLCByZWxhdGl2ZTogbnVsbCwgbm90aWZ5OiB0cnVlLCByZWxvYWQ6IGZhbHNlLCAkcmV0cnk6IGZhbHNlXG4gICAgICB9LCBvcHRpb25zIHx8IHt9KTtcblxuICAgICAgdmFyIGZyb20gPSAkc3RhdGUuJGN1cnJlbnQsIGZyb21QYXJhbXMgPSAkc3RhdGUucGFyYW1zLCBmcm9tUGF0aCA9IGZyb20ucGF0aDtcbiAgICAgIHZhciBldnQsIHRvU3RhdGUgPSBmaW5kU3RhdGUodG8sIG9wdGlvbnMucmVsYXRpdmUpO1xuXG4gICAgICBpZiAoIWlzRGVmaW5lZCh0b1N0YXRlKSkge1xuICAgICAgICB2YXIgcmVkaXJlY3QgPSB7IHRvOiB0bywgdG9QYXJhbXM6IHRvUGFyYW1zLCBvcHRpb25zOiBvcHRpb25zIH07XG4gICAgICAgIHZhciByZWRpcmVjdFJlc3VsdCA9IGhhbmRsZVJlZGlyZWN0KHJlZGlyZWN0LCBmcm9tLnNlbGYsIGZyb21QYXJhbXMsIG9wdGlvbnMpO1xuXG4gICAgICAgIGlmIChyZWRpcmVjdFJlc3VsdCkge1xuICAgICAgICAgIHJldHVybiByZWRpcmVjdFJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFsd2F5cyByZXRyeSBvbmNlIGlmIHRoZSAkc3RhdGVOb3RGb3VuZCB3YXMgbm90IHByZXZlbnRlZFxuICAgICAgICAvLyAoaGFuZGxlcyBlaXRoZXIgcmVkaXJlY3QgY2hhbmdlZCBvciBzdGF0ZSBsYXp5LWRlZmluaXRpb24pXG4gICAgICAgIHRvID0gcmVkaXJlY3QudG87XG4gICAgICAgIHRvUGFyYW1zID0gcmVkaXJlY3QudG9QYXJhbXM7XG4gICAgICAgIG9wdGlvbnMgPSByZWRpcmVjdC5vcHRpb25zO1xuICAgICAgICB0b1N0YXRlID0gZmluZFN0YXRlKHRvLCBvcHRpb25zLnJlbGF0aXZlKTtcblxuICAgICAgICBpZiAoIWlzRGVmaW5lZCh0b1N0YXRlKSkge1xuICAgICAgICAgIGlmICghb3B0aW9ucy5yZWxhdGl2ZSkgdGhyb3cgbmV3IEVycm9yKFwiTm8gc3VjaCBzdGF0ZSAnXCIgKyB0byArIFwiJ1wiKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgcmVzb2x2ZSAnXCIgKyB0byArIFwiJyBmcm9tIHN0YXRlICdcIiArIG9wdGlvbnMucmVsYXRpdmUgKyBcIidcIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh0b1N0YXRlW2Fic3RyYWN0S2V5XSkgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHRyYW5zaXRpb24gdG8gYWJzdHJhY3Qgc3RhdGUgJ1wiICsgdG8gKyBcIidcIik7XG4gICAgICBpZiAob3B0aW9ucy5pbmhlcml0KSB0b1BhcmFtcyA9IGluaGVyaXRQYXJhbXMoJHN0YXRlUGFyYW1zLCB0b1BhcmFtcyB8fCB7fSwgJHN0YXRlLiRjdXJyZW50LCB0b1N0YXRlKTtcbiAgICAgIGlmICghdG9TdGF0ZS5wYXJhbXMuJCR2YWxpZGF0ZXModG9QYXJhbXMpKSByZXR1cm4gVHJhbnNpdGlvbkZhaWxlZDtcblxuICAgICAgdG9QYXJhbXMgPSB0b1N0YXRlLnBhcmFtcy4kJHZhbHVlcyh0b1BhcmFtcyk7XG4gICAgICB0byA9IHRvU3RhdGU7XG5cbiAgICAgIHZhciB0b1BhdGggPSB0by5wYXRoO1xuXG4gICAgICAvLyBTdGFydGluZyBmcm9tIHRoZSByb290IG9mIHRoZSBwYXRoLCBrZWVwIGFsbCBsZXZlbHMgdGhhdCBoYXZlbid0IGNoYW5nZWRcbiAgICAgIHZhciBrZWVwID0gMCwgc3RhdGUgPSB0b1BhdGhba2VlcF0sIGxvY2FscyA9IHJvb3QubG9jYWxzLCB0b0xvY2FscyA9IFtdO1xuXG4gICAgICBpZiAoIW9wdGlvbnMucmVsb2FkKSB7XG4gICAgICAgIHdoaWxlIChzdGF0ZSAmJiBzdGF0ZSA9PT0gZnJvbVBhdGhba2VlcF0gJiYgc3RhdGUub3duUGFyYW1zLiQkZXF1YWxzKHRvUGFyYW1zLCBmcm9tUGFyYW1zKSkge1xuICAgICAgICAgIGxvY2FscyA9IHRvTG9jYWxzW2tlZXBdID0gc3RhdGUubG9jYWxzO1xuICAgICAgICAgIGtlZXArKztcbiAgICAgICAgICBzdGF0ZSA9IHRvUGF0aFtrZWVwXTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJZiB3ZSdyZSBnb2luZyB0byB0aGUgc2FtZSBzdGF0ZSBhbmQgYWxsIGxvY2FscyBhcmUga2VwdCwgd2UndmUgZ290IG5vdGhpbmcgdG8gZG8uXG4gICAgICAvLyBCdXQgY2xlYXIgJ3RyYW5zaXRpb24nLCBhcyB3ZSBzdGlsbCB3YW50IHRvIGNhbmNlbCBhbnkgb3RoZXIgcGVuZGluZyB0cmFuc2l0aW9ucy5cbiAgICAgIC8vIFRPRE86IFdlIG1heSBub3Qgd2FudCB0byBidW1wICd0cmFuc2l0aW9uJyBpZiB3ZSdyZSBjYWxsZWQgZnJvbSBhIGxvY2F0aW9uIGNoYW5nZVxuICAgICAgLy8gdGhhdCB3ZSd2ZSBpbml0aWF0ZWQgb3Vyc2VsdmVzLCBiZWNhdXNlIHdlIG1pZ2h0IGFjY2lkZW50YWxseSBhYm9ydCBhIGxlZ2l0aW1hdGVcbiAgICAgIC8vIHRyYW5zaXRpb24gaW5pdGlhdGVkIGZyb20gY29kZT9cbiAgICAgIGlmIChzaG91bGRUcmlnZ2VyUmVsb2FkKHRvLCBmcm9tLCBsb2NhbHMsIG9wdGlvbnMpKSB7XG4gICAgICAgIGlmICh0by5zZWxmLnJlbG9hZE9uU2VhcmNoICE9PSBmYWxzZSkgJHVybFJvdXRlci51cGRhdGUoKTtcbiAgICAgICAgJHN0YXRlLnRyYW5zaXRpb24gPSBudWxsO1xuICAgICAgICByZXR1cm4gJHEud2hlbigkc3RhdGUuY3VycmVudCk7XG4gICAgICB9XG5cbiAgICAgIC8vIEZpbHRlciBwYXJhbWV0ZXJzIGJlZm9yZSB3ZSBwYXNzIHRoZW0gdG8gZXZlbnQgaGFuZGxlcnMgZXRjLlxuICAgICAgdG9QYXJhbXMgPSBmaWx0ZXJCeUtleXModG8ucGFyYW1zLiQka2V5cygpLCB0b1BhcmFtcyB8fCB7fSk7XG5cbiAgICAgIC8vIEJyb2FkY2FzdCBzdGFydCBldmVudCBhbmQgY2FuY2VsIHRoZSB0cmFuc2l0aW9uIGlmIHJlcXVlc3RlZFxuICAgICAgaWYgKG9wdGlvbnMubm90aWZ5KSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAbmdkb2MgZXZlbnRcbiAgICAgICAgICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSMkc3RhdGVDaGFuZ2VTdGFydFxuICAgICAgICAgKiBAZXZlbnRPZiB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlXG4gICAgICAgICAqIEBldmVudFR5cGUgYnJvYWRjYXN0IG9uIHJvb3Qgc2NvcGVcbiAgICAgICAgICogQGRlc2NyaXB0aW9uXG4gICAgICAgICAqIEZpcmVkIHdoZW4gdGhlIHN0YXRlIHRyYW5zaXRpb24gKipiZWdpbnMqKi4gWW91IGNhbiB1c2UgYGV2ZW50LnByZXZlbnREZWZhdWx0KClgXG4gICAgICAgICAqIHRvIHByZXZlbnQgdGhlIHRyYW5zaXRpb24gZnJvbSBoYXBwZW5pbmcgYW5kIHRoZW4gdGhlIHRyYW5zaXRpb24gcHJvbWlzZSB3aWxsIGJlXG4gICAgICAgICAqIHJlamVjdGVkIHdpdGggYSBgJ3RyYW5zaXRpb24gcHJldmVudGVkJ2AgdmFsdWUuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBldmVudCBFdmVudCBvYmplY3QuXG4gICAgICAgICAqIEBwYXJhbSB7U3RhdGV9IHRvU3RhdGUgVGhlIHN0YXRlIGJlaW5nIHRyYW5zaXRpb25lZCB0by5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IHRvUGFyYW1zIFRoZSBwYXJhbXMgc3VwcGxpZWQgdG8gdGhlIGB0b1N0YXRlYC5cbiAgICAgICAgICogQHBhcmFtIHtTdGF0ZX0gZnJvbVN0YXRlIFRoZSBjdXJyZW50IHN0YXRlLCBwcmUtdHJhbnNpdGlvbi5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IGZyb21QYXJhbXMgVGhlIHBhcmFtcyBzdXBwbGllZCB0byB0aGUgYGZyb21TdGF0ZWAuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICAqXG4gICAgICAgICAqIDxwcmU+XG4gICAgICAgICAqICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsXG4gICAgICAgICAqIGZ1bmN0aW9uKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcywgZnJvbVN0YXRlLCBmcm9tUGFyYW1zKXtcbiAgICAgICAgICogICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAqICAgICAvLyB0cmFuc2l0aW9uVG8oKSBwcm9taXNlIHdpbGwgYmUgcmVqZWN0ZWQgd2l0aFxuICAgICAgICAgKiAgICAgLy8gYSAndHJhbnNpdGlvbiBwcmV2ZW50ZWQnIGVycm9yXG4gICAgICAgICAqIH0pXG4gICAgICAgICAqIDwvcHJlPlxuICAgICAgICAgKi9cbiAgICAgICAgaWYgKCRyb290U2NvcGUuJGJyb2FkY2FzdCgnJHN0YXRlQ2hhbmdlU3RhcnQnLCB0by5zZWxmLCB0b1BhcmFtcywgZnJvbS5zZWxmLCBmcm9tUGFyYW1zKS5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICAgICAgJHVybFJvdXRlci51cGRhdGUoKTtcbiAgICAgICAgICByZXR1cm4gVHJhbnNpdGlvblByZXZlbnRlZDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBSZXNvbHZlIGxvY2FscyBmb3IgdGhlIHJlbWFpbmluZyBzdGF0ZXMsIGJ1dCBkb24ndCB1cGRhdGUgYW55IGdsb2JhbCBzdGF0ZSBqdXN0XG4gICAgICAvLyB5ZXQgLS0gaWYgYW55dGhpbmcgZmFpbHMgdG8gcmVzb2x2ZSB0aGUgY3VycmVudCBzdGF0ZSBuZWVkcyB0byByZW1haW4gdW50b3VjaGVkLlxuICAgICAgLy8gV2UgYWxzbyBzZXQgdXAgYW4gaW5oZXJpdGFuY2UgY2hhaW4gZm9yIHRoZSBsb2NhbHMgaGVyZS4gVGhpcyBhbGxvd3MgdGhlIHZpZXcgZGlyZWN0aXZlXG4gICAgICAvLyB0byBxdWlja2x5IGxvb2sgdXAgdGhlIGNvcnJlY3QgZGVmaW5pdGlvbiBmb3IgZWFjaCB2aWV3IGluIHRoZSBjdXJyZW50IHN0YXRlLiBFdmVuXG4gICAgICAvLyB0aG91Z2ggd2UgY3JlYXRlIHRoZSBsb2NhbHMgb2JqZWN0IGl0c2VsZiBvdXRzaWRlIHJlc29sdmVTdGF0ZSgpLCBpdCBpcyBpbml0aWFsbHlcbiAgICAgIC8vIGVtcHR5IGFuZCBnZXRzIGZpbGxlZCBhc3luY2hyb25vdXNseS4gV2UgbmVlZCB0byBrZWVwIHRyYWNrIG9mIHRoZSBwcm9taXNlIGZvciB0aGVcbiAgICAgIC8vIChmdWxseSByZXNvbHZlZCkgY3VycmVudCBsb2NhbHMsIGFuZCBwYXNzIHRoaXMgZG93biB0aGUgY2hhaW4uXG4gICAgICB2YXIgcmVzb2x2ZWQgPSAkcS53aGVuKGxvY2Fscyk7XG5cbiAgICAgIGZvciAodmFyIGwgPSBrZWVwOyBsIDwgdG9QYXRoLmxlbmd0aDsgbCsrLCBzdGF0ZSA9IHRvUGF0aFtsXSkge1xuICAgICAgICBsb2NhbHMgPSB0b0xvY2Fsc1tsXSA9IGluaGVyaXQobG9jYWxzKTtcbiAgICAgICAgcmVzb2x2ZWQgPSByZXNvbHZlU3RhdGUoc3RhdGUsIHRvUGFyYW1zLCBzdGF0ZSA9PT0gdG8sIHJlc29sdmVkLCBsb2NhbHMsIG9wdGlvbnMpO1xuICAgICAgfVxuXG4gICAgICAvLyBPbmNlIGV2ZXJ5dGhpbmcgaXMgcmVzb2x2ZWQsIHdlIGFyZSByZWFkeSB0byBwZXJmb3JtIHRoZSBhY3R1YWwgdHJhbnNpdGlvblxuICAgICAgLy8gYW5kIHJldHVybiBhIHByb21pc2UgZm9yIHRoZSBuZXcgc3RhdGUuIFdlIGFsc28ga2VlcCB0cmFjayBvZiB3aGF0IHRoZVxuICAgICAgLy8gY3VycmVudCBwcm9taXNlIGlzLCBzbyB0aGF0IHdlIGNhbiBkZXRlY3Qgb3ZlcmxhcHBpbmcgdHJhbnNpdGlvbnMgYW5kXG4gICAgICAvLyBrZWVwIG9ubHkgdGhlIG91dGNvbWUgb2YgdGhlIGxhc3QgdHJhbnNpdGlvbi5cbiAgICAgIHZhciB0cmFuc2l0aW9uID0gJHN0YXRlLnRyYW5zaXRpb24gPSByZXNvbHZlZC50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGwsIGVudGVyaW5nLCBleGl0aW5nO1xuXG4gICAgICAgIGlmICgkc3RhdGUudHJhbnNpdGlvbiAhPT0gdHJhbnNpdGlvbikgcmV0dXJuIFRyYW5zaXRpb25TdXBlcnNlZGVkO1xuXG4gICAgICAgIC8vIEV4aXQgJ2Zyb20nIHN0YXRlcyBub3Qga2VwdFxuICAgICAgICBmb3IgKGwgPSBmcm9tUGF0aC5sZW5ndGggLSAxOyBsID49IGtlZXA7IGwtLSkge1xuICAgICAgICAgIGV4aXRpbmcgPSBmcm9tUGF0aFtsXTtcbiAgICAgICAgICBpZiAoZXhpdGluZy5zZWxmLm9uRXhpdCkge1xuICAgICAgICAgICAgJGluamVjdG9yLmludm9rZShleGl0aW5nLnNlbGYub25FeGl0LCBleGl0aW5nLnNlbGYsIGV4aXRpbmcubG9jYWxzLmdsb2JhbHMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBleGl0aW5nLmxvY2FscyA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFbnRlciAndG8nIHN0YXRlcyBub3Qga2VwdFxuICAgICAgICBmb3IgKGwgPSBrZWVwOyBsIDwgdG9QYXRoLmxlbmd0aDsgbCsrKSB7XG4gICAgICAgICAgZW50ZXJpbmcgPSB0b1BhdGhbbF07XG4gICAgICAgICAgZW50ZXJpbmcubG9jYWxzID0gdG9Mb2NhbHNbbF07XG4gICAgICAgICAgaWYgKGVudGVyaW5nLnNlbGYub25FbnRlcikge1xuICAgICAgICAgICAgJGluamVjdG9yLmludm9rZShlbnRlcmluZy5zZWxmLm9uRW50ZXIsIGVudGVyaW5nLnNlbGYsIGVudGVyaW5nLmxvY2Fscy5nbG9iYWxzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSdW4gaXQgYWdhaW4sIHRvIGNhdGNoIGFueSB0cmFuc2l0aW9ucyBpbiBjYWxsYmFja3NcbiAgICAgICAgaWYgKCRzdGF0ZS50cmFuc2l0aW9uICE9PSB0cmFuc2l0aW9uKSByZXR1cm4gVHJhbnNpdGlvblN1cGVyc2VkZWQ7XG5cbiAgICAgICAgLy8gVXBkYXRlIGdsb2JhbHMgaW4gJHN0YXRlXG4gICAgICAgICRzdGF0ZS4kY3VycmVudCA9IHRvO1xuICAgICAgICAkc3RhdGUuY3VycmVudCA9IHRvLnNlbGY7XG4gICAgICAgICRzdGF0ZS5wYXJhbXMgPSB0b1BhcmFtcztcbiAgICAgICAgY29weSgkc3RhdGUucGFyYW1zLCAkc3RhdGVQYXJhbXMpO1xuICAgICAgICAkc3RhdGUudHJhbnNpdGlvbiA9IG51bGw7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMubG9jYXRpb24gJiYgdG8ubmF2aWdhYmxlKSB7XG4gICAgICAgICAgJHVybFJvdXRlci5wdXNoKHRvLm5hdmlnYWJsZS51cmwsIHRvLm5hdmlnYWJsZS5sb2NhbHMuZ2xvYmFscy4kc3RhdGVQYXJhbXMsIHtcbiAgICAgICAgICAgICQkYXZvaWRSZXN5bmM6IHRydWUsIHJlcGxhY2U6IG9wdGlvbnMubG9jYXRpb24gPT09ICdyZXBsYWNlJ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMubm90aWZ5KSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAbmdkb2MgZXZlbnRcbiAgICAgICAgICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSMkc3RhdGVDaGFuZ2VTdWNjZXNzXG4gICAgICAgICAqIEBldmVudE9mIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVcbiAgICAgICAgICogQGV2ZW50VHlwZSBicm9hZGNhc3Qgb24gcm9vdCBzY29wZVxuICAgICAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgICAgICogRmlyZWQgb25jZSB0aGUgc3RhdGUgdHJhbnNpdGlvbiBpcyAqKmNvbXBsZXRlKiouXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBldmVudCBFdmVudCBvYmplY3QuXG4gICAgICAgICAqIEBwYXJhbSB7U3RhdGV9IHRvU3RhdGUgVGhlIHN0YXRlIGJlaW5nIHRyYW5zaXRpb25lZCB0by5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IHRvUGFyYW1zIFRoZSBwYXJhbXMgc3VwcGxpZWQgdG8gdGhlIGB0b1N0YXRlYC5cbiAgICAgICAgICogQHBhcmFtIHtTdGF0ZX0gZnJvbVN0YXRlIFRoZSBjdXJyZW50IHN0YXRlLCBwcmUtdHJhbnNpdGlvbi5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IGZyb21QYXJhbXMgVGhlIHBhcmFtcyBzdXBwbGllZCB0byB0aGUgYGZyb21TdGF0ZWAuXG4gICAgICAgICAqL1xuICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnJHN0YXRlQ2hhbmdlU3VjY2VzcycsIHRvLnNlbGYsIHRvUGFyYW1zLCBmcm9tLnNlbGYsIGZyb21QYXJhbXMpO1xuICAgICAgICB9XG4gICAgICAgICR1cmxSb3V0ZXIudXBkYXRlKHRydWUpO1xuXG4gICAgICAgIHJldHVybiAkc3RhdGUuY3VycmVudDtcbiAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICBpZiAoJHN0YXRlLnRyYW5zaXRpb24gIT09IHRyYW5zaXRpb24pIHJldHVybiBUcmFuc2l0aW9uU3VwZXJzZWRlZDtcblxuICAgICAgICAkc3RhdGUudHJhbnNpdGlvbiA9IG51bGw7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAbmdkb2MgZXZlbnRcbiAgICAgICAgICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSMkc3RhdGVDaGFuZ2VFcnJvclxuICAgICAgICAgKiBAZXZlbnRPZiB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlXG4gICAgICAgICAqIEBldmVudFR5cGUgYnJvYWRjYXN0IG9uIHJvb3Qgc2NvcGVcbiAgICAgICAgICogQGRlc2NyaXB0aW9uXG4gICAgICAgICAqIEZpcmVkIHdoZW4gYW4gKiplcnJvciBvY2N1cnMqKiBkdXJpbmcgdHJhbnNpdGlvbi4gSXQncyBpbXBvcnRhbnQgdG8gbm90ZSB0aGF0IGlmIHlvdVxuICAgICAgICAgKiBoYXZlIGFueSBlcnJvcnMgaW4geW91ciByZXNvbHZlIGZ1bmN0aW9ucyAoamF2YXNjcmlwdCBlcnJvcnMsIG5vbi1leGlzdGVudCBzZXJ2aWNlcywgZXRjKVxuICAgICAgICAgKiB0aGV5IHdpbGwgbm90IHRocm93IHRyYWRpdGlvbmFsbHkuIFlvdSBtdXN0IGxpc3RlbiBmb3IgdGhpcyAkc3RhdGVDaGFuZ2VFcnJvciBldmVudCB0b1xuICAgICAgICAgKiBjYXRjaCAqKkFMTCoqIGVycm9ycy5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IEV2ZW50IG9iamVjdC5cbiAgICAgICAgICogQHBhcmFtIHtTdGF0ZX0gdG9TdGF0ZSBUaGUgc3RhdGUgYmVpbmcgdHJhbnNpdGlvbmVkIHRvLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9QYXJhbXMgVGhlIHBhcmFtcyBzdXBwbGllZCB0byB0aGUgYHRvU3RhdGVgLlxuICAgICAgICAgKiBAcGFyYW0ge1N0YXRlfSBmcm9tU3RhdGUgVGhlIGN1cnJlbnQgc3RhdGUsIHByZS10cmFuc2l0aW9uLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gZnJvbVBhcmFtcyBUaGUgcGFyYW1zIHN1cHBsaWVkIHRvIHRoZSBgZnJvbVN0YXRlYC5cbiAgICAgICAgICogQHBhcmFtIHtFcnJvcn0gZXJyb3IgVGhlIHJlc29sdmUgZXJyb3Igb2JqZWN0LlxuICAgICAgICAgKi9cbiAgICAgICAgZXZ0ID0gJHJvb3RTY29wZS4kYnJvYWRjYXN0KCckc3RhdGVDaGFuZ2VFcnJvcicsIHRvLnNlbGYsIHRvUGFyYW1zLCBmcm9tLnNlbGYsIGZyb21QYXJhbXMsIGVycm9yKTtcblxuICAgICAgICBpZiAoIWV2dC5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICAgICAgICAkdXJsUm91dGVyLnVwZGF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuICRxLnJlamVjdChlcnJvcik7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHRyYW5zaXRpb247XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGUjaXNcbiAgICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICAgICAqXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogU2ltaWxhciB0byB7QGxpbmsgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSNtZXRob2RzX2luY2x1ZGVzICRzdGF0ZS5pbmNsdWRlc30sXG4gICAgICogYnV0IG9ubHkgY2hlY2tzIGZvciB0aGUgZnVsbCBzdGF0ZSBuYW1lLiBJZiBwYXJhbXMgaXMgc3VwcGxpZWQgdGhlbiBpdCB3aWxsIGJlXG4gICAgICogdGVzdGVkIGZvciBzdHJpY3QgZXF1YWxpdHkgYWdhaW5zdCB0aGUgY3VycmVudCBhY3RpdmUgcGFyYW1zIG9iamVjdCwgc28gYWxsIHBhcmFtc1xuICAgICAqIG11c3QgbWF0Y2ggd2l0aCBub25lIG1pc3NpbmcgYW5kIG5vIGV4dHJhcy5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogPHByZT5cbiAgICAgKiAkc3RhdGUuJGN1cnJlbnQubmFtZSA9ICdjb250YWN0cy5kZXRhaWxzLml0ZW0nO1xuICAgICAqXG4gICAgICogLy8gYWJzb2x1dGUgbmFtZVxuICAgICAqICRzdGF0ZS5pcygnY29udGFjdC5kZXRhaWxzLml0ZW0nKTsgLy8gcmV0dXJucyB0cnVlXG4gICAgICogJHN0YXRlLmlzKGNvbnRhY3REZXRhaWxJdGVtU3RhdGVPYmplY3QpOyAvLyByZXR1cm5zIHRydWVcbiAgICAgKlxuICAgICAqIC8vIHJlbGF0aXZlIG5hbWUgKC4gYW5kIF4pLCB0eXBpY2FsbHkgZnJvbSBhIHRlbXBsYXRlXG4gICAgICogLy8gRS5nLiBmcm9tIHRoZSAnY29udGFjdHMuZGV0YWlscycgdGVtcGxhdGVcbiAgICAgKiA8ZGl2IG5nLWNsYXNzPVwie2hpZ2hsaWdodGVkOiAkc3RhdGUuaXMoJy5pdGVtJyl9XCI+SXRlbTwvZGl2PlxuICAgICAqIDwvcHJlPlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBzdGF0ZU9yTmFtZSBUaGUgc3RhdGUgbmFtZSAoYWJzb2x1dGUgb3IgcmVsYXRpdmUpIG9yIHN0YXRlIG9iamVjdCB5b3UnZCBsaWtlIHRvIGNoZWNrLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0PX0gcGFyYW1zIEEgcGFyYW0gb2JqZWN0LCBlLmcuIGB7c2VjdGlvbklkOiBzZWN0aW9uLmlkfWAsIHRoYXQgeW91J2QgbGlrZVxuICAgICAqIHRvIHRlc3QgYWdhaW5zdCB0aGUgY3VycmVudCBhY3RpdmUgc3RhdGUuXG4gICAgICogQHBhcmFtIHtvYmplY3Q9fSBvcHRpb25zIEFuIG9wdGlvbnMgb2JqZWN0LiAgVGhlIG9wdGlvbnMgYXJlOlxuICAgICAqXG4gICAgICogLSAqKmByZWxhdGl2ZWAqKiAtIHtzdHJpbmd8b2JqZWN0fSAtICBJZiBgc3RhdGVPck5hbWVgIGlzIGEgcmVsYXRpdmUgc3RhdGUgbmFtZSBhbmQgYG9wdGlvbnMucmVsYXRpdmVgIGlzIHNldCwgLmlzIHdpbGxcbiAgICAgKiB0ZXN0IHJlbGF0aXZlIHRvIGBvcHRpb25zLnJlbGF0aXZlYCBzdGF0ZSAob3IgbmFtZSkuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyB0cnVlIGlmIGl0IGlzIHRoZSBzdGF0ZS5cbiAgICAgKi9cbiAgICAkc3RhdGUuaXMgPSBmdW5jdGlvbiBpcyhzdGF0ZU9yTmFtZSwgcGFyYW1zLCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gZXh0ZW5kKHsgcmVsYXRpdmU6ICRzdGF0ZS4kY3VycmVudCB9LCBvcHRpb25zIHx8IHt9KTtcbiAgICAgIHZhciBzdGF0ZSA9IGZpbmRTdGF0ZShzdGF0ZU9yTmFtZSwgb3B0aW9ucy5yZWxhdGl2ZSk7XG5cbiAgICAgIGlmICghaXNEZWZpbmVkKHN0YXRlKSkgeyByZXR1cm4gdW5kZWZpbmVkOyB9XG4gICAgICBpZiAoJHN0YXRlLiRjdXJyZW50ICE9PSBzdGF0ZSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgIHJldHVybiBwYXJhbXMgPyBlcXVhbEZvcktleXMoc3RhdGUucGFyYW1zLiQkdmFsdWVzKHBhcmFtcyksICRzdGF0ZVBhcmFtcykgOiB0cnVlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlI2luY2x1ZGVzXG4gICAgICogQG1ldGhvZE9mIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVcbiAgICAgKlxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIEEgbWV0aG9kIHRvIGRldGVybWluZSBpZiB0aGUgY3VycmVudCBhY3RpdmUgc3RhdGUgaXMgZXF1YWwgdG8gb3IgaXMgdGhlIGNoaWxkIG9mIHRoZVxuICAgICAqIHN0YXRlIHN0YXRlTmFtZS4gSWYgYW55IHBhcmFtcyBhcmUgcGFzc2VkIHRoZW4gdGhleSB3aWxsIGJlIHRlc3RlZCBmb3IgYSBtYXRjaCBhcyB3ZWxsLlxuICAgICAqIE5vdCBhbGwgdGhlIHBhcmFtZXRlcnMgbmVlZCB0byBiZSBwYXNzZWQsIGp1c3QgdGhlIG9uZXMgeW91J2QgbGlrZSB0byB0ZXN0IGZvciBlcXVhbGl0eS5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogUGFydGlhbCBhbmQgcmVsYXRpdmUgbmFtZXNcbiAgICAgKiA8cHJlPlxuICAgICAqICRzdGF0ZS4kY3VycmVudC5uYW1lID0gJ2NvbnRhY3RzLmRldGFpbHMuaXRlbSc7XG4gICAgICpcbiAgICAgKiAvLyBVc2luZyBwYXJ0aWFsIG5hbWVzXG4gICAgICogJHN0YXRlLmluY2x1ZGVzKFwiY29udGFjdHNcIik7IC8vIHJldHVybnMgdHJ1ZVxuICAgICAqICRzdGF0ZS5pbmNsdWRlcyhcImNvbnRhY3RzLmRldGFpbHNcIik7IC8vIHJldHVybnMgdHJ1ZVxuICAgICAqICRzdGF0ZS5pbmNsdWRlcyhcImNvbnRhY3RzLmRldGFpbHMuaXRlbVwiKTsgLy8gcmV0dXJucyB0cnVlXG4gICAgICogJHN0YXRlLmluY2x1ZGVzKFwiY29udGFjdHMubGlzdFwiKTsgLy8gcmV0dXJucyBmYWxzZVxuICAgICAqICRzdGF0ZS5pbmNsdWRlcyhcImFib3V0XCIpOyAvLyByZXR1cm5zIGZhbHNlXG4gICAgICpcbiAgICAgKiAvLyBVc2luZyByZWxhdGl2ZSBuYW1lcyAoLiBhbmQgXiksIHR5cGljYWxseSBmcm9tIGEgdGVtcGxhdGVcbiAgICAgKiAvLyBFLmcuIGZyb20gdGhlICdjb250YWN0cy5kZXRhaWxzJyB0ZW1wbGF0ZVxuICAgICAqIDxkaXYgbmctY2xhc3M9XCJ7aGlnaGxpZ2h0ZWQ6ICRzdGF0ZS5pbmNsdWRlcygnLml0ZW0nKX1cIj5JdGVtPC9kaXY+XG4gICAgICogPC9wcmU+XG4gICAgICpcbiAgICAgKiBCYXNpYyBnbG9iYmluZyBwYXR0ZXJuc1xuICAgICAqIDxwcmU+XG4gICAgICogJHN0YXRlLiRjdXJyZW50Lm5hbWUgPSAnY29udGFjdHMuZGV0YWlscy5pdGVtLnVybCc7XG4gICAgICpcbiAgICAgKiAkc3RhdGUuaW5jbHVkZXMoXCIqLmRldGFpbHMuKi4qXCIpOyAvLyByZXR1cm5zIHRydWVcbiAgICAgKiAkc3RhdGUuaW5jbHVkZXMoXCIqLmRldGFpbHMuKipcIik7IC8vIHJldHVybnMgdHJ1ZVxuICAgICAqICRzdGF0ZS5pbmNsdWRlcyhcIioqLml0ZW0uKipcIik7IC8vIHJldHVybnMgdHJ1ZVxuICAgICAqICRzdGF0ZS5pbmNsdWRlcyhcIiouZGV0YWlscy5pdGVtLnVybFwiKTsgLy8gcmV0dXJucyB0cnVlXG4gICAgICogJHN0YXRlLmluY2x1ZGVzKFwiKi5kZXRhaWxzLioudXJsXCIpOyAvLyByZXR1cm5zIHRydWVcbiAgICAgKiAkc3RhdGUuaW5jbHVkZXMoXCIqLmRldGFpbHMuKlwiKTsgLy8gcmV0dXJucyBmYWxzZVxuICAgICAqICRzdGF0ZS5pbmNsdWRlcyhcIml0ZW0uKipcIik7IC8vIHJldHVybnMgZmFsc2VcbiAgICAgKiA8L3ByZT5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzdGF0ZU9yTmFtZSBBIHBhcnRpYWwgbmFtZSwgcmVsYXRpdmUgbmFtZSwgb3IgZ2xvYiBwYXR0ZXJuXG4gICAgICogdG8gYmUgc2VhcmNoZWQgZm9yIHdpdGhpbiB0aGUgY3VycmVudCBzdGF0ZSBuYW1lLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0PX0gcGFyYW1zIEEgcGFyYW0gb2JqZWN0LCBlLmcuIGB7c2VjdGlvbklkOiBzZWN0aW9uLmlkfWAsXG4gICAgICogdGhhdCB5b3UnZCBsaWtlIHRvIHRlc3QgYWdhaW5zdCB0aGUgY3VycmVudCBhY3RpdmUgc3RhdGUuXG4gICAgICogQHBhcmFtIHtvYmplY3Q9fSBvcHRpb25zIEFuIG9wdGlvbnMgb2JqZWN0LiAgVGhlIG9wdGlvbnMgYXJlOlxuICAgICAqXG4gICAgICogLSAqKmByZWxhdGl2ZWAqKiAtIHtzdHJpbmd8b2JqZWN0PX0gLSAgSWYgYHN0YXRlT3JOYW1lYCBpcyBhIHJlbGF0aXZlIHN0YXRlIHJlZmVyZW5jZSBhbmQgYG9wdGlvbnMucmVsYXRpdmVgIGlzIHNldCxcbiAgICAgKiAuaW5jbHVkZXMgd2lsbCB0ZXN0IHJlbGF0aXZlIHRvIGBvcHRpb25zLnJlbGF0aXZlYCBzdGF0ZSAob3IgbmFtZSkuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyB0cnVlIGlmIGl0IGRvZXMgaW5jbHVkZSB0aGUgc3RhdGVcbiAgICAgKi9cbiAgICAkc3RhdGUuaW5jbHVkZXMgPSBmdW5jdGlvbiBpbmNsdWRlcyhzdGF0ZU9yTmFtZSwgcGFyYW1zLCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gZXh0ZW5kKHsgcmVsYXRpdmU6ICRzdGF0ZS4kY3VycmVudCB9LCBvcHRpb25zIHx8IHt9KTtcbiAgICAgIGlmIChpc1N0cmluZyhzdGF0ZU9yTmFtZSkgJiYgaXNHbG9iKHN0YXRlT3JOYW1lKSkge1xuICAgICAgICBpZiAoIWRvZXNTdGF0ZU1hdGNoR2xvYihzdGF0ZU9yTmFtZSkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGVPck5hbWUgPSAkc3RhdGUuJGN1cnJlbnQubmFtZTtcbiAgICAgIH1cblxuICAgICAgdmFyIHN0YXRlID0gZmluZFN0YXRlKHN0YXRlT3JOYW1lLCBvcHRpb25zLnJlbGF0aXZlKTtcbiAgICAgIGlmICghaXNEZWZpbmVkKHN0YXRlKSkgeyByZXR1cm4gdW5kZWZpbmVkOyB9XG4gICAgICBpZiAoIWlzRGVmaW5lZCgkc3RhdGUuJGN1cnJlbnQuaW5jbHVkZXNbc3RhdGUubmFtZV0pKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgcmV0dXJuIHBhcmFtcyA/IGVxdWFsRm9yS2V5cyhzdGF0ZS5wYXJhbXMuJCR2YWx1ZXMocGFyYW1zKSwgJHN0YXRlUGFyYW1zLCBvYmplY3RLZXlzKHBhcmFtcykpIDogdHJ1ZTtcbiAgICB9O1xuXG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlI2hyZWZcbiAgICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICAgICAqXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogQSB1cmwgZ2VuZXJhdGlvbiBtZXRob2QgdGhhdCByZXR1cm5zIHRoZSBjb21waWxlZCB1cmwgZm9yIHRoZSBnaXZlbiBzdGF0ZSBwb3B1bGF0ZWQgd2l0aCB0aGUgZ2l2ZW4gcGFyYW1zLlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiA8cHJlPlxuICAgICAqIGV4cGVjdCgkc3RhdGUuaHJlZihcImFib3V0LnBlcnNvblwiLCB7IHBlcnNvbjogXCJib2JcIiB9KSkudG9FcXVhbChcIi9hYm91dC9ib2JcIik7XG4gICAgICogPC9wcmU+XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHN0YXRlT3JOYW1lIFRoZSBzdGF0ZSBuYW1lIG9yIHN0YXRlIG9iamVjdCB5b3UnZCBsaWtlIHRvIGdlbmVyYXRlIGEgdXJsIGZyb20uXG4gICAgICogQHBhcmFtIHtvYmplY3Q9fSBwYXJhbXMgQW4gb2JqZWN0IG9mIHBhcmFtZXRlciB2YWx1ZXMgdG8gZmlsbCB0aGUgc3RhdGUncyByZXF1aXJlZCBwYXJhbWV0ZXJzLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0PX0gb3B0aW9ucyBPcHRpb25zIG9iamVjdC4gVGhlIG9wdGlvbnMgYXJlOlxuICAgICAqXG4gICAgICogLSAqKmBsb3NzeWAqKiAtIHtib29sZWFuPXRydWV9IC0gIElmIHRydWUsIGFuZCBpZiB0aGVyZSBpcyBubyB1cmwgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGF0ZSBwcm92aWRlZCBpbiB0aGVcbiAgICAgKiAgICBmaXJzdCBwYXJhbWV0ZXIsIHRoZW4gdGhlIGNvbnN0cnVjdGVkIGhyZWYgdXJsIHdpbGwgYmUgYnVpbHQgZnJvbSB0aGUgZmlyc3QgbmF2aWdhYmxlIGFuY2VzdG9yIChha2FcbiAgICAgKiAgICBhbmNlc3RvciB3aXRoIGEgdmFsaWQgdXJsKS5cbiAgICAgKiAtICoqYGluaGVyaXRgKiogLSB7Ym9vbGVhbj10cnVlfSwgSWYgYHRydWVgIHdpbGwgaW5oZXJpdCB1cmwgcGFyYW1ldGVycyBmcm9tIGN1cnJlbnQgdXJsLlxuICAgICAqIC0gKipgcmVsYXRpdmVgKiogLSB7b2JqZWN0PSRzdGF0ZS4kY3VycmVudH0sIFdoZW4gdHJhbnNpdGlvbmluZyB3aXRoIHJlbGF0aXZlIHBhdGggKGUuZyAnXicpLCBcbiAgICAgKiAgICBkZWZpbmVzIHdoaWNoIHN0YXRlIHRvIGJlIHJlbGF0aXZlIGZyb20uXG4gICAgICogLSAqKmBhYnNvbHV0ZWAqKiAtIHtib29sZWFuPWZhbHNlfSwgIElmIHRydWUgd2lsbCBnZW5lcmF0ZSBhbiBhYnNvbHV0ZSB1cmwsIGUuZy4gXCJodHRwOi8vd3d3LmV4YW1wbGUuY29tL2Z1bGx1cmxcIi5cbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBjb21waWxlZCBzdGF0ZSB1cmxcbiAgICAgKi9cbiAgICAkc3RhdGUuaHJlZiA9IGZ1bmN0aW9uIGhyZWYoc3RhdGVPck5hbWUsIHBhcmFtcywgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IGV4dGVuZCh7XG4gICAgICAgIGxvc3N5OiAgICB0cnVlLFxuICAgICAgICBpbmhlcml0OiAgdHJ1ZSxcbiAgICAgICAgYWJzb2x1dGU6IGZhbHNlLFxuICAgICAgICByZWxhdGl2ZTogJHN0YXRlLiRjdXJyZW50XG4gICAgICB9LCBvcHRpb25zIHx8IHt9KTtcblxuICAgICAgdmFyIHN0YXRlID0gZmluZFN0YXRlKHN0YXRlT3JOYW1lLCBvcHRpb25zLnJlbGF0aXZlKTtcblxuICAgICAgaWYgKCFpc0RlZmluZWQoc3RhdGUpKSByZXR1cm4gbnVsbDtcbiAgICAgIGlmIChvcHRpb25zLmluaGVyaXQpIHBhcmFtcyA9IGluaGVyaXRQYXJhbXMoJHN0YXRlUGFyYW1zLCBwYXJhbXMgfHwge30sICRzdGF0ZS4kY3VycmVudCwgc3RhdGUpO1xuICAgICAgXG4gICAgICB2YXIgbmF2ID0gKHN0YXRlICYmIG9wdGlvbnMubG9zc3kpID8gc3RhdGUubmF2aWdhYmxlIDogc3RhdGU7XG5cbiAgICAgIGlmICghbmF2IHx8IG5hdi51cmwgPT09IHVuZGVmaW5lZCB8fCBuYXYudXJsID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuICR1cmxSb3V0ZXIuaHJlZihuYXYudXJsLCBmaWx0ZXJCeUtleXMoc3RhdGUucGFyYW1zLiQka2V5cygpLCBwYXJhbXMgfHwge30pLCB7XG4gICAgICAgIGFic29sdXRlOiBvcHRpb25zLmFic29sdXRlXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSNnZXRcbiAgICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICAgICAqXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogUmV0dXJucyB0aGUgc3RhdGUgY29uZmlndXJhdGlvbiBvYmplY3QgZm9yIGFueSBzcGVjaWZpYyBzdGF0ZSBvciBhbGwgc3RhdGVzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0PX0gc3RhdGVPck5hbWUgKGFic29sdXRlIG9yIHJlbGF0aXZlKSBJZiBwcm92aWRlZCwgd2lsbCBvbmx5IGdldCB0aGUgY29uZmlnIGZvclxuICAgICAqIHRoZSByZXF1ZXN0ZWQgc3RhdGUuIElmIG5vdCBwcm92aWRlZCwgcmV0dXJucyBhbiBhcnJheSBvZiBBTEwgc3RhdGUgY29uZmlncy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3Q9fSBjb250ZXh0IFdoZW4gc3RhdGVPck5hbWUgaXMgYSByZWxhdGl2ZSBzdGF0ZSByZWZlcmVuY2UsIHRoZSBzdGF0ZSB3aWxsIGJlIHJldHJpZXZlZCByZWxhdGl2ZSB0byBjb250ZXh0LlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R8QXJyYXl9IFN0YXRlIGNvbmZpZ3VyYXRpb24gb2JqZWN0IG9yIGFycmF5IG9mIGFsbCBvYmplY3RzLlxuICAgICAqL1xuICAgICRzdGF0ZS5nZXQgPSBmdW5jdGlvbiAoc3RhdGVPck5hbWUsIGNvbnRleHQpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gbWFwKG9iamVjdEtleXMoc3RhdGVzKSwgZnVuY3Rpb24obmFtZSkgeyByZXR1cm4gc3RhdGVzW25hbWVdLnNlbGY7IH0pO1xuICAgICAgdmFyIHN0YXRlID0gZmluZFN0YXRlKHN0YXRlT3JOYW1lLCBjb250ZXh0IHx8ICRzdGF0ZS4kY3VycmVudCk7XG4gICAgICByZXR1cm4gKHN0YXRlICYmIHN0YXRlLnNlbGYpID8gc3RhdGUuc2VsZiA6IG51bGw7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHJlc29sdmVTdGF0ZShzdGF0ZSwgcGFyYW1zLCBwYXJhbXNBcmVGaWx0ZXJlZCwgaW5oZXJpdGVkLCBkc3QsIG9wdGlvbnMpIHtcbiAgICAgIC8vIE1ha2UgYSByZXN0cmljdGVkICRzdGF0ZVBhcmFtcyB3aXRoIG9ubHkgdGhlIHBhcmFtZXRlcnMgdGhhdCBhcHBseSB0byB0aGlzIHN0YXRlIGlmXG4gICAgICAvLyBuZWNlc3NhcnkuIEluIGFkZGl0aW9uIHRvIGJlaW5nIGF2YWlsYWJsZSB0byB0aGUgY29udHJvbGxlciBhbmQgb25FbnRlci9vbkV4aXQgY2FsbGJhY2tzLFxuICAgICAgLy8gd2UgYWxzbyBuZWVkICRzdGF0ZVBhcmFtcyB0byBiZSBhdmFpbGFibGUgZm9yIGFueSAkaW5qZWN0b3IgY2FsbHMgd2UgbWFrZSBkdXJpbmcgdGhlXG4gICAgICAvLyBkZXBlbmRlbmN5IHJlc29sdXRpb24gcHJvY2Vzcy5cbiAgICAgIHZhciAkc3RhdGVQYXJhbXMgPSAocGFyYW1zQXJlRmlsdGVyZWQpID8gcGFyYW1zIDogZmlsdGVyQnlLZXlzKHN0YXRlLnBhcmFtcy4kJGtleXMoKSwgcGFyYW1zKTtcbiAgICAgIHZhciBsb2NhbHMgPSB7ICRzdGF0ZVBhcmFtczogJHN0YXRlUGFyYW1zIH07XG5cbiAgICAgIC8vIFJlc29sdmUgJ2dsb2JhbCcgZGVwZW5kZW5jaWVzIGZvciB0aGUgc3RhdGUsIGkuZS4gdGhvc2Ugbm90IHNwZWNpZmljIHRvIGEgdmlldy5cbiAgICAgIC8vIFdlJ3JlIGFsc28gaW5jbHVkaW5nICRzdGF0ZVBhcmFtcyBpbiB0aGlzOyB0aGF0IHdheSB0aGUgcGFyYW1ldGVycyBhcmUgcmVzdHJpY3RlZFxuICAgICAgLy8gdG8gdGhlIHNldCB0aGF0IHNob3VsZCBiZSB2aXNpYmxlIHRvIHRoZSBzdGF0ZSwgYW5kIGFyZSBpbmRlcGVuZGVudCBvZiB3aGVuIHdlIHVwZGF0ZVxuICAgICAgLy8gdGhlIGdsb2JhbCAkc3RhdGUgYW5kICRzdGF0ZVBhcmFtcyB2YWx1ZXMuXG4gICAgICBkc3QucmVzb2x2ZSA9ICRyZXNvbHZlLnJlc29sdmUoc3RhdGUucmVzb2x2ZSwgbG9jYWxzLCBkc3QucmVzb2x2ZSwgc3RhdGUpO1xuICAgICAgdmFyIHByb21pc2VzID0gW2RzdC5yZXNvbHZlLnRoZW4oZnVuY3Rpb24gKGdsb2JhbHMpIHtcbiAgICAgICAgZHN0Lmdsb2JhbHMgPSBnbG9iYWxzO1xuICAgICAgfSldO1xuICAgICAgaWYgKGluaGVyaXRlZCkgcHJvbWlzZXMucHVzaChpbmhlcml0ZWQpO1xuXG4gICAgICAvLyBSZXNvbHZlIHRlbXBsYXRlIGFuZCBkZXBlbmRlbmNpZXMgZm9yIGFsbCB2aWV3cy5cbiAgICAgIGZvckVhY2goc3RhdGUudmlld3MsIGZ1bmN0aW9uICh2aWV3LCBuYW1lKSB7XG4gICAgICAgIHZhciBpbmplY3RhYmxlcyA9ICh2aWV3LnJlc29sdmUgJiYgdmlldy5yZXNvbHZlICE9PSBzdGF0ZS5yZXNvbHZlID8gdmlldy5yZXNvbHZlIDoge30pO1xuICAgICAgICBpbmplY3RhYmxlcy4kdGVtcGxhdGUgPSBbIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gJHZpZXcubG9hZChuYW1lLCB7IHZpZXc6IHZpZXcsIGxvY2FsczogbG9jYWxzLCBwYXJhbXM6ICRzdGF0ZVBhcmFtcywgbm90aWZ5OiBvcHRpb25zLm5vdGlmeSB9KSB8fCAnJztcbiAgICAgICAgfV07XG5cbiAgICAgICAgcHJvbWlzZXMucHVzaCgkcmVzb2x2ZS5yZXNvbHZlKGluamVjdGFibGVzLCBsb2NhbHMsIGRzdC5yZXNvbHZlLCBzdGF0ZSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgLy8gUmVmZXJlbmNlcyB0byB0aGUgY29udHJvbGxlciAob25seSBpbnN0YW50aWF0ZWQgYXQgbGluayB0aW1lKVxuICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKHZpZXcuY29udHJvbGxlclByb3ZpZGVyKSB8fCBpc0FycmF5KHZpZXcuY29udHJvbGxlclByb3ZpZGVyKSkge1xuICAgICAgICAgICAgdmFyIGluamVjdExvY2FscyA9IGFuZ3VsYXIuZXh0ZW5kKHt9LCBpbmplY3RhYmxlcywgbG9jYWxzKTtcbiAgICAgICAgICAgIHJlc3VsdC4kJGNvbnRyb2xsZXIgPSAkaW5qZWN0b3IuaW52b2tlKHZpZXcuY29udHJvbGxlclByb3ZpZGVyLCBudWxsLCBpbmplY3RMb2NhbHMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQuJCRjb250cm9sbGVyID0gdmlldy5jb250cm9sbGVyO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBQcm92aWRlIGFjY2VzcyB0byB0aGUgc3RhdGUgaXRzZWxmIGZvciBpbnRlcm5hbCB1c2VcbiAgICAgICAgICByZXN1bHQuJCRzdGF0ZSA9IHN0YXRlO1xuICAgICAgICAgIHJlc3VsdC4kJGNvbnRyb2xsZXJBcyA9IHZpZXcuY29udHJvbGxlckFzO1xuICAgICAgICAgIGRzdFtuYW1lXSA9IHJlc3VsdDtcbiAgICAgICAgfSkpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFdhaXQgZm9yIGFsbCB0aGUgcHJvbWlzZXMgYW5kIHRoZW4gcmV0dXJuIHRoZSBhY3RpdmF0aW9uIG9iamVjdFxuICAgICAgcmV0dXJuICRxLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbiAodmFsdWVzKSB7XG4gICAgICAgIHJldHVybiBkc3Q7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gJHN0YXRlO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvdWxkVHJpZ2dlclJlbG9hZCh0bywgZnJvbSwgbG9jYWxzLCBvcHRpb25zKSB7XG4gICAgaWYgKHRvID09PSBmcm9tICYmICgobG9jYWxzID09PSBmcm9tLmxvY2FscyAmJiAhb3B0aW9ucy5yZWxvYWQpIHx8ICh0by5zZWxmLnJlbG9hZE9uU2VhcmNoID09PSBmYWxzZSkpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbn1cblxuYW5ndWxhci5tb2R1bGUoJ3VpLnJvdXRlci5zdGF0ZScpXG4gIC52YWx1ZSgnJHN0YXRlUGFyYW1zJywge30pXG4gIC5wcm92aWRlcignJHN0YXRlJywgJFN0YXRlUHJvdmlkZXIpO1xuIl0sImZpbGUiOiJzY3JpcHRzL3ZlbmRvcnMvYW5ndWxhci11aS1yb3V0ZXIvc3JjL3N0YXRlLmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=