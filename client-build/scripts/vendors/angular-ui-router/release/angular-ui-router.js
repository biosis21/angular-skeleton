/**
 * State-based routing for AngularJS
 * @version v0.2.13
 * @link http://angular-ui.github.com/
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */

/* commonjs package manager support (eg componentjs) */
if (typeof module !== "undefined" && typeof exports !== "undefined" && module.exports === exports){
  module.exports = 'ui.router';
}

(function (window, angular, undefined) {
/*jshint globalstrict:true*/
/*global angular:false*/
'use strict';

var isDefined = angular.isDefined,
    isFunction = angular.isFunction,
    isString = angular.isString,
    isObject = angular.isObject,
    isArray = angular.isArray,
    forEach = angular.forEach,
    extend = angular.extend,
    copy = angular.copy;

function inherit(parent, extra) {
  return extend(new (extend(function() {}, { prototype: parent }))(), extra);
}

function merge(dst) {
  forEach(arguments, function(obj) {
    if (obj !== dst) {
      forEach(obj, function(value, key) {
        if (!dst.hasOwnProperty(key)) dst[key] = value;
      });
    }
  });
  return dst;
}

/**
 * Finds the common ancestor path between two states.
 *
 * @param {Object} first The first state.
 * @param {Object} second The second state.
 * @return {Array} Returns an array of state names in descending order, not including the root.
 */
function ancestors(first, second) {
  var path = [];

  for (var n in first.path) {
    if (first.path[n] !== second.path[n]) break;
    path.push(first.path[n]);
  }
  return path;
}

/**
 * IE8-safe wrapper for `Object.keys()`.
 *
 * @param {Object} object A JavaScript object.
 * @return {Array} Returns the keys of the object as an array.
 */
function objectKeys(object) {
  if (Object.keys) {
    return Object.keys(object);
  }
  var result = [];

  angular.forEach(object, function(val, key) {
    result.push(key);
  });
  return result;
}

/**
 * IE8-safe wrapper for `Array.prototype.indexOf()`.
 *
 * @param {Array} array A JavaScript array.
 * @param {*} value A value to search the array for.
 * @return {Number} Returns the array index value of `value`, or `-1` if not present.
 */
function indexOf(array, value) {
  if (Array.prototype.indexOf) {
    return array.indexOf(value, Number(arguments[2]) || 0);
  }
  var len = array.length >>> 0, from = Number(arguments[2]) || 0;
  from = (from < 0) ? Math.ceil(from) : Math.floor(from);

  if (from < 0) from += len;

  for (; from < len; from++) {
    if (from in array && array[from] === value) return from;
  }
  return -1;
}

/**
 * Merges a set of parameters with all parameters inherited between the common parents of the
 * current state and a given destination state.
 *
 * @param {Object} currentParams The value of the current state parameters ($stateParams).
 * @param {Object} newParams The set of parameters which will be composited with inherited params.
 * @param {Object} $current Internal definition of object representing the current state.
 * @param {Object} $to Internal definition of object representing state to transition to.
 */
function inheritParams(currentParams, newParams, $current, $to) {
  var parents = ancestors($current, $to), parentParams, inherited = {}, inheritList = [];

  for (var i in parents) {
    if (!parents[i].params) continue;
    parentParams = objectKeys(parents[i].params);
    if (!parentParams.length) continue;

    for (var j in parentParams) {
      if (indexOf(inheritList, parentParams[j]) >= 0) continue;
      inheritList.push(parentParams[j]);
      inherited[parentParams[j]] = currentParams[parentParams[j]];
    }
  }
  return extend({}, inherited, newParams);
}

/**
 * Performs a non-strict comparison of the subset of two objects, defined by a list of keys.
 *
 * @param {Object} a The first object.
 * @param {Object} b The second object.
 * @param {Array} keys The list of keys within each object to compare. If the list is empty or not specified,
 *                     it defaults to the list of keys in `a`.
 * @return {Boolean} Returns `true` if the keys match, otherwise `false`.
 */
function equalForKeys(a, b, keys) {
  if (!keys) {
    keys = [];
    for (var n in a) keys.push(n); // Used instead of Object.keys() for IE8 compatibility
  }

  for (var i=0; i<keys.length; i++) {
    var k = keys[i];
    if (a[k] != b[k]) return false; // Not '===', values aren't necessarily normalized
  }
  return true;
}

/**
 * Returns the subset of an object, based on a list of keys.
 *
 * @param {Array} keys
 * @param {Object} values
 * @return {Boolean} Returns a subset of `values`.
 */
function filterByKeys(keys, values) {
  var filtered = {};

  forEach(keys, function (name) {
    filtered[name] = values[name];
  });
  return filtered;
}

// like _.indexBy
// when you know that your index values will be unique, or you want last-one-in to win
function indexBy(array, propName) {
  var result = {};
  forEach(array, function(item) {
    result[item[propName]] = item;
  });
  return result;
}

// extracted from underscore.js
// Return a copy of the object only containing the whitelisted properties.
function pick(obj) {
  var copy = {};
  var keys = Array.prototype.concat.apply(Array.prototype, Array.prototype.slice.call(arguments, 1));
  forEach(keys, function(key) {
    if (key in obj) copy[key] = obj[key];
  });
  return copy;
}

// extracted from underscore.js
// Return a copy of the object omitting the blacklisted properties.
function omit(obj) {
  var copy = {};
  var keys = Array.prototype.concat.apply(Array.prototype, Array.prototype.slice.call(arguments, 1));
  for (var key in obj) {
    if (indexOf(keys, key) == -1) copy[key] = obj[key];
  }
  return copy;
}

function pluck(collection, key) {
  var result = isArray(collection) ? [] : {};

  forEach(collection, function(val, i) {
    result[i] = isFunction(key) ? key(val) : val[key];
  });
  return result;
}

function filter(collection, callback) {
  var array = isArray(collection);
  var result = array ? [] : {};
  forEach(collection, function(val, i) {
    if (callback(val, i)) {
      result[array ? result.length : i] = val;
    }
  });
  return result;
}

function map(collection, callback) {
  var result = isArray(collection) ? [] : {};

  forEach(collection, function(val, i) {
    result[i] = callback(val, i);
  });
  return result;
}

/**
 * @ngdoc overview
 * @name ui.router.util
 *
 * @description
 * # ui.router.util sub-module
 *
 * This module is a dependency of other sub-modules. Do not include this module as a dependency
 * in your angular app (use {@link ui.router} module instead).
 *
 */
angular.module('ui.router.util', ['ng']);

/**
 * @ngdoc overview
 * @name ui.router.router
 * 
 * @requires ui.router.util
 *
 * @description
 * # ui.router.router sub-module
 *
 * This module is a dependency of other sub-modules. Do not include this module as a dependency
 * in your angular app (use {@link ui.router} module instead).
 */
angular.module('ui.router.router', ['ui.router.util']);

/**
 * @ngdoc overview
 * @name ui.router.state
 * 
 * @requires ui.router.router
 * @requires ui.router.util
 *
 * @description
 * # ui.router.state sub-module
 *
 * This module is a dependency of the main ui.router module. Do not include this module as a dependency
 * in your angular app (use {@link ui.router} module instead).
 * 
 */
angular.module('ui.router.state', ['ui.router.router', 'ui.router.util']);

/**
 * @ngdoc overview
 * @name ui.router
 *
 * @requires ui.router.state
 *
 * @description
 * # ui.router
 * 
 * ## The main module for ui.router 
 * There are several sub-modules included with the ui.router module, however only this module is needed
 * as a dependency within your angular app. The other modules are for organization purposes. 
 *
 * The modules are:
 * * ui.router - the main "umbrella" module
 * * ui.router.router - 
 * 
 * *You'll need to include **only** this module as the dependency within your angular app.*
 * 
 * <pre>
 * <!doctype html>
 * <html ng-app="myApp">
 * <head>
 *   <script src="js/angular.js"></script>
 *   <!-- Include the ui-router script -->
 *   <script src="js/angular-ui-router.min.js"></script>
 *   <script>
 *     // ...and add 'ui.router' as a dependency
 *     var myApp = angular.module('myApp', ['ui.router']);
 *   </script>
 * </head>
 * <body>
 * </body>
 * </html>
 * </pre>
 */
angular.module('ui.router', ['ui.router.state']);

angular.module('ui.router.compat', ['ui.router']);

/**
 * @ngdoc object
 * @name ui.router.util.$resolve
 *
 * @requires $q
 * @requires $injector
 *
 * @description
 * Manages resolution of (acyclic) graphs of promises.
 */
$Resolve.$inject = ['$q', '$injector'];
function $Resolve(  $q,    $injector) {
  
  var VISIT_IN_PROGRESS = 1,
      VISIT_DONE = 2,
      NOTHING = {},
      NO_DEPENDENCIES = [],
      NO_LOCALS = NOTHING,
      NO_PARENT = extend($q.when(NOTHING), { $$promises: NOTHING, $$values: NOTHING });
  

  /**
   * @ngdoc function
   * @name ui.router.util.$resolve#study
   * @methodOf ui.router.util.$resolve
   *
   * @description
   * Studies a set of invocables that are likely to be used multiple times.
   * <pre>
   * $resolve.study(invocables)(locals, parent, self)
   * </pre>
   * is equivalent to
   * <pre>
   * $resolve.resolve(invocables, locals, parent, self)
   * </pre>
   * but the former is more efficient (in fact `resolve` just calls `study` 
   * internally).
   *
   * @param {object} invocables Invocable objects
   * @return {function} a function to pass in locals, parent and self
   */
  this.study = function (invocables) {
    if (!isObject(invocables)) throw new Error("'invocables' must be an object");
    var invocableKeys = objectKeys(invocables || {});
    
    // Perform a topological sort of invocables to build an ordered plan
    var plan = [], cycle = [], visited = {};
    function visit(value, key) {
      if (visited[key] === VISIT_DONE) return;
      
      cycle.push(key);
      if (visited[key] === VISIT_IN_PROGRESS) {
        cycle.splice(0, indexOf(cycle, key));
        throw new Error("Cyclic dependency: " + cycle.join(" -> "));
      }
      visited[key] = VISIT_IN_PROGRESS;
      
      if (isString(value)) {
        plan.push(key, [ function() { return $injector.get(value); }], NO_DEPENDENCIES);
      } else {
        var params = $injector.annotate(value);
        forEach(params, function (param) {
          if (param !== key && invocables.hasOwnProperty(param)) visit(invocables[param], param);
        });
        plan.push(key, value, params);
      }
      
      cycle.pop();
      visited[key] = VISIT_DONE;
    }
    forEach(invocables, visit);
    invocables = cycle = visited = null; // plan is all that's required
    
    function isResolve(value) {
      return isObject(value) && value.then && value.$$promises;
    }
    
    return function (locals, parent, self) {
      if (isResolve(locals) && self === undefined) {
        self = parent; parent = locals; locals = null;
      }
      if (!locals) locals = NO_LOCALS;
      else if (!isObject(locals)) {
        throw new Error("'locals' must be an object");
      }       
      if (!parent) parent = NO_PARENT;
      else if (!isResolve(parent)) {
        throw new Error("'parent' must be a promise returned by $resolve.resolve()");
      }
      
      // To complete the overall resolution, we have to wait for the parent
      // promise and for the promise for each invokable in our plan.
      var resolution = $q.defer(),
          result = resolution.promise,
          promises = result.$$promises = {},
          values = extend({}, locals),
          wait = 1 + plan.length/3,
          merged = false;
          
      function done() {
        // Merge parent values we haven't got yet and publish our own $$values
        if (!--wait) {
          if (!merged) merge(values, parent.$$values); 
          result.$$values = values;
          result.$$promises = result.$$promises || true; // keep for isResolve()
          delete result.$$inheritedValues;
          resolution.resolve(values);
        }
      }
      
      function fail(reason) {
        result.$$failure = reason;
        resolution.reject(reason);
      }

      // Short-circuit if parent has already failed
      if (isDefined(parent.$$failure)) {
        fail(parent.$$failure);
        return result;
      }
      
      if (parent.$$inheritedValues) {
        merge(values, omit(parent.$$inheritedValues, invocableKeys));
      }

      // Merge parent values if the parent has already resolved, or merge
      // parent promises and wait if the parent resolve is still in progress.
      extend(promises, parent.$$promises);
      if (parent.$$values) {
        merged = merge(values, omit(parent.$$values, invocableKeys));
        result.$$inheritedValues = omit(parent.$$values, invocableKeys);
        done();
      } else {
        if (parent.$$inheritedValues) {
          result.$$inheritedValues = omit(parent.$$inheritedValues, invocableKeys);
        }        
        parent.then(done, fail);
      }
      
      // Process each invocable in the plan, but ignore any where a local of the same name exists.
      for (var i=0, ii=plan.length; i<ii; i+=3) {
        if (locals.hasOwnProperty(plan[i])) done();
        else invoke(plan[i], plan[i+1], plan[i+2]);
      }
      
      function invoke(key, invocable, params) {
        // Create a deferred for this invocation. Failures will propagate to the resolution as well.
        var invocation = $q.defer(), waitParams = 0;
        function onfailure(reason) {
          invocation.reject(reason);
          fail(reason);
        }
        // Wait for any parameter that we have a promise for (either from parent or from this
        // resolve; in that case study() will have made sure it's ordered before us in the plan).
        forEach(params, function (dep) {
          if (promises.hasOwnProperty(dep) && !locals.hasOwnProperty(dep)) {
            waitParams++;
            promises[dep].then(function (result) {
              values[dep] = result;
              if (!(--waitParams)) proceed();
            }, onfailure);
          }
        });
        if (!waitParams) proceed();
        function proceed() {
          if (isDefined(result.$$failure)) return;
          try {
            invocation.resolve($injector.invoke(invocable, self, values));
            invocation.promise.then(function (result) {
              values[key] = result;
              done();
            }, onfailure);
          } catch (e) {
            onfailure(e);
          }
        }
        // Publish promise synchronously; invocations further down in the plan may depend on it.
        promises[key] = invocation.promise;
      }
      
      return result;
    };
  };
  
  /**
   * @ngdoc function
   * @name ui.router.util.$resolve#resolve
   * @methodOf ui.router.util.$resolve
   *
   * @description
   * Resolves a set of invocables. An invocable is a function to be invoked via 
   * `$injector.invoke()`, and can have an arbitrary number of dependencies. 
   * An invocable can either return a value directly,
   * or a `$q` promise. If a promise is returned it will be resolved and the 
   * resulting value will be used instead. Dependencies of invocables are resolved 
   * (in this order of precedence)
   *
   * - from the specified `locals`
   * - from another invocable that is part of this `$resolve` call
   * - from an invocable that is inherited from a `parent` call to `$resolve` 
   *   (or recursively
   * - from any ancestor `$resolve` of that parent).
   *
   * The return value of `$resolve` is a promise for an object that contains 
   * (in this order of precedence)
   *
   * - any `locals` (if specified)
   * - the resolved return values of all injectables
   * - any values inherited from a `parent` call to `$resolve` (if specified)
   *
   * The promise will resolve after the `parent` promise (if any) and all promises 
   * returned by injectables have been resolved. If any invocable 
   * (or `$injector.invoke`) throws an exception, or if a promise returned by an 
   * invocable is rejected, the `$resolve` promise is immediately rejected with the 
   * same error. A rejection of a `parent` promise (if specified) will likewise be 
   * propagated immediately. Once the `$resolve` promise has been rejected, no 
   * further invocables will be called.
   * 
   * Cyclic dependencies between invocables are not permitted and will caues `$resolve`
   * to throw an error. As a special case, an injectable can depend on a parameter 
   * with the same name as the injectable, which will be fulfilled from the `parent` 
   * injectable of the same name. This allows inherited values to be decorated. 
   * Note that in this case any other injectable in the same `$resolve` with the same
   * dependency would see the decorated value, not the inherited value.
   *
   * Note that missing dependencies -- unlike cyclic dependencies -- will cause an 
   * (asynchronous) rejection of the `$resolve` promise rather than a (synchronous) 
   * exception.
   *
   * Invocables are invoked eagerly as soon as all dependencies are available. 
   * This is true even for dependencies inherited from a `parent` call to `$resolve`.
   *
   * As a special case, an invocable can be a string, in which case it is taken to 
   * be a service name to be passed to `$injector.get()`. This is supported primarily 
   * for backwards-compatibility with the `resolve` property of `$routeProvider` 
   * routes.
   *
   * @param {object} invocables functions to invoke or 
   * `$injector` services to fetch.
   * @param {object} locals  values to make available to the injectables
   * @param {object} parent  a promise returned by another call to `$resolve`.
   * @param {object} self  the `this` for the invoked methods
   * @return {object} Promise for an object that contains the resolved return value
   * of all invocables, as well as any inherited and local values.
   */
  this.resolve = function (invocables, locals, parent, self) {
    return this.study(invocables)(locals, parent, self);
  };
}

angular.module('ui.router.util').service('$resolve', $Resolve);


/**
 * @ngdoc object
 * @name ui.router.util.$templateFactory
 *
 * @requires $http
 * @requires $templateCache
 * @requires $injector
 *
 * @description
 * Service. Manages loading of templates.
 */
$TemplateFactory.$inject = ['$http', '$templateCache', '$injector'];
function $TemplateFactory(  $http,   $templateCache,   $injector) {

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromConfig
   * @methodOf ui.router.util.$templateFactory
   *
   * @description
   * Creates a template from a configuration object. 
   *
   * @param {object} config Configuration object for which to load a template. 
   * The following properties are search in the specified order, and the first one 
   * that is defined is used to create the template:
   *
   * @param {string|object} config.template html string template or function to 
   * load via {@link ui.router.util.$templateFactory#fromString fromString}.
   * @param {string|object} config.templateUrl url to load or a function returning 
   * the url to load via {@link ui.router.util.$templateFactory#fromUrl fromUrl}.
   * @param {Function} config.templateProvider function to invoke via 
   * {@link ui.router.util.$templateFactory#fromProvider fromProvider}.
   * @param {object} params  Parameters to pass to the template function.
   * @param {object} locals Locals to pass to `invoke` if the template is loaded 
   * via a `templateProvider`. Defaults to `{ params: params }`.
   *
   * @return {string|object}  The template html as a string, or a promise for 
   * that string,or `null` if no template is configured.
   */
  this.fromConfig = function (config, params, locals) {
    return (
      isDefined(config.template) ? this.fromString(config.template, params) :
      isDefined(config.templateUrl) ? this.fromUrl(config.templateUrl, params) :
      isDefined(config.templateProvider) ? this.fromProvider(config.templateProvider, params, locals) :
      null
    );
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromString
   * @methodOf ui.router.util.$templateFactory
   *
   * @description
   * Creates a template from a string or a function returning a string.
   *
   * @param {string|object} template html template as a string or function that 
   * returns an html template as a string.
   * @param {object} params Parameters to pass to the template function.
   *
   * @return {string|object} The template html as a string, or a promise for that 
   * string.
   */
  this.fromString = function (template, params) {
    return isFunction(template) ? template(params) : template;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromUrl
   * @methodOf ui.router.util.$templateFactory
   * 
   * @description
   * Loads a template from the a URL via `$http` and `$templateCache`.
   *
   * @param {string|Function} url url of the template to load, or a function 
   * that returns a url.
   * @param {Object} params Parameters to pass to the url function.
   * @return {string|Promise.<string>} The template html as a string, or a promise 
   * for that string.
   */
  this.fromUrl = function (url, params) {
    if (isFunction(url)) url = url(params);
    if (url == null) return null;
    else return $http
        .get(url, { cache: $templateCache, headers: { Accept: 'text/html' }})
        .then(function(response) { return response.data; });
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromProvider
   * @methodOf ui.router.util.$templateFactory
   *
   * @description
   * Creates a template by invoking an injectable provider function.
   *
   * @param {Function} provider Function to invoke via `$injector.invoke`
   * @param {Object} params Parameters for the template.
   * @param {Object} locals Locals to pass to `invoke`. Defaults to 
   * `{ params: params }`.
   * @return {string|Promise.<string>} The template html as a string, or a promise 
   * for that string.
   */
  this.fromProvider = function (provider, params, locals) {
    return $injector.invoke(provider, null, locals || { params: params });
  };
}

angular.module('ui.router.util').service('$templateFactory', $TemplateFactory);

var $$UMFP; // reference to $UrlMatcherFactoryProvider

/**
 * @ngdoc object
 * @name ui.router.util.type:UrlMatcher
 *
 * @description
 * Matches URLs against patterns and extracts named parameters from the path or the search
 * part of the URL. A URL pattern consists of a path pattern, optionally followed by '?' and a list
 * of search parameters. Multiple search parameter names are separated by '&'. Search parameters
 * do not influence whether or not a URL is matched, but their values are passed through into
 * the matched parameters returned by {@link ui.router.util.type:UrlMatcher#methods_exec exec}.
 * 
 * Path parameter placeholders can be specified using simple colon/catch-all syntax or curly brace
 * syntax, which optionally allows a regular expression for the parameter to be specified:
 *
 * * `':'` name - colon placeholder
 * * `'*'` name - catch-all placeholder
 * * `'{' name '}'` - curly placeholder
 * * `'{' name ':' regexp|type '}'` - curly placeholder with regexp or type name. Should the
 *   regexp itself contain curly braces, they must be in matched pairs or escaped with a backslash.
 *
 * Parameter names may contain only word characters (latin letters, digits, and underscore) and
 * must be unique within the pattern (across both path and search parameters). For colon 
 * placeholders or curly placeholders without an explicit regexp, a path parameter matches any
 * number of characters other than '/'. For catch-all placeholders the path parameter matches
 * any number of characters.
 * 
 * Examples:
 * 
 * * `'/hello/'` - Matches only if the path is exactly '/hello/'. There is no special treatment for
 *   trailing slashes, and patterns have to match the entire path, not just a prefix.
 * * `'/user/:id'` - Matches '/user/bob' or '/user/1234!!!' or even '/user/' but not '/user' or
 *   '/user/bob/details'. The second path segment will be captured as the parameter 'id'.
 * * `'/user/{id}'` - Same as the previous example, but using curly brace syntax.
 * * `'/user/{id:[^/]*}'` - Same as the previous example.
 * * `'/user/{id:[0-9a-fA-F]{1,8}}'` - Similar to the previous example, but only matches if the id
 *   parameter consists of 1 to 8 hex digits.
 * * `'/files/{path:.*}'` - Matches any URL starting with '/files/' and captures the rest of the
 *   path into the parameter 'path'.
 * * `'/files/*path'` - ditto.
 * * `'/calendar/{start:date}'` - Matches "/calendar/2014-11-12" (because the pattern defined
 *   in the built-in  `date` Type matches `2014-11-12`) and provides a Date object in $stateParams.start
 *
 * @param {string} pattern  The pattern to compile into a matcher.
 * @param {Object} config  A configuration object hash:
 * @param {Object=} parentMatcher Used to concatenate the pattern/config onto
 *   an existing UrlMatcher
 *
 * * `caseInsensitive` - `true` if URL matching should be case insensitive, otherwise `false`, the default value (for backward compatibility) is `false`.
 * * `strict` - `false` if matching against a URL with a trailing slash should be treated as equivalent to a URL without a trailing slash, the default value is `true`.
 *
 * @property {string} prefix  A static prefix of this pattern. The matcher guarantees that any
 *   URL matching this matcher (i.e. any string for which {@link ui.router.util.type:UrlMatcher#methods_exec exec()} returns
 *   non-null) will start with this prefix.
 *
 * @property {string} source  The pattern that was passed into the constructor
 *
 * @property {string} sourcePath  The path portion of the source property
 *
 * @property {string} sourceSearch  The search portion of the source property
 *
 * @property {string} regex  The constructed regex that will be used to match against the url when 
 *   it is time to determine which url will match.
 *
 * @returns {Object}  New `UrlMatcher` object
 */
function UrlMatcher(pattern, config, parentMatcher) {
  config = extend({ params: {} }, isObject(config) ? config : {});

  // Find all placeholders and create a compiled pattern, using either classic or curly syntax:
  //   '*' name
  //   ':' name
  //   '{' name '}'
  //   '{' name ':' regexp '}'
  // The regular expression is somewhat complicated due to the need to allow curly braces
  // inside the regular expression. The placeholder regexp breaks down as follows:
  //    ([:*])([\w\[\]]+)              - classic placeholder ($1 / $2) (search version has - for snake-case)
  //    \{([\w\[\]]+)(?:\:( ... ))?\}  - curly brace placeholder ($3) with optional regexp/type ... ($4) (search version has - for snake-case
  //    (?: ... | ... | ... )+         - the regexp consists of any number of atoms, an atom being either
  //    [^{}\\]+                       - anything other than curly braces or backslash
  //    \\.                            - a backslash escape
  //    \{(?:[^{}\\]+|\\.)*\}          - a matched set of curly braces containing other atoms
  var placeholder       = /([:*])([\w\[\]]+)|\{([\w\[\]]+)(?:\:((?:[^{}\\]+|\\.|\{(?:[^{}\\]+|\\.)*\})+))?\}/g,
      searchPlaceholder = /([:]?)([\w\[\]-]+)|\{([\w\[\]-]+)(?:\:((?:[^{}\\]+|\\.|\{(?:[^{}\\]+|\\.)*\})+))?\}/g,
      compiled = '^', last = 0, m,
      segments = this.segments = [],
      parentParams = parentMatcher ? parentMatcher.params : {},
      params = this.params = parentMatcher ? parentMatcher.params.$$new() : new $$UMFP.ParamSet(),
      paramNames = [];

  function addParameter(id, type, config, location) {
    paramNames.push(id);
    if (parentParams[id]) return parentParams[id];
    if (!/^\w+(-+\w+)*(?:\[\])?$/.test(id)) throw new Error("Invalid parameter name '" + id + "' in pattern '" + pattern + "'");
    if (params[id]) throw new Error("Duplicate parameter name '" + id + "' in pattern '" + pattern + "'");
    params[id] = new $$UMFP.Param(id, type, config, location);
    return params[id];
  }

  function quoteRegExp(string, pattern, squash) {
    var surroundPattern = ['',''], result = string.replace(/[\\\[\]\^$*+?.()|{}]/g, "\\$&");
    if (!pattern) return result;
    switch(squash) {
      case false: surroundPattern = ['(', ')'];   break;
      case true:  surroundPattern = ['?(', ')?']; break;
      default:    surroundPattern = ['(' + squash + "|", ')?'];  break;
    }
    return result + surroundPattern[0] + pattern + surroundPattern[1];
  }

  this.source = pattern;

  // Split into static segments separated by path parameter placeholders.
  // The number of segments is always 1 more than the number of parameters.
  function matchDetails(m, isSearch) {
    var id, regexp, segment, type, cfg, arrayMode;
    id          = m[2] || m[3]; // IE[78] returns '' for unmatched groups instead of null
    cfg         = config.params[id];
    segment     = pattern.substring(last, m.index);
    regexp      = isSearch ? m[4] : m[4] || (m[1] == '*' ? '.*' : null);
    type        = $$UMFP.type(regexp || "string") || inherit($$UMFP.type("string"), { pattern: new RegExp(regexp) });
    return {
      id: id, regexp: regexp, segment: segment, type: type, cfg: cfg
    };
  }

  var p, param, segment;
  while ((m = placeholder.exec(pattern))) {
    p = matchDetails(m, false);
    if (p.segment.indexOf('?') >= 0) break; // we're into the search part

    param = addParameter(p.id, p.type, p.cfg, "path");
    compiled += quoteRegExp(p.segment, param.type.pattern.source, param.squash);
    segments.push(p.segment);
    last = placeholder.lastIndex;
  }
  segment = pattern.substring(last);

  // Find any search parameter names and remove them from the last segment
  var i = segment.indexOf('?');

  if (i >= 0) {
    var search = this.sourceSearch = segment.substring(i);
    segment = segment.substring(0, i);
    this.sourcePath = pattern.substring(0, last + i);

    if (search.length > 0) {
      last = 0;
      while ((m = searchPlaceholder.exec(search))) {
        p = matchDetails(m, true);
        param = addParameter(p.id, p.type, p.cfg, "search");
        last = placeholder.lastIndex;
        // check if ?&
      }
    }
  } else {
    this.sourcePath = pattern;
    this.sourceSearch = '';
  }

  compiled += quoteRegExp(segment) + (config.strict === false ? '\/?' : '') + '$';
  segments.push(segment);

  this.regexp = new RegExp(compiled, config.caseInsensitive ? 'i' : undefined);
  this.prefix = segments[0];
  this.$$paramNames = paramNames;
}

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#concat
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Returns a new matcher for a pattern constructed by appending the path part and adding the
 * search parameters of the specified pattern to this pattern. The current pattern is not
 * modified. This can be understood as creating a pattern for URLs that are relative to (or
 * suffixes of) the current pattern.
 *
 * @example
 * The following two matchers are equivalent:
 * <pre>
 * new UrlMatcher('/user/{id}?q').concat('/details?date');
 * new UrlMatcher('/user/{id}/details?q&date');
 * </pre>
 *
 * @param {string} pattern  The pattern to append.
 * @param {Object} config  An object hash of the configuration for the matcher.
 * @returns {UrlMatcher}  A matcher for the concatenated pattern.
 */
UrlMatcher.prototype.concat = function (pattern, config) {
  // Because order of search parameters is irrelevant, we can add our own search
  // parameters to the end of the new pattern. Parse the new pattern by itself
  // and then join the bits together, but it's much easier to do this on a string level.
  var defaultConfig = {
    caseInsensitive: $$UMFP.caseInsensitive(),
    strict: $$UMFP.strictMode(),
    squash: $$UMFP.defaultSquashPolicy()
  };
  return new UrlMatcher(this.sourcePath + pattern + this.sourceSearch, extend(defaultConfig, config), this);
};

UrlMatcher.prototype.toString = function () {
  return this.source;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#exec
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Tests the specified path against this matcher, and returns an object containing the captured
 * parameter values, or null if the path does not match. The returned object contains the values
 * of any search parameters that are mentioned in the pattern, but their value may be null if
 * they are not present in `searchParams`. This means that search parameters are always treated
 * as optional.
 *
 * @example
 * <pre>
 * new UrlMatcher('/user/{id}?q&r').exec('/user/bob', {
 *   x: '1', q: 'hello'
 * });
 * // returns { id: 'bob', q: 'hello', r: null }
 * </pre>
 *
 * @param {string} path  The URL path to match, e.g. `$location.path()`.
 * @param {Object} searchParams  URL search parameters, e.g. `$location.search()`.
 * @returns {Object}  The captured parameter values.
 */
UrlMatcher.prototype.exec = function (path, searchParams) {
  var m = this.regexp.exec(path);
  if (!m) return null;
  searchParams = searchParams || {};

  var paramNames = this.parameters(), nTotal = paramNames.length,
    nPath = this.segments.length - 1,
    values = {}, i, j, cfg, paramName;

  if (nPath !== m.length - 1) throw new Error("Unbalanced capture group in route '" + this.source + "'");

  function decodePathArray(string) {
    function reverseString(str) { return str.split("").reverse().join(""); }
    function unquoteDashes(str) { return str.replace(/\\-/, "-"); }

    var split = reverseString(string).split(/-(?!\\)/);
    var allReversed = map(split, reverseString);
    return map(allReversed, unquoteDashes).reverse();
  }

  for (i = 0; i < nPath; i++) {
    paramName = paramNames[i];
    var param = this.params[paramName];
    var paramVal = m[i+1];
    // if the param value matches a pre-replace pair, replace the value before decoding.
    for (j = 0; j < param.replace; j++) {
      if (param.replace[j].from === paramVal) paramVal = param.replace[j].to;
    }
    if (paramVal && param.array === true) paramVal = decodePathArray(paramVal);
    values[paramName] = param.value(paramVal);
  }
  for (/**/; i < nTotal; i++) {
    paramName = paramNames[i];
    values[paramName] = this.params[paramName].value(searchParams[paramName]);
  }

  return values;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#parameters
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Returns the names of all path and search parameters of this pattern in an unspecified order.
 * 
 * @returns {Array.<string>}  An array of parameter names. Must be treated as read-only. If the
 *    pattern has no parameters, an empty array is returned.
 */
UrlMatcher.prototype.parameters = function (param) {
  if (!isDefined(param)) return this.$$paramNames;
  return this.params[param] || null;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#validate
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Checks an object hash of parameters to validate their correctness according to the parameter
 * types of this `UrlMatcher`.
 *
 * @param {Object} params The object hash of parameters to validate.
 * @returns {boolean} Returns `true` if `params` validates, otherwise `false`.
 */
UrlMatcher.prototype.validates = function (params) {
  return this.params.$$validates(params);
};

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#format
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Creates a URL that matches this pattern by substituting the specified values
 * for the path and search parameters. Null values for path parameters are
 * treated as empty strings.
 *
 * @example
 * <pre>
 * new UrlMatcher('/user/{id}?q').format({ id:'bob', q:'yes' });
 * // returns '/user/bob?q=yes'
 * </pre>
 *
 * @param {Object} values  the values to substitute for the parameters in this pattern.
 * @returns {string}  the formatted URL (path and optionally search part).
 */
UrlMatcher.prototype.format = function (values) {
  values = values || {};
  var segments = this.segments, params = this.parameters(), paramset = this.params;
  if (!this.validates(values)) return null;

  var i, search = false, nPath = segments.length - 1, nTotal = params.length, result = segments[0];

  function encodeDashes(str) { // Replace dashes with encoded "\-"
    return encodeURIComponent(str).replace(/-/g, function(c) { return '%5C%' + c.charCodeAt(0).toString(16).toUpperCase(); });
  }

  for (i = 0; i < nTotal; i++) {
    var isPathParam = i < nPath;
    var name = params[i], param = paramset[name], value = param.value(values[name]);
    var isDefaultValue = param.isOptional && param.type.equals(param.value(), value);
    var squash = isDefaultValue ? param.squash : false;
    var encoded = param.type.encode(value);

    if (isPathParam) {
      var nextSegment = segments[i + 1];
      if (squash === false) {
        if (encoded != null) {
          if (isArray(encoded)) {
            result += map(encoded, encodeDashes).join("-");
          } else {
            result += encodeURIComponent(encoded);
          }
        }
        result += nextSegment;
      } else if (squash === true) {
        var capture = result.match(/\/$/) ? /\/?(.*)/ : /(.*)/;
        result += nextSegment.match(capture)[1];
      } else if (isString(squash)) {
        result += squash + nextSegment;
      }
    } else {
      if (encoded == null || (isDefaultValue && squash !== false)) continue;
      if (!isArray(encoded)) encoded = [ encoded ];
      encoded = map(encoded, encodeURIComponent).join('&' + name + '=');
      result += (search ? '&' : '?') + (name + '=' + encoded);
      search = true;
    }
  }

  return result;
};

/**
 * @ngdoc object
 * @name ui.router.util.type:Type
 *
 * @description
 * Implements an interface to define custom parameter types that can be decoded from and encoded to
 * string parameters matched in a URL. Used by {@link ui.router.util.type:UrlMatcher `UrlMatcher`}
 * objects when matching or formatting URLs, or comparing or validating parameter values.
 *
 * See {@link ui.router.util.$urlMatcherFactory#methods_type `$urlMatcherFactory#type()`} for more
 * information on registering custom types.
 *
 * @param {Object} config  A configuration object which contains the custom type definition.  The object's
 *        properties will override the default methods and/or pattern in `Type`'s public interface.
 * @example
 * <pre>
 * {
 *   decode: function(val) { return parseInt(val, 10); },
 *   encode: function(val) { return val && val.toString(); },
 *   equals: function(a, b) { return this.is(a) && a === b; },
 *   is: function(val) { return angular.isNumber(val) isFinite(val) && val % 1 === 0; },
 *   pattern: /\d+/
 * }
 * </pre>
 *
 * @property {RegExp} pattern The regular expression pattern used to match values of this type when
 *           coming from a substring of a URL.
 *
 * @returns {Object}  Returns a new `Type` object.
 */
function Type(config) {
  extend(this, config);
}

/**
 * @ngdoc function
 * @name ui.router.util.type:Type#is
 * @methodOf ui.router.util.type:Type
 *
 * @description
 * Detects whether a value is of a particular type. Accepts a native (decoded) value
 * and determines whether it matches the current `Type` object.
 *
 * @param {*} val  The value to check.
 * @param {string} key  Optional. If the type check is happening in the context of a specific
 *        {@link ui.router.util.type:UrlMatcher `UrlMatcher`} object, this is the name of the
 *        parameter in which `val` is stored. Can be used for meta-programming of `Type` objects.
 * @returns {Boolean}  Returns `true` if the value matches the type, otherwise `false`.
 */
Type.prototype.is = function(val, key) {
  return true;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:Type#encode
 * @methodOf ui.router.util.type:Type
 *
 * @description
 * Encodes a custom/native type value to a string that can be embedded in a URL. Note that the
 * return value does *not* need to be URL-safe (i.e. passed through `encodeURIComponent()`), it
 * only needs to be a representation of `val` that has been coerced to a string.
 *
 * @param {*} val  The value to encode.
 * @param {string} key  The name of the parameter in which `val` is stored. Can be used for
 *        meta-programming of `Type` objects.
 * @returns {string}  Returns a string representation of `val` that can be encoded in a URL.
 */
Type.prototype.encode = function(val, key) {
  return val;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:Type#decode
 * @methodOf ui.router.util.type:Type
 *
 * @description
 * Converts a parameter value (from URL string or transition param) to a custom/native value.
 *
 * @param {string} val  The URL parameter value to decode.
 * @param {string} key  The name of the parameter in which `val` is stored. Can be used for
 *        meta-programming of `Type` objects.
 * @returns {*}  Returns a custom representation of the URL parameter value.
 */
Type.prototype.decode = function(val, key) {
  return val;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:Type#equals
 * @methodOf ui.router.util.type:Type
 *
 * @description
 * Determines whether two decoded values are equivalent.
 *
 * @param {*} a  A value to compare against.
 * @param {*} b  A value to compare against.
 * @returns {Boolean}  Returns `true` if the values are equivalent/equal, otherwise `false`.
 */
Type.prototype.equals = function(a, b) {
  return a == b;
};

Type.prototype.$subPattern = function() {
  var sub = this.pattern.toString();
  return sub.substr(1, sub.length - 2);
};

Type.prototype.pattern = /.*/;

Type.prototype.toString = function() { return "{Type:" + this.name + "}"; };

/*
 * Wraps an existing custom Type as an array of Type, depending on 'mode'.
 * e.g.:
 * - urlmatcher pattern "/path?{queryParam[]:int}"
 * - url: "/path?queryParam=1&queryParam=2
 * - $stateParams.queryParam will be [1, 2]
 * if `mode` is "auto", then
 * - url: "/path?queryParam=1 will create $stateParams.queryParam: 1
 * - url: "/path?queryParam=1&queryParam=2 will create $stateParams.queryParam: [1, 2]
 */
Type.prototype.$asArray = function(mode, isSearch) {
  if (!mode) return this;
  if (mode === "auto" && !isSearch) throw new Error("'auto' array mode is for query parameters only");
  return new ArrayType(this, mode);

  function ArrayType(type, mode) {
    function bindTo(type, callbackName) {
      return function() {
        return type[callbackName].apply(type, arguments);
      };
    }

    // Wrap non-array value as array
    function arrayWrap(val) { return isArray(val) ? val : (isDefined(val) ? [ val ] : []); }
    // Unwrap array value for "auto" mode. Return undefined for empty array.
    function arrayUnwrap(val) {
      switch(val.length) {
        case 0: return undefined;
        case 1: return mode === "auto" ? val[0] : val;
        default: return val;
      }
    }
    function falsey(val) { return !val; }

    // Wraps type (.is/.encode/.decode) functions to operate on each value of an array
    function arrayHandler(callback, allTruthyMode) {
      return function handleArray(val) {
        val = arrayWrap(val);
        var result = map(val, callback);
        if (allTruthyMode === true)
          return filter(result, falsey).length === 0;
        return arrayUnwrap(result);
      };
    }

    // Wraps type (.equals) functions to operate on each value of an array
    function arrayEqualsHandler(callback) {
      return function handleArray(val1, val2) {
        var left = arrayWrap(val1), right = arrayWrap(val2);
        if (left.length !== right.length) return false;
        for (var i = 0; i < left.length; i++) {
          if (!callback(left[i], right[i])) return false;
        }
        return true;
      };
    }

    this.encode = arrayHandler(bindTo(type, 'encode'));
    this.decode = arrayHandler(bindTo(type, 'decode'));
    this.is     = arrayHandler(bindTo(type, 'is'), true);
    this.equals = arrayEqualsHandler(bindTo(type, 'equals'));
    this.pattern = type.pattern;
    this.$arrayMode = mode;
  }
};



/**
 * @ngdoc object
 * @name ui.router.util.$urlMatcherFactory
 *
 * @description
 * Factory for {@link ui.router.util.type:UrlMatcher `UrlMatcher`} instances. The factory
 * is also available to providers under the name `$urlMatcherFactoryProvider`.
 */
function $UrlMatcherFactory() {
  $$UMFP = this;

  var isCaseInsensitive = false, isStrictMode = true, defaultSquashPolicy = false;

  function valToString(val) { return val != null ? val.toString().replace(/\//g, "%2F") : val; }
  function valFromString(val) { return val != null ? val.toString().replace(/%2F/g, "/") : val; }
//  TODO: in 1.0, make string .is() return false if value is undefined by default.
//  function regexpMatches(val) { /*jshint validthis:true */ return isDefined(val) && this.pattern.test(val); }
  function regexpMatches(val) { /*jshint validthis:true */ return this.pattern.test(val); }

  var $types = {}, enqueue = true, typeQueue = [], injector, defaultTypes = {
    string: {
      encode: valToString,
      decode: valFromString,
      is: regexpMatches,
      pattern: /[^/]*/
    },
    int: {
      encode: valToString,
      decode: function(val) { return parseInt(val, 10); },
      is: function(val) { return isDefined(val) && this.decode(val.toString()) === val; },
      pattern: /\d+/
    },
    bool: {
      encode: function(val) { return val ? 1 : 0; },
      decode: function(val) { return parseInt(val, 10) !== 0; },
      is: function(val) { return val === true || val === false; },
      pattern: /0|1/
    },
    date: {
      encode: function (val) {
        if (!this.is(val))
          return undefined;
        return [ val.getFullYear(),
          ('0' + (val.getMonth() + 1)).slice(-2),
          ('0' + val.getDate()).slice(-2)
        ].join("-");
      },
      decode: function (val) {
        if (this.is(val)) return val;
        var match = this.capture.exec(val);
        return match ? new Date(match[1], match[2] - 1, match[3]) : undefined;
      },
      is: function(val) { return val instanceof Date && !isNaN(val.valueOf()); },
      equals: function (a, b) { return this.is(a) && this.is(b) && a.toISOString() === b.toISOString(); },
      pattern: /[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[1-2][0-9]|3[0-1])/,
      capture: /([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])/
    },
    json: {
      encode: angular.toJson,
      decode: angular.fromJson,
      is: angular.isObject,
      equals: angular.equals,
      pattern: /[^/]*/
    },
    any: { // does not encode/decode
      encode: angular.identity,
      decode: angular.identity,
      is: angular.identity,
      equals: angular.equals,
      pattern: /.*/
    }
  };

  function getDefaultConfig() {
    return {
      strict: isStrictMode,
      caseInsensitive: isCaseInsensitive
    };
  }

  function isInjectable(value) {
    return (isFunction(value) || (isArray(value) && isFunction(value[value.length - 1])));
  }

  /**
   * [Internal] Get the default value of a parameter, which may be an injectable function.
   */
  $UrlMatcherFactory.$$getDefaultValue = function(config) {
    if (!isInjectable(config.value)) return config.value;
    if (!injector) throw new Error("Injectable functions cannot be called at configuration time");
    return injector.invoke(config.value);
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#caseInsensitive
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Defines whether URL matching should be case sensitive (the default behavior), or not.
   *
   * @param {boolean} value `false` to match URL in a case sensitive manner; otherwise `true`;
   * @returns {boolean} the current value of caseInsensitive
   */
  this.caseInsensitive = function(value) {
    if (isDefined(value))
      isCaseInsensitive = value;
    return isCaseInsensitive;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#strictMode
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Defines whether URLs should match trailing slashes, or not (the default behavior).
   *
   * @param {boolean=} value `false` to match trailing slashes in URLs, otherwise `true`.
   * @returns {boolean} the current value of strictMode
   */
  this.strictMode = function(value) {
    if (isDefined(value))
      isStrictMode = value;
    return isStrictMode;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#defaultSquashPolicy
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Sets the default behavior when generating or matching URLs with default parameter values.
   *
   * @param {string} value A string that defines the default parameter URL squashing behavior.
   *    `nosquash`: When generating an href with a default parameter value, do not squash the parameter value from the URL
   *    `slash`: When generating an href with a default parameter value, squash (remove) the parameter value, and, if the
   *             parameter is surrounded by slashes, squash (remove) one slash from the URL
   *    any other string, e.g. "~": When generating an href with a default parameter value, squash (remove)
   *             the parameter value from the URL and replace it with this string.
   */
  this.defaultSquashPolicy = function(value) {
    if (!isDefined(value)) return defaultSquashPolicy;
    if (value !== true && value !== false && !isString(value))
      throw new Error("Invalid squash policy: " + value + ". Valid policies: false, true, arbitrary-string");
    defaultSquashPolicy = value;
    return value;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#compile
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Creates a {@link ui.router.util.type:UrlMatcher `UrlMatcher`} for the specified pattern.
   *
   * @param {string} pattern  The URL pattern.
   * @param {Object} config  The config object hash.
   * @returns {UrlMatcher}  The UrlMatcher.
   */
  this.compile = function (pattern, config) {
    return new UrlMatcher(pattern, extend(getDefaultConfig(), config));
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#isMatcher
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Returns true if the specified object is a `UrlMatcher`, or false otherwise.
   *
   * @param {Object} object  The object to perform the type check against.
   * @returns {Boolean}  Returns `true` if the object matches the `UrlMatcher` interface, by
   *          implementing all the same methods.
   */
  this.isMatcher = function (o) {
    if (!isObject(o)) return false;
    var result = true;

    forEach(UrlMatcher.prototype, function(val, name) {
      if (isFunction(val)) {
        result = result && (isDefined(o[name]) && isFunction(o[name]));
      }
    });
    return result;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#type
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Registers a custom {@link ui.router.util.type:Type `Type`} object that can be used to
   * generate URLs with typed parameters.
   *
   * @param {string} name  The type name.
   * @param {Object|Function} definition   The type definition. See
   *        {@link ui.router.util.type:Type `Type`} for information on the values accepted.
   * @param {Object|Function} definitionFn (optional) A function that is injected before the app
   *        runtime starts.  The result of this function is merged into the existing `definition`.
   *        See {@link ui.router.util.type:Type `Type`} for information on the values accepted.
   *
   * @returns {Object}  Returns `$urlMatcherFactoryProvider`.
   *
   * @example
   * This is a simple example of a custom type that encodes and decodes items from an
   * array, using the array index as the URL-encoded value:
   *
   * <pre>
   * var list = ['John', 'Paul', 'George', 'Ringo'];
   *
   * $urlMatcherFactoryProvider.type('listItem', {
   *   encode: function(item) {
   *     // Represent the list item in the URL using its corresponding index
   *     return list.indexOf(item);
   *   },
   *   decode: function(item) {
   *     // Look up the list item by index
   *     return list[parseInt(item, 10)];
   *   },
   *   is: function(item) {
   *     // Ensure the item is valid by checking to see that it appears
   *     // in the list
   *     return list.indexOf(item) > -1;
   *   }
   * });
   *
   * $stateProvider.state('list', {
   *   url: "/list/{item:listItem}",
   *   controller: function($scope, $stateParams) {
   *     console.log($stateParams.item);
   *   }
   * });
   *
   * // ...
   *
   * // Changes URL to '/list/3', logs "Ringo" to the console
   * $state.go('list', { item: "Ringo" });
   * </pre>
   *
   * This is a more complex example of a type that relies on dependency injection to
   * interact with services, and uses the parameter name from the URL to infer how to
   * handle encoding and decoding parameter values:
   *
   * <pre>
   * // Defines a custom type that gets a value from a service,
   * // where each service gets different types of values from
   * // a backend API:
   * $urlMatcherFactoryProvider.type('dbObject', {}, function(Users, Posts) {
   *
   *   // Matches up services to URL parameter names
   *   var services = {
   *     user: Users,
   *     post: Posts
   *   };
   *
   *   return {
   *     encode: function(object) {
   *       // Represent the object in the URL using its unique ID
   *       return object.id;
   *     },
   *     decode: function(value, key) {
   *       // Look up the object by ID, using the parameter
   *       // name (key) to call the correct service
   *       return services[key].findById(value);
   *     },
   *     is: function(object, key) {
   *       // Check that object is a valid dbObject
   *       return angular.isObject(object) && object.id && services[key];
   *     }
   *     equals: function(a, b) {
   *       // Check the equality of decoded objects by comparing
   *       // their unique IDs
   *       return a.id === b.id;
   *     }
   *   };
   * });
   *
   * // In a config() block, you can then attach URLs with
   * // type-annotated parameters:
   * $stateProvider.state('users', {
   *   url: "/users",
   *   // ...
   * }).state('users.item', {
   *   url: "/{user:dbObject}",
   *   controller: function($scope, $stateParams) {
   *     // $stateParams.user will now be an object returned from
   *     // the Users service
   *   },
   *   // ...
   * });
   * </pre>
   */
  this.type = function (name, definition, definitionFn) {
    if (!isDefined(definition)) return $types[name];
    if ($types.hasOwnProperty(name)) throw new Error("A type named '" + name + "' has already been defined.");

    $types[name] = new Type(extend({ name: name }, definition));
    if (definitionFn) {
      typeQueue.push({ name: name, def: definitionFn });
      if (!enqueue) flushTypeQueue();
    }
    return this;
  };

  // `flushTypeQueue()` waits until `$urlMatcherFactory` is injected before invoking the queued `definitionFn`s
  function flushTypeQueue() {
    while(typeQueue.length) {
      var type = typeQueue.shift();
      if (type.pattern) throw new Error("You cannot override a type's .pattern at runtime.");
      angular.extend($types[type.name], injector.invoke(type.def));
    }
  }

  // Register default types. Store them in the prototype of $types.
  forEach(defaultTypes, function(type, name) { $types[name] = new Type(extend({name: name}, type)); });
  $types = inherit($types, {});

  /* No need to document $get, since it returns this */
  this.$get = ['$injector', function ($injector) {
    injector = $injector;
    enqueue = false;
    flushTypeQueue();

    forEach(defaultTypes, function(type, name) {
      if (!$types[name]) $types[name] = new Type(type);
    });
    return this;
  }];

  this.Param = function Param(id, type, config, location) {
    var self = this;
    config = unwrapShorthand(config);
    type = getType(config, type, location);
    var arrayMode = getArrayMode();
    type = arrayMode ? type.$asArray(arrayMode, location === "search") : type;
    if (type.name === "string" && !arrayMode && location === "path" && config.value === undefined)
      config.value = ""; // for 0.2.x; in 0.3.0+ do not automatically default to ""
    var isOptional = config.value !== undefined;
    var squash = getSquashPolicy(config, isOptional);
    var replace = getReplace(config, arrayMode, isOptional, squash);

    function unwrapShorthand(config) {
      var keys = isObject(config) ? objectKeys(config) : [];
      var isShorthand = indexOf(keys, "value") === -1 && indexOf(keys, "type") === -1 &&
                        indexOf(keys, "squash") === -1 && indexOf(keys, "array") === -1;
      if (isShorthand) config = { value: config };
      config.$$fn = isInjectable(config.value) ? config.value : function () { return config.value; };
      return config;
    }

    function getType(config, urlType, location) {
      if (config.type && urlType) throw new Error("Param '"+id+"' has two type configurations.");
      if (urlType) return urlType;
      if (!config.type) return (location === "config" ? $types.any : $types.string);
      return config.type instanceof Type ? config.type : new Type(config.type);
    }

    // array config: param name (param[]) overrides default settings.  explicit config overrides param name.
    function getArrayMode() {
      var arrayDefaults = { array: (location === "search" ? "auto" : false) };
      var arrayParamNomenclature = id.match(/\[\]$/) ? { array: true } : {};
      return extend(arrayDefaults, arrayParamNomenclature, config).array;
    }

    /**
     * returns false, true, or the squash value to indicate the "default parameter url squash policy".
     */
    function getSquashPolicy(config, isOptional) {
      var squash = config.squash;
      if (!isOptional || squash === false) return false;
      if (!isDefined(squash) || squash == null) return defaultSquashPolicy;
      if (squash === true || isString(squash)) return squash;
      throw new Error("Invalid squash policy: '" + squash + "'. Valid policies: false, true, or arbitrary string");
    }

    function getReplace(config, arrayMode, isOptional, squash) {
      var replace, configuredKeys, defaultPolicy = [
        { from: "",   to: (isOptional || arrayMode ? undefined : "") },
        { from: null, to: (isOptional || arrayMode ? undefined : "") }
      ];
      replace = isArray(config.replace) ? config.replace : [];
      if (isString(squash))
        replace.push({ from: squash, to: undefined });
      configuredKeys = map(replace, function(item) { return item.from; } );
      return filter(defaultPolicy, function(item) { return indexOf(configuredKeys, item.from) === -1; }).concat(replace);
    }

    /**
     * [Internal] Get the default value of a parameter, which may be an injectable function.
     */
    function $$getDefaultValue() {
      if (!injector) throw new Error("Injectable functions cannot be called at configuration time");
      return injector.invoke(config.$$fn);
    }

    /**
     * [Internal] Gets the decoded representation of a value if the value is defined, otherwise, returns the
     * default value, which may be the result of an injectable function.
     */
    function $value(value) {
      function hasReplaceVal(val) { return function(obj) { return obj.from === val; }; }
      function $replace(value) {
        var replacement = map(filter(self.replace, hasReplaceVal(value)), function(obj) { return obj.to; });
        return replacement.length ? replacement[0] : value;
      }
      value = $replace(value);
      return isDefined(value) ? self.type.decode(value) : $$getDefaultValue();
    }

    function toString() { return "{Param:" + id + " " + type + " squash: '" + squash + "' optional: " + isOptional + "}"; }

    extend(this, {
      id: id,
      type: type,
      location: location,
      array: arrayMode,
      squash: squash,
      replace: replace,
      isOptional: isOptional,
      value: $value,
      dynamic: undefined,
      config: config,
      toString: toString
    });
  };

  function ParamSet(params) {
    extend(this, params || {});
  }

  ParamSet.prototype = {
    $$new: function() {
      return inherit(this, extend(new ParamSet(), { $$parent: this}));
    },
    $$keys: function () {
      var keys = [], chain = [], parent = this,
        ignore = objectKeys(ParamSet.prototype);
      while (parent) { chain.push(parent); parent = parent.$$parent; }
      chain.reverse();
      forEach(chain, function(paramset) {
        forEach(objectKeys(paramset), function(key) {
            if (indexOf(keys, key) === -1 && indexOf(ignore, key) === -1) keys.push(key);
        });
      });
      return keys;
    },
    $$values: function(paramValues) {
      var values = {}, self = this;
      forEach(self.$$keys(), function(key) {
        values[key] = self[key].value(paramValues && paramValues[key]);
      });
      return values;
    },
    $$equals: function(paramValues1, paramValues2) {
      var equal = true, self = this;
      forEach(self.$$keys(), function(key) {
        var left = paramValues1 && paramValues1[key], right = paramValues2 && paramValues2[key];
        if (!self[key].type.equals(left, right)) equal = false;
      });
      return equal;
    },
    $$validates: function $$validate(paramValues) {
      var result = true, isOptional, val, param, self = this;

      forEach(this.$$keys(), function(key) {
        param = self[key];
        val = paramValues[key];
        isOptional = !val && param.isOptional;
        result = result && (isOptional || !!param.type.is(val));
      });
      return result;
    },
    $$parent: undefined
  };

  this.ParamSet = ParamSet;
}

// Register as a provider so it's available to other providers
angular.module('ui.router.util').provider('$urlMatcherFactory', $UrlMatcherFactory);
angular.module('ui.router.util').run(['$urlMatcherFactory', function($urlMatcherFactory) { }]);

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


$ViewProvider.$inject = [];
function $ViewProvider() {

  this.$get = $get;
  /**
   * @ngdoc object
   * @name ui.router.state.$view
   *
   * @requires ui.router.util.$templateFactory
   * @requires $rootScope
   *
   * @description
   *
   */
  $get.$inject = ['$rootScope', '$templateFactory'];
  function $get(   $rootScope,   $templateFactory) {
    return {
      // $view.load('full.viewName', { template: ..., controller: ..., resolve: ..., async: false, params: ... })
      /**
       * @ngdoc function
       * @name ui.router.state.$view#load
       * @methodOf ui.router.state.$view
       *
       * @description
       *
       * @param {string} name name
       * @param {object} options option object.
       */
      load: function load(name, options) {
        var result, defaults = {
          template: null, controller: null, view: null, locals: null, notify: true, async: true, params: {}
        };
        options = extend(defaults, options);

        if (options.view) {
          result = $templateFactory.fromConfig(options.view, options.params, options.locals);
        }
        if (result && options.notify) {
        /**
         * @ngdoc event
         * @name ui.router.state.$state#$viewContentLoading
         * @eventOf ui.router.state.$view
         * @eventType broadcast on root scope
         * @description
         *
         * Fired once the view **begins loading**, *before* the DOM is rendered.
         *
         * @param {Object} event Event object.
         * @param {Object} viewConfig The view config properties (template, controller, etc).
         *
         * @example
         *
         * <pre>
         * $scope.$on('$viewContentLoading',
         * function(event, viewConfig){
         *     // Access to all the view config properties.
         *     // and one special property 'targetView'
         *     // viewConfig.targetView
         * });
         * </pre>
         */
          $rootScope.$broadcast('$viewContentLoading', options);
        }
        return result;
      }
    };
  }
}

angular.module('ui.router.state').provider('$view', $ViewProvider);

/**
 * @ngdoc object
 * @name ui.router.state.$uiViewScrollProvider
 *
 * @description
 * Provider that returns the {@link ui.router.state.$uiViewScroll} service function.
 */
function $ViewScrollProvider() {

  var useAnchorScroll = false;

  /**
   * @ngdoc function
   * @name ui.router.state.$uiViewScrollProvider#useAnchorScroll
   * @methodOf ui.router.state.$uiViewScrollProvider
   *
   * @description
   * Reverts back to using the core [`$anchorScroll`](http://docs.angularjs.org/api/ng.$anchorScroll) service for
   * scrolling based on the url anchor.
   */
  this.useAnchorScroll = function () {
    useAnchorScroll = true;
  };

  /**
   * @ngdoc object
   * @name ui.router.state.$uiViewScroll
   *
   * @requires $anchorScroll
   * @requires $timeout
   *
   * @description
   * When called with a jqLite element, it scrolls the element into view (after a
   * `$timeout` so the DOM has time to refresh).
   *
   * If you prefer to rely on `$anchorScroll` to scroll the view to the anchor,
   * this can be enabled by calling {@link ui.router.state.$uiViewScrollProvider#methods_useAnchorScroll `$uiViewScrollProvider.useAnchorScroll()`}.
   */
  this.$get = ['$anchorScroll', '$timeout', function ($anchorScroll, $timeout) {
    if (useAnchorScroll) {
      return $anchorScroll;
    }

    return function ($element) {
      $timeout(function () {
        $element[0].scrollIntoView();
      }, 0, false);
    };
  }];
}

angular.module('ui.router.state').provider('$uiViewScroll', $ViewScrollProvider);

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-view
 *
 * @requires ui.router.state.$state
 * @requires $compile
 * @requires $controller
 * @requires $injector
 * @requires ui.router.state.$uiViewScroll
 * @requires $document
 *
 * @restrict ECA
 *
 * @description
 * The ui-view directive tells $state where to place your templates.
 *
 * @param {string=} name A view name. The name should be unique amongst the other views in the
 * same state. You can have views of the same name that live in different states.
 *
 * @param {string=} autoscroll It allows you to set the scroll behavior of the browser window
 * when a view is populated. By default, $anchorScroll is overridden by ui-router's custom scroll
 * service, {@link ui.router.state.$uiViewScroll}. This custom service let's you
 * scroll ui-view elements into view when they are populated during a state activation.
 *
 * *Note: To revert back to old [`$anchorScroll`](http://docs.angularjs.org/api/ng.$anchorScroll)
 * functionality, call `$uiViewScrollProvider.useAnchorScroll()`.*
 *
 * @param {string=} onload Expression to evaluate whenever the view updates.
 * 
 * @example
 * A view can be unnamed or named. 
 * <pre>
 * <!-- Unnamed -->
 * <div ui-view></div> 
 * 
 * <!-- Named -->
 * <div ui-view="viewName"></div>
 * </pre>
 *
 * You can only have one unnamed view within any template (or root html). If you are only using a 
 * single view and it is unnamed then you can populate it like so:
 * <pre>
 * <div ui-view></div> 
 * $stateProvider.state("home", {
 *   template: "<h1>HELLO!</h1>"
 * })
 * </pre>
 * 
 * The above is a convenient shortcut equivalent to specifying your view explicitly with the {@link ui.router.state.$stateProvider#views `views`}
 * config property, by name, in this case an empty name:
 * <pre>
 * $stateProvider.state("home", {
 *   views: {
 *     "": {
 *       template: "<h1>HELLO!</h1>"
 *     }
 *   }    
 * })
 * </pre>
 * 
 * But typically you'll only use the views property if you name your view or have more than one view 
 * in the same template. There's not really a compelling reason to name a view if its the only one, 
 * but you could if you wanted, like so:
 * <pre>
 * <div ui-view="main"></div>
 * </pre> 
 * <pre>
 * $stateProvider.state("home", {
 *   views: {
 *     "main": {
 *       template: "<h1>HELLO!</h1>"
 *     }
 *   }    
 * })
 * </pre>
 * 
 * Really though, you'll use views to set up multiple views:
 * <pre>
 * <div ui-view></div>
 * <div ui-view="chart"></div> 
 * <div ui-view="data"></div> 
 * </pre>
 * 
 * <pre>
 * $stateProvider.state("home", {
 *   views: {
 *     "": {
 *       template: "<h1>HELLO!</h1>"
 *     },
 *     "chart": {
 *       template: "<chart_thing/>"
 *     },
 *     "data": {
 *       template: "<data_thing/>"
 *     }
 *   }    
 * })
 * </pre>
 *
 * Examples for `autoscroll`:
 *
 * <pre>
 * <!-- If autoscroll present with no expression,
 *      then scroll ui-view into view -->
 * <ui-view autoscroll/>
 *
 * <!-- If autoscroll present with valid expression,
 *      then scroll ui-view into view if expression evaluates to true -->
 * <ui-view autoscroll='true'/>
 * <ui-view autoscroll='false'/>
 * <ui-view autoscroll='scopeVariable'/>
 * </pre>
 */
$ViewDirective.$inject = ['$state', '$injector', '$uiViewScroll', '$interpolate'];
function $ViewDirective(   $state,   $injector,   $uiViewScroll,   $interpolate) {

  function getService() {
    return ($injector.has) ? function(service) {
      return $injector.has(service) ? $injector.get(service) : null;
    } : function(service) {
      try {
        return $injector.get(service);
      } catch (e) {
        return null;
      }
    };
  }

  var service = getService(),
      $animator = service('$animator'),
      $animate = service('$animate');

  // Returns a set of DOM manipulation functions based on which Angular version
  // it should use
  function getRenderer(attrs, scope) {
    var statics = function() {
      return {
        enter: function (element, target, cb) { target.after(element); cb(); },
        leave: function (element, cb) { element.remove(); cb(); }
      };
    };

    if ($animate) {
      return {
        enter: function(element, target, cb) {
          var promise = $animate.enter(element, null, target, cb);
          if (promise && promise.then) promise.then(cb);
        },
        leave: function(element, cb) {
          var promise = $animate.leave(element, cb);
          if (promise && promise.then) promise.then(cb);
        }
      };
    }

    if ($animator) {
      var animate = $animator && $animator(scope, attrs);

      return {
        enter: function(element, target, cb) {animate.enter(element, null, target); cb(); },
        leave: function(element, cb) { animate.leave(element); cb(); }
      };
    }

    return statics();
  }

  var directive = {
    restrict: 'ECA',
    terminal: true,
    priority: 400,
    transclude: 'element',
    compile: function (tElement, tAttrs, $transclude) {
      return function (scope, $element, attrs) {
        var previousEl, currentEl, currentScope, latestLocals,
            onloadExp     = attrs.onload || '',
            autoScrollExp = attrs.autoscroll,
            renderer      = getRenderer(attrs, scope);

        scope.$on('$stateChangeSuccess', function() {
          updateView(false);
        });
        scope.$on('$viewContentLoading', function() {
          updateView(false);
        });

        updateView(true);

        function cleanupLastView() {
          if (previousEl) {
            previousEl.remove();
            previousEl = null;
          }

          if (currentScope) {
            currentScope.$destroy();
            currentScope = null;
          }

          if (currentEl) {
            renderer.leave(currentEl, function() {
              previousEl = null;
            });

            previousEl = currentEl;
            currentEl = null;
          }
        }

        function updateView(firstTime) {
          var newScope,
              name            = getUiViewName(scope, attrs, $element, $interpolate),
              previousLocals  = name && $state.$current && $state.$current.locals[name];

          if (!firstTime && previousLocals === latestLocals) return; // nothing to do
          newScope = scope.$new();
          latestLocals = $state.$current.locals[name];

          var clone = $transclude(newScope, function(clone) {
            renderer.enter(clone, $element, function onUiViewEnter() {
              if(currentScope) {
                currentScope.$emit('$viewContentAnimationEnded');
              }

              if (angular.isDefined(autoScrollExp) && !autoScrollExp || scope.$eval(autoScrollExp)) {
                $uiViewScroll(clone);
              }
            });
            cleanupLastView();
          });

          currentEl = clone;
          currentScope = newScope;
          /**
           * @ngdoc event
           * @name ui.router.state.directive:ui-view#$viewContentLoaded
           * @eventOf ui.router.state.directive:ui-view
           * @eventType emits on ui-view directive scope
           * @description           *
           * Fired once the view is **loaded**, *after* the DOM is rendered.
           *
           * @param {Object} event Event object.
           */
          currentScope.$emit('$viewContentLoaded');
          currentScope.$eval(onloadExp);
        }
      };
    }
  };

  return directive;
}

$ViewDirectiveFill.$inject = ['$compile', '$controller', '$state', '$interpolate'];
function $ViewDirectiveFill (  $compile,   $controller,   $state,   $interpolate) {
  return {
    restrict: 'ECA',
    priority: -400,
    compile: function (tElement) {
      var initial = tElement.html();
      return function (scope, $element, attrs) {
        var current = $state.$current,
            name = getUiViewName(scope, attrs, $element, $interpolate),
            locals  = current && current.locals[name];

        if (! locals) {
          return;
        }

        $element.data('$uiView', { name: name, state: locals.$$state });
        $element.html(locals.$template ? locals.$template : initial);

        var link = $compile($element.contents());

        if (locals.$$controller) {
          locals.$scope = scope;
          var controller = $controller(locals.$$controller, locals);
          if (locals.$$controllerAs) {
            scope[locals.$$controllerAs] = controller;
          }
          $element.data('$ngControllerController', controller);
          $element.children().data('$ngControllerController', controller);
        }

        link(scope);
      };
    }
  };
}

/**
 * Shared ui-view code for both directives:
 * Given scope, element, and its attributes, return the view's name
 */
function getUiViewName(scope, attrs, element, $interpolate) {
  var name = $interpolate(attrs.uiView || attrs.name || '')(scope);
  var inherited = element.inheritedData('$uiView');
  return name.indexOf('@') >= 0 ?  name :  (name + '@' + (inherited ? inherited.state.name : ''));
}

angular.module('ui.router.state').directive('uiView', $ViewDirective);
angular.module('ui.router.state').directive('uiView', $ViewDirectiveFill);

function parseStateRef(ref, current) {
  var preparsed = ref.match(/^\s*({[^}]*})\s*$/), parsed;
  if (preparsed) ref = current + '(' + preparsed[1] + ')';
  parsed = ref.replace(/\n/g, " ").match(/^([^(]+?)\s*(\((.*)\))?$/);
  if (!parsed || parsed.length !== 4) throw new Error("Invalid state ref '" + ref + "'");
  return { state: parsed[1], paramExpr: parsed[3] || null };
}

function stateContext(el) {
  var stateData = el.parent().inheritedData('$uiView');

  if (stateData && stateData.state && stateData.state.name) {
    return stateData.state;
  }
}

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-sref
 *
 * @requires ui.router.state.$state
 * @requires $timeout
 *
 * @restrict A
 *
 * @description
 * A directive that binds a link (`<a>` tag) to a state. If the state has an associated 
 * URL, the directive will automatically generate & update the `href` attribute via 
 * the {@link ui.router.state.$state#methods_href $state.href()} method. Clicking 
 * the link will trigger a state transition with optional parameters. 
 *
 * Also middle-clicking, right-clicking, and ctrl-clicking on the link will be 
 * handled natively by the browser.
 *
 * You can also use relative state paths within ui-sref, just like the relative 
 * paths passed to `$state.go()`. You just need to be aware that the path is relative
 * to the state that the link lives in, in other words the state that loaded the 
 * template containing the link.
 *
 * You can specify options to pass to {@link ui.router.state.$state#go $state.go()}
 * using the `ui-sref-opts` attribute. Options are restricted to `location`, `inherit`,
 * and `reload`.
 *
 * @example
 * Here's an example of how you'd use ui-sref and how it would compile. If you have the 
 * following template:
 * <pre>
 * <a ui-sref="home">Home</a> | <a ui-sref="about">About</a> | <a ui-sref="{page: 2}">Next page</a>
 * 
 * <ul>
 *     <li ng-repeat="contact in contacts">
 *         <a ui-sref="contacts.detail({ id: contact.id })">{{ contact.name }}</a>
 *     </li>
 * </ul>
 * </pre>
 * 
 * Then the compiled html would be (assuming Html5Mode is off and current state is contacts):
 * <pre>
 * <a href="#/home" ui-sref="home">Home</a> | <a href="#/about" ui-sref="about">About</a> | <a href="#/contacts?page=2" ui-sref="{page: 2}">Next page</a>
 * 
 * <ul>
 *     <li ng-repeat="contact in contacts">
 *         <a href="#/contacts/1" ui-sref="contacts.detail({ id: contact.id })">Joe</a>
 *     </li>
 *     <li ng-repeat="contact in contacts">
 *         <a href="#/contacts/2" ui-sref="contacts.detail({ id: contact.id })">Alice</a>
 *     </li>
 *     <li ng-repeat="contact in contacts">
 *         <a href="#/contacts/3" ui-sref="contacts.detail({ id: contact.id })">Bob</a>
 *     </li>
 * </ul>
 *
 * <a ui-sref="home" ui-sref-opts="{reload: true}">Home</a>
 * </pre>
 *
 * @param {string} ui-sref 'stateName' can be any valid absolute or relative state
 * @param {Object} ui-sref-opts options to pass to {@link ui.router.state.$state#go $state.go()}
 */
$StateRefDirective.$inject = ['$state', '$timeout'];
function $StateRefDirective($state, $timeout) {
  var allowedOptions = ['location', 'inherit', 'reload'];

  return {
    restrict: 'A',
    require: ['?^uiSrefActive', '?^uiSrefActiveEq'],
    link: function(scope, element, attrs, uiSrefActive) {
      var ref = parseStateRef(attrs.uiSref, $state.current.name);
      var params = null, url = null, base = stateContext(element) || $state.$current;
      var newHref = null, isAnchor = element.prop("tagName") === "A";
      var isForm = element[0].nodeName === "FORM";
      var attr = isForm ? "action" : "href", nav = true;

      var options = { relative: base, inherit: true };
      var optionsOverride = scope.$eval(attrs.uiSrefOpts) || {};

      angular.forEach(allowedOptions, function(option) {
        if (option in optionsOverride) {
          options[option] = optionsOverride[option];
        }
      });

      var update = function(newVal) {
        if (newVal) params = angular.copy(newVal);
        if (!nav) return;

        newHref = $state.href(ref.state, params, options);

        var activeDirective = uiSrefActive[1] || uiSrefActive[0];
        if (activeDirective) {
          activeDirective.$$setStateInfo(ref.state, params);
        }
        if (newHref === null) {
          nav = false;
          return false;
        }
        attrs.$set(attr, newHref);
      };

      if (ref.paramExpr) {
        scope.$watch(ref.paramExpr, function(newVal, oldVal) {
          if (newVal !== params) update(newVal);
        }, true);
        params = angular.copy(scope.$eval(ref.paramExpr));
      }
      update();

      if (isForm) return;

      element.bind("click", function(e) {
        var button = e.which || e.button;
        if ( !(button > 1 || e.ctrlKey || e.metaKey || e.shiftKey || element.attr('target')) ) {
          // HACK: This is to allow ng-clicks to be processed before the transition is initiated:
          var transition = $timeout(function() {
            $state.go(ref.state, params, options);
          });
          e.preventDefault();

          // if the state has no URL, ignore one preventDefault from the <a> directive.
          var ignorePreventDefaultCount = isAnchor && !newHref ? 1: 0;
          e.preventDefault = function() {
            if (ignorePreventDefaultCount-- <= 0)
              $timeout.cancel(transition);
          };
        }
      });
    }
  };
}

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-sref-active
 *
 * @requires ui.router.state.$state
 * @requires ui.router.state.$stateParams
 * @requires $interpolate
 *
 * @restrict A
 *
 * @description
 * A directive working alongside ui-sref to add classes to an element when the
 * related ui-sref directive's state is active, and removing them when it is inactive.
 * The primary use-case is to simplify the special appearance of navigation menus
 * relying on `ui-sref`, by having the "active" state's menu button appear different,
 * distinguishing it from the inactive menu items.
 *
 * ui-sref-active can live on the same element as ui-sref or on a parent element. The first
 * ui-sref-active found at the same level or above the ui-sref will be used.
 *
 * Will activate when the ui-sref's target state or any child state is active. If you
 * need to activate only when the ui-sref target state is active and *not* any of
 * it's children, then you will use
 * {@link ui.router.state.directive:ui-sref-active-eq ui-sref-active-eq}
 *
 * @example
 * Given the following template:
 * <pre>
 * <ul>
 *   <li ui-sref-active="active" class="item">
 *     <a href ui-sref="app.user({user: 'bilbobaggins'})">@bilbobaggins</a>
 *   </li>
 * </ul>
 * </pre>
 *
 *
 * When the app state is "app.user" (or any children states), and contains the state parameter "user" with value "bilbobaggins",
 * the resulting HTML will appear as (note the 'active' class):
 * <pre>
 * <ul>
 *   <li ui-sref-active="active" class="item active">
 *     <a ui-sref="app.user({user: 'bilbobaggins'})" href="/users/bilbobaggins">@bilbobaggins</a>
 *   </li>
 * </ul>
 * </pre>
 *
 * The class name is interpolated **once** during the directives link time (any further changes to the
 * interpolated value are ignored).
 *
 * Multiple classes may be specified in a space-separated format:
 * <pre>
 * <ul>
 *   <li ui-sref-active='class1 class2 class3'>
 *     <a ui-sref="app.user">link</a>
 *   </li>
 * </ul>
 * </pre>
 */

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-sref-active-eq
 *
 * @requires ui.router.state.$state
 * @requires ui.router.state.$stateParams
 * @requires $interpolate
 *
 * @restrict A
 *
 * @description
 * The same as {@link ui.router.state.directive:ui-sref-active ui-sref-active} but will only activate
 * when the exact target state used in the `ui-sref` is active; no child states.
 *
 */
$StateRefActiveDirective.$inject = ['$state', '$stateParams', '$interpolate'];
function $StateRefActiveDirective($state, $stateParams, $interpolate) {
  return  {
    restrict: "A",
    controller: ['$scope', '$element', '$attrs', function ($scope, $element, $attrs) {
      var state, params, activeClass;

      // There probably isn't much point in $observing this
      // uiSrefActive and uiSrefActiveEq share the same directive object with some
      // slight difference in logic routing
      activeClass = $interpolate($attrs.uiSrefActiveEq || $attrs.uiSrefActive || '', false)($scope);

      // Allow uiSref to communicate with uiSrefActive[Equals]
      this.$$setStateInfo = function (newState, newParams) {
        state = $state.get(newState, stateContext($element));
        params = newParams;
        update();
      };

      $scope.$on('$stateChangeSuccess', update);

      // Update route state
      function update() {
        if (isMatch()) {
          $element.addClass(activeClass);
        } else {
          $element.removeClass(activeClass);
        }
      }

      function isMatch() {
        if (typeof $attrs.uiSrefActiveEq !== 'undefined') {
          return state && $state.is(state.name, params);
        } else {
          return state && $state.includes(state.name, params);
        }
      }
    }]
  };
}

angular.module('ui.router.state')
  .directive('uiSref', $StateRefDirective)
  .directive('uiSrefActive', $StateRefActiveDirective)
  .directive('uiSrefActiveEq', $StateRefActiveDirective);

/**
 * @ngdoc filter
 * @name ui.router.state.filter:isState
 *
 * @requires ui.router.state.$state
 *
 * @description
 * Translates to {@link ui.router.state.$state#methods_is $state.is("stateName")}.
 */
$IsStateFilter.$inject = ['$state'];
function $IsStateFilter($state) {
  var isFilter = function (state) {
    return $state.is(state);
  };
  isFilter.$stateful = true;
  return isFilter;
}

/**
 * @ngdoc filter
 * @name ui.router.state.filter:includedByState
 *
 * @requires ui.router.state.$state
 *
 * @description
 * Translates to {@link ui.router.state.$state#methods_includes $state.includes('fullOrPartialStateName')}.
 */
$IncludedByStateFilter.$inject = ['$state'];
function $IncludedByStateFilter($state) {
  var includesFilter = function (state) {
    return $state.includes(state);
  };
  includesFilter.$stateful = true;
  return  includesFilter;
}

angular.module('ui.router.state')
  .filter('isState', $IsStateFilter)
  .filter('includedByState', $IncludedByStateFilter);
})(window, window.angular);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL3ZlbmRvcnMvYW5ndWxhci11aS1yb3V0ZXIvcmVsZWFzZS9hbmd1bGFyLXVpLXJvdXRlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFN0YXRlLWJhc2VkIHJvdXRpbmcgZm9yIEFuZ3VsYXJKU1xuICogQHZlcnNpb24gdjAuMi4xM1xuICogQGxpbmsgaHR0cDovL2FuZ3VsYXItdWkuZ2l0aHViLmNvbS9cbiAqIEBsaWNlbnNlIE1JVCBMaWNlbnNlLCBodHRwOi8vd3d3Lm9wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVFxuICovXG5cbi8qIGNvbW1vbmpzIHBhY2thZ2UgbWFuYWdlciBzdXBwb3J0IChlZyBjb21wb25lbnRqcykgKi9cbmlmICh0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBleHBvcnRzICE9PSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZS5leHBvcnRzID09PSBleHBvcnRzKXtcbiAgbW9kdWxlLmV4cG9ydHMgPSAndWkucm91dGVyJztcbn1cblxuKGZ1bmN0aW9uICh3aW5kb3csIGFuZ3VsYXIsIHVuZGVmaW5lZCkge1xuLypqc2hpbnQgZ2xvYmFsc3RyaWN0OnRydWUqL1xuLypnbG9iYWwgYW5ndWxhcjpmYWxzZSovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBpc0RlZmluZWQgPSBhbmd1bGFyLmlzRGVmaW5lZCxcbiAgICBpc0Z1bmN0aW9uID0gYW5ndWxhci5pc0Z1bmN0aW9uLFxuICAgIGlzU3RyaW5nID0gYW5ndWxhci5pc1N0cmluZyxcbiAgICBpc09iamVjdCA9IGFuZ3VsYXIuaXNPYmplY3QsXG4gICAgaXNBcnJheSA9IGFuZ3VsYXIuaXNBcnJheSxcbiAgICBmb3JFYWNoID0gYW5ndWxhci5mb3JFYWNoLFxuICAgIGV4dGVuZCA9IGFuZ3VsYXIuZXh0ZW5kLFxuICAgIGNvcHkgPSBhbmd1bGFyLmNvcHk7XG5cbmZ1bmN0aW9uIGluaGVyaXQocGFyZW50LCBleHRyYSkge1xuICByZXR1cm4gZXh0ZW5kKG5ldyAoZXh0ZW5kKGZ1bmN0aW9uKCkge30sIHsgcHJvdG90eXBlOiBwYXJlbnQgfSkpKCksIGV4dHJhKTtcbn1cblxuZnVuY3Rpb24gbWVyZ2UoZHN0KSB7XG4gIGZvckVhY2goYXJndW1lbnRzLCBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqICE9PSBkc3QpIHtcbiAgICAgIGZvckVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIGlmICghZHN0Lmhhc093blByb3BlcnR5KGtleSkpIGRzdFtrZXldID0gdmFsdWU7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZHN0O1xufVxuXG4vKipcbiAqIEZpbmRzIHRoZSBjb21tb24gYW5jZXN0b3IgcGF0aCBiZXR3ZWVuIHR3byBzdGF0ZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGZpcnN0IFRoZSBmaXJzdCBzdGF0ZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBzZWNvbmQgVGhlIHNlY29uZCBzdGF0ZS5cbiAqIEByZXR1cm4ge0FycmF5fSBSZXR1cm5zIGFuIGFycmF5IG9mIHN0YXRlIG5hbWVzIGluIGRlc2NlbmRpbmcgb3JkZXIsIG5vdCBpbmNsdWRpbmcgdGhlIHJvb3QuXG4gKi9cbmZ1bmN0aW9uIGFuY2VzdG9ycyhmaXJzdCwgc2Vjb25kKSB7XG4gIHZhciBwYXRoID0gW107XG5cbiAgZm9yICh2YXIgbiBpbiBmaXJzdC5wYXRoKSB7XG4gICAgaWYgKGZpcnN0LnBhdGhbbl0gIT09IHNlY29uZC5wYXRoW25dKSBicmVhaztcbiAgICBwYXRoLnB1c2goZmlyc3QucGF0aFtuXSk7XG4gIH1cbiAgcmV0dXJuIHBhdGg7XG59XG5cbi8qKlxuICogSUU4LXNhZmUgd3JhcHBlciBmb3IgYE9iamVjdC5rZXlzKClgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgQSBKYXZhU2NyaXB0IG9iamVjdC5cbiAqIEByZXR1cm4ge0FycmF5fSBSZXR1cm5zIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QgYXMgYW4gYXJyYXkuXG4gKi9cbmZ1bmN0aW9uIG9iamVjdEtleXMob2JqZWN0KSB7XG4gIGlmIChPYmplY3Qua2V5cykge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhvYmplY3QpO1xuICB9XG4gIHZhciByZXN1bHQgPSBbXTtcblxuICBhbmd1bGFyLmZvckVhY2gob2JqZWN0LCBmdW5jdGlvbih2YWwsIGtleSkge1xuICAgIHJlc3VsdC5wdXNoKGtleSk7XG4gIH0pO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIElFOC1zYWZlIHdyYXBwZXIgZm9yIGBBcnJheS5wcm90b3R5cGUuaW5kZXhPZigpYC5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJheSBBIEphdmFTY3JpcHQgYXJyYXkuXG4gKiBAcGFyYW0geyp9IHZhbHVlIEEgdmFsdWUgdG8gc2VhcmNoIHRoZSBhcnJheSBmb3IuXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IFJldHVybnMgdGhlIGFycmF5IGluZGV4IHZhbHVlIG9mIGB2YWx1ZWAsIG9yIGAtMWAgaWYgbm90IHByZXNlbnQuXG4gKi9cbmZ1bmN0aW9uIGluZGV4T2YoYXJyYXksIHZhbHVlKSB7XG4gIGlmIChBcnJheS5wcm90b3R5cGUuaW5kZXhPZikge1xuICAgIHJldHVybiBhcnJheS5pbmRleE9mKHZhbHVlLCBOdW1iZXIoYXJndW1lbnRzWzJdKSB8fCAwKTtcbiAgfVxuICB2YXIgbGVuID0gYXJyYXkubGVuZ3RoID4+PiAwLCBmcm9tID0gTnVtYmVyKGFyZ3VtZW50c1syXSkgfHwgMDtcbiAgZnJvbSA9IChmcm9tIDwgMCkgPyBNYXRoLmNlaWwoZnJvbSkgOiBNYXRoLmZsb29yKGZyb20pO1xuXG4gIGlmIChmcm9tIDwgMCkgZnJvbSArPSBsZW47XG5cbiAgZm9yICg7IGZyb20gPCBsZW47IGZyb20rKykge1xuICAgIGlmIChmcm9tIGluIGFycmF5ICYmIGFycmF5W2Zyb21dID09PSB2YWx1ZSkgcmV0dXJuIGZyb207XG4gIH1cbiAgcmV0dXJuIC0xO1xufVxuXG4vKipcbiAqIE1lcmdlcyBhIHNldCBvZiBwYXJhbWV0ZXJzIHdpdGggYWxsIHBhcmFtZXRlcnMgaW5oZXJpdGVkIGJldHdlZW4gdGhlIGNvbW1vbiBwYXJlbnRzIG9mIHRoZVxuICogY3VycmVudCBzdGF0ZSBhbmQgYSBnaXZlbiBkZXN0aW5hdGlvbiBzdGF0ZS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gY3VycmVudFBhcmFtcyBUaGUgdmFsdWUgb2YgdGhlIGN1cnJlbnQgc3RhdGUgcGFyYW1ldGVycyAoJHN0YXRlUGFyYW1zKS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBuZXdQYXJhbXMgVGhlIHNldCBvZiBwYXJhbWV0ZXJzIHdoaWNoIHdpbGwgYmUgY29tcG9zaXRlZCB3aXRoIGluaGVyaXRlZCBwYXJhbXMuXG4gKiBAcGFyYW0ge09iamVjdH0gJGN1cnJlbnQgSW50ZXJuYWwgZGVmaW5pdGlvbiBvZiBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSBjdXJyZW50IHN0YXRlLlxuICogQHBhcmFtIHtPYmplY3R9ICR0byBJbnRlcm5hbCBkZWZpbml0aW9uIG9mIG9iamVjdCByZXByZXNlbnRpbmcgc3RhdGUgdG8gdHJhbnNpdGlvbiB0by5cbiAqL1xuZnVuY3Rpb24gaW5oZXJpdFBhcmFtcyhjdXJyZW50UGFyYW1zLCBuZXdQYXJhbXMsICRjdXJyZW50LCAkdG8pIHtcbiAgdmFyIHBhcmVudHMgPSBhbmNlc3RvcnMoJGN1cnJlbnQsICR0byksIHBhcmVudFBhcmFtcywgaW5oZXJpdGVkID0ge30sIGluaGVyaXRMaXN0ID0gW107XG5cbiAgZm9yICh2YXIgaSBpbiBwYXJlbnRzKSB7XG4gICAgaWYgKCFwYXJlbnRzW2ldLnBhcmFtcykgY29udGludWU7XG4gICAgcGFyZW50UGFyYW1zID0gb2JqZWN0S2V5cyhwYXJlbnRzW2ldLnBhcmFtcyk7XG4gICAgaWYgKCFwYXJlbnRQYXJhbXMubGVuZ3RoKSBjb250aW51ZTtcblxuICAgIGZvciAodmFyIGogaW4gcGFyZW50UGFyYW1zKSB7XG4gICAgICBpZiAoaW5kZXhPZihpbmhlcml0TGlzdCwgcGFyZW50UGFyYW1zW2pdKSA+PSAwKSBjb250aW51ZTtcbiAgICAgIGluaGVyaXRMaXN0LnB1c2gocGFyZW50UGFyYW1zW2pdKTtcbiAgICAgIGluaGVyaXRlZFtwYXJlbnRQYXJhbXNbal1dID0gY3VycmVudFBhcmFtc1twYXJlbnRQYXJhbXNbal1dO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZXh0ZW5kKHt9LCBpbmhlcml0ZWQsIG5ld1BhcmFtcyk7XG59XG5cbi8qKlxuICogUGVyZm9ybXMgYSBub24tc3RyaWN0IGNvbXBhcmlzb24gb2YgdGhlIHN1YnNldCBvZiB0d28gb2JqZWN0cywgZGVmaW5lZCBieSBhIGxpc3Qgb2Yga2V5cy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gYSBUaGUgZmlyc3Qgb2JqZWN0LlxuICogQHBhcmFtIHtPYmplY3R9IGIgVGhlIHNlY29uZCBvYmplY3QuXG4gKiBAcGFyYW0ge0FycmF5fSBrZXlzIFRoZSBsaXN0IG9mIGtleXMgd2l0aGluIGVhY2ggb2JqZWN0IHRvIGNvbXBhcmUuIElmIHRoZSBsaXN0IGlzIGVtcHR5IG9yIG5vdCBzcGVjaWZpZWQsXG4gKiAgICAgICAgICAgICAgICAgICAgIGl0IGRlZmF1bHRzIHRvIHRoZSBsaXN0IG9mIGtleXMgaW4gYGFgLlxuICogQHJldHVybiB7Qm9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGtleXMgbWF0Y2gsIG90aGVyd2lzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBlcXVhbEZvcktleXMoYSwgYiwga2V5cykge1xuICBpZiAoIWtleXMpIHtcbiAgICBrZXlzID0gW107XG4gICAgZm9yICh2YXIgbiBpbiBhKSBrZXlzLnB1c2gobik7IC8vIFVzZWQgaW5zdGVhZCBvZiBPYmplY3Qua2V5cygpIGZvciBJRTggY29tcGF0aWJpbGl0eVxuICB9XG5cbiAgZm9yICh2YXIgaT0wOyBpPGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgayA9IGtleXNbaV07XG4gICAgaWYgKGFba10gIT0gYltrXSkgcmV0dXJuIGZhbHNlOyAvLyBOb3QgJz09PScsIHZhbHVlcyBhcmVuJ3QgbmVjZXNzYXJpbHkgbm9ybWFsaXplZFxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIHN1YnNldCBvZiBhbiBvYmplY3QsIGJhc2VkIG9uIGEgbGlzdCBvZiBrZXlzLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGtleXNcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZXNcbiAqIEByZXR1cm4ge0Jvb2xlYW59IFJldHVybnMgYSBzdWJzZXQgb2YgYHZhbHVlc2AuXG4gKi9cbmZ1bmN0aW9uIGZpbHRlckJ5S2V5cyhrZXlzLCB2YWx1ZXMpIHtcbiAgdmFyIGZpbHRlcmVkID0ge307XG5cbiAgZm9yRWFjaChrZXlzLCBmdW5jdGlvbiAobmFtZSkge1xuICAgIGZpbHRlcmVkW25hbWVdID0gdmFsdWVzW25hbWVdO1xuICB9KTtcbiAgcmV0dXJuIGZpbHRlcmVkO1xufVxuXG4vLyBsaWtlIF8uaW5kZXhCeVxuLy8gd2hlbiB5b3Uga25vdyB0aGF0IHlvdXIgaW5kZXggdmFsdWVzIHdpbGwgYmUgdW5pcXVlLCBvciB5b3Ugd2FudCBsYXN0LW9uZS1pbiB0byB3aW5cbmZ1bmN0aW9uIGluZGV4QnkoYXJyYXksIHByb3BOYW1lKSB7XG4gIHZhciByZXN1bHQgPSB7fTtcbiAgZm9yRWFjaChhcnJheSwgZnVuY3Rpb24oaXRlbSkge1xuICAgIHJlc3VsdFtpdGVtW3Byb3BOYW1lXV0gPSBpdGVtO1xuICB9KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy8gZXh0cmFjdGVkIGZyb20gdW5kZXJzY29yZS5qc1xuLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IG9ubHkgY29udGFpbmluZyB0aGUgd2hpdGVsaXN0ZWQgcHJvcGVydGllcy5cbmZ1bmN0aW9uIHBpY2sob2JqKSB7XG4gIHZhciBjb3B5ID0ge307XG4gIHZhciBrZXlzID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdC5hcHBseShBcnJheS5wcm90b3R5cGUsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICBmb3JFYWNoKGtleXMsIGZ1bmN0aW9uKGtleSkge1xuICAgIGlmIChrZXkgaW4gb2JqKSBjb3B5W2tleV0gPSBvYmpba2V5XTtcbiAgfSk7XG4gIHJldHVybiBjb3B5O1xufVxuXG4vLyBleHRyYWN0ZWQgZnJvbSB1bmRlcnNjb3JlLmpzXG4vLyBSZXR1cm4gYSBjb3B5IG9mIHRoZSBvYmplY3Qgb21pdHRpbmcgdGhlIGJsYWNrbGlzdGVkIHByb3BlcnRpZXMuXG5mdW5jdGlvbiBvbWl0KG9iaikge1xuICB2YXIgY29weSA9IHt9O1xuICB2YXIga2V5cyA9IEFycmF5LnByb3RvdHlwZS5jb25jYXQuYXBwbHkoQXJyYXkucHJvdG90eXBlLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgIGlmIChpbmRleE9mKGtleXMsIGtleSkgPT0gLTEpIGNvcHlba2V5XSA9IG9ialtrZXldO1xuICB9XG4gIHJldHVybiBjb3B5O1xufVxuXG5mdW5jdGlvbiBwbHVjayhjb2xsZWN0aW9uLCBrZXkpIHtcbiAgdmFyIHJlc3VsdCA9IGlzQXJyYXkoY29sbGVjdGlvbikgPyBbXSA6IHt9O1xuXG4gIGZvckVhY2goY29sbGVjdGlvbiwgZnVuY3Rpb24odmFsLCBpKSB7XG4gICAgcmVzdWx0W2ldID0gaXNGdW5jdGlvbihrZXkpID8ga2V5KHZhbCkgOiB2YWxba2V5XTtcbiAgfSk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGZpbHRlcihjb2xsZWN0aW9uLCBjYWxsYmFjaykge1xuICB2YXIgYXJyYXkgPSBpc0FycmF5KGNvbGxlY3Rpb24pO1xuICB2YXIgcmVzdWx0ID0gYXJyYXkgPyBbXSA6IHt9O1xuICBmb3JFYWNoKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbCwgaSkge1xuICAgIGlmIChjYWxsYmFjayh2YWwsIGkpKSB7XG4gICAgICByZXN1bHRbYXJyYXkgPyByZXN1bHQubGVuZ3RoIDogaV0gPSB2YWw7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gbWFwKGNvbGxlY3Rpb24sIGNhbGxiYWNrKSB7XG4gIHZhciByZXN1bHQgPSBpc0FycmF5KGNvbGxlY3Rpb24pID8gW10gOiB7fTtcblxuICBmb3JFYWNoKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbCwgaSkge1xuICAgIHJlc3VsdFtpXSA9IGNhbGxiYWNrKHZhbCwgaSk7XG4gIH0pO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIEBuZ2RvYyBvdmVydmlld1xuICogQG5hbWUgdWkucm91dGVyLnV0aWxcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdWkucm91dGVyLnV0aWwgc3ViLW1vZHVsZVxuICpcbiAqIFRoaXMgbW9kdWxlIGlzIGEgZGVwZW5kZW5jeSBvZiBvdGhlciBzdWItbW9kdWxlcy4gRG8gbm90IGluY2x1ZGUgdGhpcyBtb2R1bGUgYXMgYSBkZXBlbmRlbmN5XG4gKiBpbiB5b3VyIGFuZ3VsYXIgYXBwICh1c2Uge0BsaW5rIHVpLnJvdXRlcn0gbW9kdWxlIGluc3RlYWQpLlxuICpcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3VpLnJvdXRlci51dGlsJywgWyduZyddKTtcblxuLyoqXG4gKiBAbmdkb2Mgb3ZlcnZpZXdcbiAqIEBuYW1lIHVpLnJvdXRlci5yb3V0ZXJcbiAqIFxuICogQHJlcXVpcmVzIHVpLnJvdXRlci51dGlsXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHVpLnJvdXRlci5yb3V0ZXIgc3ViLW1vZHVsZVxuICpcbiAqIFRoaXMgbW9kdWxlIGlzIGEgZGVwZW5kZW5jeSBvZiBvdGhlciBzdWItbW9kdWxlcy4gRG8gbm90IGluY2x1ZGUgdGhpcyBtb2R1bGUgYXMgYSBkZXBlbmRlbmN5XG4gKiBpbiB5b3VyIGFuZ3VsYXIgYXBwICh1c2Uge0BsaW5rIHVpLnJvdXRlcn0gbW9kdWxlIGluc3RlYWQpLlxuICovXG5hbmd1bGFyLm1vZHVsZSgndWkucm91dGVyLnJvdXRlcicsIFsndWkucm91dGVyLnV0aWwnXSk7XG5cbi8qKlxuICogQG5nZG9jIG92ZXJ2aWV3XG4gKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGVcbiAqIFxuICogQHJlcXVpcmVzIHVpLnJvdXRlci5yb3V0ZXJcbiAqIEByZXF1aXJlcyB1aS5yb3V0ZXIudXRpbFxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogIyB1aS5yb3V0ZXIuc3RhdGUgc3ViLW1vZHVsZVxuICpcbiAqIFRoaXMgbW9kdWxlIGlzIGEgZGVwZW5kZW5jeSBvZiB0aGUgbWFpbiB1aS5yb3V0ZXIgbW9kdWxlLiBEbyBub3QgaW5jbHVkZSB0aGlzIG1vZHVsZSBhcyBhIGRlcGVuZGVuY3lcbiAqIGluIHlvdXIgYW5ndWxhciBhcHAgKHVzZSB7QGxpbmsgdWkucm91dGVyfSBtb2R1bGUgaW5zdGVhZCkuXG4gKiBcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3VpLnJvdXRlci5zdGF0ZScsIFsndWkucm91dGVyLnJvdXRlcicsICd1aS5yb3V0ZXIudXRpbCddKTtcblxuLyoqXG4gKiBAbmdkb2Mgb3ZlcnZpZXdcbiAqIEBuYW1lIHVpLnJvdXRlclxuICpcbiAqIEByZXF1aXJlcyB1aS5yb3V0ZXIuc3RhdGVcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdWkucm91dGVyXG4gKiBcbiAqICMjIFRoZSBtYWluIG1vZHVsZSBmb3IgdWkucm91dGVyIFxuICogVGhlcmUgYXJlIHNldmVyYWwgc3ViLW1vZHVsZXMgaW5jbHVkZWQgd2l0aCB0aGUgdWkucm91dGVyIG1vZHVsZSwgaG93ZXZlciBvbmx5IHRoaXMgbW9kdWxlIGlzIG5lZWRlZFxuICogYXMgYSBkZXBlbmRlbmN5IHdpdGhpbiB5b3VyIGFuZ3VsYXIgYXBwLiBUaGUgb3RoZXIgbW9kdWxlcyBhcmUgZm9yIG9yZ2FuaXphdGlvbiBwdXJwb3Nlcy4gXG4gKlxuICogVGhlIG1vZHVsZXMgYXJlOlxuICogKiB1aS5yb3V0ZXIgLSB0aGUgbWFpbiBcInVtYnJlbGxhXCIgbW9kdWxlXG4gKiAqIHVpLnJvdXRlci5yb3V0ZXIgLSBcbiAqIFxuICogKllvdSdsbCBuZWVkIHRvIGluY2x1ZGUgKipvbmx5KiogdGhpcyBtb2R1bGUgYXMgdGhlIGRlcGVuZGVuY3kgd2l0aGluIHlvdXIgYW5ndWxhciBhcHAuKlxuICogXG4gKiA8cHJlPlxuICogPCFkb2N0eXBlIGh0bWw+XG4gKiA8aHRtbCBuZy1hcHA9XCJteUFwcFwiPlxuICogPGhlYWQ+XG4gKiAgIDxzY3JpcHQgc3JjPVwianMvYW5ndWxhci5qc1wiPjwvc2NyaXB0PlxuICogICA8IS0tIEluY2x1ZGUgdGhlIHVpLXJvdXRlciBzY3JpcHQgLS0+XG4gKiAgIDxzY3JpcHQgc3JjPVwianMvYW5ndWxhci11aS1yb3V0ZXIubWluLmpzXCI+PC9zY3JpcHQ+XG4gKiAgIDxzY3JpcHQ+XG4gKiAgICAgLy8gLi4uYW5kIGFkZCAndWkucm91dGVyJyBhcyBhIGRlcGVuZGVuY3lcbiAqICAgICB2YXIgbXlBcHAgPSBhbmd1bGFyLm1vZHVsZSgnbXlBcHAnLCBbJ3VpLnJvdXRlciddKTtcbiAqICAgPC9zY3JpcHQ+XG4gKiA8L2hlYWQ+XG4gKiA8Ym9keT5cbiAqIDwvYm9keT5cbiAqIDwvaHRtbD5cbiAqIDwvcHJlPlxuICovXG5hbmd1bGFyLm1vZHVsZSgndWkucm91dGVyJywgWyd1aS5yb3V0ZXIuc3RhdGUnXSk7XG5cbmFuZ3VsYXIubW9kdWxlKCd1aS5yb3V0ZXIuY29tcGF0JywgWyd1aS5yb3V0ZXInXSk7XG5cbi8qKlxuICogQG5nZG9jIG9iamVjdFxuICogQG5hbWUgdWkucm91dGVyLnV0aWwuJHJlc29sdmVcbiAqXG4gKiBAcmVxdWlyZXMgJHFcbiAqIEByZXF1aXJlcyAkaW5qZWN0b3JcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIE1hbmFnZXMgcmVzb2x1dGlvbiBvZiAoYWN5Y2xpYykgZ3JhcGhzIG9mIHByb21pc2VzLlxuICovXG4kUmVzb2x2ZS4kaW5qZWN0ID0gWyckcScsICckaW5qZWN0b3InXTtcbmZ1bmN0aW9uICRSZXNvbHZlKCAgJHEsICAgICRpbmplY3Rvcikge1xuICBcbiAgdmFyIFZJU0lUX0lOX1BST0dSRVNTID0gMSxcbiAgICAgIFZJU0lUX0RPTkUgPSAyLFxuICAgICAgTk9USElORyA9IHt9LFxuICAgICAgTk9fREVQRU5ERU5DSUVTID0gW10sXG4gICAgICBOT19MT0NBTFMgPSBOT1RISU5HLFxuICAgICAgTk9fUEFSRU5UID0gZXh0ZW5kKCRxLndoZW4oTk9USElORyksIHsgJCRwcm9taXNlczogTk9USElORywgJCR2YWx1ZXM6IE5PVEhJTkcgfSk7XG4gIFxuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgdWkucm91dGVyLnV0aWwuJHJlc29sdmUjc3R1ZHlcbiAgICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLiRyZXNvbHZlXG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBTdHVkaWVzIGEgc2V0IG9mIGludm9jYWJsZXMgdGhhdCBhcmUgbGlrZWx5IHRvIGJlIHVzZWQgbXVsdGlwbGUgdGltZXMuXG4gICAqIDxwcmU+XG4gICAqICRyZXNvbHZlLnN0dWR5KGludm9jYWJsZXMpKGxvY2FscywgcGFyZW50LCBzZWxmKVxuICAgKiA8L3ByZT5cbiAgICogaXMgZXF1aXZhbGVudCB0b1xuICAgKiA8cHJlPlxuICAgKiAkcmVzb2x2ZS5yZXNvbHZlKGludm9jYWJsZXMsIGxvY2FscywgcGFyZW50LCBzZWxmKVxuICAgKiA8L3ByZT5cbiAgICogYnV0IHRoZSBmb3JtZXIgaXMgbW9yZSBlZmZpY2llbnQgKGluIGZhY3QgYHJlc29sdmVgIGp1c3QgY2FsbHMgYHN0dWR5YCBcbiAgICogaW50ZXJuYWxseSkuXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBpbnZvY2FibGVzIEludm9jYWJsZSBvYmplY3RzXG4gICAqIEByZXR1cm4ge2Z1bmN0aW9ufSBhIGZ1bmN0aW9uIHRvIHBhc3MgaW4gbG9jYWxzLCBwYXJlbnQgYW5kIHNlbGZcbiAgICovXG4gIHRoaXMuc3R1ZHkgPSBmdW5jdGlvbiAoaW52b2NhYmxlcykge1xuICAgIGlmICghaXNPYmplY3QoaW52b2NhYmxlcykpIHRocm93IG5ldyBFcnJvcihcIidpbnZvY2FibGVzJyBtdXN0IGJlIGFuIG9iamVjdFwiKTtcbiAgICB2YXIgaW52b2NhYmxlS2V5cyA9IG9iamVjdEtleXMoaW52b2NhYmxlcyB8fCB7fSk7XG4gICAgXG4gICAgLy8gUGVyZm9ybSBhIHRvcG9sb2dpY2FsIHNvcnQgb2YgaW52b2NhYmxlcyB0byBidWlsZCBhbiBvcmRlcmVkIHBsYW5cbiAgICB2YXIgcGxhbiA9IFtdLCBjeWNsZSA9IFtdLCB2aXNpdGVkID0ge307XG4gICAgZnVuY3Rpb24gdmlzaXQodmFsdWUsIGtleSkge1xuICAgICAgaWYgKHZpc2l0ZWRba2V5XSA9PT0gVklTSVRfRE9ORSkgcmV0dXJuO1xuICAgICAgXG4gICAgICBjeWNsZS5wdXNoKGtleSk7XG4gICAgICBpZiAodmlzaXRlZFtrZXldID09PSBWSVNJVF9JTl9QUk9HUkVTUykge1xuICAgICAgICBjeWNsZS5zcGxpY2UoMCwgaW5kZXhPZihjeWNsZSwga2V5KSk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkN5Y2xpYyBkZXBlbmRlbmN5OiBcIiArIGN5Y2xlLmpvaW4oXCIgLT4gXCIpKTtcbiAgICAgIH1cbiAgICAgIHZpc2l0ZWRba2V5XSA9IFZJU0lUX0lOX1BST0dSRVNTO1xuICAgICAgXG4gICAgICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgICAgIHBsYW4ucHVzaChrZXksIFsgZnVuY3Rpb24oKSB7IHJldHVybiAkaW5qZWN0b3IuZ2V0KHZhbHVlKTsgfV0sIE5PX0RFUEVOREVOQ0lFUyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcGFyYW1zID0gJGluamVjdG9yLmFubm90YXRlKHZhbHVlKTtcbiAgICAgICAgZm9yRWFjaChwYXJhbXMsIGZ1bmN0aW9uIChwYXJhbSkge1xuICAgICAgICAgIGlmIChwYXJhbSAhPT0ga2V5ICYmIGludm9jYWJsZXMuaGFzT3duUHJvcGVydHkocGFyYW0pKSB2aXNpdChpbnZvY2FibGVzW3BhcmFtXSwgcGFyYW0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcGxhbi5wdXNoKGtleSwgdmFsdWUsIHBhcmFtcyk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGN5Y2xlLnBvcCgpO1xuICAgICAgdmlzaXRlZFtrZXldID0gVklTSVRfRE9ORTtcbiAgICB9XG4gICAgZm9yRWFjaChpbnZvY2FibGVzLCB2aXNpdCk7XG4gICAgaW52b2NhYmxlcyA9IGN5Y2xlID0gdmlzaXRlZCA9IG51bGw7IC8vIHBsYW4gaXMgYWxsIHRoYXQncyByZXF1aXJlZFxuICAgIFxuICAgIGZ1bmN0aW9uIGlzUmVzb2x2ZSh2YWx1ZSkge1xuICAgICAgcmV0dXJuIGlzT2JqZWN0KHZhbHVlKSAmJiB2YWx1ZS50aGVuICYmIHZhbHVlLiQkcHJvbWlzZXM7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBmdW5jdGlvbiAobG9jYWxzLCBwYXJlbnQsIHNlbGYpIHtcbiAgICAgIGlmIChpc1Jlc29sdmUobG9jYWxzKSAmJiBzZWxmID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc2VsZiA9IHBhcmVudDsgcGFyZW50ID0gbG9jYWxzOyBsb2NhbHMgPSBudWxsO1xuICAgICAgfVxuICAgICAgaWYgKCFsb2NhbHMpIGxvY2FscyA9IE5PX0xPQ0FMUztcbiAgICAgIGVsc2UgaWYgKCFpc09iamVjdChsb2NhbHMpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIidsb2NhbHMnIG11c3QgYmUgYW4gb2JqZWN0XCIpO1xuICAgICAgfSAgICAgICBcbiAgICAgIGlmICghcGFyZW50KSBwYXJlbnQgPSBOT19QQVJFTlQ7XG4gICAgICBlbHNlIGlmICghaXNSZXNvbHZlKHBhcmVudCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiJ3BhcmVudCcgbXVzdCBiZSBhIHByb21pc2UgcmV0dXJuZWQgYnkgJHJlc29sdmUucmVzb2x2ZSgpXCIpO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBUbyBjb21wbGV0ZSB0aGUgb3ZlcmFsbCByZXNvbHV0aW9uLCB3ZSBoYXZlIHRvIHdhaXQgZm9yIHRoZSBwYXJlbnRcbiAgICAgIC8vIHByb21pc2UgYW5kIGZvciB0aGUgcHJvbWlzZSBmb3IgZWFjaCBpbnZva2FibGUgaW4gb3VyIHBsYW4uXG4gICAgICB2YXIgcmVzb2x1dGlvbiA9ICRxLmRlZmVyKCksXG4gICAgICAgICAgcmVzdWx0ID0gcmVzb2x1dGlvbi5wcm9taXNlLFxuICAgICAgICAgIHByb21pc2VzID0gcmVzdWx0LiQkcHJvbWlzZXMgPSB7fSxcbiAgICAgICAgICB2YWx1ZXMgPSBleHRlbmQoe30sIGxvY2FscyksXG4gICAgICAgICAgd2FpdCA9IDEgKyBwbGFuLmxlbmd0aC8zLFxuICAgICAgICAgIG1lcmdlZCA9IGZhbHNlO1xuICAgICAgICAgIFxuICAgICAgZnVuY3Rpb24gZG9uZSgpIHtcbiAgICAgICAgLy8gTWVyZ2UgcGFyZW50IHZhbHVlcyB3ZSBoYXZlbid0IGdvdCB5ZXQgYW5kIHB1Ymxpc2ggb3VyIG93biAkJHZhbHVlc1xuICAgICAgICBpZiAoIS0td2FpdCkge1xuICAgICAgICAgIGlmICghbWVyZ2VkKSBtZXJnZSh2YWx1ZXMsIHBhcmVudC4kJHZhbHVlcyk7IFxuICAgICAgICAgIHJlc3VsdC4kJHZhbHVlcyA9IHZhbHVlcztcbiAgICAgICAgICByZXN1bHQuJCRwcm9taXNlcyA9IHJlc3VsdC4kJHByb21pc2VzIHx8IHRydWU7IC8vIGtlZXAgZm9yIGlzUmVzb2x2ZSgpXG4gICAgICAgICAgZGVsZXRlIHJlc3VsdC4kJGluaGVyaXRlZFZhbHVlcztcbiAgICAgICAgICByZXNvbHV0aW9uLnJlc29sdmUodmFsdWVzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBmYWlsKHJlYXNvbikge1xuICAgICAgICByZXN1bHQuJCRmYWlsdXJlID0gcmVhc29uO1xuICAgICAgICByZXNvbHV0aW9uLnJlamVjdChyZWFzb24pO1xuICAgICAgfVxuXG4gICAgICAvLyBTaG9ydC1jaXJjdWl0IGlmIHBhcmVudCBoYXMgYWxyZWFkeSBmYWlsZWRcbiAgICAgIGlmIChpc0RlZmluZWQocGFyZW50LiQkZmFpbHVyZSkpIHtcbiAgICAgICAgZmFpbChwYXJlbnQuJCRmYWlsdXJlKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKHBhcmVudC4kJGluaGVyaXRlZFZhbHVlcykge1xuICAgICAgICBtZXJnZSh2YWx1ZXMsIG9taXQocGFyZW50LiQkaW5oZXJpdGVkVmFsdWVzLCBpbnZvY2FibGVLZXlzKSk7XG4gICAgICB9XG5cbiAgICAgIC8vIE1lcmdlIHBhcmVudCB2YWx1ZXMgaWYgdGhlIHBhcmVudCBoYXMgYWxyZWFkeSByZXNvbHZlZCwgb3IgbWVyZ2VcbiAgICAgIC8vIHBhcmVudCBwcm9taXNlcyBhbmQgd2FpdCBpZiB0aGUgcGFyZW50IHJlc29sdmUgaXMgc3RpbGwgaW4gcHJvZ3Jlc3MuXG4gICAgICBleHRlbmQocHJvbWlzZXMsIHBhcmVudC4kJHByb21pc2VzKTtcbiAgICAgIGlmIChwYXJlbnQuJCR2YWx1ZXMpIHtcbiAgICAgICAgbWVyZ2VkID0gbWVyZ2UodmFsdWVzLCBvbWl0KHBhcmVudC4kJHZhbHVlcywgaW52b2NhYmxlS2V5cykpO1xuICAgICAgICByZXN1bHQuJCRpbmhlcml0ZWRWYWx1ZXMgPSBvbWl0KHBhcmVudC4kJHZhbHVlcywgaW52b2NhYmxlS2V5cyk7XG4gICAgICAgIGRvbmUoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChwYXJlbnQuJCRpbmhlcml0ZWRWYWx1ZXMpIHtcbiAgICAgICAgICByZXN1bHQuJCRpbmhlcml0ZWRWYWx1ZXMgPSBvbWl0KHBhcmVudC4kJGluaGVyaXRlZFZhbHVlcywgaW52b2NhYmxlS2V5cyk7XG4gICAgICAgIH0gICAgICAgIFxuICAgICAgICBwYXJlbnQudGhlbihkb25lLCBmYWlsKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gUHJvY2VzcyBlYWNoIGludm9jYWJsZSBpbiB0aGUgcGxhbiwgYnV0IGlnbm9yZSBhbnkgd2hlcmUgYSBsb2NhbCBvZiB0aGUgc2FtZSBuYW1lIGV4aXN0cy5cbiAgICAgIGZvciAodmFyIGk9MCwgaWk9cGxhbi5sZW5ndGg7IGk8aWk7IGkrPTMpIHtcbiAgICAgICAgaWYgKGxvY2Fscy5oYXNPd25Qcm9wZXJ0eShwbGFuW2ldKSkgZG9uZSgpO1xuICAgICAgICBlbHNlIGludm9rZShwbGFuW2ldLCBwbGFuW2krMV0sIHBsYW5baSsyXSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIGludm9rZShrZXksIGludm9jYWJsZSwgcGFyYW1zKSB7XG4gICAgICAgIC8vIENyZWF0ZSBhIGRlZmVycmVkIGZvciB0aGlzIGludm9jYXRpb24uIEZhaWx1cmVzIHdpbGwgcHJvcGFnYXRlIHRvIHRoZSByZXNvbHV0aW9uIGFzIHdlbGwuXG4gICAgICAgIHZhciBpbnZvY2F0aW9uID0gJHEuZGVmZXIoKSwgd2FpdFBhcmFtcyA9IDA7XG4gICAgICAgIGZ1bmN0aW9uIG9uZmFpbHVyZShyZWFzb24pIHtcbiAgICAgICAgICBpbnZvY2F0aW9uLnJlamVjdChyZWFzb24pO1xuICAgICAgICAgIGZhaWwocmVhc29uKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBXYWl0IGZvciBhbnkgcGFyYW1ldGVyIHRoYXQgd2UgaGF2ZSBhIHByb21pc2UgZm9yIChlaXRoZXIgZnJvbSBwYXJlbnQgb3IgZnJvbSB0aGlzXG4gICAgICAgIC8vIHJlc29sdmU7IGluIHRoYXQgY2FzZSBzdHVkeSgpIHdpbGwgaGF2ZSBtYWRlIHN1cmUgaXQncyBvcmRlcmVkIGJlZm9yZSB1cyBpbiB0aGUgcGxhbikuXG4gICAgICAgIGZvckVhY2gocGFyYW1zLCBmdW5jdGlvbiAoZGVwKSB7XG4gICAgICAgICAgaWYgKHByb21pc2VzLmhhc093blByb3BlcnR5KGRlcCkgJiYgIWxvY2Fscy5oYXNPd25Qcm9wZXJ0eShkZXApKSB7XG4gICAgICAgICAgICB3YWl0UGFyYW1zKys7XG4gICAgICAgICAgICBwcm9taXNlc1tkZXBdLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICB2YWx1ZXNbZGVwXSA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgaWYgKCEoLS13YWl0UGFyYW1zKSkgcHJvY2VlZCgpO1xuICAgICAgICAgICAgfSwgb25mYWlsdXJlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXdhaXRQYXJhbXMpIHByb2NlZWQoKTtcbiAgICAgICAgZnVuY3Rpb24gcHJvY2VlZCgpIHtcbiAgICAgICAgICBpZiAoaXNEZWZpbmVkKHJlc3VsdC4kJGZhaWx1cmUpKSByZXR1cm47XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGludm9jYXRpb24ucmVzb2x2ZSgkaW5qZWN0b3IuaW52b2tlKGludm9jYWJsZSwgc2VsZiwgdmFsdWVzKSk7XG4gICAgICAgICAgICBpbnZvY2F0aW9uLnByb21pc2UudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgIHZhbHVlc1trZXldID0gcmVzdWx0O1xuICAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgICB9LCBvbmZhaWx1cmUpO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIG9uZmFpbHVyZShlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gUHVibGlzaCBwcm9taXNlIHN5bmNocm9ub3VzbHk7IGludm9jYXRpb25zIGZ1cnRoZXIgZG93biBpbiB0aGUgcGxhbiBtYXkgZGVwZW5kIG9uIGl0LlxuICAgICAgICBwcm9taXNlc1trZXldID0gaW52b2NhdGlvbi5wcm9taXNlO1xuICAgICAgfVxuICAgICAgXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG4gIFxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci51dGlsLiRyZXNvbHZlI3Jlc29sdmVcbiAgICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLiRyZXNvbHZlXG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBSZXNvbHZlcyBhIHNldCBvZiBpbnZvY2FibGVzLiBBbiBpbnZvY2FibGUgaXMgYSBmdW5jdGlvbiB0byBiZSBpbnZva2VkIHZpYSBcbiAgICogYCRpbmplY3Rvci5pbnZva2UoKWAsIGFuZCBjYW4gaGF2ZSBhbiBhcmJpdHJhcnkgbnVtYmVyIG9mIGRlcGVuZGVuY2llcy4gXG4gICAqIEFuIGludm9jYWJsZSBjYW4gZWl0aGVyIHJldHVybiBhIHZhbHVlIGRpcmVjdGx5LFxuICAgKiBvciBhIGAkcWAgcHJvbWlzZS4gSWYgYSBwcm9taXNlIGlzIHJldHVybmVkIGl0IHdpbGwgYmUgcmVzb2x2ZWQgYW5kIHRoZSBcbiAgICogcmVzdWx0aW5nIHZhbHVlIHdpbGwgYmUgdXNlZCBpbnN0ZWFkLiBEZXBlbmRlbmNpZXMgb2YgaW52b2NhYmxlcyBhcmUgcmVzb2x2ZWQgXG4gICAqIChpbiB0aGlzIG9yZGVyIG9mIHByZWNlZGVuY2UpXG4gICAqXG4gICAqIC0gZnJvbSB0aGUgc3BlY2lmaWVkIGBsb2NhbHNgXG4gICAqIC0gZnJvbSBhbm90aGVyIGludm9jYWJsZSB0aGF0IGlzIHBhcnQgb2YgdGhpcyBgJHJlc29sdmVgIGNhbGxcbiAgICogLSBmcm9tIGFuIGludm9jYWJsZSB0aGF0IGlzIGluaGVyaXRlZCBmcm9tIGEgYHBhcmVudGAgY2FsbCB0byBgJHJlc29sdmVgIFxuICAgKiAgIChvciByZWN1cnNpdmVseVxuICAgKiAtIGZyb20gYW55IGFuY2VzdG9yIGAkcmVzb2x2ZWAgb2YgdGhhdCBwYXJlbnQpLlxuICAgKlxuICAgKiBUaGUgcmV0dXJuIHZhbHVlIG9mIGAkcmVzb2x2ZWAgaXMgYSBwcm9taXNlIGZvciBhbiBvYmplY3QgdGhhdCBjb250YWlucyBcbiAgICogKGluIHRoaXMgb3JkZXIgb2YgcHJlY2VkZW5jZSlcbiAgICpcbiAgICogLSBhbnkgYGxvY2Fsc2AgKGlmIHNwZWNpZmllZClcbiAgICogLSB0aGUgcmVzb2x2ZWQgcmV0dXJuIHZhbHVlcyBvZiBhbGwgaW5qZWN0YWJsZXNcbiAgICogLSBhbnkgdmFsdWVzIGluaGVyaXRlZCBmcm9tIGEgYHBhcmVudGAgY2FsbCB0byBgJHJlc29sdmVgIChpZiBzcGVjaWZpZWQpXG4gICAqXG4gICAqIFRoZSBwcm9taXNlIHdpbGwgcmVzb2x2ZSBhZnRlciB0aGUgYHBhcmVudGAgcHJvbWlzZSAoaWYgYW55KSBhbmQgYWxsIHByb21pc2VzIFxuICAgKiByZXR1cm5lZCBieSBpbmplY3RhYmxlcyBoYXZlIGJlZW4gcmVzb2x2ZWQuIElmIGFueSBpbnZvY2FibGUgXG4gICAqIChvciBgJGluamVjdG9yLmludm9rZWApIHRocm93cyBhbiBleGNlcHRpb24sIG9yIGlmIGEgcHJvbWlzZSByZXR1cm5lZCBieSBhbiBcbiAgICogaW52b2NhYmxlIGlzIHJlamVjdGVkLCB0aGUgYCRyZXNvbHZlYCBwcm9taXNlIGlzIGltbWVkaWF0ZWx5IHJlamVjdGVkIHdpdGggdGhlIFxuICAgKiBzYW1lIGVycm9yLiBBIHJlamVjdGlvbiBvZiBhIGBwYXJlbnRgIHByb21pc2UgKGlmIHNwZWNpZmllZCkgd2lsbCBsaWtld2lzZSBiZSBcbiAgICogcHJvcGFnYXRlZCBpbW1lZGlhdGVseS4gT25jZSB0aGUgYCRyZXNvbHZlYCBwcm9taXNlIGhhcyBiZWVuIHJlamVjdGVkLCBubyBcbiAgICogZnVydGhlciBpbnZvY2FibGVzIHdpbGwgYmUgY2FsbGVkLlxuICAgKiBcbiAgICogQ3ljbGljIGRlcGVuZGVuY2llcyBiZXR3ZWVuIGludm9jYWJsZXMgYXJlIG5vdCBwZXJtaXR0ZWQgYW5kIHdpbGwgY2F1ZXMgYCRyZXNvbHZlYFxuICAgKiB0byB0aHJvdyBhbiBlcnJvci4gQXMgYSBzcGVjaWFsIGNhc2UsIGFuIGluamVjdGFibGUgY2FuIGRlcGVuZCBvbiBhIHBhcmFtZXRlciBcbiAgICogd2l0aCB0aGUgc2FtZSBuYW1lIGFzIHRoZSBpbmplY3RhYmxlLCB3aGljaCB3aWxsIGJlIGZ1bGZpbGxlZCBmcm9tIHRoZSBgcGFyZW50YCBcbiAgICogaW5qZWN0YWJsZSBvZiB0aGUgc2FtZSBuYW1lLiBUaGlzIGFsbG93cyBpbmhlcml0ZWQgdmFsdWVzIHRvIGJlIGRlY29yYXRlZC4gXG4gICAqIE5vdGUgdGhhdCBpbiB0aGlzIGNhc2UgYW55IG90aGVyIGluamVjdGFibGUgaW4gdGhlIHNhbWUgYCRyZXNvbHZlYCB3aXRoIHRoZSBzYW1lXG4gICAqIGRlcGVuZGVuY3kgd291bGQgc2VlIHRoZSBkZWNvcmF0ZWQgdmFsdWUsIG5vdCB0aGUgaW5oZXJpdGVkIHZhbHVlLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgbWlzc2luZyBkZXBlbmRlbmNpZXMgLS0gdW5saWtlIGN5Y2xpYyBkZXBlbmRlbmNpZXMgLS0gd2lsbCBjYXVzZSBhbiBcbiAgICogKGFzeW5jaHJvbm91cykgcmVqZWN0aW9uIG9mIHRoZSBgJHJlc29sdmVgIHByb21pc2UgcmF0aGVyIHRoYW4gYSAoc3luY2hyb25vdXMpIFxuICAgKiBleGNlcHRpb24uXG4gICAqXG4gICAqIEludm9jYWJsZXMgYXJlIGludm9rZWQgZWFnZXJseSBhcyBzb29uIGFzIGFsbCBkZXBlbmRlbmNpZXMgYXJlIGF2YWlsYWJsZS4gXG4gICAqIFRoaXMgaXMgdHJ1ZSBldmVuIGZvciBkZXBlbmRlbmNpZXMgaW5oZXJpdGVkIGZyb20gYSBgcGFyZW50YCBjYWxsIHRvIGAkcmVzb2x2ZWAuXG4gICAqXG4gICAqIEFzIGEgc3BlY2lhbCBjYXNlLCBhbiBpbnZvY2FibGUgY2FuIGJlIGEgc3RyaW5nLCBpbiB3aGljaCBjYXNlIGl0IGlzIHRha2VuIHRvIFxuICAgKiBiZSBhIHNlcnZpY2UgbmFtZSB0byBiZSBwYXNzZWQgdG8gYCRpbmplY3Rvci5nZXQoKWAuIFRoaXMgaXMgc3VwcG9ydGVkIHByaW1hcmlseSBcbiAgICogZm9yIGJhY2t3YXJkcy1jb21wYXRpYmlsaXR5IHdpdGggdGhlIGByZXNvbHZlYCBwcm9wZXJ0eSBvZiBgJHJvdXRlUHJvdmlkZXJgIFxuICAgKiByb3V0ZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBpbnZvY2FibGVzIGZ1bmN0aW9ucyB0byBpbnZva2Ugb3IgXG4gICAqIGAkaW5qZWN0b3JgIHNlcnZpY2VzIHRvIGZldGNoLlxuICAgKiBAcGFyYW0ge29iamVjdH0gbG9jYWxzICB2YWx1ZXMgdG8gbWFrZSBhdmFpbGFibGUgdG8gdGhlIGluamVjdGFibGVzXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJlbnQgIGEgcHJvbWlzZSByZXR1cm5lZCBieSBhbm90aGVyIGNhbGwgdG8gYCRyZXNvbHZlYC5cbiAgICogQHBhcmFtIHtvYmplY3R9IHNlbGYgIHRoZSBgdGhpc2AgZm9yIHRoZSBpbnZva2VkIG1ldGhvZHNcbiAgICogQHJldHVybiB7b2JqZWN0fSBQcm9taXNlIGZvciBhbiBvYmplY3QgdGhhdCBjb250YWlucyB0aGUgcmVzb2x2ZWQgcmV0dXJuIHZhbHVlXG4gICAqIG9mIGFsbCBpbnZvY2FibGVzLCBhcyB3ZWxsIGFzIGFueSBpbmhlcml0ZWQgYW5kIGxvY2FsIHZhbHVlcy5cbiAgICovXG4gIHRoaXMucmVzb2x2ZSA9IGZ1bmN0aW9uIChpbnZvY2FibGVzLCBsb2NhbHMsIHBhcmVudCwgc2VsZikge1xuICAgIHJldHVybiB0aGlzLnN0dWR5KGludm9jYWJsZXMpKGxvY2FscywgcGFyZW50LCBzZWxmKTtcbiAgfTtcbn1cblxuYW5ndWxhci5tb2R1bGUoJ3VpLnJvdXRlci51dGlsJykuc2VydmljZSgnJHJlc29sdmUnLCAkUmVzb2x2ZSk7XG5cblxuLyoqXG4gKiBAbmdkb2Mgb2JqZWN0XG4gKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC4kdGVtcGxhdGVGYWN0b3J5XG4gKlxuICogQHJlcXVpcmVzICRodHRwXG4gKiBAcmVxdWlyZXMgJHRlbXBsYXRlQ2FjaGVcbiAqIEByZXF1aXJlcyAkaW5qZWN0b3JcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFNlcnZpY2UuIE1hbmFnZXMgbG9hZGluZyBvZiB0ZW1wbGF0ZXMuXG4gKi9cbiRUZW1wbGF0ZUZhY3RvcnkuJGluamVjdCA9IFsnJGh0dHAnLCAnJHRlbXBsYXRlQ2FjaGUnLCAnJGluamVjdG9yJ107XG5mdW5jdGlvbiAkVGVtcGxhdGVGYWN0b3J5KCAgJGh0dHAsICAgJHRlbXBsYXRlQ2FjaGUsICAgJGluamVjdG9yKSB7XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC4kdGVtcGxhdGVGYWN0b3J5I2Zyb21Db25maWdcbiAgICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLiR0ZW1wbGF0ZUZhY3RvcnlcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIENyZWF0ZXMgYSB0ZW1wbGF0ZSBmcm9tIGEgY29uZmlndXJhdGlvbiBvYmplY3QuIFxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIENvbmZpZ3VyYXRpb24gb2JqZWN0IGZvciB3aGljaCB0byBsb2FkIGEgdGVtcGxhdGUuIFxuICAgKiBUaGUgZm9sbG93aW5nIHByb3BlcnRpZXMgYXJlIHNlYXJjaCBpbiB0aGUgc3BlY2lmaWVkIG9yZGVyLCBhbmQgdGhlIGZpcnN0IG9uZSBcbiAgICogdGhhdCBpcyBkZWZpbmVkIGlzIHVzZWQgdG8gY3JlYXRlIHRoZSB0ZW1wbGF0ZTpcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBjb25maWcudGVtcGxhdGUgaHRtbCBzdHJpbmcgdGVtcGxhdGUgb3IgZnVuY3Rpb24gdG8gXG4gICAqIGxvYWQgdmlhIHtAbGluayB1aS5yb3V0ZXIudXRpbC4kdGVtcGxhdGVGYWN0b3J5I2Zyb21TdHJpbmcgZnJvbVN0cmluZ30uXG4gICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gY29uZmlnLnRlbXBsYXRlVXJsIHVybCB0byBsb2FkIG9yIGEgZnVuY3Rpb24gcmV0dXJuaW5nIFxuICAgKiB0aGUgdXJsIHRvIGxvYWQgdmlhIHtAbGluayB1aS5yb3V0ZXIudXRpbC4kdGVtcGxhdGVGYWN0b3J5I2Zyb21VcmwgZnJvbVVybH0uXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNvbmZpZy50ZW1wbGF0ZVByb3ZpZGVyIGZ1bmN0aW9uIHRvIGludm9rZSB2aWEgXG4gICAqIHtAbGluayB1aS5yb3V0ZXIudXRpbC4kdGVtcGxhdGVGYWN0b3J5I2Zyb21Qcm92aWRlciBmcm9tUHJvdmlkZXJ9LlxuICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zICBQYXJhbWV0ZXJzIHRvIHBhc3MgdG8gdGhlIHRlbXBsYXRlIGZ1bmN0aW9uLlxuICAgKiBAcGFyYW0ge29iamVjdH0gbG9jYWxzIExvY2FscyB0byBwYXNzIHRvIGBpbnZva2VgIGlmIHRoZSB0ZW1wbGF0ZSBpcyBsb2FkZWQgXG4gICAqIHZpYSBhIGB0ZW1wbGF0ZVByb3ZpZGVyYC4gRGVmYXVsdHMgdG8gYHsgcGFyYW1zOiBwYXJhbXMgfWAuXG4gICAqXG4gICAqIEByZXR1cm4ge3N0cmluZ3xvYmplY3R9ICBUaGUgdGVtcGxhdGUgaHRtbCBhcyBhIHN0cmluZywgb3IgYSBwcm9taXNlIGZvciBcbiAgICogdGhhdCBzdHJpbmcsb3IgYG51bGxgIGlmIG5vIHRlbXBsYXRlIGlzIGNvbmZpZ3VyZWQuXG4gICAqL1xuICB0aGlzLmZyb21Db25maWcgPSBmdW5jdGlvbiAoY29uZmlnLCBwYXJhbXMsIGxvY2Fscykge1xuICAgIHJldHVybiAoXG4gICAgICBpc0RlZmluZWQoY29uZmlnLnRlbXBsYXRlKSA/IHRoaXMuZnJvbVN0cmluZyhjb25maWcudGVtcGxhdGUsIHBhcmFtcykgOlxuICAgICAgaXNEZWZpbmVkKGNvbmZpZy50ZW1wbGF0ZVVybCkgPyB0aGlzLmZyb21VcmwoY29uZmlnLnRlbXBsYXRlVXJsLCBwYXJhbXMpIDpcbiAgICAgIGlzRGVmaW5lZChjb25maWcudGVtcGxhdGVQcm92aWRlcikgPyB0aGlzLmZyb21Qcm92aWRlcihjb25maWcudGVtcGxhdGVQcm92aWRlciwgcGFyYW1zLCBsb2NhbHMpIDpcbiAgICAgIG51bGxcbiAgICApO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgdWkucm91dGVyLnV0aWwuJHRlbXBsYXRlRmFjdG9yeSNmcm9tU3RyaW5nXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC4kdGVtcGxhdGVGYWN0b3J5XG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBDcmVhdGVzIGEgdGVtcGxhdGUgZnJvbSBhIHN0cmluZyBvciBhIGZ1bmN0aW9uIHJldHVybmluZyBhIHN0cmluZy5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSB0ZW1wbGF0ZSBodG1sIHRlbXBsYXRlIGFzIGEgc3RyaW5nIG9yIGZ1bmN0aW9uIHRoYXQgXG4gICAqIHJldHVybnMgYW4gaHRtbCB0ZW1wbGF0ZSBhcyBhIHN0cmluZy5cbiAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyBQYXJhbWV0ZXJzIHRvIHBhc3MgdG8gdGhlIHRlbXBsYXRlIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJuIHtzdHJpbmd8b2JqZWN0fSBUaGUgdGVtcGxhdGUgaHRtbCBhcyBhIHN0cmluZywgb3IgYSBwcm9taXNlIGZvciB0aGF0IFxuICAgKiBzdHJpbmcuXG4gICAqL1xuICB0aGlzLmZyb21TdHJpbmcgPSBmdW5jdGlvbiAodGVtcGxhdGUsIHBhcmFtcykge1xuICAgIHJldHVybiBpc0Z1bmN0aW9uKHRlbXBsYXRlKSA/IHRlbXBsYXRlKHBhcmFtcykgOiB0ZW1wbGF0ZTtcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci51dGlsLiR0ZW1wbGF0ZUZhY3RvcnkjZnJvbVVybFxuICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwuJHRlbXBsYXRlRmFjdG9yeVxuICAgKiBcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIExvYWRzIGEgdGVtcGxhdGUgZnJvbSB0aGUgYSBVUkwgdmlhIGAkaHR0cGAgYW5kIGAkdGVtcGxhdGVDYWNoZWAuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfEZ1bmN0aW9ufSB1cmwgdXJsIG9mIHRoZSB0ZW1wbGF0ZSB0byBsb2FkLCBvciBhIGZ1bmN0aW9uIFxuICAgKiB0aGF0IHJldHVybnMgYSB1cmwuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgUGFyYW1ldGVycyB0byBwYXNzIHRvIHRoZSB1cmwgZnVuY3Rpb24uXG4gICAqIEByZXR1cm4ge3N0cmluZ3xQcm9taXNlLjxzdHJpbmc+fSBUaGUgdGVtcGxhdGUgaHRtbCBhcyBhIHN0cmluZywgb3IgYSBwcm9taXNlIFxuICAgKiBmb3IgdGhhdCBzdHJpbmcuXG4gICAqL1xuICB0aGlzLmZyb21VcmwgPSBmdW5jdGlvbiAodXJsLCBwYXJhbXMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbih1cmwpKSB1cmwgPSB1cmwocGFyYW1zKTtcbiAgICBpZiAodXJsID09IG51bGwpIHJldHVybiBudWxsO1xuICAgIGVsc2UgcmV0dXJuICRodHRwXG4gICAgICAgIC5nZXQodXJsLCB7IGNhY2hlOiAkdGVtcGxhdGVDYWNoZSwgaGVhZGVyczogeyBBY2NlcHQ6ICd0ZXh0L2h0bWwnIH19KVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkgeyByZXR1cm4gcmVzcG9uc2UuZGF0YTsgfSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC4kdGVtcGxhdGVGYWN0b3J5I2Zyb21Qcm92aWRlclxuICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwuJHRlbXBsYXRlRmFjdG9yeVxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogQ3JlYXRlcyBhIHRlbXBsYXRlIGJ5IGludm9raW5nIGFuIGluamVjdGFibGUgcHJvdmlkZXIgZnVuY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IHByb3ZpZGVyIEZ1bmN0aW9uIHRvIGludm9rZSB2aWEgYCRpbmplY3Rvci5pbnZva2VgXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgUGFyYW1ldGVycyBmb3IgdGhlIHRlbXBsYXRlLlxuICAgKiBAcGFyYW0ge09iamVjdH0gbG9jYWxzIExvY2FscyB0byBwYXNzIHRvIGBpbnZva2VgLiBEZWZhdWx0cyB0byBcbiAgICogYHsgcGFyYW1zOiBwYXJhbXMgfWAuXG4gICAqIEByZXR1cm4ge3N0cmluZ3xQcm9taXNlLjxzdHJpbmc+fSBUaGUgdGVtcGxhdGUgaHRtbCBhcyBhIHN0cmluZywgb3IgYSBwcm9taXNlIFxuICAgKiBmb3IgdGhhdCBzdHJpbmcuXG4gICAqL1xuICB0aGlzLmZyb21Qcm92aWRlciA9IGZ1bmN0aW9uIChwcm92aWRlciwgcGFyYW1zLCBsb2NhbHMpIHtcbiAgICByZXR1cm4gJGluamVjdG9yLmludm9rZShwcm92aWRlciwgbnVsbCwgbG9jYWxzIHx8IHsgcGFyYW1zOiBwYXJhbXMgfSk7XG4gIH07XG59XG5cbmFuZ3VsYXIubW9kdWxlKCd1aS5yb3V0ZXIudXRpbCcpLnNlcnZpY2UoJyR0ZW1wbGF0ZUZhY3RvcnknLCAkVGVtcGxhdGVGYWN0b3J5KTtcblxudmFyICQkVU1GUDsgLy8gcmVmZXJlbmNlIHRvICRVcmxNYXRjaGVyRmFjdG9yeVByb3ZpZGVyXG5cbi8qKlxuICogQG5nZG9jIG9iamVjdFxuICogQG5hbWUgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBNYXRjaGVzIFVSTHMgYWdhaW5zdCBwYXR0ZXJucyBhbmQgZXh0cmFjdHMgbmFtZWQgcGFyYW1ldGVycyBmcm9tIHRoZSBwYXRoIG9yIHRoZSBzZWFyY2hcbiAqIHBhcnQgb2YgdGhlIFVSTC4gQSBVUkwgcGF0dGVybiBjb25zaXN0cyBvZiBhIHBhdGggcGF0dGVybiwgb3B0aW9uYWxseSBmb2xsb3dlZCBieSAnPycgYW5kIGEgbGlzdFxuICogb2Ygc2VhcmNoIHBhcmFtZXRlcnMuIE11bHRpcGxlIHNlYXJjaCBwYXJhbWV0ZXIgbmFtZXMgYXJlIHNlcGFyYXRlZCBieSAnJicuIFNlYXJjaCBwYXJhbWV0ZXJzXG4gKiBkbyBub3QgaW5mbHVlbmNlIHdoZXRoZXIgb3Igbm90IGEgVVJMIGlzIG1hdGNoZWQsIGJ1dCB0aGVpciB2YWx1ZXMgYXJlIHBhc3NlZCB0aHJvdWdoIGludG9cbiAqIHRoZSBtYXRjaGVkIHBhcmFtZXRlcnMgcmV0dXJuZWQgYnkge0BsaW5rIHVpLnJvdXRlci51dGlsLnR5cGU6VXJsTWF0Y2hlciNtZXRob2RzX2V4ZWMgZXhlY30uXG4gKiBcbiAqIFBhdGggcGFyYW1ldGVyIHBsYWNlaG9sZGVycyBjYW4gYmUgc3BlY2lmaWVkIHVzaW5nIHNpbXBsZSBjb2xvbi9jYXRjaC1hbGwgc3ludGF4IG9yIGN1cmx5IGJyYWNlXG4gKiBzeW50YXgsIHdoaWNoIG9wdGlvbmFsbHkgYWxsb3dzIGEgcmVndWxhciBleHByZXNzaW9uIGZvciB0aGUgcGFyYW1ldGVyIHRvIGJlIHNwZWNpZmllZDpcbiAqXG4gKiAqIGAnOidgIG5hbWUgLSBjb2xvbiBwbGFjZWhvbGRlclxuICogKiBgJyonYCBuYW1lIC0gY2F0Y2gtYWxsIHBsYWNlaG9sZGVyXG4gKiAqIGAneycgbmFtZSAnfSdgIC0gY3VybHkgcGxhY2Vob2xkZXJcbiAqICogYCd7JyBuYW1lICc6JyByZWdleHB8dHlwZSAnfSdgIC0gY3VybHkgcGxhY2Vob2xkZXIgd2l0aCByZWdleHAgb3IgdHlwZSBuYW1lLiBTaG91bGQgdGhlXG4gKiAgIHJlZ2V4cCBpdHNlbGYgY29udGFpbiBjdXJseSBicmFjZXMsIHRoZXkgbXVzdCBiZSBpbiBtYXRjaGVkIHBhaXJzIG9yIGVzY2FwZWQgd2l0aCBhIGJhY2tzbGFzaC5cbiAqXG4gKiBQYXJhbWV0ZXIgbmFtZXMgbWF5IGNvbnRhaW4gb25seSB3b3JkIGNoYXJhY3RlcnMgKGxhdGluIGxldHRlcnMsIGRpZ2l0cywgYW5kIHVuZGVyc2NvcmUpIGFuZFxuICogbXVzdCBiZSB1bmlxdWUgd2l0aGluIHRoZSBwYXR0ZXJuIChhY3Jvc3MgYm90aCBwYXRoIGFuZCBzZWFyY2ggcGFyYW1ldGVycykuIEZvciBjb2xvbiBcbiAqIHBsYWNlaG9sZGVycyBvciBjdXJseSBwbGFjZWhvbGRlcnMgd2l0aG91dCBhbiBleHBsaWNpdCByZWdleHAsIGEgcGF0aCBwYXJhbWV0ZXIgbWF0Y2hlcyBhbnlcbiAqIG51bWJlciBvZiBjaGFyYWN0ZXJzIG90aGVyIHRoYW4gJy8nLiBGb3IgY2F0Y2gtYWxsIHBsYWNlaG9sZGVycyB0aGUgcGF0aCBwYXJhbWV0ZXIgbWF0Y2hlc1xuICogYW55IG51bWJlciBvZiBjaGFyYWN0ZXJzLlxuICogXG4gKiBFeGFtcGxlczpcbiAqIFxuICogKiBgJy9oZWxsby8nYCAtIE1hdGNoZXMgb25seSBpZiB0aGUgcGF0aCBpcyBleGFjdGx5ICcvaGVsbG8vJy4gVGhlcmUgaXMgbm8gc3BlY2lhbCB0cmVhdG1lbnQgZm9yXG4gKiAgIHRyYWlsaW5nIHNsYXNoZXMsIGFuZCBwYXR0ZXJucyBoYXZlIHRvIG1hdGNoIHRoZSBlbnRpcmUgcGF0aCwgbm90IGp1c3QgYSBwcmVmaXguXG4gKiAqIGAnL3VzZXIvOmlkJ2AgLSBNYXRjaGVzICcvdXNlci9ib2InIG9yICcvdXNlci8xMjM0ISEhJyBvciBldmVuICcvdXNlci8nIGJ1dCBub3QgJy91c2VyJyBvclxuICogICAnL3VzZXIvYm9iL2RldGFpbHMnLiBUaGUgc2Vjb25kIHBhdGggc2VnbWVudCB3aWxsIGJlIGNhcHR1cmVkIGFzIHRoZSBwYXJhbWV0ZXIgJ2lkJy5cbiAqICogYCcvdXNlci97aWR9J2AgLSBTYW1lIGFzIHRoZSBwcmV2aW91cyBleGFtcGxlLCBidXQgdXNpbmcgY3VybHkgYnJhY2Ugc3ludGF4LlxuICogKiBgJy91c2VyL3tpZDpbXi9dKn0nYCAtIFNhbWUgYXMgdGhlIHByZXZpb3VzIGV4YW1wbGUuXG4gKiAqIGAnL3VzZXIve2lkOlswLTlhLWZBLUZdezEsOH19J2AgLSBTaW1pbGFyIHRvIHRoZSBwcmV2aW91cyBleGFtcGxlLCBidXQgb25seSBtYXRjaGVzIGlmIHRoZSBpZFxuICogICBwYXJhbWV0ZXIgY29uc2lzdHMgb2YgMSB0byA4IGhleCBkaWdpdHMuXG4gKiAqIGAnL2ZpbGVzL3twYXRoOi4qfSdgIC0gTWF0Y2hlcyBhbnkgVVJMIHN0YXJ0aW5nIHdpdGggJy9maWxlcy8nIGFuZCBjYXB0dXJlcyB0aGUgcmVzdCBvZiB0aGVcbiAqICAgcGF0aCBpbnRvIHRoZSBwYXJhbWV0ZXIgJ3BhdGgnLlxuICogKiBgJy9maWxlcy8qcGF0aCdgIC0gZGl0dG8uXG4gKiAqIGAnL2NhbGVuZGFyL3tzdGFydDpkYXRlfSdgIC0gTWF0Y2hlcyBcIi9jYWxlbmRhci8yMDE0LTExLTEyXCIgKGJlY2F1c2UgdGhlIHBhdHRlcm4gZGVmaW5lZFxuICogICBpbiB0aGUgYnVpbHQtaW4gIGBkYXRlYCBUeXBlIG1hdGNoZXMgYDIwMTQtMTEtMTJgKSBhbmQgcHJvdmlkZXMgYSBEYXRlIG9iamVjdCBpbiAkc3RhdGVQYXJhbXMuc3RhcnRcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0dGVybiAgVGhlIHBhdHRlcm4gdG8gY29tcGlsZSBpbnRvIGEgbWF0Y2hlci5cbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgIEEgY29uZmlndXJhdGlvbiBvYmplY3QgaGFzaDpcbiAqIEBwYXJhbSB7T2JqZWN0PX0gcGFyZW50TWF0Y2hlciBVc2VkIHRvIGNvbmNhdGVuYXRlIHRoZSBwYXR0ZXJuL2NvbmZpZyBvbnRvXG4gKiAgIGFuIGV4aXN0aW5nIFVybE1hdGNoZXJcbiAqXG4gKiAqIGBjYXNlSW5zZW5zaXRpdmVgIC0gYHRydWVgIGlmIFVSTCBtYXRjaGluZyBzaG91bGQgYmUgY2FzZSBpbnNlbnNpdGl2ZSwgb3RoZXJ3aXNlIGBmYWxzZWAsIHRoZSBkZWZhdWx0IHZhbHVlIChmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSkgaXMgYGZhbHNlYC5cbiAqICogYHN0cmljdGAgLSBgZmFsc2VgIGlmIG1hdGNoaW5nIGFnYWluc3QgYSBVUkwgd2l0aCBhIHRyYWlsaW5nIHNsYXNoIHNob3VsZCBiZSB0cmVhdGVkIGFzIGVxdWl2YWxlbnQgdG8gYSBVUkwgd2l0aG91dCBhIHRyYWlsaW5nIHNsYXNoLCB0aGUgZGVmYXVsdCB2YWx1ZSBpcyBgdHJ1ZWAuXG4gKlxuICogQHByb3BlcnR5IHtzdHJpbmd9IHByZWZpeCAgQSBzdGF0aWMgcHJlZml4IG9mIHRoaXMgcGF0dGVybi4gVGhlIG1hdGNoZXIgZ3VhcmFudGVlcyB0aGF0IGFueVxuICogICBVUkwgbWF0Y2hpbmcgdGhpcyBtYXRjaGVyIChpLmUuIGFueSBzdHJpbmcgZm9yIHdoaWNoIHtAbGluayB1aS5yb3V0ZXIudXRpbC50eXBlOlVybE1hdGNoZXIjbWV0aG9kc19leGVjIGV4ZWMoKX0gcmV0dXJuc1xuICogICBub24tbnVsbCkgd2lsbCBzdGFydCB3aXRoIHRoaXMgcHJlZml4LlxuICpcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBzb3VyY2UgIFRoZSBwYXR0ZXJuIHRoYXQgd2FzIHBhc3NlZCBpbnRvIHRoZSBjb25zdHJ1Y3RvclxuICpcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBzb3VyY2VQYXRoICBUaGUgcGF0aCBwb3J0aW9uIG9mIHRoZSBzb3VyY2UgcHJvcGVydHlcbiAqXG4gKiBAcHJvcGVydHkge3N0cmluZ30gc291cmNlU2VhcmNoICBUaGUgc2VhcmNoIHBvcnRpb24gb2YgdGhlIHNvdXJjZSBwcm9wZXJ0eVxuICpcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSByZWdleCAgVGhlIGNvbnN0cnVjdGVkIHJlZ2V4IHRoYXQgd2lsbCBiZSB1c2VkIHRvIG1hdGNoIGFnYWluc3QgdGhlIHVybCB3aGVuIFxuICogICBpdCBpcyB0aW1lIHRvIGRldGVybWluZSB3aGljaCB1cmwgd2lsbCBtYXRjaC5cbiAqXG4gKiBAcmV0dXJucyB7T2JqZWN0fSAgTmV3IGBVcmxNYXRjaGVyYCBvYmplY3RcbiAqL1xuZnVuY3Rpb24gVXJsTWF0Y2hlcihwYXR0ZXJuLCBjb25maWcsIHBhcmVudE1hdGNoZXIpIHtcbiAgY29uZmlnID0gZXh0ZW5kKHsgcGFyYW1zOiB7fSB9LCBpc09iamVjdChjb25maWcpID8gY29uZmlnIDoge30pO1xuXG4gIC8vIEZpbmQgYWxsIHBsYWNlaG9sZGVycyBhbmQgY3JlYXRlIGEgY29tcGlsZWQgcGF0dGVybiwgdXNpbmcgZWl0aGVyIGNsYXNzaWMgb3IgY3VybHkgc3ludGF4OlxuICAvLyAgICcqJyBuYW1lXG4gIC8vICAgJzonIG5hbWVcbiAgLy8gICAneycgbmFtZSAnfSdcbiAgLy8gICAneycgbmFtZSAnOicgcmVnZXhwICd9J1xuICAvLyBUaGUgcmVndWxhciBleHByZXNzaW9uIGlzIHNvbWV3aGF0IGNvbXBsaWNhdGVkIGR1ZSB0byB0aGUgbmVlZCB0byBhbGxvdyBjdXJseSBicmFjZXNcbiAgLy8gaW5zaWRlIHRoZSByZWd1bGFyIGV4cHJlc3Npb24uIFRoZSBwbGFjZWhvbGRlciByZWdleHAgYnJlYWtzIGRvd24gYXMgZm9sbG93czpcbiAgLy8gICAgKFs6Kl0pKFtcXHdcXFtcXF1dKykgICAgICAgICAgICAgIC0gY2xhc3NpYyBwbGFjZWhvbGRlciAoJDEgLyAkMikgKHNlYXJjaCB2ZXJzaW9uIGhhcyAtIGZvciBzbmFrZS1jYXNlKVxuICAvLyAgICBcXHsoW1xcd1xcW1xcXV0rKSg/OlxcOiggLi4uICkpP1xcfSAgLSBjdXJseSBicmFjZSBwbGFjZWhvbGRlciAoJDMpIHdpdGggb3B0aW9uYWwgcmVnZXhwL3R5cGUgLi4uICgkNCkgKHNlYXJjaCB2ZXJzaW9uIGhhcyAtIGZvciBzbmFrZS1jYXNlXG4gIC8vICAgICg/OiAuLi4gfCAuLi4gfCAuLi4gKSsgICAgICAgICAtIHRoZSByZWdleHAgY29uc2lzdHMgb2YgYW55IG51bWJlciBvZiBhdG9tcywgYW4gYXRvbSBiZWluZyBlaXRoZXJcbiAgLy8gICAgW157fVxcXFxdKyAgICAgICAgICAgICAgICAgICAgICAgLSBhbnl0aGluZyBvdGhlciB0aGFuIGN1cmx5IGJyYWNlcyBvciBiYWNrc2xhc2hcbiAgLy8gICAgXFxcXC4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLSBhIGJhY2tzbGFzaCBlc2NhcGVcbiAgLy8gICAgXFx7KD86W157fVxcXFxdK3xcXFxcLikqXFx9ICAgICAgICAgIC0gYSBtYXRjaGVkIHNldCBvZiBjdXJseSBicmFjZXMgY29udGFpbmluZyBvdGhlciBhdG9tc1xuICB2YXIgcGxhY2Vob2xkZXIgICAgICAgPSAvKFs6Kl0pKFtcXHdcXFtcXF1dKyl8XFx7KFtcXHdcXFtcXF1dKykoPzpcXDooKD86W157fVxcXFxdK3xcXFxcLnxcXHsoPzpbXnt9XFxcXF0rfFxcXFwuKSpcXH0pKykpP1xcfS9nLFxuICAgICAgc2VhcmNoUGxhY2Vob2xkZXIgPSAvKFs6XT8pKFtcXHdcXFtcXF0tXSspfFxceyhbXFx3XFxbXFxdLV0rKSg/OlxcOigoPzpbXnt9XFxcXF0rfFxcXFwufFxceyg/Oltee31cXFxcXSt8XFxcXC4pKlxcfSkrKSk/XFx9L2csXG4gICAgICBjb21waWxlZCA9ICdeJywgbGFzdCA9IDAsIG0sXG4gICAgICBzZWdtZW50cyA9IHRoaXMuc2VnbWVudHMgPSBbXSxcbiAgICAgIHBhcmVudFBhcmFtcyA9IHBhcmVudE1hdGNoZXIgPyBwYXJlbnRNYXRjaGVyLnBhcmFtcyA6IHt9LFxuICAgICAgcGFyYW1zID0gdGhpcy5wYXJhbXMgPSBwYXJlbnRNYXRjaGVyID8gcGFyZW50TWF0Y2hlci5wYXJhbXMuJCRuZXcoKSA6IG5ldyAkJFVNRlAuUGFyYW1TZXQoKSxcbiAgICAgIHBhcmFtTmFtZXMgPSBbXTtcblxuICBmdW5jdGlvbiBhZGRQYXJhbWV0ZXIoaWQsIHR5cGUsIGNvbmZpZywgbG9jYXRpb24pIHtcbiAgICBwYXJhbU5hbWVzLnB1c2goaWQpO1xuICAgIGlmIChwYXJlbnRQYXJhbXNbaWRdKSByZXR1cm4gcGFyZW50UGFyYW1zW2lkXTtcbiAgICBpZiAoIS9eXFx3KygtK1xcdyspKig/OlxcW1xcXSk/JC8udGVzdChpZCkpIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgcGFyYW1ldGVyIG5hbWUgJ1wiICsgaWQgKyBcIicgaW4gcGF0dGVybiAnXCIgKyBwYXR0ZXJuICsgXCInXCIpO1xuICAgIGlmIChwYXJhbXNbaWRdKSB0aHJvdyBuZXcgRXJyb3IoXCJEdXBsaWNhdGUgcGFyYW1ldGVyIG5hbWUgJ1wiICsgaWQgKyBcIicgaW4gcGF0dGVybiAnXCIgKyBwYXR0ZXJuICsgXCInXCIpO1xuICAgIHBhcmFtc1tpZF0gPSBuZXcgJCRVTUZQLlBhcmFtKGlkLCB0eXBlLCBjb25maWcsIGxvY2F0aW9uKTtcbiAgICByZXR1cm4gcGFyYW1zW2lkXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHF1b3RlUmVnRXhwKHN0cmluZywgcGF0dGVybiwgc3F1YXNoKSB7XG4gICAgdmFyIHN1cnJvdW5kUGF0dGVybiA9IFsnJywnJ10sIHJlc3VsdCA9IHN0cmluZy5yZXBsYWNlKC9bXFxcXFxcW1xcXVxcXiQqKz8uKCl8e31dL2csIFwiXFxcXCQmXCIpO1xuICAgIGlmICghcGF0dGVybikgcmV0dXJuIHJlc3VsdDtcbiAgICBzd2l0Y2goc3F1YXNoKSB7XG4gICAgICBjYXNlIGZhbHNlOiBzdXJyb3VuZFBhdHRlcm4gPSBbJygnLCAnKSddOyAgIGJyZWFrO1xuICAgICAgY2FzZSB0cnVlOiAgc3Vycm91bmRQYXR0ZXJuID0gWyc/KCcsICcpPyddOyBicmVhaztcbiAgICAgIGRlZmF1bHQ6ICAgIHN1cnJvdW5kUGF0dGVybiA9IFsnKCcgKyBzcXVhc2ggKyBcInxcIiwgJyk/J107ICBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdCArIHN1cnJvdW5kUGF0dGVyblswXSArIHBhdHRlcm4gKyBzdXJyb3VuZFBhdHRlcm5bMV07XG4gIH1cblxuICB0aGlzLnNvdXJjZSA9IHBhdHRlcm47XG5cbiAgLy8gU3BsaXQgaW50byBzdGF0aWMgc2VnbWVudHMgc2VwYXJhdGVkIGJ5IHBhdGggcGFyYW1ldGVyIHBsYWNlaG9sZGVycy5cbiAgLy8gVGhlIG51bWJlciBvZiBzZWdtZW50cyBpcyBhbHdheXMgMSBtb3JlIHRoYW4gdGhlIG51bWJlciBvZiBwYXJhbWV0ZXJzLlxuICBmdW5jdGlvbiBtYXRjaERldGFpbHMobSwgaXNTZWFyY2gpIHtcbiAgICB2YXIgaWQsIHJlZ2V4cCwgc2VnbWVudCwgdHlwZSwgY2ZnLCBhcnJheU1vZGU7XG4gICAgaWQgICAgICAgICAgPSBtWzJdIHx8IG1bM107IC8vIElFWzc4XSByZXR1cm5zICcnIGZvciB1bm1hdGNoZWQgZ3JvdXBzIGluc3RlYWQgb2YgbnVsbFxuICAgIGNmZyAgICAgICAgID0gY29uZmlnLnBhcmFtc1tpZF07XG4gICAgc2VnbWVudCAgICAgPSBwYXR0ZXJuLnN1YnN0cmluZyhsYXN0LCBtLmluZGV4KTtcbiAgICByZWdleHAgICAgICA9IGlzU2VhcmNoID8gbVs0XSA6IG1bNF0gfHwgKG1bMV0gPT0gJyonID8gJy4qJyA6IG51bGwpO1xuICAgIHR5cGUgICAgICAgID0gJCRVTUZQLnR5cGUocmVnZXhwIHx8IFwic3RyaW5nXCIpIHx8IGluaGVyaXQoJCRVTUZQLnR5cGUoXCJzdHJpbmdcIiksIHsgcGF0dGVybjogbmV3IFJlZ0V4cChyZWdleHApIH0pO1xuICAgIHJldHVybiB7XG4gICAgICBpZDogaWQsIHJlZ2V4cDogcmVnZXhwLCBzZWdtZW50OiBzZWdtZW50LCB0eXBlOiB0eXBlLCBjZmc6IGNmZ1xuICAgIH07XG4gIH1cblxuICB2YXIgcCwgcGFyYW0sIHNlZ21lbnQ7XG4gIHdoaWxlICgobSA9IHBsYWNlaG9sZGVyLmV4ZWMocGF0dGVybikpKSB7XG4gICAgcCA9IG1hdGNoRGV0YWlscyhtLCBmYWxzZSk7XG4gICAgaWYgKHAuc2VnbWVudC5pbmRleE9mKCc/JykgPj0gMCkgYnJlYWs7IC8vIHdlJ3JlIGludG8gdGhlIHNlYXJjaCBwYXJ0XG5cbiAgICBwYXJhbSA9IGFkZFBhcmFtZXRlcihwLmlkLCBwLnR5cGUsIHAuY2ZnLCBcInBhdGhcIik7XG4gICAgY29tcGlsZWQgKz0gcXVvdGVSZWdFeHAocC5zZWdtZW50LCBwYXJhbS50eXBlLnBhdHRlcm4uc291cmNlLCBwYXJhbS5zcXVhc2gpO1xuICAgIHNlZ21lbnRzLnB1c2gocC5zZWdtZW50KTtcbiAgICBsYXN0ID0gcGxhY2Vob2xkZXIubGFzdEluZGV4O1xuICB9XG4gIHNlZ21lbnQgPSBwYXR0ZXJuLnN1YnN0cmluZyhsYXN0KTtcblxuICAvLyBGaW5kIGFueSBzZWFyY2ggcGFyYW1ldGVyIG5hbWVzIGFuZCByZW1vdmUgdGhlbSBmcm9tIHRoZSBsYXN0IHNlZ21lbnRcbiAgdmFyIGkgPSBzZWdtZW50LmluZGV4T2YoJz8nKTtcblxuICBpZiAoaSA+PSAwKSB7XG4gICAgdmFyIHNlYXJjaCA9IHRoaXMuc291cmNlU2VhcmNoID0gc2VnbWVudC5zdWJzdHJpbmcoaSk7XG4gICAgc2VnbWVudCA9IHNlZ21lbnQuc3Vic3RyaW5nKDAsIGkpO1xuICAgIHRoaXMuc291cmNlUGF0aCA9IHBhdHRlcm4uc3Vic3RyaW5nKDAsIGxhc3QgKyBpKTtcblxuICAgIGlmIChzZWFyY2gubGVuZ3RoID4gMCkge1xuICAgICAgbGFzdCA9IDA7XG4gICAgICB3aGlsZSAoKG0gPSBzZWFyY2hQbGFjZWhvbGRlci5leGVjKHNlYXJjaCkpKSB7XG4gICAgICAgIHAgPSBtYXRjaERldGFpbHMobSwgdHJ1ZSk7XG4gICAgICAgIHBhcmFtID0gYWRkUGFyYW1ldGVyKHAuaWQsIHAudHlwZSwgcC5jZmcsIFwic2VhcmNoXCIpO1xuICAgICAgICBsYXN0ID0gcGxhY2Vob2xkZXIubGFzdEluZGV4O1xuICAgICAgICAvLyBjaGVjayBpZiA/JlxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aGlzLnNvdXJjZVBhdGggPSBwYXR0ZXJuO1xuICAgIHRoaXMuc291cmNlU2VhcmNoID0gJyc7XG4gIH1cblxuICBjb21waWxlZCArPSBxdW90ZVJlZ0V4cChzZWdtZW50KSArIChjb25maWcuc3RyaWN0ID09PSBmYWxzZSA/ICdcXC8/JyA6ICcnKSArICckJztcbiAgc2VnbWVudHMucHVzaChzZWdtZW50KTtcblxuICB0aGlzLnJlZ2V4cCA9IG5ldyBSZWdFeHAoY29tcGlsZWQsIGNvbmZpZy5jYXNlSW5zZW5zaXRpdmUgPyAnaScgOiB1bmRlZmluZWQpO1xuICB0aGlzLnByZWZpeCA9IHNlZ21lbnRzWzBdO1xuICB0aGlzLiQkcGFyYW1OYW1lcyA9IHBhcmFtTmFtZXM7XG59XG5cbi8qKlxuICogQG5nZG9jIGZ1bmN0aW9uXG4gKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC50eXBlOlVybE1hdGNoZXIjY29uY2F0XG4gKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSZXR1cm5zIGEgbmV3IG1hdGNoZXIgZm9yIGEgcGF0dGVybiBjb25zdHJ1Y3RlZCBieSBhcHBlbmRpbmcgdGhlIHBhdGggcGFydCBhbmQgYWRkaW5nIHRoZVxuICogc2VhcmNoIHBhcmFtZXRlcnMgb2YgdGhlIHNwZWNpZmllZCBwYXR0ZXJuIHRvIHRoaXMgcGF0dGVybi4gVGhlIGN1cnJlbnQgcGF0dGVybiBpcyBub3RcbiAqIG1vZGlmaWVkLiBUaGlzIGNhbiBiZSB1bmRlcnN0b29kIGFzIGNyZWF0aW5nIGEgcGF0dGVybiBmb3IgVVJMcyB0aGF0IGFyZSByZWxhdGl2ZSB0byAob3JcbiAqIHN1ZmZpeGVzIG9mKSB0aGUgY3VycmVudCBwYXR0ZXJuLlxuICpcbiAqIEBleGFtcGxlXG4gKiBUaGUgZm9sbG93aW5nIHR3byBtYXRjaGVycyBhcmUgZXF1aXZhbGVudDpcbiAqIDxwcmU+XG4gKiBuZXcgVXJsTWF0Y2hlcignL3VzZXIve2lkfT9xJykuY29uY2F0KCcvZGV0YWlscz9kYXRlJyk7XG4gKiBuZXcgVXJsTWF0Y2hlcignL3VzZXIve2lkfS9kZXRhaWxzP3EmZGF0ZScpO1xuICogPC9wcmU+XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdHRlcm4gIFRoZSBwYXR0ZXJuIHRvIGFwcGVuZC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgIEFuIG9iamVjdCBoYXNoIG9mIHRoZSBjb25maWd1cmF0aW9uIGZvciB0aGUgbWF0Y2hlci5cbiAqIEByZXR1cm5zIHtVcmxNYXRjaGVyfSAgQSBtYXRjaGVyIGZvciB0aGUgY29uY2F0ZW5hdGVkIHBhdHRlcm4uXG4gKi9cblVybE1hdGNoZXIucHJvdG90eXBlLmNvbmNhdCA9IGZ1bmN0aW9uIChwYXR0ZXJuLCBjb25maWcpIHtcbiAgLy8gQmVjYXVzZSBvcmRlciBvZiBzZWFyY2ggcGFyYW1ldGVycyBpcyBpcnJlbGV2YW50LCB3ZSBjYW4gYWRkIG91ciBvd24gc2VhcmNoXG4gIC8vIHBhcmFtZXRlcnMgdG8gdGhlIGVuZCBvZiB0aGUgbmV3IHBhdHRlcm4uIFBhcnNlIHRoZSBuZXcgcGF0dGVybiBieSBpdHNlbGZcbiAgLy8gYW5kIHRoZW4gam9pbiB0aGUgYml0cyB0b2dldGhlciwgYnV0IGl0J3MgbXVjaCBlYXNpZXIgdG8gZG8gdGhpcyBvbiBhIHN0cmluZyBsZXZlbC5cbiAgdmFyIGRlZmF1bHRDb25maWcgPSB7XG4gICAgY2FzZUluc2Vuc2l0aXZlOiAkJFVNRlAuY2FzZUluc2Vuc2l0aXZlKCksXG4gICAgc3RyaWN0OiAkJFVNRlAuc3RyaWN0TW9kZSgpLFxuICAgIHNxdWFzaDogJCRVTUZQLmRlZmF1bHRTcXVhc2hQb2xpY3koKVxuICB9O1xuICByZXR1cm4gbmV3IFVybE1hdGNoZXIodGhpcy5zb3VyY2VQYXRoICsgcGF0dGVybiArIHRoaXMuc291cmNlU2VhcmNoLCBleHRlbmQoZGVmYXVsdENvbmZpZywgY29uZmlnKSwgdGhpcyk7XG59O1xuXG5VcmxNYXRjaGVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuc291cmNlO1xufTtcblxuLyoqXG4gKiBAbmdkb2MgZnVuY3Rpb25cbiAqIEBuYW1lIHVpLnJvdXRlci51dGlsLnR5cGU6VXJsTWF0Y2hlciNleGVjXG4gKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBUZXN0cyB0aGUgc3BlY2lmaWVkIHBhdGggYWdhaW5zdCB0aGlzIG1hdGNoZXIsIGFuZCByZXR1cm5zIGFuIG9iamVjdCBjb250YWluaW5nIHRoZSBjYXB0dXJlZFxuICogcGFyYW1ldGVyIHZhbHVlcywgb3IgbnVsbCBpZiB0aGUgcGF0aCBkb2VzIG5vdCBtYXRjaC4gVGhlIHJldHVybmVkIG9iamVjdCBjb250YWlucyB0aGUgdmFsdWVzXG4gKiBvZiBhbnkgc2VhcmNoIHBhcmFtZXRlcnMgdGhhdCBhcmUgbWVudGlvbmVkIGluIHRoZSBwYXR0ZXJuLCBidXQgdGhlaXIgdmFsdWUgbWF5IGJlIG51bGwgaWZcbiAqIHRoZXkgYXJlIG5vdCBwcmVzZW50IGluIGBzZWFyY2hQYXJhbXNgLiBUaGlzIG1lYW5zIHRoYXQgc2VhcmNoIHBhcmFtZXRlcnMgYXJlIGFsd2F5cyB0cmVhdGVkXG4gKiBhcyBvcHRpb25hbC5cbiAqXG4gKiBAZXhhbXBsZVxuICogPHByZT5cbiAqIG5ldyBVcmxNYXRjaGVyKCcvdXNlci97aWR9P3EmcicpLmV4ZWMoJy91c2VyL2JvYicsIHtcbiAqICAgeDogJzEnLCBxOiAnaGVsbG8nXG4gKiB9KTtcbiAqIC8vIHJldHVybnMgeyBpZDogJ2JvYicsIHE6ICdoZWxsbycsIHI6IG51bGwgfVxuICogPC9wcmU+XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGggIFRoZSBVUkwgcGF0aCB0byBtYXRjaCwgZS5nLiBgJGxvY2F0aW9uLnBhdGgoKWAuXG4gKiBAcGFyYW0ge09iamVjdH0gc2VhcmNoUGFyYW1zICBVUkwgc2VhcmNoIHBhcmFtZXRlcnMsIGUuZy4gYCRsb2NhdGlvbi5zZWFyY2goKWAuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSAgVGhlIGNhcHR1cmVkIHBhcmFtZXRlciB2YWx1ZXMuXG4gKi9cblVybE1hdGNoZXIucHJvdG90eXBlLmV4ZWMgPSBmdW5jdGlvbiAocGF0aCwgc2VhcmNoUGFyYW1zKSB7XG4gIHZhciBtID0gdGhpcy5yZWdleHAuZXhlYyhwYXRoKTtcbiAgaWYgKCFtKSByZXR1cm4gbnVsbDtcbiAgc2VhcmNoUGFyYW1zID0gc2VhcmNoUGFyYW1zIHx8IHt9O1xuXG4gIHZhciBwYXJhbU5hbWVzID0gdGhpcy5wYXJhbWV0ZXJzKCksIG5Ub3RhbCA9IHBhcmFtTmFtZXMubGVuZ3RoLFxuICAgIG5QYXRoID0gdGhpcy5zZWdtZW50cy5sZW5ndGggLSAxLFxuICAgIHZhbHVlcyA9IHt9LCBpLCBqLCBjZmcsIHBhcmFtTmFtZTtcblxuICBpZiAoblBhdGggIT09IG0ubGVuZ3RoIC0gMSkgdGhyb3cgbmV3IEVycm9yKFwiVW5iYWxhbmNlZCBjYXB0dXJlIGdyb3VwIGluIHJvdXRlICdcIiArIHRoaXMuc291cmNlICsgXCInXCIpO1xuXG4gIGZ1bmN0aW9uIGRlY29kZVBhdGhBcnJheShzdHJpbmcpIHtcbiAgICBmdW5jdGlvbiByZXZlcnNlU3RyaW5nKHN0cikgeyByZXR1cm4gc3RyLnNwbGl0KFwiXCIpLnJldmVyc2UoKS5qb2luKFwiXCIpOyB9XG4gICAgZnVuY3Rpb24gdW5xdW90ZURhc2hlcyhzdHIpIHsgcmV0dXJuIHN0ci5yZXBsYWNlKC9cXFxcLS8sIFwiLVwiKTsgfVxuXG4gICAgdmFyIHNwbGl0ID0gcmV2ZXJzZVN0cmluZyhzdHJpbmcpLnNwbGl0KC8tKD8hXFxcXCkvKTtcbiAgICB2YXIgYWxsUmV2ZXJzZWQgPSBtYXAoc3BsaXQsIHJldmVyc2VTdHJpbmcpO1xuICAgIHJldHVybiBtYXAoYWxsUmV2ZXJzZWQsIHVucXVvdGVEYXNoZXMpLnJldmVyc2UoKTtcbiAgfVxuXG4gIGZvciAoaSA9IDA7IGkgPCBuUGF0aDsgaSsrKSB7XG4gICAgcGFyYW1OYW1lID0gcGFyYW1OYW1lc1tpXTtcbiAgICB2YXIgcGFyYW0gPSB0aGlzLnBhcmFtc1twYXJhbU5hbWVdO1xuICAgIHZhciBwYXJhbVZhbCA9IG1baSsxXTtcbiAgICAvLyBpZiB0aGUgcGFyYW0gdmFsdWUgbWF0Y2hlcyBhIHByZS1yZXBsYWNlIHBhaXIsIHJlcGxhY2UgdGhlIHZhbHVlIGJlZm9yZSBkZWNvZGluZy5cbiAgICBmb3IgKGogPSAwOyBqIDwgcGFyYW0ucmVwbGFjZTsgaisrKSB7XG4gICAgICBpZiAocGFyYW0ucmVwbGFjZVtqXS5mcm9tID09PSBwYXJhbVZhbCkgcGFyYW1WYWwgPSBwYXJhbS5yZXBsYWNlW2pdLnRvO1xuICAgIH1cbiAgICBpZiAocGFyYW1WYWwgJiYgcGFyYW0uYXJyYXkgPT09IHRydWUpIHBhcmFtVmFsID0gZGVjb2RlUGF0aEFycmF5KHBhcmFtVmFsKTtcbiAgICB2YWx1ZXNbcGFyYW1OYW1lXSA9IHBhcmFtLnZhbHVlKHBhcmFtVmFsKTtcbiAgfVxuICBmb3IgKC8qKi87IGkgPCBuVG90YWw7IGkrKykge1xuICAgIHBhcmFtTmFtZSA9IHBhcmFtTmFtZXNbaV07XG4gICAgdmFsdWVzW3BhcmFtTmFtZV0gPSB0aGlzLnBhcmFtc1twYXJhbU5hbWVdLnZhbHVlKHNlYXJjaFBhcmFtc1twYXJhbU5hbWVdKTtcbiAgfVxuXG4gIHJldHVybiB2YWx1ZXM7XG59O1xuXG4vKipcbiAqIEBuZ2RvYyBmdW5jdGlvblxuICogQG5hbWUgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyI3BhcmFtZXRlcnNcbiAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC50eXBlOlVybE1hdGNoZXJcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFJldHVybnMgdGhlIG5hbWVzIG9mIGFsbCBwYXRoIGFuZCBzZWFyY2ggcGFyYW1ldGVycyBvZiB0aGlzIHBhdHRlcm4gaW4gYW4gdW5zcGVjaWZpZWQgb3JkZXIuXG4gKiBcbiAqIEByZXR1cm5zIHtBcnJheS48c3RyaW5nPn0gIEFuIGFycmF5IG9mIHBhcmFtZXRlciBuYW1lcy4gTXVzdCBiZSB0cmVhdGVkIGFzIHJlYWQtb25seS4gSWYgdGhlXG4gKiAgICBwYXR0ZXJuIGhhcyBubyBwYXJhbWV0ZXJzLCBhbiBlbXB0eSBhcnJheSBpcyByZXR1cm5lZC5cbiAqL1xuVXJsTWF0Y2hlci5wcm90b3R5cGUucGFyYW1ldGVycyA9IGZ1bmN0aW9uIChwYXJhbSkge1xuICBpZiAoIWlzRGVmaW5lZChwYXJhbSkpIHJldHVybiB0aGlzLiQkcGFyYW1OYW1lcztcbiAgcmV0dXJuIHRoaXMucGFyYW1zW3BhcmFtXSB8fCBudWxsO1xufTtcblxuLyoqXG4gKiBAbmdkb2MgZnVuY3Rpb25cbiAqIEBuYW1lIHVpLnJvdXRlci51dGlsLnR5cGU6VXJsTWF0Y2hlciN2YWxpZGF0ZVxuICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLnR5cGU6VXJsTWF0Y2hlclxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogQ2hlY2tzIGFuIG9iamVjdCBoYXNoIG9mIHBhcmFtZXRlcnMgdG8gdmFsaWRhdGUgdGhlaXIgY29ycmVjdG5lc3MgYWNjb3JkaW5nIHRvIHRoZSBwYXJhbWV0ZXJcbiAqIHR5cGVzIG9mIHRoaXMgYFVybE1hdGNoZXJgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgVGhlIG9iamVjdCBoYXNoIG9mIHBhcmFtZXRlcnMgdG8gdmFsaWRhdGUuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHBhcmFtc2AgdmFsaWRhdGVzLCBvdGhlcndpc2UgYGZhbHNlYC5cbiAqL1xuVXJsTWF0Y2hlci5wcm90b3R5cGUudmFsaWRhdGVzID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICByZXR1cm4gdGhpcy5wYXJhbXMuJCR2YWxpZGF0ZXMocGFyYW1zKTtcbn07XG5cbi8qKlxuICogQG5nZG9jIGZ1bmN0aW9uXG4gKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC50eXBlOlVybE1hdGNoZXIjZm9ybWF0XG4gKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBDcmVhdGVzIGEgVVJMIHRoYXQgbWF0Y2hlcyB0aGlzIHBhdHRlcm4gYnkgc3Vic3RpdHV0aW5nIHRoZSBzcGVjaWZpZWQgdmFsdWVzXG4gKiBmb3IgdGhlIHBhdGggYW5kIHNlYXJjaCBwYXJhbWV0ZXJzLiBOdWxsIHZhbHVlcyBmb3IgcGF0aCBwYXJhbWV0ZXJzIGFyZVxuICogdHJlYXRlZCBhcyBlbXB0eSBzdHJpbmdzLlxuICpcbiAqIEBleGFtcGxlXG4gKiA8cHJlPlxuICogbmV3IFVybE1hdGNoZXIoJy91c2VyL3tpZH0/cScpLmZvcm1hdCh7IGlkOidib2InLCBxOid5ZXMnIH0pO1xuICogLy8gcmV0dXJucyAnL3VzZXIvYm9iP3E9eWVzJ1xuICogPC9wcmU+XG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlcyAgdGhlIHZhbHVlcyB0byBzdWJzdGl0dXRlIGZvciB0aGUgcGFyYW1ldGVycyBpbiB0aGlzIHBhdHRlcm4uXG4gKiBAcmV0dXJucyB7c3RyaW5nfSAgdGhlIGZvcm1hdHRlZCBVUkwgKHBhdGggYW5kIG9wdGlvbmFsbHkgc2VhcmNoIHBhcnQpLlxuICovXG5VcmxNYXRjaGVyLnByb3RvdHlwZS5mb3JtYXQgPSBmdW5jdGlvbiAodmFsdWVzKSB7XG4gIHZhbHVlcyA9IHZhbHVlcyB8fCB7fTtcbiAgdmFyIHNlZ21lbnRzID0gdGhpcy5zZWdtZW50cywgcGFyYW1zID0gdGhpcy5wYXJhbWV0ZXJzKCksIHBhcmFtc2V0ID0gdGhpcy5wYXJhbXM7XG4gIGlmICghdGhpcy52YWxpZGF0ZXModmFsdWVzKSkgcmV0dXJuIG51bGw7XG5cbiAgdmFyIGksIHNlYXJjaCA9IGZhbHNlLCBuUGF0aCA9IHNlZ21lbnRzLmxlbmd0aCAtIDEsIG5Ub3RhbCA9IHBhcmFtcy5sZW5ndGgsIHJlc3VsdCA9IHNlZ21lbnRzWzBdO1xuXG4gIGZ1bmN0aW9uIGVuY29kZURhc2hlcyhzdHIpIHsgLy8gUmVwbGFjZSBkYXNoZXMgd2l0aCBlbmNvZGVkIFwiXFwtXCJcbiAgICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KHN0cikucmVwbGFjZSgvLS9nLCBmdW5jdGlvbihjKSB7IHJldHVybiAnJTVDJScgKyBjLmNoYXJDb2RlQXQoMCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7IH0pO1xuICB9XG5cbiAgZm9yIChpID0gMDsgaSA8IG5Ub3RhbDsgaSsrKSB7XG4gICAgdmFyIGlzUGF0aFBhcmFtID0gaSA8IG5QYXRoO1xuICAgIHZhciBuYW1lID0gcGFyYW1zW2ldLCBwYXJhbSA9IHBhcmFtc2V0W25hbWVdLCB2YWx1ZSA9IHBhcmFtLnZhbHVlKHZhbHVlc1tuYW1lXSk7XG4gICAgdmFyIGlzRGVmYXVsdFZhbHVlID0gcGFyYW0uaXNPcHRpb25hbCAmJiBwYXJhbS50eXBlLmVxdWFscyhwYXJhbS52YWx1ZSgpLCB2YWx1ZSk7XG4gICAgdmFyIHNxdWFzaCA9IGlzRGVmYXVsdFZhbHVlID8gcGFyYW0uc3F1YXNoIDogZmFsc2U7XG4gICAgdmFyIGVuY29kZWQgPSBwYXJhbS50eXBlLmVuY29kZSh2YWx1ZSk7XG5cbiAgICBpZiAoaXNQYXRoUGFyYW0pIHtcbiAgICAgIHZhciBuZXh0U2VnbWVudCA9IHNlZ21lbnRzW2kgKyAxXTtcbiAgICAgIGlmIChzcXVhc2ggPT09IGZhbHNlKSB7XG4gICAgICAgIGlmIChlbmNvZGVkICE9IG51bGwpIHtcbiAgICAgICAgICBpZiAoaXNBcnJheShlbmNvZGVkKSkge1xuICAgICAgICAgICAgcmVzdWx0ICs9IG1hcChlbmNvZGVkLCBlbmNvZGVEYXNoZXMpLmpvaW4oXCItXCIpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQgKz0gZW5jb2RlVVJJQ29tcG9uZW50KGVuY29kZWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXN1bHQgKz0gbmV4dFNlZ21lbnQ7XG4gICAgICB9IGVsc2UgaWYgKHNxdWFzaCA9PT0gdHJ1ZSkge1xuICAgICAgICB2YXIgY2FwdHVyZSA9IHJlc3VsdC5tYXRjaCgvXFwvJC8pID8gL1xcLz8oLiopLyA6IC8oLiopLztcbiAgICAgICAgcmVzdWx0ICs9IG5leHRTZWdtZW50Lm1hdGNoKGNhcHR1cmUpWzFdO1xuICAgICAgfSBlbHNlIGlmIChpc1N0cmluZyhzcXVhc2gpKSB7XG4gICAgICAgIHJlc3VsdCArPSBzcXVhc2ggKyBuZXh0U2VnbWVudDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGVuY29kZWQgPT0gbnVsbCB8fCAoaXNEZWZhdWx0VmFsdWUgJiYgc3F1YXNoICE9PSBmYWxzZSkpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFpc0FycmF5KGVuY29kZWQpKSBlbmNvZGVkID0gWyBlbmNvZGVkIF07XG4gICAgICBlbmNvZGVkID0gbWFwKGVuY29kZWQsIGVuY29kZVVSSUNvbXBvbmVudCkuam9pbignJicgKyBuYW1lICsgJz0nKTtcbiAgICAgIHJlc3VsdCArPSAoc2VhcmNoID8gJyYnIDogJz8nKSArIChuYW1lICsgJz0nICsgZW5jb2RlZCk7XG4gICAgICBzZWFyY2ggPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEBuZ2RvYyBvYmplY3RcbiAqIEBuYW1lIHVpLnJvdXRlci51dGlsLnR5cGU6VHlwZVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogSW1wbGVtZW50cyBhbiBpbnRlcmZhY2UgdG8gZGVmaW5lIGN1c3RvbSBwYXJhbWV0ZXIgdHlwZXMgdGhhdCBjYW4gYmUgZGVjb2RlZCBmcm9tIGFuZCBlbmNvZGVkIHRvXG4gKiBzdHJpbmcgcGFyYW1ldGVycyBtYXRjaGVkIGluIGEgVVJMLiBVc2VkIGJ5IHtAbGluayB1aS5yb3V0ZXIudXRpbC50eXBlOlVybE1hdGNoZXIgYFVybE1hdGNoZXJgfVxuICogb2JqZWN0cyB3aGVuIG1hdGNoaW5nIG9yIGZvcm1hdHRpbmcgVVJMcywgb3IgY29tcGFyaW5nIG9yIHZhbGlkYXRpbmcgcGFyYW1ldGVyIHZhbHVlcy5cbiAqXG4gKiBTZWUge0BsaW5rIHVpLnJvdXRlci51dGlsLiR1cmxNYXRjaGVyRmFjdG9yeSNtZXRob2RzX3R5cGUgYCR1cmxNYXRjaGVyRmFjdG9yeSN0eXBlKClgfSBmb3IgbW9yZVxuICogaW5mb3JtYXRpb24gb24gcmVnaXN0ZXJpbmcgY3VzdG9tIHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgIEEgY29uZmlndXJhdGlvbiBvYmplY3Qgd2hpY2ggY29udGFpbnMgdGhlIGN1c3RvbSB0eXBlIGRlZmluaXRpb24uICBUaGUgb2JqZWN0J3NcbiAqICAgICAgICBwcm9wZXJ0aWVzIHdpbGwgb3ZlcnJpZGUgdGhlIGRlZmF1bHQgbWV0aG9kcyBhbmQvb3IgcGF0dGVybiBpbiBgVHlwZWAncyBwdWJsaWMgaW50ZXJmYWNlLlxuICogQGV4YW1wbGVcbiAqIDxwcmU+XG4gKiB7XG4gKiAgIGRlY29kZTogZnVuY3Rpb24odmFsKSB7IHJldHVybiBwYXJzZUludCh2YWwsIDEwKTsgfSxcbiAqICAgZW5jb2RlOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIHZhbCAmJiB2YWwudG9TdHJpbmcoKTsgfSxcbiAqICAgZXF1YWxzOiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiB0aGlzLmlzKGEpICYmIGEgPT09IGI7IH0sXG4gKiAgIGlzOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFuZ3VsYXIuaXNOdW1iZXIodmFsKSBpc0Zpbml0ZSh2YWwpICYmIHZhbCAlIDEgPT09IDA7IH0sXG4gKiAgIHBhdHRlcm46IC9cXGQrL1xuICogfVxuICogPC9wcmU+XG4gKlxuICogQHByb3BlcnR5IHtSZWdFeHB9IHBhdHRlcm4gVGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiBwYXR0ZXJuIHVzZWQgdG8gbWF0Y2ggdmFsdWVzIG9mIHRoaXMgdHlwZSB3aGVuXG4gKiAgICAgICAgICAgY29taW5nIGZyb20gYSBzdWJzdHJpbmcgb2YgYSBVUkwuXG4gKlxuICogQHJldHVybnMge09iamVjdH0gIFJldHVybnMgYSBuZXcgYFR5cGVgIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gVHlwZShjb25maWcpIHtcbiAgZXh0ZW5kKHRoaXMsIGNvbmZpZyk7XG59XG5cbi8qKlxuICogQG5nZG9jIGZ1bmN0aW9uXG4gKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC50eXBlOlR5cGUjaXNcbiAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC50eXBlOlR5cGVcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVjdHMgd2hldGhlciBhIHZhbHVlIGlzIG9mIGEgcGFydGljdWxhciB0eXBlLiBBY2NlcHRzIGEgbmF0aXZlIChkZWNvZGVkKSB2YWx1ZVxuICogYW5kIGRldGVybWluZXMgd2hldGhlciBpdCBtYXRjaGVzIHRoZSBjdXJyZW50IGBUeXBlYCBvYmplY3QuXG4gKlxuICogQHBhcmFtIHsqfSB2YWwgIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgIE9wdGlvbmFsLiBJZiB0aGUgdHlwZSBjaGVjayBpcyBoYXBwZW5pbmcgaW4gdGhlIGNvbnRleHQgb2YgYSBzcGVjaWZpY1xuICogICAgICAgIHtAbGluayB1aS5yb3V0ZXIudXRpbC50eXBlOlVybE1hdGNoZXIgYFVybE1hdGNoZXJgfSBvYmplY3QsIHRoaXMgaXMgdGhlIG5hbWUgb2YgdGhlXG4gKiAgICAgICAgcGFyYW1ldGVyIGluIHdoaWNoIGB2YWxgIGlzIHN0b3JlZC4gQ2FuIGJlIHVzZWQgZm9yIG1ldGEtcHJvZ3JhbW1pbmcgb2YgYFR5cGVgIG9iamVjdHMuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gIFJldHVybnMgYHRydWVgIGlmIHRoZSB2YWx1ZSBtYXRjaGVzIHRoZSB0eXBlLCBvdGhlcndpc2UgYGZhbHNlYC5cbiAqL1xuVHlwZS5wcm90b3R5cGUuaXMgPSBmdW5jdGlvbih2YWwsIGtleSkge1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQG5nZG9jIGZ1bmN0aW9uXG4gKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC50eXBlOlR5cGUjZW5jb2RlXG4gKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwudHlwZTpUeXBlXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBFbmNvZGVzIGEgY3VzdG9tL25hdGl2ZSB0eXBlIHZhbHVlIHRvIGEgc3RyaW5nIHRoYXQgY2FuIGJlIGVtYmVkZGVkIGluIGEgVVJMLiBOb3RlIHRoYXQgdGhlXG4gKiByZXR1cm4gdmFsdWUgZG9lcyAqbm90KiBuZWVkIHRvIGJlIFVSTC1zYWZlIChpLmUuIHBhc3NlZCB0aHJvdWdoIGBlbmNvZGVVUklDb21wb25lbnQoKWApLCBpdFxuICogb25seSBuZWVkcyB0byBiZSBhIHJlcHJlc2VudGF0aW9uIG9mIGB2YWxgIHRoYXQgaGFzIGJlZW4gY29lcmNlZCB0byBhIHN0cmluZy5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbCAgVGhlIHZhbHVlIHRvIGVuY29kZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgIFRoZSBuYW1lIG9mIHRoZSBwYXJhbWV0ZXIgaW4gd2hpY2ggYHZhbGAgaXMgc3RvcmVkLiBDYW4gYmUgdXNlZCBmb3JcbiAqICAgICAgICBtZXRhLXByb2dyYW1taW5nIG9mIGBUeXBlYCBvYmplY3RzLlxuICogQHJldHVybnMge3N0cmluZ30gIFJldHVybnMgYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYHZhbGAgdGhhdCBjYW4gYmUgZW5jb2RlZCBpbiBhIFVSTC5cbiAqL1xuVHlwZS5wcm90b3R5cGUuZW5jb2RlID0gZnVuY3Rpb24odmFsLCBrZXkpIHtcbiAgcmV0dXJuIHZhbDtcbn07XG5cbi8qKlxuICogQG5nZG9jIGZ1bmN0aW9uXG4gKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC50eXBlOlR5cGUjZGVjb2RlXG4gKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwudHlwZTpUeXBlXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBDb252ZXJ0cyBhIHBhcmFtZXRlciB2YWx1ZSAoZnJvbSBVUkwgc3RyaW5nIG9yIHRyYW5zaXRpb24gcGFyYW0pIHRvIGEgY3VzdG9tL25hdGl2ZSB2YWx1ZS5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsICBUaGUgVVJMIHBhcmFtZXRlciB2YWx1ZSB0byBkZWNvZGUuXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5ICBUaGUgbmFtZSBvZiB0aGUgcGFyYW1ldGVyIGluIHdoaWNoIGB2YWxgIGlzIHN0b3JlZC4gQ2FuIGJlIHVzZWQgZm9yXG4gKiAgICAgICAgbWV0YS1wcm9ncmFtbWluZyBvZiBgVHlwZWAgb2JqZWN0cy5cbiAqIEByZXR1cm5zIHsqfSAgUmV0dXJucyBhIGN1c3RvbSByZXByZXNlbnRhdGlvbiBvZiB0aGUgVVJMIHBhcmFtZXRlciB2YWx1ZS5cbiAqL1xuVHlwZS5wcm90b3R5cGUuZGVjb2RlID0gZnVuY3Rpb24odmFsLCBrZXkpIHtcbiAgcmV0dXJuIHZhbDtcbn07XG5cbi8qKlxuICogQG5nZG9jIGZ1bmN0aW9uXG4gKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC50eXBlOlR5cGUjZXF1YWxzXG4gKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwudHlwZTpUeXBlXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgdHdvIGRlY29kZWQgdmFsdWVzIGFyZSBlcXVpdmFsZW50LlxuICpcbiAqIEBwYXJhbSB7Kn0gYSAgQSB2YWx1ZSB0byBjb21wYXJlIGFnYWluc3QuXG4gKiBAcGFyYW0geyp9IGIgIEEgdmFsdWUgdG8gY29tcGFyZSBhZ2FpbnN0LlxuICogQHJldHVybnMge0Jvb2xlYW59ICBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgdmFsdWVzIGFyZSBlcXVpdmFsZW50L2VxdWFsLCBvdGhlcndpc2UgYGZhbHNlYC5cbiAqL1xuVHlwZS5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24oYSwgYikge1xuICByZXR1cm4gYSA9PSBiO1xufTtcblxuVHlwZS5wcm90b3R5cGUuJHN1YlBhdHRlcm4gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHN1YiA9IHRoaXMucGF0dGVybi50b1N0cmluZygpO1xuICByZXR1cm4gc3ViLnN1YnN0cigxLCBzdWIubGVuZ3RoIC0gMik7XG59O1xuXG5UeXBlLnByb3RvdHlwZS5wYXR0ZXJuID0gLy4qLztcblxuVHlwZS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuIFwie1R5cGU6XCIgKyB0aGlzLm5hbWUgKyBcIn1cIjsgfTtcblxuLypcbiAqIFdyYXBzIGFuIGV4aXN0aW5nIGN1c3RvbSBUeXBlIGFzIGFuIGFycmF5IG9mIFR5cGUsIGRlcGVuZGluZyBvbiAnbW9kZScuXG4gKiBlLmcuOlxuICogLSB1cmxtYXRjaGVyIHBhdHRlcm4gXCIvcGF0aD97cXVlcnlQYXJhbVtdOmludH1cIlxuICogLSB1cmw6IFwiL3BhdGg/cXVlcnlQYXJhbT0xJnF1ZXJ5UGFyYW09MlxuICogLSAkc3RhdGVQYXJhbXMucXVlcnlQYXJhbSB3aWxsIGJlIFsxLCAyXVxuICogaWYgYG1vZGVgIGlzIFwiYXV0b1wiLCB0aGVuXG4gKiAtIHVybDogXCIvcGF0aD9xdWVyeVBhcmFtPTEgd2lsbCBjcmVhdGUgJHN0YXRlUGFyYW1zLnF1ZXJ5UGFyYW06IDFcbiAqIC0gdXJsOiBcIi9wYXRoP3F1ZXJ5UGFyYW09MSZxdWVyeVBhcmFtPTIgd2lsbCBjcmVhdGUgJHN0YXRlUGFyYW1zLnF1ZXJ5UGFyYW06IFsxLCAyXVxuICovXG5UeXBlLnByb3RvdHlwZS4kYXNBcnJheSA9IGZ1bmN0aW9uKG1vZGUsIGlzU2VhcmNoKSB7XG4gIGlmICghbW9kZSkgcmV0dXJuIHRoaXM7XG4gIGlmIChtb2RlID09PSBcImF1dG9cIiAmJiAhaXNTZWFyY2gpIHRocm93IG5ldyBFcnJvcihcIidhdXRvJyBhcnJheSBtb2RlIGlzIGZvciBxdWVyeSBwYXJhbWV0ZXJzIG9ubHlcIik7XG4gIHJldHVybiBuZXcgQXJyYXlUeXBlKHRoaXMsIG1vZGUpO1xuXG4gIGZ1bmN0aW9uIEFycmF5VHlwZSh0eXBlLCBtb2RlKSB7XG4gICAgZnVuY3Rpb24gYmluZFRvKHR5cGUsIGNhbGxiYWNrTmFtZSkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdHlwZVtjYWxsYmFja05hbWVdLmFwcGx5KHR5cGUsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFdyYXAgbm9uLWFycmF5IHZhbHVlIGFzIGFycmF5XG4gICAgZnVuY3Rpb24gYXJyYXlXcmFwKHZhbCkgeyByZXR1cm4gaXNBcnJheSh2YWwpID8gdmFsIDogKGlzRGVmaW5lZCh2YWwpID8gWyB2YWwgXSA6IFtdKTsgfVxuICAgIC8vIFVud3JhcCBhcnJheSB2YWx1ZSBmb3IgXCJhdXRvXCIgbW9kZS4gUmV0dXJuIHVuZGVmaW5lZCBmb3IgZW1wdHkgYXJyYXkuXG4gICAgZnVuY3Rpb24gYXJyYXlVbndyYXAodmFsKSB7XG4gICAgICBzd2l0Y2godmFsLmxlbmd0aCkge1xuICAgICAgICBjYXNlIDA6IHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIGNhc2UgMTogcmV0dXJuIG1vZGUgPT09IFwiYXV0b1wiID8gdmFsWzBdIDogdmFsO1xuICAgICAgICBkZWZhdWx0OiByZXR1cm4gdmFsO1xuICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBmYWxzZXkodmFsKSB7IHJldHVybiAhdmFsOyB9XG5cbiAgICAvLyBXcmFwcyB0eXBlICguaXMvLmVuY29kZS8uZGVjb2RlKSBmdW5jdGlvbnMgdG8gb3BlcmF0ZSBvbiBlYWNoIHZhbHVlIG9mIGFuIGFycmF5XG4gICAgZnVuY3Rpb24gYXJyYXlIYW5kbGVyKGNhbGxiYWNrLCBhbGxUcnV0aHlNb2RlKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gaGFuZGxlQXJyYXkodmFsKSB7XG4gICAgICAgIHZhbCA9IGFycmF5V3JhcCh2YWwpO1xuICAgICAgICB2YXIgcmVzdWx0ID0gbWFwKHZhbCwgY2FsbGJhY2spO1xuICAgICAgICBpZiAoYWxsVHJ1dGh5TW9kZSA9PT0gdHJ1ZSlcbiAgICAgICAgICByZXR1cm4gZmlsdGVyKHJlc3VsdCwgZmFsc2V5KS5sZW5ndGggPT09IDA7XG4gICAgICAgIHJldHVybiBhcnJheVVud3JhcChyZXN1bHQpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBXcmFwcyB0eXBlICguZXF1YWxzKSBmdW5jdGlvbnMgdG8gb3BlcmF0ZSBvbiBlYWNoIHZhbHVlIG9mIGFuIGFycmF5XG4gICAgZnVuY3Rpb24gYXJyYXlFcXVhbHNIYW5kbGVyKGNhbGxiYWNrKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gaGFuZGxlQXJyYXkodmFsMSwgdmFsMikge1xuICAgICAgICB2YXIgbGVmdCA9IGFycmF5V3JhcCh2YWwxKSwgcmlnaHQgPSBhcnJheVdyYXAodmFsMik7XG4gICAgICAgIGlmIChsZWZ0Lmxlbmd0aCAhPT0gcmlnaHQubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVmdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmICghY2FsbGJhY2sobGVmdFtpXSwgcmlnaHRbaV0pKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9O1xuICAgIH1cblxuICAgIHRoaXMuZW5jb2RlID0gYXJyYXlIYW5kbGVyKGJpbmRUbyh0eXBlLCAnZW5jb2RlJykpO1xuICAgIHRoaXMuZGVjb2RlID0gYXJyYXlIYW5kbGVyKGJpbmRUbyh0eXBlLCAnZGVjb2RlJykpO1xuICAgIHRoaXMuaXMgICAgID0gYXJyYXlIYW5kbGVyKGJpbmRUbyh0eXBlLCAnaXMnKSwgdHJ1ZSk7XG4gICAgdGhpcy5lcXVhbHMgPSBhcnJheUVxdWFsc0hhbmRsZXIoYmluZFRvKHR5cGUsICdlcXVhbHMnKSk7XG4gICAgdGhpcy5wYXR0ZXJuID0gdHlwZS5wYXR0ZXJuO1xuICAgIHRoaXMuJGFycmF5TW9kZSA9IG1vZGU7XG4gIH1cbn07XG5cblxuXG4vKipcbiAqIEBuZ2RvYyBvYmplY3RcbiAqIEBuYW1lIHVpLnJvdXRlci51dGlsLiR1cmxNYXRjaGVyRmFjdG9yeVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRmFjdG9yeSBmb3Ige0BsaW5rIHVpLnJvdXRlci51dGlsLnR5cGU6VXJsTWF0Y2hlciBgVXJsTWF0Y2hlcmB9IGluc3RhbmNlcy4gVGhlIGZhY3RvcnlcbiAqIGlzIGFsc28gYXZhaWxhYmxlIHRvIHByb3ZpZGVycyB1bmRlciB0aGUgbmFtZSBgJHVybE1hdGNoZXJGYWN0b3J5UHJvdmlkZXJgLlxuICovXG5mdW5jdGlvbiAkVXJsTWF0Y2hlckZhY3RvcnkoKSB7XG4gICQkVU1GUCA9IHRoaXM7XG5cbiAgdmFyIGlzQ2FzZUluc2Vuc2l0aXZlID0gZmFsc2UsIGlzU3RyaWN0TW9kZSA9IHRydWUsIGRlZmF1bHRTcXVhc2hQb2xpY3kgPSBmYWxzZTtcblxuICBmdW5jdGlvbiB2YWxUb1N0cmluZyh2YWwpIHsgcmV0dXJuIHZhbCAhPSBudWxsID8gdmFsLnRvU3RyaW5nKCkucmVwbGFjZSgvXFwvL2csIFwiJTJGXCIpIDogdmFsOyB9XG4gIGZ1bmN0aW9uIHZhbEZyb21TdHJpbmcodmFsKSB7IHJldHVybiB2YWwgIT0gbnVsbCA/IHZhbC50b1N0cmluZygpLnJlcGxhY2UoLyUyRi9nLCBcIi9cIikgOiB2YWw7IH1cbi8vICBUT0RPOiBpbiAxLjAsIG1ha2Ugc3RyaW5nIC5pcygpIHJldHVybiBmYWxzZSBpZiB2YWx1ZSBpcyB1bmRlZmluZWQgYnkgZGVmYXVsdC5cbi8vICBmdW5jdGlvbiByZWdleHBNYXRjaGVzKHZhbCkgeyAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqLyByZXR1cm4gaXNEZWZpbmVkKHZhbCkgJiYgdGhpcy5wYXR0ZXJuLnRlc3QodmFsKTsgfVxuICBmdW5jdGlvbiByZWdleHBNYXRjaGVzKHZhbCkgeyAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqLyByZXR1cm4gdGhpcy5wYXR0ZXJuLnRlc3QodmFsKTsgfVxuXG4gIHZhciAkdHlwZXMgPSB7fSwgZW5xdWV1ZSA9IHRydWUsIHR5cGVRdWV1ZSA9IFtdLCBpbmplY3RvciwgZGVmYXVsdFR5cGVzID0ge1xuICAgIHN0cmluZzoge1xuICAgICAgZW5jb2RlOiB2YWxUb1N0cmluZyxcbiAgICAgIGRlY29kZTogdmFsRnJvbVN0cmluZyxcbiAgICAgIGlzOiByZWdleHBNYXRjaGVzLFxuICAgICAgcGF0dGVybjogL1teL10qL1xuICAgIH0sXG4gICAgaW50OiB7XG4gICAgICBlbmNvZGU6IHZhbFRvU3RyaW5nLFxuICAgICAgZGVjb2RlOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIHBhcnNlSW50KHZhbCwgMTApOyB9LFxuICAgICAgaXM6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gaXNEZWZpbmVkKHZhbCkgJiYgdGhpcy5kZWNvZGUodmFsLnRvU3RyaW5nKCkpID09PSB2YWw7IH0sXG4gICAgICBwYXR0ZXJuOiAvXFxkKy9cbiAgICB9LFxuICAgIGJvb2w6IHtcbiAgICAgIGVuY29kZTogZnVuY3Rpb24odmFsKSB7IHJldHVybiB2YWwgPyAxIDogMDsgfSxcbiAgICAgIGRlY29kZTogZnVuY3Rpb24odmFsKSB7IHJldHVybiBwYXJzZUludCh2YWwsIDEwKSAhPT0gMDsgfSxcbiAgICAgIGlzOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIHZhbCA9PT0gdHJ1ZSB8fCB2YWwgPT09IGZhbHNlOyB9LFxuICAgICAgcGF0dGVybjogLzB8MS9cbiAgICB9LFxuICAgIGRhdGU6IHtcbiAgICAgIGVuY29kZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICBpZiAoIXRoaXMuaXModmFsKSlcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gWyB2YWwuZ2V0RnVsbFllYXIoKSxcbiAgICAgICAgICAoJzAnICsgKHZhbC5nZXRNb250aCgpICsgMSkpLnNsaWNlKC0yKSxcbiAgICAgICAgICAoJzAnICsgdmFsLmdldERhdGUoKSkuc2xpY2UoLTIpXG4gICAgICAgIF0uam9pbihcIi1cIik7XG4gICAgICB9LFxuICAgICAgZGVjb2RlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIGlmICh0aGlzLmlzKHZhbCkpIHJldHVybiB2YWw7XG4gICAgICAgIHZhciBtYXRjaCA9IHRoaXMuY2FwdHVyZS5leGVjKHZhbCk7XG4gICAgICAgIHJldHVybiBtYXRjaCA/IG5ldyBEYXRlKG1hdGNoWzFdLCBtYXRjaFsyXSAtIDEsIG1hdGNoWzNdKSA6IHVuZGVmaW5lZDtcbiAgICAgIH0sXG4gICAgICBpczogZnVuY3Rpb24odmFsKSB7IHJldHVybiB2YWwgaW5zdGFuY2VvZiBEYXRlICYmICFpc05hTih2YWwudmFsdWVPZigpKTsgfSxcbiAgICAgIGVxdWFsczogZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIHRoaXMuaXMoYSkgJiYgdGhpcy5pcyhiKSAmJiBhLnRvSVNPU3RyaW5nKCkgPT09IGIudG9JU09TdHJpbmcoKTsgfSxcbiAgICAgIHBhdHRlcm46IC9bMC05XXs0fS0oPzowWzEtOV18MVswLTJdKS0oPzowWzEtOV18WzEtMl1bMC05XXwzWzAtMV0pLyxcbiAgICAgIGNhcHR1cmU6IC8oWzAtOV17NH0pLSgwWzEtOV18MVswLTJdKS0oMFsxLTldfFsxLTJdWzAtOV18M1swLTFdKS9cbiAgICB9LFxuICAgIGpzb246IHtcbiAgICAgIGVuY29kZTogYW5ndWxhci50b0pzb24sXG4gICAgICBkZWNvZGU6IGFuZ3VsYXIuZnJvbUpzb24sXG4gICAgICBpczogYW5ndWxhci5pc09iamVjdCxcbiAgICAgIGVxdWFsczogYW5ndWxhci5lcXVhbHMsXG4gICAgICBwYXR0ZXJuOiAvW14vXSovXG4gICAgfSxcbiAgICBhbnk6IHsgLy8gZG9lcyBub3QgZW5jb2RlL2RlY29kZVxuICAgICAgZW5jb2RlOiBhbmd1bGFyLmlkZW50aXR5LFxuICAgICAgZGVjb2RlOiBhbmd1bGFyLmlkZW50aXR5LFxuICAgICAgaXM6IGFuZ3VsYXIuaWRlbnRpdHksXG4gICAgICBlcXVhbHM6IGFuZ3VsYXIuZXF1YWxzLFxuICAgICAgcGF0dGVybjogLy4qL1xuICAgIH1cbiAgfTtcblxuICBmdW5jdGlvbiBnZXREZWZhdWx0Q29uZmlnKCkge1xuICAgIHJldHVybiB7XG4gICAgICBzdHJpY3Q6IGlzU3RyaWN0TW9kZSxcbiAgICAgIGNhc2VJbnNlbnNpdGl2ZTogaXNDYXNlSW5zZW5zaXRpdmVcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gaXNJbmplY3RhYmxlKHZhbHVlKSB7XG4gICAgcmV0dXJuIChpc0Z1bmN0aW9uKHZhbHVlKSB8fCAoaXNBcnJheSh2YWx1ZSkgJiYgaXNGdW5jdGlvbih2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXSkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBbSW50ZXJuYWxdIEdldCB0aGUgZGVmYXVsdCB2YWx1ZSBvZiBhIHBhcmFtZXRlciwgd2hpY2ggbWF5IGJlIGFuIGluamVjdGFibGUgZnVuY3Rpb24uXG4gICAqL1xuICAkVXJsTWF0Y2hlckZhY3RvcnkuJCRnZXREZWZhdWx0VmFsdWUgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICBpZiAoIWlzSW5qZWN0YWJsZShjb25maWcudmFsdWUpKSByZXR1cm4gY29uZmlnLnZhbHVlO1xuICAgIGlmICghaW5qZWN0b3IpIHRocm93IG5ldyBFcnJvcihcIkluamVjdGFibGUgZnVuY3Rpb25zIGNhbm5vdCBiZSBjYWxsZWQgYXQgY29uZmlndXJhdGlvbiB0aW1lXCIpO1xuICAgIHJldHVybiBpbmplY3Rvci5pbnZva2UoY29uZmlnLnZhbHVlKTtcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci51dGlsLiR1cmxNYXRjaGVyRmFjdG9yeSNjYXNlSW5zZW5zaXRpdmVcbiAgICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLiR1cmxNYXRjaGVyRmFjdG9yeVxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogRGVmaW5lcyB3aGV0aGVyIFVSTCBtYXRjaGluZyBzaG91bGQgYmUgY2FzZSBzZW5zaXRpdmUgKHRoZSBkZWZhdWx0IGJlaGF2aW9yKSwgb3Igbm90LlxuICAgKlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IHZhbHVlIGBmYWxzZWAgdG8gbWF0Y2ggVVJMIGluIGEgY2FzZSBzZW5zaXRpdmUgbWFubmVyOyBvdGhlcndpc2UgYHRydWVgO1xuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdGhlIGN1cnJlbnQgdmFsdWUgb2YgY2FzZUluc2Vuc2l0aXZlXG4gICAqL1xuICB0aGlzLmNhc2VJbnNlbnNpdGl2ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKGlzRGVmaW5lZCh2YWx1ZSkpXG4gICAgICBpc0Nhc2VJbnNlbnNpdGl2ZSA9IHZhbHVlO1xuICAgIHJldHVybiBpc0Nhc2VJbnNlbnNpdGl2ZTtcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci51dGlsLiR1cmxNYXRjaGVyRmFjdG9yeSNzdHJpY3RNb2RlXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnlcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIERlZmluZXMgd2hldGhlciBVUkxzIHNob3VsZCBtYXRjaCB0cmFpbGluZyBzbGFzaGVzLCBvciBub3QgKHRoZSBkZWZhdWx0IGJlaGF2aW9yKS5cbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFuPX0gdmFsdWUgYGZhbHNlYCB0byBtYXRjaCB0cmFpbGluZyBzbGFzaGVzIGluIFVSTHMsIG90aGVyd2lzZSBgdHJ1ZWAuXG4gICAqIEByZXR1cm5zIHtib29sZWFufSB0aGUgY3VycmVudCB2YWx1ZSBvZiBzdHJpY3RNb2RlXG4gICAqL1xuICB0aGlzLnN0cmljdE1vZGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmIChpc0RlZmluZWQodmFsdWUpKVxuICAgICAgaXNTdHJpY3RNb2RlID0gdmFsdWU7XG4gICAgcmV0dXJuIGlzU3RyaWN0TW9kZTtcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci51dGlsLiR1cmxNYXRjaGVyRmFjdG9yeSNkZWZhdWx0U3F1YXNoUG9saWN5XG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnlcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFNldHMgdGhlIGRlZmF1bHQgYmVoYXZpb3Igd2hlbiBnZW5lcmF0aW5nIG9yIG1hdGNoaW5nIFVSTHMgd2l0aCBkZWZhdWx0IHBhcmFtZXRlciB2YWx1ZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSBBIHN0cmluZyB0aGF0IGRlZmluZXMgdGhlIGRlZmF1bHQgcGFyYW1ldGVyIFVSTCBzcXVhc2hpbmcgYmVoYXZpb3IuXG4gICAqICAgIGBub3NxdWFzaGA6IFdoZW4gZ2VuZXJhdGluZyBhbiBocmVmIHdpdGggYSBkZWZhdWx0IHBhcmFtZXRlciB2YWx1ZSwgZG8gbm90IHNxdWFzaCB0aGUgcGFyYW1ldGVyIHZhbHVlIGZyb20gdGhlIFVSTFxuICAgKiAgICBgc2xhc2hgOiBXaGVuIGdlbmVyYXRpbmcgYW4gaHJlZiB3aXRoIGEgZGVmYXVsdCBwYXJhbWV0ZXIgdmFsdWUsIHNxdWFzaCAocmVtb3ZlKSB0aGUgcGFyYW1ldGVyIHZhbHVlLCBhbmQsIGlmIHRoZVxuICAgKiAgICAgICAgICAgICBwYXJhbWV0ZXIgaXMgc3Vycm91bmRlZCBieSBzbGFzaGVzLCBzcXVhc2ggKHJlbW92ZSkgb25lIHNsYXNoIGZyb20gdGhlIFVSTFxuICAgKiAgICBhbnkgb3RoZXIgc3RyaW5nLCBlLmcuIFwiflwiOiBXaGVuIGdlbmVyYXRpbmcgYW4gaHJlZiB3aXRoIGEgZGVmYXVsdCBwYXJhbWV0ZXIgdmFsdWUsIHNxdWFzaCAocmVtb3ZlKVxuICAgKiAgICAgICAgICAgICB0aGUgcGFyYW1ldGVyIHZhbHVlIGZyb20gdGhlIFVSTCBhbmQgcmVwbGFjZSBpdCB3aXRoIHRoaXMgc3RyaW5nLlxuICAgKi9cbiAgdGhpcy5kZWZhdWx0U3F1YXNoUG9saWN5ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoIWlzRGVmaW5lZCh2YWx1ZSkpIHJldHVybiBkZWZhdWx0U3F1YXNoUG9saWN5O1xuICAgIGlmICh2YWx1ZSAhPT0gdHJ1ZSAmJiB2YWx1ZSAhPT0gZmFsc2UgJiYgIWlzU3RyaW5nKHZhbHVlKSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgc3F1YXNoIHBvbGljeTogXCIgKyB2YWx1ZSArIFwiLiBWYWxpZCBwb2xpY2llczogZmFsc2UsIHRydWUsIGFyYml0cmFyeS1zdHJpbmdcIik7XG4gICAgZGVmYXVsdFNxdWFzaFBvbGljeSA9IHZhbHVlO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci51dGlsLiR1cmxNYXRjaGVyRmFjdG9yeSNjb21waWxlXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnlcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIENyZWF0ZXMgYSB7QGxpbmsgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyIGBVcmxNYXRjaGVyYH0gZm9yIHRoZSBzcGVjaWZpZWQgcGF0dGVybi5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHBhdHRlcm4gIFRoZSBVUkwgcGF0dGVybi5cbiAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyAgVGhlIGNvbmZpZyBvYmplY3QgaGFzaC5cbiAgICogQHJldHVybnMge1VybE1hdGNoZXJ9ICBUaGUgVXJsTWF0Y2hlci5cbiAgICovXG4gIHRoaXMuY29tcGlsZSA9IGZ1bmN0aW9uIChwYXR0ZXJuLCBjb25maWcpIHtcbiAgICByZXR1cm4gbmV3IFVybE1hdGNoZXIocGF0dGVybiwgZXh0ZW5kKGdldERlZmF1bHRDb25maWcoKSwgY29uZmlnKSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnkjaXNNYXRjaGVyXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnlcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgc3BlY2lmaWVkIG9iamVjdCBpcyBhIGBVcmxNYXRjaGVyYCwgb3IgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0ICBUaGUgb2JqZWN0IHRvIHBlcmZvcm0gdGhlIHR5cGUgY2hlY2sgYWdhaW5zdC5cbiAgICogQHJldHVybnMge0Jvb2xlYW59ICBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgb2JqZWN0IG1hdGNoZXMgdGhlIGBVcmxNYXRjaGVyYCBpbnRlcmZhY2UsIGJ5XG4gICAqICAgICAgICAgIGltcGxlbWVudGluZyBhbGwgdGhlIHNhbWUgbWV0aG9kcy5cbiAgICovXG4gIHRoaXMuaXNNYXRjaGVyID0gZnVuY3Rpb24gKG8pIHtcbiAgICBpZiAoIWlzT2JqZWN0KG8pKSByZXR1cm4gZmFsc2U7XG4gICAgdmFyIHJlc3VsdCA9IHRydWU7XG5cbiAgICBmb3JFYWNoKFVybE1hdGNoZXIucHJvdG90eXBlLCBmdW5jdGlvbih2YWwsIG5hbWUpIHtcbiAgICAgIGlmIChpc0Z1bmN0aW9uKHZhbCkpIHtcbiAgICAgICAgcmVzdWx0ID0gcmVzdWx0ICYmIChpc0RlZmluZWQob1tuYW1lXSkgJiYgaXNGdW5jdGlvbihvW25hbWVdKSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci51dGlsLiR1cmxNYXRjaGVyRmFjdG9yeSN0eXBlXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnlcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFJlZ2lzdGVycyBhIGN1c3RvbSB7QGxpbmsgdWkucm91dGVyLnV0aWwudHlwZTpUeXBlIGBUeXBlYH0gb2JqZWN0IHRoYXQgY2FuIGJlIHVzZWQgdG9cbiAgICogZ2VuZXJhdGUgVVJMcyB3aXRoIHR5cGVkIHBhcmFtZXRlcnMuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lICBUaGUgdHlwZSBuYW1lLlxuICAgKiBAcGFyYW0ge09iamVjdHxGdW5jdGlvbn0gZGVmaW5pdGlvbiAgIFRoZSB0eXBlIGRlZmluaXRpb24uIFNlZVxuICAgKiAgICAgICAge0BsaW5rIHVpLnJvdXRlci51dGlsLnR5cGU6VHlwZSBgVHlwZWB9IGZvciBpbmZvcm1hdGlvbiBvbiB0aGUgdmFsdWVzIGFjY2VwdGVkLlxuICAgKiBAcGFyYW0ge09iamVjdHxGdW5jdGlvbn0gZGVmaW5pdGlvbkZuIChvcHRpb25hbCkgQSBmdW5jdGlvbiB0aGF0IGlzIGluamVjdGVkIGJlZm9yZSB0aGUgYXBwXG4gICAqICAgICAgICBydW50aW1lIHN0YXJ0cy4gIFRoZSByZXN1bHQgb2YgdGhpcyBmdW5jdGlvbiBpcyBtZXJnZWQgaW50byB0aGUgZXhpc3RpbmcgYGRlZmluaXRpb25gLlxuICAgKiAgICAgICAgU2VlIHtAbGluayB1aS5yb3V0ZXIudXRpbC50eXBlOlR5cGUgYFR5cGVgfSBmb3IgaW5mb3JtYXRpb24gb24gdGhlIHZhbHVlcyBhY2NlcHRlZC5cbiAgICpcbiAgICogQHJldHVybnMge09iamVjdH0gIFJldHVybnMgYCR1cmxNYXRjaGVyRmFjdG9yeVByb3ZpZGVyYC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogVGhpcyBpcyBhIHNpbXBsZSBleGFtcGxlIG9mIGEgY3VzdG9tIHR5cGUgdGhhdCBlbmNvZGVzIGFuZCBkZWNvZGVzIGl0ZW1zIGZyb20gYW5cbiAgICogYXJyYXksIHVzaW5nIHRoZSBhcnJheSBpbmRleCBhcyB0aGUgVVJMLWVuY29kZWQgdmFsdWU6XG4gICAqXG4gICAqIDxwcmU+XG4gICAqIHZhciBsaXN0ID0gWydKb2huJywgJ1BhdWwnLCAnR2VvcmdlJywgJ1JpbmdvJ107XG4gICAqXG4gICAqICR1cmxNYXRjaGVyRmFjdG9yeVByb3ZpZGVyLnR5cGUoJ2xpc3RJdGVtJywge1xuICAgKiAgIGVuY29kZTogZnVuY3Rpb24oaXRlbSkge1xuICAgKiAgICAgLy8gUmVwcmVzZW50IHRoZSBsaXN0IGl0ZW0gaW4gdGhlIFVSTCB1c2luZyBpdHMgY29ycmVzcG9uZGluZyBpbmRleFxuICAgKiAgICAgcmV0dXJuIGxpc3QuaW5kZXhPZihpdGVtKTtcbiAgICogICB9LFxuICAgKiAgIGRlY29kZTogZnVuY3Rpb24oaXRlbSkge1xuICAgKiAgICAgLy8gTG9vayB1cCB0aGUgbGlzdCBpdGVtIGJ5IGluZGV4XG4gICAqICAgICByZXR1cm4gbGlzdFtwYXJzZUludChpdGVtLCAxMCldO1xuICAgKiAgIH0sXG4gICAqICAgaXM6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICogICAgIC8vIEVuc3VyZSB0aGUgaXRlbSBpcyB2YWxpZCBieSBjaGVja2luZyB0byBzZWUgdGhhdCBpdCBhcHBlYXJzXG4gICAqICAgICAvLyBpbiB0aGUgbGlzdFxuICAgKiAgICAgcmV0dXJuIGxpc3QuaW5kZXhPZihpdGVtKSA+IC0xO1xuICAgKiAgIH1cbiAgICogfSk7XG4gICAqXG4gICAqICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsaXN0Jywge1xuICAgKiAgIHVybDogXCIvbGlzdC97aXRlbTpsaXN0SXRlbX1cIixcbiAgICogICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcykge1xuICAgKiAgICAgY29uc29sZS5sb2coJHN0YXRlUGFyYW1zLml0ZW0pO1xuICAgKiAgIH1cbiAgICogfSk7XG4gICAqXG4gICAqIC8vIC4uLlxuICAgKlxuICAgKiAvLyBDaGFuZ2VzIFVSTCB0byAnL2xpc3QvMycsIGxvZ3MgXCJSaW5nb1wiIHRvIHRoZSBjb25zb2xlXG4gICAqICRzdGF0ZS5nbygnbGlzdCcsIHsgaXRlbTogXCJSaW5nb1wiIH0pO1xuICAgKiA8L3ByZT5cbiAgICpcbiAgICogVGhpcyBpcyBhIG1vcmUgY29tcGxleCBleGFtcGxlIG9mIGEgdHlwZSB0aGF0IHJlbGllcyBvbiBkZXBlbmRlbmN5IGluamVjdGlvbiB0b1xuICAgKiBpbnRlcmFjdCB3aXRoIHNlcnZpY2VzLCBhbmQgdXNlcyB0aGUgcGFyYW1ldGVyIG5hbWUgZnJvbSB0aGUgVVJMIHRvIGluZmVyIGhvdyB0b1xuICAgKiBoYW5kbGUgZW5jb2RpbmcgYW5kIGRlY29kaW5nIHBhcmFtZXRlciB2YWx1ZXM6XG4gICAqXG4gICAqIDxwcmU+XG4gICAqIC8vIERlZmluZXMgYSBjdXN0b20gdHlwZSB0aGF0IGdldHMgYSB2YWx1ZSBmcm9tIGEgc2VydmljZSxcbiAgICogLy8gd2hlcmUgZWFjaCBzZXJ2aWNlIGdldHMgZGlmZmVyZW50IHR5cGVzIG9mIHZhbHVlcyBmcm9tXG4gICAqIC8vIGEgYmFja2VuZCBBUEk6XG4gICAqICR1cmxNYXRjaGVyRmFjdG9yeVByb3ZpZGVyLnR5cGUoJ2RiT2JqZWN0Jywge30sIGZ1bmN0aW9uKFVzZXJzLCBQb3N0cykge1xuICAgKlxuICAgKiAgIC8vIE1hdGNoZXMgdXAgc2VydmljZXMgdG8gVVJMIHBhcmFtZXRlciBuYW1lc1xuICAgKiAgIHZhciBzZXJ2aWNlcyA9IHtcbiAgICogICAgIHVzZXI6IFVzZXJzLFxuICAgKiAgICAgcG9zdDogUG9zdHNcbiAgICogICB9O1xuICAgKlxuICAgKiAgIHJldHVybiB7XG4gICAqICAgICBlbmNvZGU6IGZ1bmN0aW9uKG9iamVjdCkge1xuICAgKiAgICAgICAvLyBSZXByZXNlbnQgdGhlIG9iamVjdCBpbiB0aGUgVVJMIHVzaW5nIGl0cyB1bmlxdWUgSURcbiAgICogICAgICAgcmV0dXJuIG9iamVjdC5pZDtcbiAgICogICAgIH0sXG4gICAqICAgICBkZWNvZGU6IGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICogICAgICAgLy8gTG9vayB1cCB0aGUgb2JqZWN0IGJ5IElELCB1c2luZyB0aGUgcGFyYW1ldGVyXG4gICAqICAgICAgIC8vIG5hbWUgKGtleSkgdG8gY2FsbCB0aGUgY29ycmVjdCBzZXJ2aWNlXG4gICAqICAgICAgIHJldHVybiBzZXJ2aWNlc1trZXldLmZpbmRCeUlkKHZhbHVlKTtcbiAgICogICAgIH0sXG4gICAqICAgICBpczogZnVuY3Rpb24ob2JqZWN0LCBrZXkpIHtcbiAgICogICAgICAgLy8gQ2hlY2sgdGhhdCBvYmplY3QgaXMgYSB2YWxpZCBkYk9iamVjdFxuICAgKiAgICAgICByZXR1cm4gYW5ndWxhci5pc09iamVjdChvYmplY3QpICYmIG9iamVjdC5pZCAmJiBzZXJ2aWNlc1trZXldO1xuICAgKiAgICAgfVxuICAgKiAgICAgZXF1YWxzOiBmdW5jdGlvbihhLCBiKSB7XG4gICAqICAgICAgIC8vIENoZWNrIHRoZSBlcXVhbGl0eSBvZiBkZWNvZGVkIG9iamVjdHMgYnkgY29tcGFyaW5nXG4gICAqICAgICAgIC8vIHRoZWlyIHVuaXF1ZSBJRHNcbiAgICogICAgICAgcmV0dXJuIGEuaWQgPT09IGIuaWQ7XG4gICAqICAgICB9XG4gICAqICAgfTtcbiAgICogfSk7XG4gICAqXG4gICAqIC8vIEluIGEgY29uZmlnKCkgYmxvY2ssIHlvdSBjYW4gdGhlbiBhdHRhY2ggVVJMcyB3aXRoXG4gICAqIC8vIHR5cGUtYW5ub3RhdGVkIHBhcmFtZXRlcnM6XG4gICAqICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCd1c2VycycsIHtcbiAgICogICB1cmw6IFwiL3VzZXJzXCIsXG4gICAqICAgLy8gLi4uXG4gICAqIH0pLnN0YXRlKCd1c2Vycy5pdGVtJywge1xuICAgKiAgIHVybDogXCIve3VzZXI6ZGJPYmplY3R9XCIsXG4gICAqICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGVQYXJhbXMpIHtcbiAgICogICAgIC8vICRzdGF0ZVBhcmFtcy51c2VyIHdpbGwgbm93IGJlIGFuIG9iamVjdCByZXR1cm5lZCBmcm9tXG4gICAqICAgICAvLyB0aGUgVXNlcnMgc2VydmljZVxuICAgKiAgIH0sXG4gICAqICAgLy8gLi4uXG4gICAqIH0pO1xuICAgKiA8L3ByZT5cbiAgICovXG4gIHRoaXMudHlwZSA9IGZ1bmN0aW9uIChuYW1lLCBkZWZpbml0aW9uLCBkZWZpbml0aW9uRm4pIHtcbiAgICBpZiAoIWlzRGVmaW5lZChkZWZpbml0aW9uKSkgcmV0dXJuICR0eXBlc1tuYW1lXTtcbiAgICBpZiAoJHR5cGVzLmhhc093blByb3BlcnR5KG5hbWUpKSB0aHJvdyBuZXcgRXJyb3IoXCJBIHR5cGUgbmFtZWQgJ1wiICsgbmFtZSArIFwiJyBoYXMgYWxyZWFkeSBiZWVuIGRlZmluZWQuXCIpO1xuXG4gICAgJHR5cGVzW25hbWVdID0gbmV3IFR5cGUoZXh0ZW5kKHsgbmFtZTogbmFtZSB9LCBkZWZpbml0aW9uKSk7XG4gICAgaWYgKGRlZmluaXRpb25Gbikge1xuICAgICAgdHlwZVF1ZXVlLnB1c2goeyBuYW1lOiBuYW1lLCBkZWY6IGRlZmluaXRpb25GbiB9KTtcbiAgICAgIGlmICghZW5xdWV1ZSkgZmx1c2hUeXBlUXVldWUoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLy8gYGZsdXNoVHlwZVF1ZXVlKClgIHdhaXRzIHVudGlsIGAkdXJsTWF0Y2hlckZhY3RvcnlgIGlzIGluamVjdGVkIGJlZm9yZSBpbnZva2luZyB0aGUgcXVldWVkIGBkZWZpbml0aW9uRm5gc1xuICBmdW5jdGlvbiBmbHVzaFR5cGVRdWV1ZSgpIHtcbiAgICB3aGlsZSh0eXBlUXVldWUubGVuZ3RoKSB7XG4gICAgICB2YXIgdHlwZSA9IHR5cGVRdWV1ZS5zaGlmdCgpO1xuICAgICAgaWYgKHR5cGUucGF0dGVybikgdGhyb3cgbmV3IEVycm9yKFwiWW91IGNhbm5vdCBvdmVycmlkZSBhIHR5cGUncyAucGF0dGVybiBhdCBydW50aW1lLlwiKTtcbiAgICAgIGFuZ3VsYXIuZXh0ZW5kKCR0eXBlc1t0eXBlLm5hbWVdLCBpbmplY3Rvci5pbnZva2UodHlwZS5kZWYpKTtcbiAgICB9XG4gIH1cblxuICAvLyBSZWdpc3RlciBkZWZhdWx0IHR5cGVzLiBTdG9yZSB0aGVtIGluIHRoZSBwcm90b3R5cGUgb2YgJHR5cGVzLlxuICBmb3JFYWNoKGRlZmF1bHRUeXBlcywgZnVuY3Rpb24odHlwZSwgbmFtZSkgeyAkdHlwZXNbbmFtZV0gPSBuZXcgVHlwZShleHRlbmQoe25hbWU6IG5hbWV9LCB0eXBlKSk7IH0pO1xuICAkdHlwZXMgPSBpbmhlcml0KCR0eXBlcywge30pO1xuXG4gIC8qIE5vIG5lZWQgdG8gZG9jdW1lbnQgJGdldCwgc2luY2UgaXQgcmV0dXJucyB0aGlzICovXG4gIHRoaXMuJGdldCA9IFsnJGluamVjdG9yJywgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgIGluamVjdG9yID0gJGluamVjdG9yO1xuICAgIGVucXVldWUgPSBmYWxzZTtcbiAgICBmbHVzaFR5cGVRdWV1ZSgpO1xuXG4gICAgZm9yRWFjaChkZWZhdWx0VHlwZXMsIGZ1bmN0aW9uKHR5cGUsIG5hbWUpIHtcbiAgICAgIGlmICghJHR5cGVzW25hbWVdKSAkdHlwZXNbbmFtZV0gPSBuZXcgVHlwZSh0eXBlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfV07XG5cbiAgdGhpcy5QYXJhbSA9IGZ1bmN0aW9uIFBhcmFtKGlkLCB0eXBlLCBjb25maWcsIGxvY2F0aW9uKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGNvbmZpZyA9IHVud3JhcFNob3J0aGFuZChjb25maWcpO1xuICAgIHR5cGUgPSBnZXRUeXBlKGNvbmZpZywgdHlwZSwgbG9jYXRpb24pO1xuICAgIHZhciBhcnJheU1vZGUgPSBnZXRBcnJheU1vZGUoKTtcbiAgICB0eXBlID0gYXJyYXlNb2RlID8gdHlwZS4kYXNBcnJheShhcnJheU1vZGUsIGxvY2F0aW9uID09PSBcInNlYXJjaFwiKSA6IHR5cGU7XG4gICAgaWYgKHR5cGUubmFtZSA9PT0gXCJzdHJpbmdcIiAmJiAhYXJyYXlNb2RlICYmIGxvY2F0aW9uID09PSBcInBhdGhcIiAmJiBjb25maWcudmFsdWUgPT09IHVuZGVmaW5lZClcbiAgICAgIGNvbmZpZy52YWx1ZSA9IFwiXCI7IC8vIGZvciAwLjIueDsgaW4gMC4zLjArIGRvIG5vdCBhdXRvbWF0aWNhbGx5IGRlZmF1bHQgdG8gXCJcIlxuICAgIHZhciBpc09wdGlvbmFsID0gY29uZmlnLnZhbHVlICE9PSB1bmRlZmluZWQ7XG4gICAgdmFyIHNxdWFzaCA9IGdldFNxdWFzaFBvbGljeShjb25maWcsIGlzT3B0aW9uYWwpO1xuICAgIHZhciByZXBsYWNlID0gZ2V0UmVwbGFjZShjb25maWcsIGFycmF5TW9kZSwgaXNPcHRpb25hbCwgc3F1YXNoKTtcblxuICAgIGZ1bmN0aW9uIHVud3JhcFNob3J0aGFuZChjb25maWcpIHtcbiAgICAgIHZhciBrZXlzID0gaXNPYmplY3QoY29uZmlnKSA/IG9iamVjdEtleXMoY29uZmlnKSA6IFtdO1xuICAgICAgdmFyIGlzU2hvcnRoYW5kID0gaW5kZXhPZihrZXlzLCBcInZhbHVlXCIpID09PSAtMSAmJiBpbmRleE9mKGtleXMsIFwidHlwZVwiKSA9PT0gLTEgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4T2Yoa2V5cywgXCJzcXVhc2hcIikgPT09IC0xICYmIGluZGV4T2Yoa2V5cywgXCJhcnJheVwiKSA9PT0gLTE7XG4gICAgICBpZiAoaXNTaG9ydGhhbmQpIGNvbmZpZyA9IHsgdmFsdWU6IGNvbmZpZyB9O1xuICAgICAgY29uZmlnLiQkZm4gPSBpc0luamVjdGFibGUoY29uZmlnLnZhbHVlKSA/IGNvbmZpZy52YWx1ZSA6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGNvbmZpZy52YWx1ZTsgfTtcbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0VHlwZShjb25maWcsIHVybFR5cGUsIGxvY2F0aW9uKSB7XG4gICAgICBpZiAoY29uZmlnLnR5cGUgJiYgdXJsVHlwZSkgdGhyb3cgbmV3IEVycm9yKFwiUGFyYW0gJ1wiK2lkK1wiJyBoYXMgdHdvIHR5cGUgY29uZmlndXJhdGlvbnMuXCIpO1xuICAgICAgaWYgKHVybFR5cGUpIHJldHVybiB1cmxUeXBlO1xuICAgICAgaWYgKCFjb25maWcudHlwZSkgcmV0dXJuIChsb2NhdGlvbiA9PT0gXCJjb25maWdcIiA/ICR0eXBlcy5hbnkgOiAkdHlwZXMuc3RyaW5nKTtcbiAgICAgIHJldHVybiBjb25maWcudHlwZSBpbnN0YW5jZW9mIFR5cGUgPyBjb25maWcudHlwZSA6IG5ldyBUeXBlKGNvbmZpZy50eXBlKTtcbiAgICB9XG5cbiAgICAvLyBhcnJheSBjb25maWc6IHBhcmFtIG5hbWUgKHBhcmFtW10pIG92ZXJyaWRlcyBkZWZhdWx0IHNldHRpbmdzLiAgZXhwbGljaXQgY29uZmlnIG92ZXJyaWRlcyBwYXJhbSBuYW1lLlxuICAgIGZ1bmN0aW9uIGdldEFycmF5TW9kZSgpIHtcbiAgICAgIHZhciBhcnJheURlZmF1bHRzID0geyBhcnJheTogKGxvY2F0aW9uID09PSBcInNlYXJjaFwiID8gXCJhdXRvXCIgOiBmYWxzZSkgfTtcbiAgICAgIHZhciBhcnJheVBhcmFtTm9tZW5jbGF0dXJlID0gaWQubWF0Y2goL1xcW1xcXSQvKSA/IHsgYXJyYXk6IHRydWUgfSA6IHt9O1xuICAgICAgcmV0dXJuIGV4dGVuZChhcnJheURlZmF1bHRzLCBhcnJheVBhcmFtTm9tZW5jbGF0dXJlLCBjb25maWcpLmFycmF5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgZmFsc2UsIHRydWUsIG9yIHRoZSBzcXVhc2ggdmFsdWUgdG8gaW5kaWNhdGUgdGhlIFwiZGVmYXVsdCBwYXJhbWV0ZXIgdXJsIHNxdWFzaCBwb2xpY3lcIi5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRTcXVhc2hQb2xpY3koY29uZmlnLCBpc09wdGlvbmFsKSB7XG4gICAgICB2YXIgc3F1YXNoID0gY29uZmlnLnNxdWFzaDtcbiAgICAgIGlmICghaXNPcHRpb25hbCB8fCBzcXVhc2ggPT09IGZhbHNlKSByZXR1cm4gZmFsc2U7XG4gICAgICBpZiAoIWlzRGVmaW5lZChzcXVhc2gpIHx8IHNxdWFzaCA9PSBudWxsKSByZXR1cm4gZGVmYXVsdFNxdWFzaFBvbGljeTtcbiAgICAgIGlmIChzcXVhc2ggPT09IHRydWUgfHwgaXNTdHJpbmcoc3F1YXNoKSkgcmV0dXJuIHNxdWFzaDtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgc3F1YXNoIHBvbGljeTogJ1wiICsgc3F1YXNoICsgXCInLiBWYWxpZCBwb2xpY2llczogZmFsc2UsIHRydWUsIG9yIGFyYml0cmFyeSBzdHJpbmdcIik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0UmVwbGFjZShjb25maWcsIGFycmF5TW9kZSwgaXNPcHRpb25hbCwgc3F1YXNoKSB7XG4gICAgICB2YXIgcmVwbGFjZSwgY29uZmlndXJlZEtleXMsIGRlZmF1bHRQb2xpY3kgPSBbXG4gICAgICAgIHsgZnJvbTogXCJcIiwgICB0bzogKGlzT3B0aW9uYWwgfHwgYXJyYXlNb2RlID8gdW5kZWZpbmVkIDogXCJcIikgfSxcbiAgICAgICAgeyBmcm9tOiBudWxsLCB0bzogKGlzT3B0aW9uYWwgfHwgYXJyYXlNb2RlID8gdW5kZWZpbmVkIDogXCJcIikgfVxuICAgICAgXTtcbiAgICAgIHJlcGxhY2UgPSBpc0FycmF5KGNvbmZpZy5yZXBsYWNlKSA/IGNvbmZpZy5yZXBsYWNlIDogW107XG4gICAgICBpZiAoaXNTdHJpbmcoc3F1YXNoKSlcbiAgICAgICAgcmVwbGFjZS5wdXNoKHsgZnJvbTogc3F1YXNoLCB0bzogdW5kZWZpbmVkIH0pO1xuICAgICAgY29uZmlndXJlZEtleXMgPSBtYXAocmVwbGFjZSwgZnVuY3Rpb24oaXRlbSkgeyByZXR1cm4gaXRlbS5mcm9tOyB9ICk7XG4gICAgICByZXR1cm4gZmlsdGVyKGRlZmF1bHRQb2xpY3ksIGZ1bmN0aW9uKGl0ZW0pIHsgcmV0dXJuIGluZGV4T2YoY29uZmlndXJlZEtleXMsIGl0ZW0uZnJvbSkgPT09IC0xOyB9KS5jb25jYXQocmVwbGFjZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogW0ludGVybmFsXSBHZXQgdGhlIGRlZmF1bHQgdmFsdWUgb2YgYSBwYXJhbWV0ZXIsIHdoaWNoIG1heSBiZSBhbiBpbmplY3RhYmxlIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uICQkZ2V0RGVmYXVsdFZhbHVlKCkge1xuICAgICAgaWYgKCFpbmplY3RvcikgdGhyb3cgbmV3IEVycm9yKFwiSW5qZWN0YWJsZSBmdW5jdGlvbnMgY2Fubm90IGJlIGNhbGxlZCBhdCBjb25maWd1cmF0aW9uIHRpbWVcIik7XG4gICAgICByZXR1cm4gaW5qZWN0b3IuaW52b2tlKGNvbmZpZy4kJGZuKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBbSW50ZXJuYWxdIEdldHMgdGhlIGRlY29kZWQgcmVwcmVzZW50YXRpb24gb2YgYSB2YWx1ZSBpZiB0aGUgdmFsdWUgaXMgZGVmaW5lZCwgb3RoZXJ3aXNlLCByZXR1cm5zIHRoZVxuICAgICAqIGRlZmF1bHQgdmFsdWUsIHdoaWNoIG1heSBiZSB0aGUgcmVzdWx0IG9mIGFuIGluamVjdGFibGUgZnVuY3Rpb24uXG4gICAgICovXG4gICAgZnVuY3Rpb24gJHZhbHVlKHZhbHVlKSB7XG4gICAgICBmdW5jdGlvbiBoYXNSZXBsYWNlVmFsKHZhbCkgeyByZXR1cm4gZnVuY3Rpb24ob2JqKSB7IHJldHVybiBvYmouZnJvbSA9PT0gdmFsOyB9OyB9XG4gICAgICBmdW5jdGlvbiAkcmVwbGFjZSh2YWx1ZSkge1xuICAgICAgICB2YXIgcmVwbGFjZW1lbnQgPSBtYXAoZmlsdGVyKHNlbGYucmVwbGFjZSwgaGFzUmVwbGFjZVZhbCh2YWx1ZSkpLCBmdW5jdGlvbihvYmopIHsgcmV0dXJuIG9iai50bzsgfSk7XG4gICAgICAgIHJldHVybiByZXBsYWNlbWVudC5sZW5ndGggPyByZXBsYWNlbWVudFswXSA6IHZhbHVlO1xuICAgICAgfVxuICAgICAgdmFsdWUgPSAkcmVwbGFjZSh2YWx1ZSk7XG4gICAgICByZXR1cm4gaXNEZWZpbmVkKHZhbHVlKSA/IHNlbGYudHlwZS5kZWNvZGUodmFsdWUpIDogJCRnZXREZWZhdWx0VmFsdWUoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0b1N0cmluZygpIHsgcmV0dXJuIFwie1BhcmFtOlwiICsgaWQgKyBcIiBcIiArIHR5cGUgKyBcIiBzcXVhc2g6ICdcIiArIHNxdWFzaCArIFwiJyBvcHRpb25hbDogXCIgKyBpc09wdGlvbmFsICsgXCJ9XCI7IH1cblxuICAgIGV4dGVuZCh0aGlzLCB7XG4gICAgICBpZDogaWQsXG4gICAgICB0eXBlOiB0eXBlLFxuICAgICAgbG9jYXRpb246IGxvY2F0aW9uLFxuICAgICAgYXJyYXk6IGFycmF5TW9kZSxcbiAgICAgIHNxdWFzaDogc3F1YXNoLFxuICAgICAgcmVwbGFjZTogcmVwbGFjZSxcbiAgICAgIGlzT3B0aW9uYWw6IGlzT3B0aW9uYWwsXG4gICAgICB2YWx1ZTogJHZhbHVlLFxuICAgICAgZHluYW1pYzogdW5kZWZpbmVkLFxuICAgICAgY29uZmlnOiBjb25maWcsXG4gICAgICB0b1N0cmluZzogdG9TdHJpbmdcbiAgICB9KTtcbiAgfTtcblxuICBmdW5jdGlvbiBQYXJhbVNldChwYXJhbXMpIHtcbiAgICBleHRlbmQodGhpcywgcGFyYW1zIHx8IHt9KTtcbiAgfVxuXG4gIFBhcmFtU2V0LnByb3RvdHlwZSA9IHtcbiAgICAkJG5ldzogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gaW5oZXJpdCh0aGlzLCBleHRlbmQobmV3IFBhcmFtU2V0KCksIHsgJCRwYXJlbnQ6IHRoaXN9KSk7XG4gICAgfSxcbiAgICAkJGtleXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBrZXlzID0gW10sIGNoYWluID0gW10sIHBhcmVudCA9IHRoaXMsXG4gICAgICAgIGlnbm9yZSA9IG9iamVjdEtleXMoUGFyYW1TZXQucHJvdG90eXBlKTtcbiAgICAgIHdoaWxlIChwYXJlbnQpIHsgY2hhaW4ucHVzaChwYXJlbnQpOyBwYXJlbnQgPSBwYXJlbnQuJCRwYXJlbnQ7IH1cbiAgICAgIGNoYWluLnJldmVyc2UoKTtcbiAgICAgIGZvckVhY2goY2hhaW4sIGZ1bmN0aW9uKHBhcmFtc2V0KSB7XG4gICAgICAgIGZvckVhY2gob2JqZWN0S2V5cyhwYXJhbXNldCksIGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgaWYgKGluZGV4T2Yoa2V5cywga2V5KSA9PT0gLTEgJiYgaW5kZXhPZihpZ25vcmUsIGtleSkgPT09IC0xKSBrZXlzLnB1c2goa2V5KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBrZXlzO1xuICAgIH0sXG4gICAgJCR2YWx1ZXM6IGZ1bmN0aW9uKHBhcmFtVmFsdWVzKSB7XG4gICAgICB2YXIgdmFsdWVzID0ge30sIHNlbGYgPSB0aGlzO1xuICAgICAgZm9yRWFjaChzZWxmLiQka2V5cygpLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFsdWVzW2tleV0gPSBzZWxmW2tleV0udmFsdWUocGFyYW1WYWx1ZXMgJiYgcGFyYW1WYWx1ZXNba2V5XSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgfSxcbiAgICAkJGVxdWFsczogZnVuY3Rpb24ocGFyYW1WYWx1ZXMxLCBwYXJhbVZhbHVlczIpIHtcbiAgICAgIHZhciBlcXVhbCA9IHRydWUsIHNlbGYgPSB0aGlzO1xuICAgICAgZm9yRWFjaChzZWxmLiQka2V5cygpLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGxlZnQgPSBwYXJhbVZhbHVlczEgJiYgcGFyYW1WYWx1ZXMxW2tleV0sIHJpZ2h0ID0gcGFyYW1WYWx1ZXMyICYmIHBhcmFtVmFsdWVzMltrZXldO1xuICAgICAgICBpZiAoIXNlbGZba2V5XS50eXBlLmVxdWFscyhsZWZ0LCByaWdodCkpIGVxdWFsID0gZmFsc2U7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBlcXVhbDtcbiAgICB9LFxuICAgICQkdmFsaWRhdGVzOiBmdW5jdGlvbiAkJHZhbGlkYXRlKHBhcmFtVmFsdWVzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdHJ1ZSwgaXNPcHRpb25hbCwgdmFsLCBwYXJhbSwgc2VsZiA9IHRoaXM7XG5cbiAgICAgIGZvckVhY2godGhpcy4kJGtleXMoKSwgZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHBhcmFtID0gc2VsZltrZXldO1xuICAgICAgICB2YWwgPSBwYXJhbVZhbHVlc1trZXldO1xuICAgICAgICBpc09wdGlvbmFsID0gIXZhbCAmJiBwYXJhbS5pc09wdGlvbmFsO1xuICAgICAgICByZXN1bHQgPSByZXN1bHQgJiYgKGlzT3B0aW9uYWwgfHwgISFwYXJhbS50eXBlLmlzKHZhbCkpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgJCRwYXJlbnQ6IHVuZGVmaW5lZFxuICB9O1xuXG4gIHRoaXMuUGFyYW1TZXQgPSBQYXJhbVNldDtcbn1cblxuLy8gUmVnaXN0ZXIgYXMgYSBwcm92aWRlciBzbyBpdCdzIGF2YWlsYWJsZSB0byBvdGhlciBwcm92aWRlcnNcbmFuZ3VsYXIubW9kdWxlKCd1aS5yb3V0ZXIudXRpbCcpLnByb3ZpZGVyKCckdXJsTWF0Y2hlckZhY3RvcnknLCAkVXJsTWF0Y2hlckZhY3RvcnkpO1xuYW5ndWxhci5tb2R1bGUoJ3VpLnJvdXRlci51dGlsJykucnVuKFsnJHVybE1hdGNoZXJGYWN0b3J5JywgZnVuY3Rpb24oJHVybE1hdGNoZXJGYWN0b3J5KSB7IH1dKTtcblxuLyoqXG4gKiBAbmdkb2Mgb2JqZWN0XG4gKiBAbmFtZSB1aS5yb3V0ZXIucm91dGVyLiR1cmxSb3V0ZXJQcm92aWRlclxuICpcbiAqIEByZXF1aXJlcyB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnlQcm92aWRlclxuICogQHJlcXVpcmVzICRsb2NhdGlvblByb3ZpZGVyXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBgJHVybFJvdXRlclByb3ZpZGVyYCBoYXMgdGhlIHJlc3BvbnNpYmlsaXR5IG9mIHdhdGNoaW5nIGAkbG9jYXRpb25gLiBcbiAqIFdoZW4gYCRsb2NhdGlvbmAgY2hhbmdlcyBpdCBydW5zIHRocm91Z2ggYSBsaXN0IG9mIHJ1bGVzIG9uZSBieSBvbmUgdW50aWwgYSBcbiAqIG1hdGNoIGlzIGZvdW5kLiBgJHVybFJvdXRlclByb3ZpZGVyYCBpcyB1c2VkIGJlaGluZCB0aGUgc2NlbmVzIGFueXRpbWUgeW91IHNwZWNpZnkgXG4gKiBhIHVybCBpbiBhIHN0YXRlIGNvbmZpZ3VyYXRpb24uIEFsbCB1cmxzIGFyZSBjb21waWxlZCBpbnRvIGEgVXJsTWF0Y2hlciBvYmplY3QuXG4gKlxuICogVGhlcmUgYXJlIHNldmVyYWwgbWV0aG9kcyBvbiBgJHVybFJvdXRlclByb3ZpZGVyYCB0aGF0IG1ha2UgaXQgdXNlZnVsIHRvIHVzZSBkaXJlY3RseVxuICogaW4geW91ciBtb2R1bGUgY29uZmlnLlxuICovXG4kVXJsUm91dGVyUHJvdmlkZXIuJGluamVjdCA9IFsnJGxvY2F0aW9uUHJvdmlkZXInLCAnJHVybE1hdGNoZXJGYWN0b3J5UHJvdmlkZXInXTtcbmZ1bmN0aW9uICRVcmxSb3V0ZXJQcm92aWRlciggICAkbG9jYXRpb25Qcm92aWRlciwgICAkdXJsTWF0Y2hlckZhY3RvcnkpIHtcbiAgdmFyIHJ1bGVzID0gW10sIG90aGVyd2lzZSA9IG51bGwsIGludGVyY2VwdERlZmVycmVkID0gZmFsc2UsIGxpc3RlbmVyO1xuXG4gIC8vIFJldHVybnMgYSBzdHJpbmcgdGhhdCBpcyBhIHByZWZpeCBvZiBhbGwgc3RyaW5ncyBtYXRjaGluZyB0aGUgUmVnRXhwXG4gIGZ1bmN0aW9uIHJlZ0V4cFByZWZpeChyZSkge1xuICAgIHZhciBwcmVmaXggPSAvXlxcXigoPzpcXFxcW15hLXpBLVowLTldfFteXFxcXFxcW1xcXVxcXiQqKz8uKCl8e31dKykqKS8uZXhlYyhyZS5zb3VyY2UpO1xuICAgIHJldHVybiAocHJlZml4ICE9IG51bGwpID8gcHJlZml4WzFdLnJlcGxhY2UoL1xcXFwoLikvZywgXCIkMVwiKSA6ICcnO1xuICB9XG5cbiAgLy8gSW50ZXJwb2xhdGVzIG1hdGNoZWQgdmFsdWVzIGludG8gYSBTdHJpbmcucmVwbGFjZSgpLXN0eWxlIHBhdHRlcm5cbiAgZnVuY3Rpb24gaW50ZXJwb2xhdGUocGF0dGVybiwgbWF0Y2gpIHtcbiAgICByZXR1cm4gcGF0dGVybi5yZXBsYWNlKC9cXCQoXFwkfFxcZHsxLDJ9KS8sIGZ1bmN0aW9uIChtLCB3aGF0KSB7XG4gICAgICByZXR1cm4gbWF0Y2hbd2hhdCA9PT0gJyQnID8gMCA6IE51bWJlcih3aGF0KV07XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci5yb3V0ZXIuJHVybFJvdXRlclByb3ZpZGVyI3J1bGVcbiAgICogQG1ldGhvZE9mIHVpLnJvdXRlci5yb3V0ZXIuJHVybFJvdXRlclByb3ZpZGVyXG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBEZWZpbmVzIHJ1bGVzIHRoYXQgYXJlIHVzZWQgYnkgYCR1cmxSb3V0ZXJQcm92aWRlcmAgdG8gZmluZCBtYXRjaGVzIGZvclxuICAgKiBzcGVjaWZpYyBVUkxzLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiA8cHJlPlxuICAgKiB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFsndWkucm91dGVyLnJvdXRlciddKTtcbiAgICpcbiAgICogYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHVybFJvdXRlclByb3ZpZGVyKSB7XG4gICAqICAgLy8gSGVyZSdzIGFuIGV4YW1wbGUgb2YgaG93IHlvdSBtaWdodCBhbGxvdyBjYXNlIGluc2Vuc2l0aXZlIHVybHNcbiAgICogICAkdXJsUm91dGVyUHJvdmlkZXIucnVsZShmdW5jdGlvbiAoJGluamVjdG9yLCAkbG9jYXRpb24pIHtcbiAgICogICAgIHZhciBwYXRoID0gJGxvY2F0aW9uLnBhdGgoKSxcbiAgICogICAgICAgICBub3JtYWxpemVkID0gcGF0aC50b0xvd2VyQ2FzZSgpO1xuICAgKlxuICAgKiAgICAgaWYgKHBhdGggIT09IG5vcm1hbGl6ZWQpIHtcbiAgICogICAgICAgcmV0dXJuIG5vcm1hbGl6ZWQ7XG4gICAqICAgICB9XG4gICAqICAgfSk7XG4gICAqIH0pO1xuICAgKiA8L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IHJ1bGUgSGFuZGxlciBmdW5jdGlvbiB0aGF0IHRha2VzIGAkaW5qZWN0b3JgIGFuZCBgJGxvY2F0aW9uYFxuICAgKiBzZXJ2aWNlcyBhcyBhcmd1bWVudHMuIFlvdSBjYW4gdXNlIHRoZW0gdG8gcmV0dXJuIGEgdmFsaWQgcGF0aCBhcyBhIHN0cmluZy5cbiAgICpcbiAgICogQHJldHVybiB7b2JqZWN0fSBgJHVybFJvdXRlclByb3ZpZGVyYCAtIGAkdXJsUm91dGVyUHJvdmlkZXJgIGluc3RhbmNlXG4gICAqL1xuICB0aGlzLnJ1bGUgPSBmdW5jdGlvbiAocnVsZSkge1xuICAgIGlmICghaXNGdW5jdGlvbihydWxlKSkgdGhyb3cgbmV3IEVycm9yKFwiJ3J1bGUnIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICBydWxlcy5wdXNoKHJ1bGUpO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2Mgb2JqZWN0XG4gICAqIEBuYW1lIHVpLnJvdXRlci5yb3V0ZXIuJHVybFJvdXRlclByb3ZpZGVyI290aGVyd2lzZVxuICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnJvdXRlci4kdXJsUm91dGVyUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIERlZmluZXMgYSBwYXRoIHRoYXQgaXMgdXNlZCB3aGVuIGFuIGludmFsaWQgcm91dGUgaXMgcmVxdWVzdGVkLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiA8cHJlPlxuICAgKiB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFsndWkucm91dGVyLnJvdXRlciddKTtcbiAgICpcbiAgICogYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHVybFJvdXRlclByb3ZpZGVyKSB7XG4gICAqICAgLy8gaWYgdGhlIHBhdGggZG9lc24ndCBtYXRjaCBhbnkgb2YgdGhlIHVybHMgeW91IGNvbmZpZ3VyZWRcbiAgICogICAvLyBvdGhlcndpc2Ugd2lsbCB0YWtlIGNhcmUgb2Ygcm91dGluZyB0aGUgdXNlciB0byB0aGVcbiAgICogICAvLyBzcGVjaWZpZWQgdXJsXG4gICAqICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnL2luZGV4Jyk7XG4gICAqXG4gICAqICAgLy8gRXhhbXBsZSBvZiB1c2luZyBmdW5jdGlvbiBydWxlIGFzIHBhcmFtXG4gICAqICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZShmdW5jdGlvbiAoJGluamVjdG9yLCAkbG9jYXRpb24pIHtcbiAgICogICAgIHJldHVybiAnL2EvdmFsaWQvdXJsJztcbiAgICogICB9KTtcbiAgICogfSk7XG4gICAqIDwvcHJlPlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHJ1bGUgVGhlIHVybCBwYXRoIHlvdSB3YW50IHRvIHJlZGlyZWN0IHRvIG9yIGEgZnVuY3Rpb24gXG4gICAqIHJ1bGUgdGhhdCByZXR1cm5zIHRoZSB1cmwgcGF0aC4gVGhlIGZ1bmN0aW9uIHZlcnNpb24gaXMgcGFzc2VkIHR3byBwYXJhbXM6IFxuICAgKiBgJGluamVjdG9yYCBhbmQgYCRsb2NhdGlvbmAgc2VydmljZXMsIGFuZCBtdXN0IHJldHVybiBhIHVybCBzdHJpbmcuXG4gICAqXG4gICAqIEByZXR1cm4ge29iamVjdH0gYCR1cmxSb3V0ZXJQcm92aWRlcmAgLSBgJHVybFJvdXRlclByb3ZpZGVyYCBpbnN0YW5jZVxuICAgKi9cbiAgdGhpcy5vdGhlcndpc2UgPSBmdW5jdGlvbiAocnVsZSkge1xuICAgIGlmIChpc1N0cmluZyhydWxlKSkge1xuICAgICAgdmFyIHJlZGlyZWN0ID0gcnVsZTtcbiAgICAgIHJ1bGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiByZWRpcmVjdDsgfTtcbiAgICB9XG4gICAgZWxzZSBpZiAoIWlzRnVuY3Rpb24ocnVsZSkpIHRocm93IG5ldyBFcnJvcihcIidydWxlJyBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgb3RoZXJ3aXNlID0gcnVsZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuXG4gIGZ1bmN0aW9uIGhhbmRsZUlmTWF0Y2goJGluamVjdG9yLCBoYW5kbGVyLCBtYXRjaCkge1xuICAgIGlmICghbWF0Y2gpIHJldHVybiBmYWxzZTtcbiAgICB2YXIgcmVzdWx0ID0gJGluamVjdG9yLmludm9rZShoYW5kbGVyLCBoYW5kbGVyLCB7ICRtYXRjaDogbWF0Y2ggfSk7XG4gICAgcmV0dXJuIGlzRGVmaW5lZChyZXN1bHQpID8gcmVzdWx0IDogdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgdWkucm91dGVyLnJvdXRlci4kdXJsUm91dGVyUHJvdmlkZXIjd2hlblxuICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnJvdXRlci4kdXJsUm91dGVyUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFJlZ2lzdGVycyBhIGhhbmRsZXIgZm9yIGEgZ2l2ZW4gdXJsIG1hdGNoaW5nLiBpZiBoYW5kbGUgaXMgYSBzdHJpbmcsIGl0IGlzXG4gICAqIHRyZWF0ZWQgYXMgYSByZWRpcmVjdCwgYW5kIGlzIGludGVycG9sYXRlZCBhY2NvcmRpbmcgdG8gdGhlIHN5bnRheCBvZiBtYXRjaFxuICAgKiAoaS5lLiBsaWtlIGBTdHJpbmcucmVwbGFjZSgpYCBmb3IgYFJlZ0V4cGAsIG9yIGxpa2UgYSBgVXJsTWF0Y2hlcmAgcGF0dGVybiBvdGhlcndpc2UpLlxuICAgKlxuICAgKiBJZiB0aGUgaGFuZGxlciBpcyBhIGZ1bmN0aW9uLCBpdCBpcyBpbmplY3RhYmxlLiBJdCBnZXRzIGludm9rZWQgaWYgYCRsb2NhdGlvbmBcbiAgICogbWF0Y2hlcy4gWW91IGhhdmUgdGhlIG9wdGlvbiBvZiBpbmplY3QgdGhlIG1hdGNoIG9iamVjdCBhcyBgJG1hdGNoYC5cbiAgICpcbiAgICogVGhlIGhhbmRsZXIgY2FuIHJldHVyblxuICAgKlxuICAgKiAtICoqZmFsc3kqKiB0byBpbmRpY2F0ZSB0aGF0IHRoZSBydWxlIGRpZG4ndCBtYXRjaCBhZnRlciBhbGwsIHRoZW4gYCR1cmxSb3V0ZXJgXG4gICAqICAgd2lsbCBjb250aW51ZSB0cnlpbmcgdG8gZmluZCBhbm90aGVyIG9uZSB0aGF0IG1hdGNoZXMuXG4gICAqIC0gKipzdHJpbmcqKiB3aGljaCBpcyB0cmVhdGVkIGFzIGEgcmVkaXJlY3QgYW5kIHBhc3NlZCB0byBgJGxvY2F0aW9uLnVybCgpYFxuICAgKiAtICoqdm9pZCoqIG9yIGFueSAqKnRydXRoeSoqIHZhbHVlIHRlbGxzIGAkdXJsUm91dGVyYCB0aGF0IHRoZSB1cmwgd2FzIGhhbmRsZWQuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIDxwcmU+XG4gICAqIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnYXBwJywgWyd1aS5yb3V0ZXIucm91dGVyJ10pO1xuICAgKlxuICAgKiBhcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIpIHtcbiAgICogICAkdXJsUm91dGVyUHJvdmlkZXIud2hlbigkc3RhdGUudXJsLCBmdW5jdGlvbiAoJG1hdGNoLCAkc3RhdGVQYXJhbXMpIHtcbiAgICogICAgIGlmICgkc3RhdGUuJGN1cnJlbnQubmF2aWdhYmxlICE9PSBzdGF0ZSB8fFxuICAgKiAgICAgICAgICFlcXVhbEZvcktleXMoJG1hdGNoLCAkc3RhdGVQYXJhbXMpIHtcbiAgICogICAgICAkc3RhdGUudHJhbnNpdGlvblRvKHN0YXRlLCAkbWF0Y2gsIGZhbHNlKTtcbiAgICogICAgIH1cbiAgICogICB9KTtcbiAgICogfSk7XG4gICAqIDwvcHJlPlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHdoYXQgVGhlIGluY29taW5nIHBhdGggdGhhdCB5b3Ugd2FudCB0byByZWRpcmVjdC5cbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBoYW5kbGVyIFRoZSBwYXRoIHlvdSB3YW50IHRvIHJlZGlyZWN0IHlvdXIgdXNlciB0by5cbiAgICovXG4gIHRoaXMud2hlbiA9IGZ1bmN0aW9uICh3aGF0LCBoYW5kbGVyKSB7XG4gICAgdmFyIHJlZGlyZWN0LCBoYW5kbGVySXNTdHJpbmcgPSBpc1N0cmluZyhoYW5kbGVyKTtcbiAgICBpZiAoaXNTdHJpbmcod2hhdCkpIHdoYXQgPSAkdXJsTWF0Y2hlckZhY3RvcnkuY29tcGlsZSh3aGF0KTtcblxuICAgIGlmICghaGFuZGxlcklzU3RyaW5nICYmICFpc0Z1bmN0aW9uKGhhbmRsZXIpICYmICFpc0FycmF5KGhhbmRsZXIpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCAnaGFuZGxlcicgaW4gd2hlbigpXCIpO1xuXG4gICAgdmFyIHN0cmF0ZWdpZXMgPSB7XG4gICAgICBtYXRjaGVyOiBmdW5jdGlvbiAod2hhdCwgaGFuZGxlcikge1xuICAgICAgICBpZiAoaGFuZGxlcklzU3RyaW5nKSB7XG4gICAgICAgICAgcmVkaXJlY3QgPSAkdXJsTWF0Y2hlckZhY3RvcnkuY29tcGlsZShoYW5kbGVyKTtcbiAgICAgICAgICBoYW5kbGVyID0gWyckbWF0Y2gnLCBmdW5jdGlvbiAoJG1hdGNoKSB7IHJldHVybiByZWRpcmVjdC5mb3JtYXQoJG1hdGNoKTsgfV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGV4dGVuZChmdW5jdGlvbiAoJGluamVjdG9yLCAkbG9jYXRpb24pIHtcbiAgICAgICAgICByZXR1cm4gaGFuZGxlSWZNYXRjaCgkaW5qZWN0b3IsIGhhbmRsZXIsIHdoYXQuZXhlYygkbG9jYXRpb24ucGF0aCgpLCAkbG9jYXRpb24uc2VhcmNoKCkpKTtcbiAgICAgICAgfSwge1xuICAgICAgICAgIHByZWZpeDogaXNTdHJpbmcod2hhdC5wcmVmaXgpID8gd2hhdC5wcmVmaXggOiAnJ1xuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICByZWdleDogZnVuY3Rpb24gKHdoYXQsIGhhbmRsZXIpIHtcbiAgICAgICAgaWYgKHdoYXQuZ2xvYmFsIHx8IHdoYXQuc3RpY2t5KSB0aHJvdyBuZXcgRXJyb3IoXCJ3aGVuKCkgUmVnRXhwIG11c3Qgbm90IGJlIGdsb2JhbCBvciBzdGlja3lcIik7XG5cbiAgICAgICAgaWYgKGhhbmRsZXJJc1N0cmluZykge1xuICAgICAgICAgIHJlZGlyZWN0ID0gaGFuZGxlcjtcbiAgICAgICAgICBoYW5kbGVyID0gWyckbWF0Y2gnLCBmdW5jdGlvbiAoJG1hdGNoKSB7IHJldHVybiBpbnRlcnBvbGF0ZShyZWRpcmVjdCwgJG1hdGNoKTsgfV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGV4dGVuZChmdW5jdGlvbiAoJGluamVjdG9yLCAkbG9jYXRpb24pIHtcbiAgICAgICAgICByZXR1cm4gaGFuZGxlSWZNYXRjaCgkaW5qZWN0b3IsIGhhbmRsZXIsIHdoYXQuZXhlYygkbG9jYXRpb24ucGF0aCgpKSk7XG4gICAgICAgIH0sIHtcbiAgICAgICAgICBwcmVmaXg6IHJlZ0V4cFByZWZpeCh3aGF0KVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGNoZWNrID0geyBtYXRjaGVyOiAkdXJsTWF0Y2hlckZhY3RvcnkuaXNNYXRjaGVyKHdoYXQpLCByZWdleDogd2hhdCBpbnN0YW5jZW9mIFJlZ0V4cCB9O1xuXG4gICAgZm9yICh2YXIgbiBpbiBjaGVjaykge1xuICAgICAgaWYgKGNoZWNrW25dKSByZXR1cm4gdGhpcy5ydWxlKHN0cmF0ZWdpZXNbbl0od2hhdCwgaGFuZGxlcikpO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgJ3doYXQnIGluIHdoZW4oKVwiKTtcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci5yb3V0ZXIuJHVybFJvdXRlclByb3ZpZGVyI2RlZmVySW50ZXJjZXB0XG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIucm91dGVyLiR1cmxSb3V0ZXJQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogRGlzYWJsZXMgKG9yIGVuYWJsZXMpIGRlZmVycmluZyBsb2NhdGlvbiBjaGFuZ2UgaW50ZXJjZXB0aW9uLlxuICAgKlxuICAgKiBJZiB5b3Ugd2lzaCB0byBjdXN0b21pemUgdGhlIGJlaGF2aW9yIG9mIHN5bmNpbmcgdGhlIFVSTCAoZm9yIGV4YW1wbGUsIGlmIHlvdSB3aXNoIHRvXG4gICAqIGRlZmVyIGEgdHJhbnNpdGlvbiBidXQgbWFpbnRhaW4gdGhlIGN1cnJlbnQgVVJMKSwgY2FsbCB0aGlzIG1ldGhvZCBhdCBjb25maWd1cmF0aW9uIHRpbWUuXG4gICAqIFRoZW4sIGF0IHJ1biB0aW1lLCBjYWxsIGAkdXJsUm91dGVyLmxpc3RlbigpYCBhZnRlciB5b3UgaGF2ZSBjb25maWd1cmVkIHlvdXIgb3duXG4gICAqIGAkbG9jYXRpb25DaGFuZ2VTdWNjZXNzYCBldmVudCBoYW5kbGVyLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiA8cHJlPlxuICAgKiB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFsndWkucm91dGVyLnJvdXRlciddKTtcbiAgICpcbiAgICogYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHVybFJvdXRlclByb3ZpZGVyKSB7XG4gICAqXG4gICAqICAgLy8gUHJldmVudCAkdXJsUm91dGVyIGZyb20gYXV0b21hdGljYWxseSBpbnRlcmNlcHRpbmcgVVJMIGNoYW5nZXM7XG4gICAqICAgLy8gdGhpcyBhbGxvd3MgeW91IHRvIGNvbmZpZ3VyZSBjdXN0b20gYmVoYXZpb3IgaW4gYmV0d2VlblxuICAgKiAgIC8vIGxvY2F0aW9uIGNoYW5nZXMgYW5kIHJvdXRlIHN5bmNocm9uaXphdGlvbjpcbiAgICogICAkdXJsUm91dGVyUHJvdmlkZXIuZGVmZXJJbnRlcmNlcHQoKTtcbiAgICpcbiAgICogfSkucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkdXJsUm91dGVyLCBVc2VyU2VydmljZSkge1xuICAgKlxuICAgKiAgICRyb290U2NvcGUuJG9uKCckbG9jYXRpb25DaGFuZ2VTdWNjZXNzJywgZnVuY3Rpb24oZSkge1xuICAgKiAgICAgLy8gVXNlclNlcnZpY2UgaXMgYW4gZXhhbXBsZSBzZXJ2aWNlIGZvciBtYW5hZ2luZyB1c2VyIHN0YXRlXG4gICAqICAgICBpZiAoVXNlclNlcnZpY2UuaXNMb2dnZWRJbigpKSByZXR1cm47XG4gICAqXG4gICAqICAgICAvLyBQcmV2ZW50ICR1cmxSb3V0ZXIncyBkZWZhdWx0IGhhbmRsZXIgZnJvbSBmaXJpbmdcbiAgICogICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICpcbiAgICogICAgIFVzZXJTZXJ2aWNlLmhhbmRsZUxvZ2luKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICogICAgICAgLy8gT25jZSB0aGUgdXNlciBoYXMgbG9nZ2VkIGluLCBzeW5jIHRoZSBjdXJyZW50IFVSTFxuICAgKiAgICAgICAvLyB0byB0aGUgcm91dGVyOlxuICAgKiAgICAgICAkdXJsUm91dGVyLnN5bmMoKTtcbiAgICogICAgIH0pO1xuICAgKiAgIH0pO1xuICAgKlxuICAgKiAgIC8vIENvbmZpZ3VyZXMgJHVybFJvdXRlcidzIGxpc3RlbmVyICphZnRlciogeW91ciBjdXN0b20gbGlzdGVuZXJcbiAgICogICAkdXJsUm91dGVyLmxpc3RlbigpO1xuICAgKiB9KTtcbiAgICogPC9wcmU+XG4gICAqXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gZGVmZXIgSW5kaWNhdGVzIHdoZXRoZXIgdG8gZGVmZXIgbG9jYXRpb24gY2hhbmdlIGludGVyY2VwdGlvbi4gUGFzc2luZ1xuICAgICAgICAgICAgbm8gcGFyYW1ldGVyIGlzIGVxdWl2YWxlbnQgdG8gYHRydWVgLlxuICAgKi9cbiAgdGhpcy5kZWZlckludGVyY2VwdCA9IGZ1bmN0aW9uIChkZWZlcikge1xuICAgIGlmIChkZWZlciA9PT0gdW5kZWZpbmVkKSBkZWZlciA9IHRydWU7XG4gICAgaW50ZXJjZXB0RGVmZXJyZWQgPSBkZWZlcjtcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIG9iamVjdFxuICAgKiBAbmFtZSB1aS5yb3V0ZXIucm91dGVyLiR1cmxSb3V0ZXJcbiAgICpcbiAgICogQHJlcXVpcmVzICRsb2NhdGlvblxuICAgKiBAcmVxdWlyZXMgJHJvb3RTY29wZVxuICAgKiBAcmVxdWlyZXMgJGluamVjdG9yXG4gICAqIEByZXF1aXJlcyAkYnJvd3NlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICpcbiAgICovXG4gIHRoaXMuJGdldCA9ICRnZXQ7XG4gICRnZXQuJGluamVjdCA9IFsnJGxvY2F0aW9uJywgJyRyb290U2NvcGUnLCAnJGluamVjdG9yJywgJyRicm93c2VyJ107XG4gIGZ1bmN0aW9uICRnZXQoICAgJGxvY2F0aW9uLCAgICRyb290U2NvcGUsICAgJGluamVjdG9yLCAgICRicm93c2VyKSB7XG5cbiAgICB2YXIgYmFzZUhyZWYgPSAkYnJvd3Nlci5iYXNlSHJlZigpLCBsb2NhdGlvbiA9ICRsb2NhdGlvbi51cmwoKSwgbGFzdFB1c2hlZFVybDtcblxuICAgIGZ1bmN0aW9uIGFwcGVuZEJhc2VQYXRoKHVybCwgaXNIdG1sNSwgYWJzb2x1dGUpIHtcbiAgICAgIGlmIChiYXNlSHJlZiA9PT0gJy8nKSByZXR1cm4gdXJsO1xuICAgICAgaWYgKGlzSHRtbDUpIHJldHVybiBiYXNlSHJlZi5zbGljZSgwLCAtMSkgKyB1cmw7XG4gICAgICBpZiAoYWJzb2x1dGUpIHJldHVybiBiYXNlSHJlZi5zbGljZSgxKSArIHVybDtcbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgLy8gVE9ETzogT3B0aW1pemUgZ3JvdXBzIG9mIHJ1bGVzIHdpdGggbm9uLWVtcHR5IHByZWZpeCBpbnRvIHNvbWUgc29ydCBvZiBkZWNpc2lvbiB0cmVlXG4gICAgZnVuY3Rpb24gdXBkYXRlKGV2dCkge1xuICAgICAgaWYgKGV2dCAmJiBldnQuZGVmYXVsdFByZXZlbnRlZCkgcmV0dXJuO1xuICAgICAgdmFyIGlnbm9yZVVwZGF0ZSA9IGxhc3RQdXNoZWRVcmwgJiYgJGxvY2F0aW9uLnVybCgpID09PSBsYXN0UHVzaGVkVXJsO1xuICAgICAgbGFzdFB1c2hlZFVybCA9IHVuZGVmaW5lZDtcbiAgICAgIGlmIChpZ25vcmVVcGRhdGUpIHJldHVybiB0cnVlO1xuXG4gICAgICBmdW5jdGlvbiBjaGVjayhydWxlKSB7XG4gICAgICAgIHZhciBoYW5kbGVkID0gcnVsZSgkaW5qZWN0b3IsICRsb2NhdGlvbik7XG5cbiAgICAgICAgaWYgKCFoYW5kbGVkKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmIChpc1N0cmluZyhoYW5kbGVkKSkgJGxvY2F0aW9uLnJlcGxhY2UoKS51cmwoaGFuZGxlZCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgdmFyIG4gPSBydWxlcy5sZW5ndGgsIGk7XG5cbiAgICAgIGZvciAoaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgaWYgKGNoZWNrKHJ1bGVzW2ldKSkgcmV0dXJuO1xuICAgICAgfVxuICAgICAgLy8gYWx3YXlzIGNoZWNrIG90aGVyd2lzZSBsYXN0IHRvIGFsbG93IGR5bmFtaWMgdXBkYXRlcyB0byB0aGUgc2V0IG9mIHJ1bGVzXG4gICAgICBpZiAob3RoZXJ3aXNlKSBjaGVjayhvdGhlcndpc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpc3RlbigpIHtcbiAgICAgIGxpc3RlbmVyID0gbGlzdGVuZXIgfHwgJHJvb3RTY29wZS4kb24oJyRsb2NhdGlvbkNoYW5nZVN1Y2Nlc3MnLCB1cGRhdGUpO1xuICAgICAgcmV0dXJuIGxpc3RlbmVyO1xuICAgIH1cblxuICAgIGlmICghaW50ZXJjZXB0RGVmZXJyZWQpIGxpc3RlbigpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIC8qKlxuICAgICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICAgKiBAbmFtZSB1aS5yb3V0ZXIucm91dGVyLiR1cmxSb3V0ZXIjc3luY1xuICAgICAgICogQG1ldGhvZE9mIHVpLnJvdXRlci5yb3V0ZXIuJHVybFJvdXRlclxuICAgICAgICpcbiAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICogVHJpZ2dlcnMgYW4gdXBkYXRlOyB0aGUgc2FtZSB1cGRhdGUgdGhhdCBoYXBwZW5zIHdoZW4gdGhlIGFkZHJlc3MgYmFyIHVybCBjaGFuZ2VzLCBha2EgYCRsb2NhdGlvbkNoYW5nZVN1Y2Nlc3NgLlxuICAgICAgICogVGhpcyBtZXRob2QgaXMgdXNlZnVsIHdoZW4geW91IG5lZWQgdG8gdXNlIGBwcmV2ZW50RGVmYXVsdCgpYCBvbiB0aGUgYCRsb2NhdGlvbkNoYW5nZVN1Y2Nlc3NgIGV2ZW50LFxuICAgICAgICogcGVyZm9ybSBzb21lIGN1c3RvbSBsb2dpYyAocm91dGUgcHJvdGVjdGlvbiwgYXV0aCwgY29uZmlnLCByZWRpcmVjdGlvbiwgZXRjKSBhbmQgdGhlbiBmaW5hbGx5IHByb2NlZWRcbiAgICAgICAqIHdpdGggdGhlIHRyYW5zaXRpb24gYnkgY2FsbGluZyBgJHVybFJvdXRlci5zeW5jKClgLlxuICAgICAgICpcbiAgICAgICAqIEBleGFtcGxlXG4gICAgICAgKiA8cHJlPlxuICAgICAgICogYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFsndWkucm91dGVyJ10pXG4gICAgICAgKiAgIC5ydW4oZnVuY3Rpb24oJHJvb3RTY29wZSwgJHVybFJvdXRlcikge1xuICAgICAgICogICAgICRyb290U2NvcGUuJG9uKCckbG9jYXRpb25DaGFuZ2VTdWNjZXNzJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgKiAgICAgICAvLyBIYWx0IHN0YXRlIGNoYW5nZSBmcm9tIGV2ZW4gc3RhcnRpbmdcbiAgICAgICAqICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICogICAgICAgLy8gUGVyZm9ybSBjdXN0b20gbG9naWNcbiAgICAgICAqICAgICAgIHZhciBtZWV0c1JlcXVpcmVtZW50ID0gLi4uXG4gICAgICAgKiAgICAgICAvLyBDb250aW51ZSB3aXRoIHRoZSB1cGRhdGUgYW5kIHN0YXRlIHRyYW5zaXRpb24gaWYgbG9naWMgYWxsb3dzXG4gICAgICAgKiAgICAgICBpZiAobWVldHNSZXF1aXJlbWVudCkgJHVybFJvdXRlci5zeW5jKCk7XG4gICAgICAgKiAgICAgfSk7XG4gICAgICAgKiB9KTtcbiAgICAgICAqIDwvcHJlPlxuICAgICAgICovXG4gICAgICBzeW5jOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdXBkYXRlKCk7XG4gICAgICB9LFxuXG4gICAgICBsaXN0ZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbGlzdGVuKCk7XG4gICAgICB9LFxuXG4gICAgICB1cGRhdGU6IGZ1bmN0aW9uKHJlYWQpIHtcbiAgICAgICAgaWYgKHJlYWQpIHtcbiAgICAgICAgICBsb2NhdGlvbiA9ICRsb2NhdGlvbi51cmwoKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCRsb2NhdGlvbi51cmwoKSA9PT0gbG9jYXRpb24pIHJldHVybjtcblxuICAgICAgICAkbG9jYXRpb24udXJsKGxvY2F0aW9uKTtcbiAgICAgICAgJGxvY2F0aW9uLnJlcGxhY2UoKTtcbiAgICAgIH0sXG5cbiAgICAgIHB1c2g6IGZ1bmN0aW9uKHVybE1hdGNoZXIsIHBhcmFtcywgb3B0aW9ucykge1xuICAgICAgICAkbG9jYXRpb24udXJsKHVybE1hdGNoZXIuZm9ybWF0KHBhcmFtcyB8fCB7fSkpO1xuICAgICAgICBsYXN0UHVzaGVkVXJsID0gb3B0aW9ucyAmJiBvcHRpb25zLiQkYXZvaWRSZXN5bmMgPyAkbG9jYXRpb24udXJsKCkgOiB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMucmVwbGFjZSkgJGxvY2F0aW9uLnJlcGxhY2UoKTtcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICAgKiBAbmFtZSB1aS5yb3V0ZXIucm91dGVyLiR1cmxSb3V0ZXIjaHJlZlxuICAgICAgICogQG1ldGhvZE9mIHVpLnJvdXRlci5yb3V0ZXIuJHVybFJvdXRlclxuICAgICAgICpcbiAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICogQSBVUkwgZ2VuZXJhdGlvbiBtZXRob2QgdGhhdCByZXR1cm5zIHRoZSBjb21waWxlZCBVUkwgZm9yIGEgZ2l2ZW5cbiAgICAgICAqIHtAbGluayB1aS5yb3V0ZXIudXRpbC50eXBlOlVybE1hdGNoZXIgYFVybE1hdGNoZXJgfSwgcG9wdWxhdGVkIHdpdGggdGhlIHByb3ZpZGVkIHBhcmFtZXRlcnMuXG4gICAgICAgKlxuICAgICAgICogQGV4YW1wbGVcbiAgICAgICAqIDxwcmU+XG4gICAgICAgKiAkYm9iID0gJHVybFJvdXRlci5ocmVmKG5ldyBVcmxNYXRjaGVyKFwiL2Fib3V0LzpwZXJzb25cIiksIHtcbiAgICAgICAqICAgcGVyc29uOiBcImJvYlwiXG4gICAgICAgKiB9KTtcbiAgICAgICAqIC8vICRib2IgPT0gXCIvYWJvdXQvYm9iXCI7XG4gICAgICAgKiA8L3ByZT5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge1VybE1hdGNoZXJ9IHVybE1hdGNoZXIgVGhlIGBVcmxNYXRjaGVyYCBvYmplY3Qgd2hpY2ggaXMgdXNlZCBhcyB0aGUgdGVtcGxhdGUgb2YgdGhlIFVSTCB0byBnZW5lcmF0ZS5cbiAgICAgICAqIEBwYXJhbSB7b2JqZWN0PX0gcGFyYW1zIEFuIG9iamVjdCBvZiBwYXJhbWV0ZXIgdmFsdWVzIHRvIGZpbGwgdGhlIG1hdGNoZXIncyByZXF1aXJlZCBwYXJhbWV0ZXJzLlxuICAgICAgICogQHBhcmFtIHtvYmplY3Q9fSBvcHRpb25zIE9wdGlvbnMgb2JqZWN0LiBUaGUgb3B0aW9ucyBhcmU6XG4gICAgICAgKlxuICAgICAgICogLSAqKmBhYnNvbHV0ZWAqKiAtIHtib29sZWFuPWZhbHNlfSwgIElmIHRydWUgd2lsbCBnZW5lcmF0ZSBhbiBhYnNvbHV0ZSB1cmwsIGUuZy4gXCJodHRwOi8vd3d3LmV4YW1wbGUuY29tL2Z1bGx1cmxcIi5cbiAgICAgICAqXG4gICAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBmdWxseSBjb21waWxlZCBVUkwsIG9yIGBudWxsYCBpZiBgcGFyYW1zYCBmYWlsIHZhbGlkYXRpb24gYWdhaW5zdCBgdXJsTWF0Y2hlcmBcbiAgICAgICAqL1xuICAgICAgaHJlZjogZnVuY3Rpb24odXJsTWF0Y2hlciwgcGFyYW1zLCBvcHRpb25zKSB7XG4gICAgICAgIGlmICghdXJsTWF0Y2hlci52YWxpZGF0ZXMocGFyYW1zKSkgcmV0dXJuIG51bGw7XG5cbiAgICAgICAgdmFyIGlzSHRtbDUgPSAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUoKTtcbiAgICAgICAgaWYgKGFuZ3VsYXIuaXNPYmplY3QoaXNIdG1sNSkpIHtcbiAgICAgICAgICBpc0h0bWw1ID0gaXNIdG1sNS5lbmFibGVkO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgdXJsID0gdXJsTWF0Y2hlci5mb3JtYXQocGFyYW1zKTtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgICAgaWYgKCFpc0h0bWw1ICYmIHVybCAhPT0gbnVsbCkge1xuICAgICAgICAgIHVybCA9IFwiI1wiICsgJGxvY2F0aW9uUHJvdmlkZXIuaGFzaFByZWZpeCgpICsgdXJsO1xuICAgICAgICB9XG4gICAgICAgIHVybCA9IGFwcGVuZEJhc2VQYXRoKHVybCwgaXNIdG1sNSwgb3B0aW9ucy5hYnNvbHV0ZSk7XG5cbiAgICAgICAgaWYgKCFvcHRpb25zLmFic29sdXRlIHx8ICF1cmwpIHtcbiAgICAgICAgICByZXR1cm4gdXJsO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHNsYXNoID0gKCFpc0h0bWw1ICYmIHVybCA/ICcvJyA6ICcnKSwgcG9ydCA9ICRsb2NhdGlvbi5wb3J0KCk7XG4gICAgICAgIHBvcnQgPSAocG9ydCA9PT0gODAgfHwgcG9ydCA9PT0gNDQzID8gJycgOiAnOicgKyBwb3J0KTtcblxuICAgICAgICByZXR1cm4gWyRsb2NhdGlvbi5wcm90b2NvbCgpLCAnOi8vJywgJGxvY2F0aW9uLmhvc3QoKSwgcG9ydCwgc2xhc2gsIHVybF0uam9pbignJyk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxufVxuXG5hbmd1bGFyLm1vZHVsZSgndWkucm91dGVyLnJvdXRlcicpLnByb3ZpZGVyKCckdXJsUm91dGVyJywgJFVybFJvdXRlclByb3ZpZGVyKTtcblxuLyoqXG4gKiBAbmdkb2Mgb2JqZWN0XG4gKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlUHJvdmlkZXJcbiAqXG4gKiBAcmVxdWlyZXMgdWkucm91dGVyLnJvdXRlci4kdXJsUm91dGVyUHJvdmlkZXJcbiAqIEByZXF1aXJlcyB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnlQcm92aWRlclxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogVGhlIG5ldyBgJHN0YXRlUHJvdmlkZXJgIHdvcmtzIHNpbWlsYXIgdG8gQW5ndWxhcidzIHYxIHJvdXRlciwgYnV0IGl0IGZvY3VzZXMgcHVyZWx5XG4gKiBvbiBzdGF0ZS5cbiAqXG4gKiBBIHN0YXRlIGNvcnJlc3BvbmRzIHRvIGEgXCJwbGFjZVwiIGluIHRoZSBhcHBsaWNhdGlvbiBpbiB0ZXJtcyBvZiB0aGUgb3ZlcmFsbCBVSSBhbmRcbiAqIG5hdmlnYXRpb24uIEEgc3RhdGUgZGVzY3JpYmVzICh2aWEgdGhlIGNvbnRyb2xsZXIgLyB0ZW1wbGF0ZSAvIHZpZXcgcHJvcGVydGllcykgd2hhdFxuICogdGhlIFVJIGxvb2tzIGxpa2UgYW5kIGRvZXMgYXQgdGhhdCBwbGFjZS5cbiAqXG4gKiBTdGF0ZXMgb2Z0ZW4gaGF2ZSB0aGluZ3MgaW4gY29tbW9uLCBhbmQgdGhlIHByaW1hcnkgd2F5IG9mIGZhY3RvcmluZyBvdXQgdGhlc2VcbiAqIGNvbW1vbmFsaXRpZXMgaW4gdGhpcyBtb2RlbCBpcyB2aWEgdGhlIHN0YXRlIGhpZXJhcmNoeSwgaS5lLiBwYXJlbnQvY2hpbGQgc3RhdGVzIGFrYVxuICogbmVzdGVkIHN0YXRlcy5cbiAqXG4gKiBUaGUgYCRzdGF0ZVByb3ZpZGVyYCBwcm92aWRlcyBpbnRlcmZhY2VzIHRvIGRlY2xhcmUgdGhlc2Ugc3RhdGVzIGZvciB5b3VyIGFwcC5cbiAqL1xuJFN0YXRlUHJvdmlkZXIuJGluamVjdCA9IFsnJHVybFJvdXRlclByb3ZpZGVyJywgJyR1cmxNYXRjaGVyRmFjdG9yeVByb3ZpZGVyJ107XG5mdW5jdGlvbiAkU3RhdGVQcm92aWRlciggICAkdXJsUm91dGVyUHJvdmlkZXIsICAgJHVybE1hdGNoZXJGYWN0b3J5KSB7XG5cbiAgdmFyIHJvb3QsIHN0YXRlcyA9IHt9LCAkc3RhdGUsIHF1ZXVlID0ge30sIGFic3RyYWN0S2V5ID0gJ2Fic3RyYWN0JztcblxuICAvLyBCdWlsZHMgc3RhdGUgcHJvcGVydGllcyBmcm9tIGRlZmluaXRpb24gcGFzc2VkIHRvIHJlZ2lzdGVyU3RhdGUoKVxuICB2YXIgc3RhdGVCdWlsZGVyID0ge1xuXG4gICAgLy8gRGVyaXZlIHBhcmVudCBzdGF0ZSBmcm9tIGEgaGllcmFyY2hpY2FsIG5hbWUgb25seSBpZiAncGFyZW50JyBpcyBub3QgZXhwbGljaXRseSBkZWZpbmVkLlxuICAgIC8vIHN0YXRlLmNoaWxkcmVuID0gW107XG4gICAgLy8gaWYgKHBhcmVudCkgcGFyZW50LmNoaWxkcmVuLnB1c2goc3RhdGUpO1xuICAgIHBhcmVudDogZnVuY3Rpb24oc3RhdGUpIHtcbiAgICAgIGlmIChpc0RlZmluZWQoc3RhdGUucGFyZW50KSAmJiBzdGF0ZS5wYXJlbnQpIHJldHVybiBmaW5kU3RhdGUoc3RhdGUucGFyZW50KTtcbiAgICAgIC8vIHJlZ2V4IG1hdGNoZXMgYW55IHZhbGlkIGNvbXBvc2l0ZSBzdGF0ZSBuYW1lXG4gICAgICAvLyB3b3VsZCBtYXRjaCBcImNvbnRhY3QubGlzdFwiIGJ1dCBub3QgXCJjb250YWN0c1wiXG4gICAgICB2YXIgY29tcG9zaXRlTmFtZSA9IC9eKC4rKVxcLlteLl0rJC8uZXhlYyhzdGF0ZS5uYW1lKTtcbiAgICAgIHJldHVybiBjb21wb3NpdGVOYW1lID8gZmluZFN0YXRlKGNvbXBvc2l0ZU5hbWVbMV0pIDogcm9vdDtcbiAgICB9LFxuXG4gICAgLy8gaW5oZXJpdCAnZGF0YScgZnJvbSBwYXJlbnQgYW5kIG92ZXJyaWRlIGJ5IG93biB2YWx1ZXMgKGlmIGFueSlcbiAgICBkYXRhOiBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgaWYgKHN0YXRlLnBhcmVudCAmJiBzdGF0ZS5wYXJlbnQuZGF0YSkge1xuICAgICAgICBzdGF0ZS5kYXRhID0gc3RhdGUuc2VsZi5kYXRhID0gZXh0ZW5kKHt9LCBzdGF0ZS5wYXJlbnQuZGF0YSwgc3RhdGUuZGF0YSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RhdGUuZGF0YTtcbiAgICB9LFxuXG4gICAgLy8gQnVpbGQgYSBVUkxNYXRjaGVyIGlmIG5lY2Vzc2FyeSwgZWl0aGVyIHZpYSBhIHJlbGF0aXZlIG9yIGFic29sdXRlIFVSTFxuICAgIHVybDogZnVuY3Rpb24oc3RhdGUpIHtcbiAgICAgIHZhciB1cmwgPSBzdGF0ZS51cmwsIGNvbmZpZyA9IHsgcGFyYW1zOiBzdGF0ZS5wYXJhbXMgfHwge30gfTtcblxuICAgICAgaWYgKGlzU3RyaW5nKHVybCkpIHtcbiAgICAgICAgaWYgKHVybC5jaGFyQXQoMCkgPT0gJ14nKSByZXR1cm4gJHVybE1hdGNoZXJGYWN0b3J5LmNvbXBpbGUodXJsLnN1YnN0cmluZygxKSwgY29uZmlnKTtcbiAgICAgICAgcmV0dXJuIChzdGF0ZS5wYXJlbnQubmF2aWdhYmxlIHx8IHJvb3QpLnVybC5jb25jYXQodXJsLCBjb25maWcpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXVybCB8fCAkdXJsTWF0Y2hlckZhY3RvcnkuaXNNYXRjaGVyKHVybCkpIHJldHVybiB1cmw7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHVybCAnXCIgKyB1cmwgKyBcIicgaW4gc3RhdGUgJ1wiICsgc3RhdGUgKyBcIidcIik7XG4gICAgfSxcblxuICAgIC8vIEtlZXAgdHJhY2sgb2YgdGhlIGNsb3Nlc3QgYW5jZXN0b3Igc3RhdGUgdGhhdCBoYXMgYSBVUkwgKGkuZS4gaXMgbmF2aWdhYmxlKVxuICAgIG5hdmlnYWJsZTogZnVuY3Rpb24oc3RhdGUpIHtcbiAgICAgIHJldHVybiBzdGF0ZS51cmwgPyBzdGF0ZSA6IChzdGF0ZS5wYXJlbnQgPyBzdGF0ZS5wYXJlbnQubmF2aWdhYmxlIDogbnVsbCk7XG4gICAgfSxcblxuICAgIC8vIE93biBwYXJhbWV0ZXJzIGZvciB0aGlzIHN0YXRlLiBzdGF0ZS51cmwucGFyYW1zIGlzIGFscmVhZHkgYnVpbHQgYXQgdGhpcyBwb2ludC4gQ3JlYXRlIGFuZCBhZGQgbm9uLXVybCBwYXJhbXNcbiAgICBvd25QYXJhbXM6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICB2YXIgcGFyYW1zID0gc3RhdGUudXJsICYmIHN0YXRlLnVybC5wYXJhbXMgfHwgbmV3ICQkVU1GUC5QYXJhbVNldCgpO1xuICAgICAgZm9yRWFjaChzdGF0ZS5wYXJhbXMgfHwge30sIGZ1bmN0aW9uKGNvbmZpZywgaWQpIHtcbiAgICAgICAgaWYgKCFwYXJhbXNbaWRdKSBwYXJhbXNbaWRdID0gbmV3ICQkVU1GUC5QYXJhbShpZCwgbnVsbCwgY29uZmlnLCBcImNvbmZpZ1wiKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICB9LFxuXG4gICAgLy8gRGVyaXZlIHBhcmFtZXRlcnMgZm9yIHRoaXMgc3RhdGUgYW5kIGVuc3VyZSB0aGV5J3JlIGEgc3VwZXItc2V0IG9mIHBhcmVudCdzIHBhcmFtZXRlcnNcbiAgICBwYXJhbXM6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICByZXR1cm4gc3RhdGUucGFyZW50ICYmIHN0YXRlLnBhcmVudC5wYXJhbXMgPyBleHRlbmQoc3RhdGUucGFyZW50LnBhcmFtcy4kJG5ldygpLCBzdGF0ZS5vd25QYXJhbXMpIDogbmV3ICQkVU1GUC5QYXJhbVNldCgpO1xuICAgIH0sXG5cbiAgICAvLyBJZiB0aGVyZSBpcyBubyBleHBsaWNpdCBtdWx0aS12aWV3IGNvbmZpZ3VyYXRpb24sIG1ha2Ugb25lIHVwIHNvIHdlIGRvbid0IGhhdmVcbiAgICAvLyB0byBoYW5kbGUgYm90aCBjYXNlcyBpbiB0aGUgdmlldyBkaXJlY3RpdmUgbGF0ZXIuIE5vdGUgdGhhdCBoYXZpbmcgYW4gZXhwbGljaXRcbiAgICAvLyAndmlld3MnIHByb3BlcnR5IHdpbGwgbWVhbiB0aGUgZGVmYXVsdCB1bm5hbWVkIHZpZXcgcHJvcGVydGllcyBhcmUgaWdub3JlZC4gVGhpc1xuICAgIC8vIGlzIGFsc28gYSBnb29kIHRpbWUgdG8gcmVzb2x2ZSB2aWV3IG5hbWVzIHRvIGFic29sdXRlIG5hbWVzLCBzbyBldmVyeXRoaW5nIGlzIGFcbiAgICAvLyBzdHJhaWdodCBsb29rdXAgYXQgbGluayB0aW1lLlxuICAgIHZpZXdzOiBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgdmFyIHZpZXdzID0ge307XG5cbiAgICAgIGZvckVhY2goaXNEZWZpbmVkKHN0YXRlLnZpZXdzKSA/IHN0YXRlLnZpZXdzIDogeyAnJzogc3RhdGUgfSwgZnVuY3Rpb24gKHZpZXcsIG5hbWUpIHtcbiAgICAgICAgaWYgKG5hbWUuaW5kZXhPZignQCcpIDwgMCkgbmFtZSArPSAnQCcgKyBzdGF0ZS5wYXJlbnQubmFtZTtcbiAgICAgICAgdmlld3NbbmFtZV0gPSB2aWV3O1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gdmlld3M7XG4gICAgfSxcblxuICAgIC8vIEtlZXAgYSBmdWxsIHBhdGggZnJvbSB0aGUgcm9vdCBkb3duIHRvIHRoaXMgc3RhdGUgYXMgdGhpcyBpcyBuZWVkZWQgZm9yIHN0YXRlIGFjdGl2YXRpb24uXG4gICAgcGF0aDogZnVuY3Rpb24oc3RhdGUpIHtcbiAgICAgIHJldHVybiBzdGF0ZS5wYXJlbnQgPyBzdGF0ZS5wYXJlbnQucGF0aC5jb25jYXQoc3RhdGUpIDogW107IC8vIGV4Y2x1ZGUgcm9vdCBmcm9tIHBhdGhcbiAgICB9LFxuXG4gICAgLy8gU3BlZWQgdXAgJHN0YXRlLmNvbnRhaW5zKCkgYXMgaXQncyB1c2VkIGEgbG90XG4gICAgaW5jbHVkZXM6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICB2YXIgaW5jbHVkZXMgPSBzdGF0ZS5wYXJlbnQgPyBleHRlbmQoe30sIHN0YXRlLnBhcmVudC5pbmNsdWRlcykgOiB7fTtcbiAgICAgIGluY2x1ZGVzW3N0YXRlLm5hbWVdID0gdHJ1ZTtcbiAgICAgIHJldHVybiBpbmNsdWRlcztcbiAgICB9LFxuXG4gICAgJGRlbGVnYXRlczoge31cbiAgfTtcblxuICBmdW5jdGlvbiBpc1JlbGF0aXZlKHN0YXRlTmFtZSkge1xuICAgIHJldHVybiBzdGF0ZU5hbWUuaW5kZXhPZihcIi5cIikgPT09IDAgfHwgc3RhdGVOYW1lLmluZGV4T2YoXCJeXCIpID09PSAwO1xuICB9XG5cbiAgZnVuY3Rpb24gZmluZFN0YXRlKHN0YXRlT3JOYW1lLCBiYXNlKSB7XG4gICAgaWYgKCFzdGF0ZU9yTmFtZSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIHZhciBpc1N0ciA9IGlzU3RyaW5nKHN0YXRlT3JOYW1lKSxcbiAgICAgICAgbmFtZSAgPSBpc1N0ciA/IHN0YXRlT3JOYW1lIDogc3RhdGVPck5hbWUubmFtZSxcbiAgICAgICAgcGF0aCAgPSBpc1JlbGF0aXZlKG5hbWUpO1xuXG4gICAgaWYgKHBhdGgpIHtcbiAgICAgIGlmICghYmFzZSkgdGhyb3cgbmV3IEVycm9yKFwiTm8gcmVmZXJlbmNlIHBvaW50IGdpdmVuIGZvciBwYXRoICdcIiAgKyBuYW1lICsgXCInXCIpO1xuICAgICAgYmFzZSA9IGZpbmRTdGF0ZShiYXNlKTtcbiAgICAgIFxuICAgICAgdmFyIHJlbCA9IG5hbWUuc3BsaXQoXCIuXCIpLCBpID0gMCwgcGF0aExlbmd0aCA9IHJlbC5sZW5ndGgsIGN1cnJlbnQgPSBiYXNlO1xuXG4gICAgICBmb3IgKDsgaSA8IHBhdGhMZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAocmVsW2ldID09PSBcIlwiICYmIGkgPT09IDApIHtcbiAgICAgICAgICBjdXJyZW50ID0gYmFzZTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVsW2ldID09PSBcIl5cIikge1xuICAgICAgICAgIGlmICghY3VycmVudC5wYXJlbnQpIHRocm93IG5ldyBFcnJvcihcIlBhdGggJ1wiICsgbmFtZSArIFwiJyBub3QgdmFsaWQgZm9yIHN0YXRlICdcIiArIGJhc2UubmFtZSArIFwiJ1wiKTtcbiAgICAgICAgICBjdXJyZW50ID0gY3VycmVudC5wYXJlbnQ7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICByZWwgPSByZWwuc2xpY2UoaSkuam9pbihcIi5cIik7XG4gICAgICBuYW1lID0gY3VycmVudC5uYW1lICsgKGN1cnJlbnQubmFtZSAmJiByZWwgPyBcIi5cIiA6IFwiXCIpICsgcmVsO1xuICAgIH1cbiAgICB2YXIgc3RhdGUgPSBzdGF0ZXNbbmFtZV07XG5cbiAgICBpZiAoc3RhdGUgJiYgKGlzU3RyIHx8ICghaXNTdHIgJiYgKHN0YXRlID09PSBzdGF0ZU9yTmFtZSB8fCBzdGF0ZS5zZWxmID09PSBzdGF0ZU9yTmFtZSkpKSkge1xuICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgZnVuY3Rpb24gcXVldWVTdGF0ZShwYXJlbnROYW1lLCBzdGF0ZSkge1xuICAgIGlmICghcXVldWVbcGFyZW50TmFtZV0pIHtcbiAgICAgIHF1ZXVlW3BhcmVudE5hbWVdID0gW107XG4gICAgfVxuICAgIHF1ZXVlW3BhcmVudE5hbWVdLnB1c2goc3RhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gZmx1c2hRdWV1ZWRDaGlsZHJlbihwYXJlbnROYW1lKSB7XG4gICAgdmFyIHF1ZXVlZCA9IHF1ZXVlW3BhcmVudE5hbWVdIHx8IFtdO1xuICAgIHdoaWxlKHF1ZXVlZC5sZW5ndGgpIHtcbiAgICAgIHJlZ2lzdGVyU3RhdGUocXVldWVkLnNoaWZ0KCkpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyU3RhdGUoc3RhdGUpIHtcbiAgICAvLyBXcmFwIGEgbmV3IG9iamVjdCBhcm91bmQgdGhlIHN0YXRlIHNvIHdlIGNhbiBzdG9yZSBvdXIgcHJpdmF0ZSBkZXRhaWxzIGVhc2lseS5cbiAgICBzdGF0ZSA9IGluaGVyaXQoc3RhdGUsIHtcbiAgICAgIHNlbGY6IHN0YXRlLFxuICAgICAgcmVzb2x2ZTogc3RhdGUucmVzb2x2ZSB8fCB7fSxcbiAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMubmFtZTsgfVxuICAgIH0pO1xuXG4gICAgdmFyIG5hbWUgPSBzdGF0ZS5uYW1lO1xuICAgIGlmICghaXNTdHJpbmcobmFtZSkgfHwgbmFtZS5pbmRleE9mKCdAJykgPj0gMCkgdGhyb3cgbmV3IEVycm9yKFwiU3RhdGUgbXVzdCBoYXZlIGEgdmFsaWQgbmFtZVwiKTtcbiAgICBpZiAoc3RhdGVzLmhhc093blByb3BlcnR5KG5hbWUpKSB0aHJvdyBuZXcgRXJyb3IoXCJTdGF0ZSAnXCIgKyBuYW1lICsgXCInJyBpcyBhbHJlYWR5IGRlZmluZWRcIik7XG5cbiAgICAvLyBHZXQgcGFyZW50IG5hbWVcbiAgICB2YXIgcGFyZW50TmFtZSA9IChuYW1lLmluZGV4T2YoJy4nKSAhPT0gLTEpID8gbmFtZS5zdWJzdHJpbmcoMCwgbmFtZS5sYXN0SW5kZXhPZignLicpKVxuICAgICAgICA6IChpc1N0cmluZyhzdGF0ZS5wYXJlbnQpKSA/IHN0YXRlLnBhcmVudFxuICAgICAgICA6IChpc09iamVjdChzdGF0ZS5wYXJlbnQpICYmIGlzU3RyaW5nKHN0YXRlLnBhcmVudC5uYW1lKSkgPyBzdGF0ZS5wYXJlbnQubmFtZVxuICAgICAgICA6ICcnO1xuXG4gICAgLy8gSWYgcGFyZW50IGlzIG5vdCByZWdpc3RlcmVkIHlldCwgYWRkIHN0YXRlIHRvIHF1ZXVlIGFuZCByZWdpc3RlciBsYXRlclxuICAgIGlmIChwYXJlbnROYW1lICYmICFzdGF0ZXNbcGFyZW50TmFtZV0pIHtcbiAgICAgIHJldHVybiBxdWV1ZVN0YXRlKHBhcmVudE5hbWUsIHN0YXRlLnNlbGYpO1xuICAgIH1cblxuICAgIGZvciAodmFyIGtleSBpbiBzdGF0ZUJ1aWxkZXIpIHtcbiAgICAgIGlmIChpc0Z1bmN0aW9uKHN0YXRlQnVpbGRlcltrZXldKSkgc3RhdGVba2V5XSA9IHN0YXRlQnVpbGRlcltrZXldKHN0YXRlLCBzdGF0ZUJ1aWxkZXIuJGRlbGVnYXRlc1trZXldKTtcbiAgICB9XG4gICAgc3RhdGVzW25hbWVdID0gc3RhdGU7XG5cbiAgICAvLyBSZWdpc3RlciB0aGUgc3RhdGUgaW4gdGhlIGdsb2JhbCBzdGF0ZSBsaXN0IGFuZCB3aXRoICR1cmxSb3V0ZXIgaWYgbmVjZXNzYXJ5LlxuICAgIGlmICghc3RhdGVbYWJzdHJhY3RLZXldICYmIHN0YXRlLnVybCkge1xuICAgICAgJHVybFJvdXRlclByb3ZpZGVyLndoZW4oc3RhdGUudXJsLCBbJyRtYXRjaCcsICckc3RhdGVQYXJhbXMnLCBmdW5jdGlvbiAoJG1hdGNoLCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgaWYgKCRzdGF0ZS4kY3VycmVudC5uYXZpZ2FibGUgIT0gc3RhdGUgfHwgIWVxdWFsRm9yS2V5cygkbWF0Y2gsICRzdGF0ZVBhcmFtcykpIHtcbiAgICAgICAgICAkc3RhdGUudHJhbnNpdGlvblRvKHN0YXRlLCAkbWF0Y2gsIHsgaW5oZXJpdDogdHJ1ZSwgbG9jYXRpb246IGZhbHNlIH0pO1xuICAgICAgICB9XG4gICAgICB9XSk7XG4gICAgfVxuXG4gICAgLy8gUmVnaXN0ZXIgYW55IHF1ZXVlZCBjaGlsZHJlblxuICAgIGZsdXNoUXVldWVkQ2hpbGRyZW4obmFtZSk7XG5cbiAgICByZXR1cm4gc3RhdGU7XG4gIH1cblxuICAvLyBDaGVja3MgdGV4dCB0byBzZWUgaWYgaXQgbG9va3MgbGlrZSBhIGdsb2IuXG4gIGZ1bmN0aW9uIGlzR2xvYiAodGV4dCkge1xuICAgIHJldHVybiB0ZXh0LmluZGV4T2YoJyonKSA+IC0xO1xuICB9XG5cbiAgLy8gUmV0dXJucyB0cnVlIGlmIGdsb2IgbWF0Y2hlcyBjdXJyZW50ICRzdGF0ZSBuYW1lLlxuICBmdW5jdGlvbiBkb2VzU3RhdGVNYXRjaEdsb2IgKGdsb2IpIHtcbiAgICB2YXIgZ2xvYlNlZ21lbnRzID0gZ2xvYi5zcGxpdCgnLicpLFxuICAgICAgICBzZWdtZW50cyA9ICRzdGF0ZS4kY3VycmVudC5uYW1lLnNwbGl0KCcuJyk7XG5cbiAgICAvL21hdGNoIGdyZWVkeSBzdGFydHNcbiAgICBpZiAoZ2xvYlNlZ21lbnRzWzBdID09PSAnKionKSB7XG4gICAgICAgc2VnbWVudHMgPSBzZWdtZW50cy5zbGljZShpbmRleE9mKHNlZ21lbnRzLCBnbG9iU2VnbWVudHNbMV0pKTtcbiAgICAgICBzZWdtZW50cy51bnNoaWZ0KCcqKicpO1xuICAgIH1cbiAgICAvL21hdGNoIGdyZWVkeSBlbmRzXG4gICAgaWYgKGdsb2JTZWdtZW50c1tnbG9iU2VnbWVudHMubGVuZ3RoIC0gMV0gPT09ICcqKicpIHtcbiAgICAgICBzZWdtZW50cy5zcGxpY2UoaW5kZXhPZihzZWdtZW50cywgZ2xvYlNlZ21lbnRzW2dsb2JTZWdtZW50cy5sZW5ndGggLSAyXSkgKyAxLCBOdW1iZXIuTUFYX1ZBTFVFKTtcbiAgICAgICBzZWdtZW50cy5wdXNoKCcqKicpO1xuICAgIH1cblxuICAgIGlmIChnbG9iU2VnbWVudHMubGVuZ3RoICE9IHNlZ21lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vbWF0Y2ggc2luZ2xlIHN0YXJzXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBnbG9iU2VnbWVudHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBpZiAoZ2xvYlNlZ21lbnRzW2ldID09PSAnKicpIHtcbiAgICAgICAgc2VnbWVudHNbaV0gPSAnKic7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlZ21lbnRzLmpvaW4oJycpID09PSBnbG9iU2VnbWVudHMuam9pbignJyk7XG4gIH1cblxuXG4gIC8vIEltcGxpY2l0IHJvb3Qgc3RhdGUgdGhhdCBpcyBhbHdheXMgYWN0aXZlXG4gIHJvb3QgPSByZWdpc3RlclN0YXRlKHtcbiAgICBuYW1lOiAnJyxcbiAgICB1cmw6ICdeJyxcbiAgICB2aWV3czogbnVsbCxcbiAgICAnYWJzdHJhY3QnOiB0cnVlXG4gIH0pO1xuICByb290Lm5hdmlnYWJsZSA9IG51bGw7XG5cblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVQcm92aWRlciNkZWNvcmF0b3JcbiAgICogQG1ldGhvZE9mIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogQWxsb3dzIHlvdSB0byBleHRlbmQgKGNhcmVmdWxseSkgb3Igb3ZlcnJpZGUgKGF0IHlvdXIgb3duIHBlcmlsKSB0aGUgXG4gICAqIGBzdGF0ZUJ1aWxkZXJgIG9iamVjdCB1c2VkIGludGVybmFsbHkgYnkgYCRzdGF0ZVByb3ZpZGVyYC4gVGhpcyBjYW4gYmUgdXNlZCBcbiAgICogdG8gYWRkIGN1c3RvbSBmdW5jdGlvbmFsaXR5IHRvIHVpLXJvdXRlciwgZm9yIGV4YW1wbGUgaW5mZXJyaW5nIHRlbXBsYXRlVXJsIFxuICAgKiBiYXNlZCBvbiB0aGUgc3RhdGUgbmFtZS5cbiAgICpcbiAgICogV2hlbiBwYXNzaW5nIG9ubHkgYSBuYW1lLCBpdCByZXR1cm5zIHRoZSBjdXJyZW50IChvcmlnaW5hbCBvciBkZWNvcmF0ZWQpIGJ1aWxkZXJcbiAgICogZnVuY3Rpb24gdGhhdCBtYXRjaGVzIGBuYW1lYC5cbiAgICpcbiAgICogVGhlIGJ1aWxkZXIgZnVuY3Rpb25zIHRoYXQgY2FuIGJlIGRlY29yYXRlZCBhcmUgbGlzdGVkIGJlbG93LiBUaG91Z2ggbm90IGFsbFxuICAgKiBuZWNlc3NhcmlseSBoYXZlIGEgZ29vZCB1c2UgY2FzZSBmb3IgZGVjb3JhdGlvbiwgdGhhdCBpcyB1cCB0byB5b3UgdG8gZGVjaWRlLlxuICAgKlxuICAgKiBJbiBhZGRpdGlvbiwgdXNlcnMgY2FuIGF0dGFjaCBjdXN0b20gZGVjb3JhdG9ycywgd2hpY2ggd2lsbCBnZW5lcmF0ZSBuZXcgXG4gICAqIHByb3BlcnRpZXMgd2l0aGluIHRoZSBzdGF0ZSdzIGludGVybmFsIGRlZmluaXRpb24uIFRoZXJlIGlzIGN1cnJlbnRseSBubyBjbGVhciBcbiAgICogdXNlLWNhc2UgZm9yIHRoaXMgYmV5b25kIGFjY2Vzc2luZyBpbnRlcm5hbCBzdGF0ZXMgKGkuZS4gJHN0YXRlLiRjdXJyZW50KSwgXG4gICAqIGhvd2V2ZXIsIGV4cGVjdCB0aGlzIHRvIGJlY29tZSBpbmNyZWFzaW5nbHkgcmVsZXZhbnQgYXMgd2UgaW50cm9kdWNlIGFkZGl0aW9uYWwgXG4gICAqIG1ldGEtcHJvZ3JhbW1pbmcgZmVhdHVyZXMuXG4gICAqXG4gICAqICoqV2FybmluZyoqOiBEZWNvcmF0b3JzIHNob3VsZCBub3QgYmUgaW50ZXJkZXBlbmRlbnQgYmVjYXVzZSB0aGUgb3JkZXIgb2YgXG4gICAqIGV4ZWN1dGlvbiBvZiB0aGUgYnVpbGRlciBmdW5jdGlvbnMgaW4gbm9uLWRldGVybWluaXN0aWMuIEJ1aWxkZXIgZnVuY3Rpb25zIFxuICAgKiBzaG91bGQgb25seSBiZSBkZXBlbmRlbnQgb24gdGhlIHN0YXRlIGRlZmluaXRpb24gb2JqZWN0IGFuZCBzdXBlciBmdW5jdGlvbi5cbiAgICpcbiAgICpcbiAgICogRXhpc3RpbmcgYnVpbGRlciBmdW5jdGlvbnMgYW5kIGN1cnJlbnQgcmV0dXJuIHZhbHVlczpcbiAgICpcbiAgICogLSAqKnBhcmVudCoqIGB7b2JqZWN0fWAgLSByZXR1cm5zIHRoZSBwYXJlbnQgc3RhdGUgb2JqZWN0LlxuICAgKiAtICoqZGF0YSoqIGB7b2JqZWN0fWAgLSByZXR1cm5zIHN0YXRlIGRhdGEsIGluY2x1ZGluZyBhbnkgaW5oZXJpdGVkIGRhdGEgdGhhdCBpcyBub3RcbiAgICogICBvdmVycmlkZGVuIGJ5IG93biB2YWx1ZXMgKGlmIGFueSkuXG4gICAqIC0gKip1cmwqKiBge29iamVjdH1gIC0gcmV0dXJucyBhIHtAbGluayB1aS5yb3V0ZXIudXRpbC50eXBlOlVybE1hdGNoZXIgVXJsTWF0Y2hlcn1cbiAgICogICBvciBgbnVsbGAuXG4gICAqIC0gKipuYXZpZ2FibGUqKiBge29iamVjdH1gIC0gcmV0dXJucyBjbG9zZXN0IGFuY2VzdG9yIHN0YXRlIHRoYXQgaGFzIGEgVVJMIChha2EgaXMgXG4gICAqICAgbmF2aWdhYmxlKS5cbiAgICogLSAqKnBhcmFtcyoqIGB7b2JqZWN0fWAgLSByZXR1cm5zIGFuIGFycmF5IG9mIHN0YXRlIHBhcmFtcyB0aGF0IGFyZSBlbnN1cmVkIHRvIFxuICAgKiAgIGJlIGEgc3VwZXItc2V0IG9mIHBhcmVudCdzIHBhcmFtcy5cbiAgICogLSAqKnZpZXdzKiogYHtvYmplY3R9YCAtIHJldHVybnMgYSB2aWV3cyBvYmplY3Qgd2hlcmUgZWFjaCBrZXkgaXMgYW4gYWJzb2x1dGUgdmlldyBcbiAgICogICBuYW1lIChpLmUuIFwidmlld05hbWVAc3RhdGVOYW1lXCIpIGFuZCBlYWNoIHZhbHVlIGlzIHRoZSBjb25maWcgb2JqZWN0IFxuICAgKiAgICh0ZW1wbGF0ZSwgY29udHJvbGxlcikgZm9yIHRoZSB2aWV3LiBFdmVuIHdoZW4geW91IGRvbid0IHVzZSB0aGUgdmlld3Mgb2JqZWN0IFxuICAgKiAgIGV4cGxpY2l0bHkgb24gYSBzdGF0ZSBjb25maWcsIG9uZSBpcyBzdGlsbCBjcmVhdGVkIGZvciB5b3UgaW50ZXJuYWxseS5cbiAgICogICBTbyBieSBkZWNvcmF0aW5nIHRoaXMgYnVpbGRlciBmdW5jdGlvbiB5b3UgaGF2ZSBhY2Nlc3MgdG8gZGVjb3JhdGluZyB0ZW1wbGF0ZSBcbiAgICogICBhbmQgY29udHJvbGxlciBwcm9wZXJ0aWVzLlxuICAgKiAtICoqb3duUGFyYW1zKiogYHtvYmplY3R9YCAtIHJldHVybnMgYW4gYXJyYXkgb2YgcGFyYW1zIHRoYXQgYmVsb25nIHRvIHRoZSBzdGF0ZSwgXG4gICAqICAgbm90IGluY2x1ZGluZyBhbnkgcGFyYW1zIGRlZmluZWQgYnkgYW5jZXN0b3Igc3RhdGVzLlxuICAgKiAtICoqcGF0aCoqIGB7c3RyaW5nfWAgLSByZXR1cm5zIHRoZSBmdWxsIHBhdGggZnJvbSB0aGUgcm9vdCBkb3duIHRvIHRoaXMgc3RhdGUuIFxuICAgKiAgIE5lZWRlZCBmb3Igc3RhdGUgYWN0aXZhdGlvbi5cbiAgICogLSAqKmluY2x1ZGVzKiogYHtvYmplY3R9YCAtIHJldHVybnMgYW4gb2JqZWN0IHRoYXQgaW5jbHVkZXMgZXZlcnkgc3RhdGUgdGhhdCBcbiAgICogICB3b3VsZCBwYXNzIGEgYCRzdGF0ZS5pbmNsdWRlcygpYCB0ZXN0LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiA8cHJlPlxuICAgKiAvLyBPdmVycmlkZSB0aGUgaW50ZXJuYWwgJ3ZpZXdzJyBidWlsZGVyIHdpdGggYSBmdW5jdGlvbiB0aGF0IHRha2VzIHRoZSBzdGF0ZVxuICAgKiAvLyBkZWZpbml0aW9uLCBhbmQgYSByZWZlcmVuY2UgdG8gdGhlIGludGVybmFsIGZ1bmN0aW9uIGJlaW5nIG92ZXJyaWRkZW46XG4gICAqICRzdGF0ZVByb3ZpZGVyLmRlY29yYXRvcigndmlld3MnLCBmdW5jdGlvbiAoc3RhdGUsIHBhcmVudCkge1xuICAgKiAgIHZhciByZXN1bHQgPSB7fSxcbiAgICogICAgICAgdmlld3MgPSBwYXJlbnQoc3RhdGUpO1xuICAgKlxuICAgKiAgIGFuZ3VsYXIuZm9yRWFjaCh2aWV3cywgZnVuY3Rpb24gKGNvbmZpZywgbmFtZSkge1xuICAgKiAgICAgdmFyIGF1dG9OYW1lID0gKHN0YXRlLm5hbWUgKyAnLicgKyBuYW1lKS5yZXBsYWNlKCcuJywgJy8nKTtcbiAgICogICAgIGNvbmZpZy50ZW1wbGF0ZVVybCA9IGNvbmZpZy50ZW1wbGF0ZVVybCB8fCAnL3BhcnRpYWxzLycgKyBhdXRvTmFtZSArICcuaHRtbCc7XG4gICAqICAgICByZXN1bHRbbmFtZV0gPSBjb25maWc7XG4gICAqICAgfSk7XG4gICAqICAgcmV0dXJuIHJlc3VsdDtcbiAgICogfSk7XG4gICAqXG4gICAqICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdob21lJywge1xuICAgKiAgIHZpZXdzOiB7XG4gICAqICAgICAnY29udGFjdC5saXN0JzogeyBjb250cm9sbGVyOiAnTGlzdENvbnRyb2xsZXInIH0sXG4gICAqICAgICAnY29udGFjdC5pdGVtJzogeyBjb250cm9sbGVyOiAnSXRlbUNvbnRyb2xsZXInIH1cbiAgICogICB9XG4gICAqIH0pO1xuICAgKlxuICAgKiAvLyAuLi5cbiAgICpcbiAgICogJHN0YXRlLmdvKCdob21lJyk7XG4gICAqIC8vIEF1dG8tcG9wdWxhdGVzIGxpc3QgYW5kIGl0ZW0gdmlld3Mgd2l0aCAvcGFydGlhbHMvaG9tZS9jb250YWN0L2xpc3QuaHRtbCxcbiAgICogLy8gYW5kIC9wYXJ0aWFscy9ob21lL2NvbnRhY3QvaXRlbS5odG1sLCByZXNwZWN0aXZlbHkuXG4gICAqIDwvcHJlPlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgYnVpbGRlciBmdW5jdGlvbiB0byBkZWNvcmF0ZS4gXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBmdW5jIEEgZnVuY3Rpb24gdGhhdCBpcyByZXNwb25zaWJsZSBmb3IgZGVjb3JhdGluZyB0aGUgb3JpZ2luYWwgXG4gICAqIGJ1aWxkZXIgZnVuY3Rpb24uIFRoZSBmdW5jdGlvbiByZWNlaXZlcyB0d28gcGFyYW1ldGVyczpcbiAgICpcbiAgICogICAtIGB7b2JqZWN0fWAgLSBzdGF0ZSAtIFRoZSBzdGF0ZSBjb25maWcgb2JqZWN0LlxuICAgKiAgIC0gYHtvYmplY3R9YCAtIHN1cGVyIC0gVGhlIG9yaWdpbmFsIGJ1aWxkZXIgZnVuY3Rpb24uXG4gICAqXG4gICAqIEByZXR1cm4ge29iamVjdH0gJHN0YXRlUHJvdmlkZXIgLSAkc3RhdGVQcm92aWRlciBpbnN0YW5jZVxuICAgKi9cbiAgdGhpcy5kZWNvcmF0b3IgPSBkZWNvcmF0b3I7XG4gIGZ1bmN0aW9uIGRlY29yYXRvcihuYW1lLCBmdW5jKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgaWYgKGlzU3RyaW5nKG5hbWUpICYmICFpc0RlZmluZWQoZnVuYykpIHtcbiAgICAgIHJldHVybiBzdGF0ZUJ1aWxkZXJbbmFtZV07XG4gICAgfVxuICAgIGlmICghaXNGdW5jdGlvbihmdW5jKSB8fCAhaXNTdHJpbmcobmFtZSkpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBpZiAoc3RhdGVCdWlsZGVyW25hbWVdICYmICFzdGF0ZUJ1aWxkZXIuJGRlbGVnYXRlc1tuYW1lXSkge1xuICAgICAgc3RhdGVCdWlsZGVyLiRkZWxlZ2F0ZXNbbmFtZV0gPSBzdGF0ZUJ1aWxkZXJbbmFtZV07XG4gICAgfVxuICAgIHN0YXRlQnVpbGRlcltuYW1lXSA9IGZ1bmM7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVQcm92aWRlciNzdGF0ZVxuICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVByb3ZpZGVyXG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBSZWdpc3RlcnMgYSBzdGF0ZSBjb25maWd1cmF0aW9uIHVuZGVyIGEgZ2l2ZW4gc3RhdGUgbmFtZS4gVGhlIHN0YXRlQ29uZmlnIG9iamVjdFxuICAgKiBoYXMgdGhlIGZvbGxvd2luZyBhY2NlcHRhYmxlIHByb3BlcnRpZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIEEgdW5pcXVlIHN0YXRlIG5hbWUsIGUuZy4gXCJob21lXCIsIFwiYWJvdXRcIiwgXCJjb250YWN0c1wiLlxuICAgKiBUbyBjcmVhdGUgYSBwYXJlbnQvY2hpbGQgc3RhdGUgdXNlIGEgZG90LCBlLmcuIFwiYWJvdXQuc2FsZXNcIiwgXCJob21lLm5ld2VzdFwiLlxuICAgKiBAcGFyYW0ge29iamVjdH0gc3RhdGVDb25maWcgU3RhdGUgY29uZmlndXJhdGlvbiBvYmplY3QuXG4gICAqIEBwYXJhbSB7c3RyaW5nfGZ1bmN0aW9uPX0gc3RhdGVDb25maWcudGVtcGxhdGVcbiAgICogPGEgaWQ9J3RlbXBsYXRlJz48L2E+XG4gICAqICAgaHRtbCB0ZW1wbGF0ZSBhcyBhIHN0cmluZyBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJuc1xuICAgKiAgIGFuIGh0bWwgdGVtcGxhdGUgYXMgYSBzdHJpbmcgd2hpY2ggc2hvdWxkIGJlIHVzZWQgYnkgdGhlIHVpVmlldyBkaXJlY3RpdmVzLiBUaGlzIHByb3BlcnR5IFxuICAgKiAgIHRha2VzIHByZWNlZGVuY2Ugb3ZlciB0ZW1wbGF0ZVVybC5cbiAgICogICBcbiAgICogICBJZiBgdGVtcGxhdGVgIGlzIGEgZnVuY3Rpb24sIGl0IHdpbGwgYmUgY2FsbGVkIHdpdGggdGhlIGZvbGxvd2luZyBwYXJhbWV0ZXJzOlxuICAgKlxuICAgKiAgIC0ge2FycmF5LiZsdDtvYmplY3QmZ3Q7fSAtIHN0YXRlIHBhcmFtZXRlcnMgZXh0cmFjdGVkIGZyb20gdGhlIGN1cnJlbnQgJGxvY2F0aW9uLnBhdGgoKSBieVxuICAgKiAgICAgYXBwbHlpbmcgdGhlIGN1cnJlbnQgc3RhdGVcbiAgICpcbiAgICogPHByZT50ZW1wbGF0ZTpcbiAgICogICBcIjxoMT5pbmxpbmUgdGVtcGxhdGUgZGVmaW5pdGlvbjwvaDE+XCIgK1xuICAgKiAgIFwiPGRpdiB1aS12aWV3PjwvZGl2PlwiPC9wcmU+XG4gICAqIDxwcmU+dGVtcGxhdGU6IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgKiAgICAgICByZXR1cm4gXCI8aDE+Z2VuZXJhdGVkIHRlbXBsYXRlPC9oMT5cIjsgfTwvcHJlPlxuICAgKiA8L2Rpdj5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd8ZnVuY3Rpb249fSBzdGF0ZUNvbmZpZy50ZW1wbGF0ZVVybFxuICAgKiA8YSBpZD0ndGVtcGxhdGVVcmwnPjwvYT5cbiAgICpcbiAgICogICBwYXRoIG9yIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHBhdGggdG8gYW4gaHRtbFxuICAgKiAgIHRlbXBsYXRlIHRoYXQgc2hvdWxkIGJlIHVzZWQgYnkgdWlWaWV3LlxuICAgKiAgIFxuICAgKiAgIElmIGB0ZW1wbGF0ZVVybGAgaXMgYSBmdW5jdGlvbiwgaXQgd2lsbCBiZSBjYWxsZWQgd2l0aCB0aGUgZm9sbG93aW5nIHBhcmFtZXRlcnM6XG4gICAqXG4gICAqICAgLSB7YXJyYXkuJmx0O29iamVjdCZndDt9IC0gc3RhdGUgcGFyYW1ldGVycyBleHRyYWN0ZWQgZnJvbSB0aGUgY3VycmVudCAkbG9jYXRpb24ucGF0aCgpIGJ5IFxuICAgKiAgICAgYXBwbHlpbmcgdGhlIGN1cnJlbnQgc3RhdGVcbiAgICpcbiAgICogPHByZT50ZW1wbGF0ZVVybDogXCJob21lLmh0bWxcIjwvcHJlPlxuICAgKiA8cHJlPnRlbXBsYXRlVXJsOiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICogICAgIHJldHVybiBteVRlbXBsYXRlc1twYXJhbXMucGFnZUlkXTsgfTwvcHJlPlxuICAgKlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9uPX0gc3RhdGVDb25maWcudGVtcGxhdGVQcm92aWRlclxuICAgKiA8YSBpZD0ndGVtcGxhdGVQcm92aWRlcic+PC9hPlxuICAgKiAgICBQcm92aWRlciBmdW5jdGlvbiB0aGF0IHJldHVybnMgSFRNTCBjb250ZW50IHN0cmluZy5cbiAgICogPHByZT4gdGVtcGxhdGVQcm92aWRlcjpcbiAgICogICAgICAgZnVuY3Rpb24oTXlUZW1wbGF0ZVNlcnZpY2UsIHBhcmFtcykge1xuICAgKiAgICAgICAgIHJldHVybiBNeVRlbXBsYXRlU2VydmljZS5nZXRUZW1wbGF0ZShwYXJhbXMucGFnZUlkKTtcbiAgICogICAgICAgfTwvcHJlPlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ3xmdW5jdGlvbj19IHN0YXRlQ29uZmlnLmNvbnRyb2xsZXJcbiAgICogPGEgaWQ9J2NvbnRyb2xsZXInPjwvYT5cbiAgICpcbiAgICogIENvbnRyb2xsZXIgZm4gdGhhdCBzaG91bGQgYmUgYXNzb2NpYXRlZCB3aXRoIG5ld2x5XG4gICAqICAgcmVsYXRlZCBzY29wZSBvciB0aGUgbmFtZSBvZiBhIHJlZ2lzdGVyZWQgY29udHJvbGxlciBpZiBwYXNzZWQgYXMgYSBzdHJpbmcuXG4gICAqICAgT3B0aW9uYWxseSwgdGhlIENvbnRyb2xsZXJBcyBtYXkgYmUgZGVjbGFyZWQgaGVyZS5cbiAgICogPHByZT5jb250cm9sbGVyOiBcIk15UmVnaXN0ZXJlZENvbnRyb2xsZXJcIjwvcHJlPlxuICAgKiA8cHJlPmNvbnRyb2xsZXI6XG4gICAqICAgICBcIk15UmVnaXN0ZXJlZENvbnRyb2xsZXIgYXMgZm9vQ3RybFwifTwvcHJlPlxuICAgKiA8cHJlPmNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgTXlTZXJ2aWNlKSB7XG4gICAqICAgICAkc2NvcGUuZGF0YSA9IE15U2VydmljZS5nZXREYXRhKCk7IH08L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbj19IHN0YXRlQ29uZmlnLmNvbnRyb2xsZXJQcm92aWRlclxuICAgKiA8YSBpZD0nY29udHJvbGxlclByb3ZpZGVyJz48L2E+XG4gICAqXG4gICAqIEluamVjdGFibGUgcHJvdmlkZXIgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBhY3R1YWwgY29udHJvbGxlciBvciBzdHJpbmcuXG4gICAqIDxwcmU+Y29udHJvbGxlclByb3ZpZGVyOlxuICAgKiAgIGZ1bmN0aW9uKE15UmVzb2x2ZURhdGEpIHtcbiAgICogICAgIGlmIChNeVJlc29sdmVEYXRhLmZvbylcbiAgICogICAgICAgcmV0dXJuIFwiRm9vQ3RybFwiXG4gICAqICAgICBlbHNlIGlmIChNeVJlc29sdmVEYXRhLmJhcilcbiAgICogICAgICAgcmV0dXJuIFwiQmFyQ3RybFwiO1xuICAgKiAgICAgZWxzZSByZXR1cm4gZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAqICAgICAgICRzY29wZS5iYXogPSBcIlF1eFwiO1xuICAgKiAgICAgfVxuICAgKiAgIH08L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmc9fSBzdGF0ZUNvbmZpZy5jb250cm9sbGVyQXNcbiAgICogPGEgaWQ9J2NvbnRyb2xsZXJBcyc+PC9hPlxuICAgKiBcbiAgICogQSBjb250cm9sbGVyIGFsaWFzIG5hbWUuIElmIHByZXNlbnQgdGhlIGNvbnRyb2xsZXIgd2lsbCBiZVxuICAgKiAgIHB1Ymxpc2hlZCB0byBzY29wZSB1bmRlciB0aGUgY29udHJvbGxlckFzIG5hbWUuXG4gICAqIDxwcmU+Y29udHJvbGxlckFzOiBcIm15Q3RybFwiPC9wcmU+XG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0PX0gc3RhdGVDb25maWcucmVzb2x2ZVxuICAgKiA8YSBpZD0ncmVzb2x2ZSc+PC9hPlxuICAgKlxuICAgKiBBbiBvcHRpb25hbCBtYXAmbHQ7c3RyaW5nLCBmdW5jdGlvbiZndDsgb2YgZGVwZW5kZW5jaWVzIHdoaWNoXG4gICAqICAgc2hvdWxkIGJlIGluamVjdGVkIGludG8gdGhlIGNvbnRyb2xsZXIuIElmIGFueSBvZiB0aGVzZSBkZXBlbmRlbmNpZXMgYXJlIHByb21pc2VzLCBcbiAgICogICB0aGUgcm91dGVyIHdpbGwgd2FpdCBmb3IgdGhlbSBhbGwgdG8gYmUgcmVzb2x2ZWQgYmVmb3JlIHRoZSBjb250cm9sbGVyIGlzIGluc3RhbnRpYXRlZC5cbiAgICogICBJZiBhbGwgdGhlIHByb21pc2VzIGFyZSByZXNvbHZlZCBzdWNjZXNzZnVsbHksIHRoZSAkc3RhdGVDaGFuZ2VTdWNjZXNzIGV2ZW50IGlzIGZpcmVkXG4gICAqICAgYW5kIHRoZSB2YWx1ZXMgb2YgdGhlIHJlc29sdmVkIHByb21pc2VzIGFyZSBpbmplY3RlZCBpbnRvIGFueSBjb250cm9sbGVycyB0aGF0IHJlZmVyZW5jZSB0aGVtLlxuICAgKiAgIElmIGFueSAgb2YgdGhlIHByb21pc2VzIGFyZSByZWplY3RlZCB0aGUgJHN0YXRlQ2hhbmdlRXJyb3IgZXZlbnQgaXMgZmlyZWQuXG4gICAqXG4gICAqICAgVGhlIG1hcCBvYmplY3QgaXM6XG4gICAqICAgXG4gICAqICAgLSBrZXkgLSB7c3RyaW5nfTogbmFtZSBvZiBkZXBlbmRlbmN5IHRvIGJlIGluamVjdGVkIGludG8gY29udHJvbGxlclxuICAgKiAgIC0gZmFjdG9yeSAtIHtzdHJpbmd8ZnVuY3Rpb259OiBJZiBzdHJpbmcgdGhlbiBpdCBpcyBhbGlhcyBmb3Igc2VydmljZS4gT3RoZXJ3aXNlIGlmIGZ1bmN0aW9uLCBcbiAgICogICAgIGl0IGlzIGluamVjdGVkIGFuZCByZXR1cm4gdmFsdWUgaXQgdHJlYXRlZCBhcyBkZXBlbmRlbmN5LiBJZiByZXN1bHQgaXMgYSBwcm9taXNlLCBpdCBpcyBcbiAgICogICAgIHJlc29sdmVkIGJlZm9yZSBpdHMgdmFsdWUgaXMgaW5qZWN0ZWQgaW50byBjb250cm9sbGVyLlxuICAgKlxuICAgKiA8cHJlPnJlc29sdmU6IHtcbiAgICogICAgIG15UmVzb2x2ZTE6XG4gICAqICAgICAgIGZ1bmN0aW9uKCRodHRwLCAkc3RhdGVQYXJhbXMpIHtcbiAgICogICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KFwiL2FwaS9mb29zL1wiK3N0YXRlUGFyYW1zLmZvb0lEKTtcbiAgICogICAgICAgfVxuICAgKiAgICAgfTwvcHJlPlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZz19IHN0YXRlQ29uZmlnLnVybFxuICAgKiA8YSBpZD0ndXJsJz48L2E+XG4gICAqXG4gICAqICAgQSB1cmwgZnJhZ21lbnQgd2l0aCBvcHRpb25hbCBwYXJhbWV0ZXJzLiBXaGVuIGEgc3RhdGUgaXMgbmF2aWdhdGVkIG9yXG4gICAqICAgdHJhbnNpdGlvbmVkIHRvLCB0aGUgYCRzdGF0ZVBhcmFtc2Agc2VydmljZSB3aWxsIGJlIHBvcHVsYXRlZCB3aXRoIGFueSBcbiAgICogICBwYXJhbWV0ZXJzIHRoYXQgd2VyZSBwYXNzZWQuXG4gICAqXG4gICAqIGV4YW1wbGVzOlxuICAgKiA8cHJlPnVybDogXCIvaG9tZVwiXG4gICAqIHVybDogXCIvdXNlcnMvOnVzZXJpZFwiXG4gICAqIHVybDogXCIvYm9va3Mve2Jvb2tpZDpbYS16QS1aXy1dfVwiXG4gICAqIHVybDogXCIvYm9va3Mve2NhdGVnb3J5aWQ6aW50fVwiXG4gICAqIHVybDogXCIvYm9va3Mve3B1Ymxpc2hlcm5hbWU6c3RyaW5nfS97Y2F0ZWdvcnlpZDppbnR9XCJcbiAgICogdXJsOiBcIi9tZXNzYWdlcz9iZWZvcmUmYWZ0ZXJcIlxuICAgKiB1cmw6IFwiL21lc3NhZ2VzP3tiZWZvcmU6ZGF0ZX0me2FmdGVyOmRhdGV9XCI8L3ByZT5cbiAgICogdXJsOiBcIi9tZXNzYWdlcy86bWFpbGJveGlkP3tiZWZvcmU6ZGF0ZX0me2FmdGVyOmRhdGV9XCJcbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3Q9fSBzdGF0ZUNvbmZpZy52aWV3c1xuICAgKiA8YSBpZD0ndmlld3MnPjwvYT5cbiAgICogYW4gb3B0aW9uYWwgbWFwJmx0O3N0cmluZywgb2JqZWN0Jmd0OyB3aGljaCBkZWZpbmVkIG11bHRpcGxlIHZpZXdzLCBvciB0YXJnZXRzIHZpZXdzXG4gICAqIG1hbnVhbGx5L2V4cGxpY2l0bHkuXG4gICAqXG4gICAqIEV4YW1wbGVzOlxuICAgKlxuICAgKiBUYXJnZXRzIHRocmVlIG5hbWVkIGB1aS12aWV3YHMgaW4gdGhlIHBhcmVudCBzdGF0ZSdzIHRlbXBsYXRlXG4gICAqIDxwcmU+dmlld3M6IHtcbiAgICogICAgIGhlYWRlcjoge1xuICAgKiAgICAgICBjb250cm9sbGVyOiBcImhlYWRlckN0cmxcIixcbiAgICogICAgICAgdGVtcGxhdGVVcmw6IFwiaGVhZGVyLmh0bWxcIlxuICAgKiAgICAgfSwgYm9keToge1xuICAgKiAgICAgICBjb250cm9sbGVyOiBcImJvZHlDdHJsXCIsXG4gICAqICAgICAgIHRlbXBsYXRlVXJsOiBcImJvZHkuaHRtbFwiXG4gICAqICAgICB9LCBmb290ZXI6IHtcbiAgICogICAgICAgY29udHJvbGxlcjogXCJmb290Q3RybFwiLFxuICAgKiAgICAgICB0ZW1wbGF0ZVVybDogXCJmb290ZXIuaHRtbFwiXG4gICAqICAgICB9XG4gICAqICAgfTwvcHJlPlxuICAgKlxuICAgKiBUYXJnZXRzIG5hbWVkIGB1aS12aWV3PVwiaGVhZGVyXCJgIGZyb20gZ3JhbmRwYXJlbnQgc3RhdGUgJ3RvcCcncyB0ZW1wbGF0ZSwgYW5kIG5hbWVkIGB1aS12aWV3PVwiYm9keVwiIGZyb20gcGFyZW50IHN0YXRlJ3MgdGVtcGxhdGUuXG4gICAqIDxwcmU+dmlld3M6IHtcbiAgICogICAgICdoZWFkZXJAdG9wJzoge1xuICAgKiAgICAgICBjb250cm9sbGVyOiBcIm1zZ0hlYWRlckN0cmxcIixcbiAgICogICAgICAgdGVtcGxhdGVVcmw6IFwibXNnSGVhZGVyLmh0bWxcIlxuICAgKiAgICAgfSwgJ2JvZHknOiB7XG4gICAqICAgICAgIGNvbnRyb2xsZXI6IFwibWVzc2FnZXNDdHJsXCIsXG4gICAqICAgICAgIHRlbXBsYXRlVXJsOiBcIm1lc3NhZ2VzLmh0bWxcIlxuICAgKiAgICAgfVxuICAgKiAgIH08L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFuPX0gW3N0YXRlQ29uZmlnLmFic3RyYWN0PWZhbHNlXVxuICAgKiA8YSBpZD0nYWJzdHJhY3QnPjwvYT5cbiAgICogQW4gYWJzdHJhY3Qgc3RhdGUgd2lsbCBuZXZlciBiZSBkaXJlY3RseSBhY3RpdmF0ZWQsXG4gICAqICAgYnV0IGNhbiBwcm92aWRlIGluaGVyaXRlZCBwcm9wZXJ0aWVzIHRvIGl0cyBjb21tb24gY2hpbGRyZW4gc3RhdGVzLlxuICAgKiA8cHJlPmFic3RyYWN0OiB0cnVlPC9wcmU+XG4gICAqXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb249fSBzdGF0ZUNvbmZpZy5vbkVudGVyXG4gICAqIDxhIGlkPSdvbkVudGVyJz48L2E+XG4gICAqXG4gICAqIENhbGxiYWNrIGZ1bmN0aW9uIGZvciB3aGVuIGEgc3RhdGUgaXMgZW50ZXJlZC4gR29vZCB3YXlcbiAgICogICB0byB0cmlnZ2VyIGFuIGFjdGlvbiBvciBkaXNwYXRjaCBhbiBldmVudCwgc3VjaCBhcyBvcGVuaW5nIGEgZGlhbG9nLlxuICAgKiBJZiBtaW5pZnlpbmcgeW91ciBzY3JpcHRzLCBtYWtlIHN1cmUgdG8gZXhwbGljdGx5IGFubm90YXRlIHRoaXMgZnVuY3Rpb24sXG4gICAqIGJlY2F1c2UgaXQgd29uJ3QgYmUgYXV0b21hdGljYWxseSBhbm5vdGF0ZWQgYnkgeW91ciBidWlsZCB0b29scy5cbiAgICpcbiAgICogPHByZT5vbkVudGVyOiBmdW5jdGlvbihNeVNlcnZpY2UsICRzdGF0ZVBhcmFtcykge1xuICAgKiAgICAgTXlTZXJ2aWNlLmZvbygkc3RhdGVQYXJhbXMubXlQYXJhbSk7XG4gICAqIH08L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbj19IHN0YXRlQ29uZmlnLm9uRXhpdFxuICAgKiA8YSBpZD0nb25FeGl0Jz48L2E+XG4gICAqXG4gICAqIENhbGxiYWNrIGZ1bmN0aW9uIGZvciB3aGVuIGEgc3RhdGUgaXMgZXhpdGVkLiBHb29kIHdheSB0b1xuICAgKiAgIHRyaWdnZXIgYW4gYWN0aW9uIG9yIGRpc3BhdGNoIGFuIGV2ZW50LCBzdWNoIGFzIG9wZW5pbmcgYSBkaWFsb2cuXG4gICAqIElmIG1pbmlmeWluZyB5b3VyIHNjcmlwdHMsIG1ha2Ugc3VyZSB0byBleHBsaWN0bHkgYW5ub3RhdGUgdGhpcyBmdW5jdGlvbixcbiAgICogYmVjYXVzZSBpdCB3b24ndCBiZSBhdXRvbWF0aWNhbGx5IGFubm90YXRlZCBieSB5b3VyIGJ1aWxkIHRvb2xzLlxuICAgKlxuICAgKiA8cHJlPm9uRXhpdDogZnVuY3Rpb24oTXlTZXJ2aWNlLCAkc3RhdGVQYXJhbXMpIHtcbiAgICogICAgIE15U2VydmljZS5jbGVhbnVwKCRzdGF0ZVBhcmFtcy5teVBhcmFtKTtcbiAgICogfTwvcHJlPlxuICAgKlxuICAgKiBAcGFyYW0ge2Jvb2xlYW49fSBbc3RhdGVDb25maWcucmVsb2FkT25TZWFyY2g9dHJ1ZV1cbiAgICogPGEgaWQ9J3JlbG9hZE9uU2VhcmNoJz48L2E+XG4gICAqXG4gICAqIElmIGBmYWxzZWAsIHdpbGwgbm90IHJldHJpZ2dlciB0aGUgc2FtZSBzdGF0ZVxuICAgKiAgIGp1c3QgYmVjYXVzZSBhIHNlYXJjaC9xdWVyeSBwYXJhbWV0ZXIgaGFzIGNoYW5nZWQgKHZpYSAkbG9jYXRpb24uc2VhcmNoKCkgb3IgJGxvY2F0aW9uLmhhc2goKSkuIFxuICAgKiAgIFVzZWZ1bCBmb3Igd2hlbiB5b3UnZCBsaWtlIHRvIG1vZGlmeSAkbG9jYXRpb24uc2VhcmNoKCkgd2l0aG91dCB0cmlnZ2VyaW5nIGEgcmVsb2FkLlxuICAgKiA8cHJlPnJlbG9hZE9uU2VhcmNoOiBmYWxzZTwvcHJlPlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdD19IHN0YXRlQ29uZmlnLmRhdGFcbiAgICogPGEgaWQ9J2RhdGEnPjwvYT5cbiAgICpcbiAgICogQXJiaXRyYXJ5IGRhdGEgb2JqZWN0LCB1c2VmdWwgZm9yIGN1c3RvbSBjb25maWd1cmF0aW9uLiAgVGhlIHBhcmVudCBzdGF0ZSdzIGBkYXRhYCBpc1xuICAgKiAgIHByb3RvdHlwYWxseSBpbmhlcml0ZWQuICBJbiBvdGhlciB3b3JkcywgYWRkaW5nIGEgZGF0YSBwcm9wZXJ0eSB0byBhIHN0YXRlIGFkZHMgaXQgdG9cbiAgICogICB0aGUgZW50aXJlIHN1YnRyZWUgdmlhIHByb3RvdHlwYWwgaW5oZXJpdGFuY2UuXG4gICAqXG4gICAqIDxwcmU+ZGF0YToge1xuICAgKiAgICAgcmVxdWlyZWRSb2xlOiAnZm9vJ1xuICAgKiB9IDwvcHJlPlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdD19IHN0YXRlQ29uZmlnLnBhcmFtc1xuICAgKiA8YSBpZD0ncGFyYW1zJz48L2E+XG4gICAqXG4gICAqIEEgbWFwIHdoaWNoIG9wdGlvbmFsbHkgY29uZmlndXJlcyBwYXJhbWV0ZXJzIGRlY2xhcmVkIGluIHRoZSBgdXJsYCwgb3JcbiAgICogICBkZWZpbmVzIGFkZGl0aW9uYWwgbm9uLXVybCBwYXJhbWV0ZXJzLiAgRm9yIGVhY2ggcGFyYW1ldGVyIGJlaW5nXG4gICAqICAgY29uZmlndXJlZCwgYWRkIGEgY29uZmlndXJhdGlvbiBvYmplY3Qga2V5ZWQgdG8gdGhlIG5hbWUgb2YgdGhlIHBhcmFtZXRlci5cbiAgICpcbiAgICogICBFYWNoIHBhcmFtZXRlciBjb25maWd1cmF0aW9uIG9iamVjdCBtYXkgY29udGFpbiB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG4gICAqXG4gICAqICAgLSAqKiB2YWx1ZSAqKiAtIHtvYmplY3R8ZnVuY3Rpb249fTogc3BlY2lmaWVzIHRoZSBkZWZhdWx0IHZhbHVlIGZvciB0aGlzXG4gICAqICAgICBwYXJhbWV0ZXIuICBUaGlzIGltcGxpY2l0bHkgc2V0cyB0aGlzIHBhcmFtZXRlciBhcyBvcHRpb25hbC5cbiAgICpcbiAgICogICAgIFdoZW4gVUktUm91dGVyIHJvdXRlcyB0byBhIHN0YXRlIGFuZCBubyB2YWx1ZSBpc1xuICAgKiAgICAgc3BlY2lmaWVkIGZvciB0aGlzIHBhcmFtZXRlciBpbiB0aGUgVVJMIG9yIHRyYW5zaXRpb24sIHRoZVxuICAgKiAgICAgZGVmYXVsdCB2YWx1ZSB3aWxsIGJlIHVzZWQgaW5zdGVhZC4gIElmIGB2YWx1ZWAgaXMgYSBmdW5jdGlvbixcbiAgICogICAgIGl0IHdpbGwgYmUgaW5qZWN0ZWQgYW5kIGludm9rZWQsIGFuZCB0aGUgcmV0dXJuIHZhbHVlIHVzZWQuXG4gICAqXG4gICAqICAgICAqTm90ZSo6IGB1bmRlZmluZWRgIGlzIHRyZWF0ZWQgYXMgXCJubyBkZWZhdWx0IHZhbHVlXCIgd2hpbGUgYG51bGxgXG4gICAqICAgICBpcyB0cmVhdGVkIGFzIFwidGhlIGRlZmF1bHQgdmFsdWUgaXMgYG51bGxgXCIuXG4gICAqXG4gICAqICAgICAqU2hvcnRoYW5kKjogSWYgeW91IG9ubHkgbmVlZCB0byBjb25maWd1cmUgdGhlIGRlZmF1bHQgdmFsdWUgb2YgdGhlXG4gICAqICAgICBwYXJhbWV0ZXIsIHlvdSBtYXkgdXNlIGEgc2hvcnRoYW5kIHN5bnRheC4gICBJbiB0aGUgKipgcGFyYW1zYCoqXG4gICAqICAgICBtYXAsIGluc3RlYWQgbWFwcGluZyB0aGUgcGFyYW0gbmFtZSB0byBhIGZ1bGwgcGFyYW1ldGVyIGNvbmZpZ3VyYXRpb25cbiAgICogICAgIG9iamVjdCwgc2ltcGx5IHNldCBtYXAgaXQgdG8gdGhlIGRlZmF1bHQgcGFyYW1ldGVyIHZhbHVlLCBlLmcuOlxuICAgKlxuICAgKiA8cHJlPi8vIGRlZmluZSBhIHBhcmFtZXRlcidzIGRlZmF1bHQgdmFsdWVcbiAgICogcGFyYW1zOiB7XG4gICAqICAgICBwYXJhbTE6IHsgdmFsdWU6IFwiZGVmYXVsdFZhbHVlXCIgfVxuICAgKiB9XG4gICAqIC8vIHNob3J0aGFuZCBkZWZhdWx0IHZhbHVlc1xuICAgKiBwYXJhbXM6IHtcbiAgICogICAgIHBhcmFtMTogXCJkZWZhdWx0VmFsdWVcIixcbiAgICogICAgIHBhcmFtMjogXCJwYXJhbTJEZWZhdWx0XCJcbiAgICogfTwvcHJlPlxuICAgKlxuICAgKiAgIC0gKiogYXJyYXkgKiogLSB7Ym9vbGVhbj19OiAqKGRlZmF1bHQ6IGZhbHNlKSogSWYgdHJ1ZSwgdGhlIHBhcmFtIHZhbHVlIHdpbGwgYmVcbiAgICogICAgIHRyZWF0ZWQgYXMgYW4gYXJyYXkgb2YgdmFsdWVzLiAgSWYgeW91IHNwZWNpZmllZCBhIFR5cGUsIHRoZSB2YWx1ZSB3aWxsIGJlXG4gICAqICAgICB0cmVhdGVkIGFzIGFuIGFycmF5IG9mIHRoZSBzcGVjaWZpZWQgVHlwZS4gIE5vdGU6IHF1ZXJ5IHBhcmFtZXRlciB2YWx1ZXNcbiAgICogICAgIGRlZmF1bHQgdG8gYSBzcGVjaWFsIGBcImF1dG9cImAgbW9kZS5cbiAgICpcbiAgICogICAgIEZvciBxdWVyeSBwYXJhbWV0ZXJzIGluIGBcImF1dG9cImAgbW9kZSwgaWYgbXVsdGlwbGUgIHZhbHVlcyBmb3IgYSBzaW5nbGUgcGFyYW1ldGVyXG4gICAqICAgICBhcmUgcHJlc2VudCBpbiB0aGUgVVJMIChlLmcuOiBgL2Zvbz9iYXI9MSZiYXI9MiZiYXI9M2ApIHRoZW4gdGhlIHZhbHVlc1xuICAgKiAgICAgYXJlIG1hcHBlZCB0byBhbiBhcnJheSAoZS5nLjogYHsgZm9vOiBbICcxJywgJzInLCAnMycgXSB9YCkuICBIb3dldmVyLCBpZlxuICAgKiAgICAgb25seSBvbmUgdmFsdWUgaXMgcHJlc2VudCAoZS5nLjogYC9mb28/YmFyPTFgKSB0aGVuIHRoZSB2YWx1ZSBpcyB0cmVhdGVkIGFzIHNpbmdsZVxuICAgKiAgICAgdmFsdWUgKGUuZy46IGB7IGZvbzogJzEnIH1gKS5cbiAgICpcbiAgICogPHByZT5wYXJhbXM6IHtcbiAgICogICAgIHBhcmFtMTogeyBhcnJheTogdHJ1ZSB9XG4gICAqIH08L3ByZT5cbiAgICpcbiAgICogICAtICoqIHNxdWFzaCAqKiAtIHtib29sfHN0cmluZz19OiBgc3F1YXNoYCBjb25maWd1cmVzIGhvdyBhIGRlZmF1bHQgcGFyYW1ldGVyIHZhbHVlIGlzIHJlcHJlc2VudGVkIGluIHRoZSBVUkwgd2hlblxuICAgKiAgICAgdGhlIGN1cnJlbnQgcGFyYW1ldGVyIHZhbHVlIGlzIHRoZSBzYW1lIGFzIHRoZSBkZWZhdWx0IHZhbHVlLiBJZiBgc3F1YXNoYCBpcyBub3Qgc2V0LCBpdCB1c2VzIHRoZVxuICAgKiAgICAgY29uZmlndXJlZCBkZWZhdWx0IHNxdWFzaCBwb2xpY3kuXG4gICAqICAgICAoU2VlIHtAbGluayB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnkjbWV0aG9kc19kZWZhdWx0U3F1YXNoUG9saWN5IGBkZWZhdWx0U3F1YXNoUG9saWN5KClgfSlcbiAgICpcbiAgICogICBUaGVyZSBhcmUgdGhyZWUgc3F1YXNoIHNldHRpbmdzOlxuICAgKlxuICAgKiAgICAgLSBmYWxzZTogVGhlIHBhcmFtZXRlcidzIGRlZmF1bHQgdmFsdWUgaXMgbm90IHNxdWFzaGVkLiAgSXQgaXMgZW5jb2RlZCBhbmQgaW5jbHVkZWQgaW4gdGhlIFVSTFxuICAgKiAgICAgLSB0cnVlOiBUaGUgcGFyYW1ldGVyJ3MgZGVmYXVsdCB2YWx1ZSBpcyBvbWl0dGVkIGZyb20gdGhlIFVSTC4gIElmIHRoZSBwYXJhbWV0ZXIgaXMgcHJlY2VlZGVkIGFuZCBmb2xsb3dlZFxuICAgKiAgICAgICBieSBzbGFzaGVzIGluIHRoZSBzdGF0ZSdzIGB1cmxgIGRlY2xhcmF0aW9uLCB0aGVuIG9uZSBvZiB0aG9zZSBzbGFzaGVzIGFyZSBvbWl0dGVkLlxuICAgKiAgICAgICBUaGlzIGNhbiBhbGxvdyBmb3IgY2xlYW5lciBsb29raW5nIFVSTHMuXG4gICAqICAgICAtIGBcIjxhcmJpdHJhcnkgc3RyaW5nPlwiYDogVGhlIHBhcmFtZXRlcidzIGRlZmF1bHQgdmFsdWUgaXMgcmVwbGFjZWQgd2l0aCBhbiBhcmJpdHJhcnkgcGxhY2Vob2xkZXIgb2YgIHlvdXIgY2hvaWNlLlxuICAgKlxuICAgKiA8cHJlPnBhcmFtczoge1xuICAgKiAgICAgcGFyYW0xOiB7XG4gICAqICAgICAgIHZhbHVlOiBcImRlZmF1bHRJZFwiLFxuICAgKiAgICAgICBzcXVhc2g6IHRydWVcbiAgICogfSB9XG4gICAqIC8vIHNxdWFzaCBcImRlZmF1bHRWYWx1ZVwiIHRvIFwiflwiXG4gICAqIHBhcmFtczoge1xuICAgKiAgICAgcGFyYW0xOiB7XG4gICAqICAgICAgIHZhbHVlOiBcImRlZmF1bHRWYWx1ZVwiLFxuICAgKiAgICAgICBzcXVhc2g6IFwiflwiXG4gICAqIH0gfVxuICAgKiA8L3ByZT5cbiAgICpcbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogPHByZT5cbiAgICogLy8gU29tZSBzdGF0ZSBuYW1lIGV4YW1wbGVzXG4gICAqXG4gICAqIC8vIHN0YXRlTmFtZSBjYW4gYmUgYSBzaW5nbGUgdG9wLWxldmVsIG5hbWUgKG11c3QgYmUgdW5pcXVlKS5cbiAgICogJHN0YXRlUHJvdmlkZXIuc3RhdGUoXCJob21lXCIsIHt9KTtcbiAgICpcbiAgICogLy8gT3IgaXQgY2FuIGJlIGEgbmVzdGVkIHN0YXRlIG5hbWUuIFRoaXMgc3RhdGUgaXMgYSBjaGlsZCBvZiB0aGVcbiAgICogLy8gYWJvdmUgXCJob21lXCIgc3RhdGUuXG4gICAqICRzdGF0ZVByb3ZpZGVyLnN0YXRlKFwiaG9tZS5uZXdlc3RcIiwge30pO1xuICAgKlxuICAgKiAvLyBOZXN0IHN0YXRlcyBhcyBkZWVwbHkgYXMgbmVlZGVkLlxuICAgKiAkc3RhdGVQcm92aWRlci5zdGF0ZShcImhvbWUubmV3ZXN0LmFiYy54eXouaW5jZXB0aW9uXCIsIHt9KTtcbiAgICpcbiAgICogLy8gc3RhdGUoKSByZXR1cm5zICRzdGF0ZVByb3ZpZGVyLCBzbyB5b3UgY2FuIGNoYWluIHN0YXRlIGRlY2xhcmF0aW9ucy5cbiAgICogJHN0YXRlUHJvdmlkZXJcbiAgICogICAuc3RhdGUoXCJob21lXCIsIHt9KVxuICAgKiAgIC5zdGF0ZShcImFib3V0XCIsIHt9KVxuICAgKiAgIC5zdGF0ZShcImNvbnRhY3RzXCIsIHt9KTtcbiAgICogPC9wcmU+XG4gICAqXG4gICAqL1xuICB0aGlzLnN0YXRlID0gc3RhdGU7XG4gIGZ1bmN0aW9uIHN0YXRlKG5hbWUsIGRlZmluaXRpb24pIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICBpZiAoaXNPYmplY3QobmFtZSkpIGRlZmluaXRpb24gPSBuYW1lO1xuICAgIGVsc2UgZGVmaW5pdGlvbi5uYW1lID0gbmFtZTtcbiAgICByZWdpc3RlclN0YXRlKGRlZmluaXRpb24pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBvYmplY3RcbiAgICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICAgKlxuICAgKiBAcmVxdWlyZXMgJHJvb3RTY29wZVxuICAgKiBAcmVxdWlyZXMgJHFcbiAgICogQHJlcXVpcmVzIHVpLnJvdXRlci5zdGF0ZS4kdmlld1xuICAgKiBAcmVxdWlyZXMgJGluamVjdG9yXG4gICAqIEByZXF1aXJlcyB1aS5yb3V0ZXIudXRpbC4kcmVzb2x2ZVxuICAgKiBAcmVxdWlyZXMgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVBhcmFtc1xuICAgKiBAcmVxdWlyZXMgdWkucm91dGVyLnJvdXRlci4kdXJsUm91dGVyXG4gICAqXG4gICAqIEBwcm9wZXJ0eSB7b2JqZWN0fSBwYXJhbXMgQSBwYXJhbSBvYmplY3QsIGUuZy4ge3NlY3Rpb25JZDogc2VjdGlvbi5pZCl9LCB0aGF0IFxuICAgKiB5b3UnZCBsaWtlIHRvIHRlc3QgYWdhaW5zdCB0aGUgY3VycmVudCBhY3RpdmUgc3RhdGUuXG4gICAqIEBwcm9wZXJ0eSB7b2JqZWN0fSBjdXJyZW50IEEgcmVmZXJlbmNlIHRvIHRoZSBzdGF0ZSdzIGNvbmZpZyBvYmplY3QuIEhvd2V2ZXIgXG4gICAqIHlvdSBwYXNzZWQgaXQgaW4uIFVzZWZ1bCBmb3IgYWNjZXNzaW5nIGN1c3RvbSBkYXRhLlxuICAgKiBAcHJvcGVydHkge29iamVjdH0gdHJhbnNpdGlvbiBDdXJyZW50bHkgcGVuZGluZyB0cmFuc2l0aW9uLiBBIHByb21pc2UgdGhhdCdsbCBcbiAgICogcmVzb2x2ZSBvciByZWplY3QuXG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBgJHN0YXRlYCBzZXJ2aWNlIGlzIHJlc3BvbnNpYmxlIGZvciByZXByZXNlbnRpbmcgc3RhdGVzIGFzIHdlbGwgYXMgdHJhbnNpdGlvbmluZ1xuICAgKiBiZXR3ZWVuIHRoZW0uIEl0IGFsc28gcHJvdmlkZXMgaW50ZXJmYWNlcyB0byBhc2sgZm9yIGN1cnJlbnQgc3RhdGUgb3IgZXZlbiBzdGF0ZXNcbiAgICogeW91J3JlIGNvbWluZyBmcm9tLlxuICAgKi9cbiAgdGhpcy4kZ2V0ID0gJGdldDtcbiAgJGdldC4kaW5qZWN0ID0gWyckcm9vdFNjb3BlJywgJyRxJywgJyR2aWV3JywgJyRpbmplY3RvcicsICckcmVzb2x2ZScsICckc3RhdGVQYXJhbXMnLCAnJHVybFJvdXRlcicsICckbG9jYXRpb24nLCAnJHVybE1hdGNoZXJGYWN0b3J5J107XG4gIGZ1bmN0aW9uICRnZXQoICAgJHJvb3RTY29wZSwgICAkcSwgICAkdmlldywgICAkaW5qZWN0b3IsICAgJHJlc29sdmUsICAgJHN0YXRlUGFyYW1zLCAgICR1cmxSb3V0ZXIsICAgJGxvY2F0aW9uLCAgICR1cmxNYXRjaGVyRmFjdG9yeSkge1xuXG4gICAgdmFyIFRyYW5zaXRpb25TdXBlcnNlZGVkID0gJHEucmVqZWN0KG5ldyBFcnJvcigndHJhbnNpdGlvbiBzdXBlcnNlZGVkJykpO1xuICAgIHZhciBUcmFuc2l0aW9uUHJldmVudGVkID0gJHEucmVqZWN0KG5ldyBFcnJvcigndHJhbnNpdGlvbiBwcmV2ZW50ZWQnKSk7XG4gICAgdmFyIFRyYW5zaXRpb25BYm9ydGVkID0gJHEucmVqZWN0KG5ldyBFcnJvcigndHJhbnNpdGlvbiBhYm9ydGVkJykpO1xuICAgIHZhciBUcmFuc2l0aW9uRmFpbGVkID0gJHEucmVqZWN0KG5ldyBFcnJvcigndHJhbnNpdGlvbiBmYWlsZWQnKSk7XG5cbiAgICAvLyBIYW5kbGVzIHRoZSBjYXNlIHdoZXJlIGEgc3RhdGUgd2hpY2ggaXMgdGhlIHRhcmdldCBvZiBhIHRyYW5zaXRpb24gaXMgbm90IGZvdW5kLCBhbmQgdGhlIHVzZXJcbiAgICAvLyBjYW4gb3B0aW9uYWxseSByZXRyeSBvciBkZWZlciB0aGUgdHJhbnNpdGlvblxuICAgIGZ1bmN0aW9uIGhhbmRsZVJlZGlyZWN0KHJlZGlyZWN0LCBzdGF0ZSwgcGFyYW1zLCBvcHRpb25zKSB7XG4gICAgICAvKipcbiAgICAgICAqIEBuZ2RvYyBldmVudFxuICAgICAgICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSMkc3RhdGVOb3RGb3VuZFxuICAgICAgICogQGV2ZW50T2YgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICAgICAgICogQGV2ZW50VHlwZSBicm9hZGNhc3Qgb24gcm9vdCBzY29wZVxuICAgICAgICogQGRlc2NyaXB0aW9uXG4gICAgICAgKiBGaXJlZCB3aGVuIGEgcmVxdWVzdGVkIHN0YXRlICoqY2Fubm90IGJlIGZvdW5kKiogdXNpbmcgdGhlIHByb3ZpZGVkIHN0YXRlIG5hbWUgZHVyaW5nIHRyYW5zaXRpb24uXG4gICAgICAgKiBUaGUgZXZlbnQgaXMgYnJvYWRjYXN0IGFsbG93aW5nIGFueSBoYW5kbGVycyBhIHNpbmdsZSBjaGFuY2UgdG8gZGVhbCB3aXRoIHRoZSBlcnJvciAodXN1YWxseSBieVxuICAgICAgICogbGF6eS1sb2FkaW5nIHRoZSB1bmZvdW5kIHN0YXRlKS4gQSBzcGVjaWFsIGB1bmZvdW5kU3RhdGVgIG9iamVjdCBpcyBwYXNzZWQgdG8gdGhlIGxpc3RlbmVyIGhhbmRsZXIsXG4gICAgICAgKiB5b3UgY2FuIHNlZSBpdHMgdGhyZWUgcHJvcGVydGllcyBpbiB0aGUgZXhhbXBsZS4gWW91IGNhbiB1c2UgYGV2ZW50LnByZXZlbnREZWZhdWx0KClgIHRvIGFib3J0IHRoZVxuICAgICAgICogdHJhbnNpdGlvbiBhbmQgdGhlIHByb21pc2UgcmV0dXJuZWQgZnJvbSBgZ29gIHdpbGwgYmUgcmVqZWN0ZWQgd2l0aCBhIGAndHJhbnNpdGlvbiBhYm9ydGVkJ2AgdmFsdWUuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IEV2ZW50IG9iamVjdC5cbiAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSB1bmZvdW5kU3RhdGUgVW5mb3VuZCBTdGF0ZSBpbmZvcm1hdGlvbi4gQ29udGFpbnM6IGB0bywgdG9QYXJhbXMsIG9wdGlvbnNgIHByb3BlcnRpZXMuXG4gICAgICAgKiBAcGFyYW0ge1N0YXRlfSBmcm9tU3RhdGUgQ3VycmVudCBzdGF0ZSBvYmplY3QuXG4gICAgICAgKiBAcGFyYW0ge09iamVjdH0gZnJvbVBhcmFtcyBDdXJyZW50IHN0YXRlIHBhcmFtcy5cbiAgICAgICAqXG4gICAgICAgKiBAZXhhbXBsZVxuICAgICAgICpcbiAgICAgICAqIDxwcmU+XG4gICAgICAgKiAvLyBzb21ld2hlcmUsIGFzc3VtZSBsYXp5LnN0YXRlIGhhcyBub3QgYmVlbiBkZWZpbmVkXG4gICAgICAgKiAkc3RhdGUuZ28oXCJsYXp5LnN0YXRlXCIsIHthOjEsIGI6Mn0sIHtpbmhlcml0OmZhbHNlfSk7XG4gICAgICAgKlxuICAgICAgICogLy8gc29tZXdoZXJlIGVsc2VcbiAgICAgICAqICRzY29wZS4kb24oJyRzdGF0ZU5vdEZvdW5kJyxcbiAgICAgICAqIGZ1bmN0aW9uKGV2ZW50LCB1bmZvdW5kU3RhdGUsIGZyb21TdGF0ZSwgZnJvbVBhcmFtcyl7XG4gICAgICAgKiAgICAgY29uc29sZS5sb2codW5mb3VuZFN0YXRlLnRvKTsgLy8gXCJsYXp5LnN0YXRlXCJcbiAgICAgICAqICAgICBjb25zb2xlLmxvZyh1bmZvdW5kU3RhdGUudG9QYXJhbXMpOyAvLyB7YToxLCBiOjJ9XG4gICAgICAgKiAgICAgY29uc29sZS5sb2codW5mb3VuZFN0YXRlLm9wdGlvbnMpOyAvLyB7aW5oZXJpdDpmYWxzZX0gKyBkZWZhdWx0IG9wdGlvbnNcbiAgICAgICAqIH0pXG4gICAgICAgKiA8L3ByZT5cbiAgICAgICAqL1xuICAgICAgdmFyIGV2dCA9ICRyb290U2NvcGUuJGJyb2FkY2FzdCgnJHN0YXRlTm90Rm91bmQnLCByZWRpcmVjdCwgc3RhdGUsIHBhcmFtcyk7XG5cbiAgICAgIGlmIChldnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgICAkdXJsUm91dGVyLnVwZGF0ZSgpO1xuICAgICAgICByZXR1cm4gVHJhbnNpdGlvbkFib3J0ZWQ7XG4gICAgICB9XG5cbiAgICAgIGlmICghZXZ0LnJldHJ5KSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICAvLyBBbGxvdyB0aGUgaGFuZGxlciB0byByZXR1cm4gYSBwcm9taXNlIHRvIGRlZmVyIHN0YXRlIGxvb2t1cCByZXRyeVxuICAgICAgaWYgKG9wdGlvbnMuJHJldHJ5KSB7XG4gICAgICAgICR1cmxSb3V0ZXIudXBkYXRlKCk7XG4gICAgICAgIHJldHVybiBUcmFuc2l0aW9uRmFpbGVkO1xuICAgICAgfVxuICAgICAgdmFyIHJldHJ5VHJhbnNpdGlvbiA9ICRzdGF0ZS50cmFuc2l0aW9uID0gJHEud2hlbihldnQucmV0cnkpO1xuXG4gICAgICByZXRyeVRyYW5zaXRpb24udGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHJldHJ5VHJhbnNpdGlvbiAhPT0gJHN0YXRlLnRyYW5zaXRpb24pIHJldHVybiBUcmFuc2l0aW9uU3VwZXJzZWRlZDtcbiAgICAgICAgcmVkaXJlY3Qub3B0aW9ucy4kcmV0cnkgPSB0cnVlO1xuICAgICAgICByZXR1cm4gJHN0YXRlLnRyYW5zaXRpb25UbyhyZWRpcmVjdC50bywgcmVkaXJlY3QudG9QYXJhbXMsIHJlZGlyZWN0Lm9wdGlvbnMpO1xuICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBUcmFuc2l0aW9uQWJvcnRlZDtcbiAgICAgIH0pO1xuICAgICAgJHVybFJvdXRlci51cGRhdGUoKTtcblxuICAgICAgcmV0dXJuIHJldHJ5VHJhbnNpdGlvbjtcbiAgICB9XG5cbiAgICByb290LmxvY2FscyA9IHsgcmVzb2x2ZTogbnVsbCwgZ2xvYmFsczogeyAkc3RhdGVQYXJhbXM6IHt9IH0gfTtcblxuICAgICRzdGF0ZSA9IHtcbiAgICAgIHBhcmFtczoge30sXG4gICAgICBjdXJyZW50OiByb290LnNlbGYsXG4gICAgICAkY3VycmVudDogcm9vdCxcbiAgICAgIHRyYW5zaXRpb246IG51bGxcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSNyZWxvYWRcbiAgICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICAgICAqXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogQSBtZXRob2QgdGhhdCBmb3JjZSByZWxvYWRzIHRoZSBjdXJyZW50IHN0YXRlLiBBbGwgcmVzb2x2ZXMgYXJlIHJlLXJlc29sdmVkLCBldmVudHMgYXJlIG5vdCByZS1maXJlZCwgXG4gICAgICogYW5kIGNvbnRyb2xsZXJzIHJlaW5zdGFudGlhdGVkIChidWcgd2l0aCBjb250cm9sbGVycyByZWluc3RhbnRpYXRpbmcgcmlnaHQgbm93LCBmaXhpbmcgc29vbikuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIDxwcmU+XG4gICAgICogdmFyIGFwcCBhbmd1bGFyLm1vZHVsZSgnYXBwJywgWyd1aS5yb3V0ZXInXSk7XG4gICAgICpcbiAgICAgKiBhcHAuY29udHJvbGxlcignY3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsICRzdGF0ZSkge1xuICAgICAqICAgJHNjb3BlLnJlbG9hZCA9IGZ1bmN0aW9uKCl7XG4gICAgICogICAgICRzdGF0ZS5yZWxvYWQoKTtcbiAgICAgKiAgIH1cbiAgICAgKiB9KTtcbiAgICAgKiA8L3ByZT5cbiAgICAgKlxuICAgICAqIGByZWxvYWQoKWAgaXMganVzdCBhbiBhbGlhcyBmb3I6XG4gICAgICogPHByZT5cbiAgICAgKiAkc3RhdGUudHJhbnNpdGlvblRvKCRzdGF0ZS5jdXJyZW50LCAkc3RhdGVQYXJhbXMsIHsgXG4gICAgICogICByZWxvYWQ6IHRydWUsIGluaGVyaXQ6IGZhbHNlLCBub3RpZnk6IHRydWVcbiAgICAgKiB9KTtcbiAgICAgKiA8L3ByZT5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtwcm9taXNlfSBBIHByb21pc2UgcmVwcmVzZW50aW5nIHRoZSBzdGF0ZSBvZiB0aGUgbmV3IHRyYW5zaXRpb24uIFNlZVxuICAgICAqIHtAbGluayB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlI21ldGhvZHNfZ28gJHN0YXRlLmdvfS5cbiAgICAgKi9cbiAgICAkc3RhdGUucmVsb2FkID0gZnVuY3Rpb24gcmVsb2FkKCkge1xuICAgICAgcmV0dXJuICRzdGF0ZS50cmFuc2l0aW9uVG8oJHN0YXRlLmN1cnJlbnQsICRzdGF0ZVBhcmFtcywgeyByZWxvYWQ6IHRydWUsIGluaGVyaXQ6IGZhbHNlLCBub3RpZnk6IHRydWUgfSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGUjZ29cbiAgICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICAgICAqXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogQ29udmVuaWVuY2UgbWV0aG9kIGZvciB0cmFuc2l0aW9uaW5nIHRvIGEgbmV3IHN0YXRlLiBgJHN0YXRlLmdvYCBjYWxscyBcbiAgICAgKiBgJHN0YXRlLnRyYW5zaXRpb25Ub2AgaW50ZXJuYWxseSBidXQgYXV0b21hdGljYWxseSBzZXRzIG9wdGlvbnMgdG8gXG4gICAgICogYHsgbG9jYXRpb246IHRydWUsIGluaGVyaXQ6IHRydWUsIHJlbGF0aXZlOiAkc3RhdGUuJGN1cnJlbnQsIG5vdGlmeTogdHJ1ZSB9YC4gXG4gICAgICogVGhpcyBhbGxvd3MgeW91IHRvIGVhc2lseSB1c2UgYW4gYWJzb2x1dGUgb3IgcmVsYXRpdmUgdG8gcGF0aCBhbmQgc3BlY2lmeSBcbiAgICAgKiBvbmx5IHRoZSBwYXJhbWV0ZXJzIHlvdSdkIGxpa2UgdG8gdXBkYXRlICh3aGlsZSBsZXR0aW5nIHVuc3BlY2lmaWVkIHBhcmFtZXRlcnMgXG4gICAgICogaW5oZXJpdCBmcm9tIHRoZSBjdXJyZW50bHkgYWN0aXZlIGFuY2VzdG9yIHN0YXRlcykuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIDxwcmU+XG4gICAgICogdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbJ3VpLnJvdXRlciddKTtcbiAgICAgKlxuICAgICAqIGFwcC5jb250cm9sbGVyKCdjdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlKSB7XG4gICAgICogICAkc2NvcGUuY2hhbmdlU3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICogICAgICRzdGF0ZS5nbygnY29udGFjdC5kZXRhaWwnKTtcbiAgICAgKiAgIH07XG4gICAgICogfSk7XG4gICAgICogPC9wcmU+XG4gICAgICogPGltZyBzcmM9Jy4uL25nZG9jX2Fzc2V0cy9TdGF0ZUdvRXhhbXBsZXMucG5nJy8+XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdG8gQWJzb2x1dGUgc3RhdGUgbmFtZSBvciByZWxhdGl2ZSBzdGF0ZSBwYXRoLiBTb21lIGV4YW1wbGVzOlxuICAgICAqXG4gICAgICogLSBgJHN0YXRlLmdvKCdjb250YWN0LmRldGFpbCcpYCAtIHdpbGwgZ28gdG8gdGhlIGBjb250YWN0LmRldGFpbGAgc3RhdGVcbiAgICAgKiAtIGAkc3RhdGUuZ28oJ14nKWAgLSB3aWxsIGdvIHRvIGEgcGFyZW50IHN0YXRlXG4gICAgICogLSBgJHN0YXRlLmdvKCdeLnNpYmxpbmcnKWAgLSB3aWxsIGdvIHRvIGEgc2libGluZyBzdGF0ZVxuICAgICAqIC0gYCRzdGF0ZS5nbygnLmNoaWxkLmdyYW5kY2hpbGQnKWAgLSB3aWxsIGdvIHRvIGdyYW5kY2hpbGQgc3RhdGVcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0PX0gcGFyYW1zIEEgbWFwIG9mIHRoZSBwYXJhbWV0ZXJzIHRoYXQgd2lsbCBiZSBzZW50IHRvIHRoZSBzdGF0ZSwgXG4gICAgICogd2lsbCBwb3B1bGF0ZSAkc3RhdGVQYXJhbXMuIEFueSBwYXJhbWV0ZXJzIHRoYXQgYXJlIG5vdCBzcGVjaWZpZWQgd2lsbCBiZSBpbmhlcml0ZWQgZnJvbSBjdXJyZW50bHkgXG4gICAgICogZGVmaW5lZCBwYXJhbWV0ZXJzLiBUaGlzIGFsbG93cywgZm9yIGV4YW1wbGUsIGdvaW5nIHRvIGEgc2libGluZyBzdGF0ZSB0aGF0IHNoYXJlcyBwYXJhbWV0ZXJzXG4gICAgICogc3BlY2lmaWVkIGluIGEgcGFyZW50IHN0YXRlLiBQYXJhbWV0ZXIgaW5oZXJpdGFuY2Ugb25seSB3b3JrcyBiZXR3ZWVuIGNvbW1vbiBhbmNlc3RvciBzdGF0ZXMsIEkuZS5cbiAgICAgKiB0cmFuc2l0aW9uaW5nIHRvIGEgc2libGluZyB3aWxsIGdldCB5b3UgdGhlIHBhcmFtZXRlcnMgZm9yIGFsbCBwYXJlbnRzLCB0cmFuc2l0aW9uaW5nIHRvIGEgY2hpbGRcbiAgICAgKiB3aWxsIGdldCB5b3UgYWxsIGN1cnJlbnQgcGFyYW1ldGVycywgZXRjLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0PX0gb3B0aW9ucyBPcHRpb25zIG9iamVjdC4gVGhlIG9wdGlvbnMgYXJlOlxuICAgICAqXG4gICAgICogLSAqKmBsb2NhdGlvbmAqKiAtIHtib29sZWFuPXRydWV8c3RyaW5nPX0gLSBJZiBgdHJ1ZWAgd2lsbCB1cGRhdGUgdGhlIHVybCBpbiB0aGUgbG9jYXRpb24gYmFyLCBpZiBgZmFsc2VgXG4gICAgICogICAgd2lsbCBub3QuIElmIHN0cmluZywgbXVzdCBiZSBgXCJyZXBsYWNlXCJgLCB3aGljaCB3aWxsIHVwZGF0ZSB1cmwgYW5kIGFsc28gcmVwbGFjZSBsYXN0IGhpc3RvcnkgcmVjb3JkLlxuICAgICAqIC0gKipgaW5oZXJpdGAqKiAtIHtib29sZWFuPXRydWV9LCBJZiBgdHJ1ZWAgd2lsbCBpbmhlcml0IHVybCBwYXJhbWV0ZXJzIGZyb20gY3VycmVudCB1cmwuXG4gICAgICogLSAqKmByZWxhdGl2ZWAqKiAtIHtvYmplY3Q9JHN0YXRlLiRjdXJyZW50fSwgV2hlbiB0cmFuc2l0aW9uaW5nIHdpdGggcmVsYXRpdmUgcGF0aCAoZS5nICdeJyksIFxuICAgICAqICAgIGRlZmluZXMgd2hpY2ggc3RhdGUgdG8gYmUgcmVsYXRpdmUgZnJvbS5cbiAgICAgKiAtICoqYG5vdGlmeWAqKiAtIHtib29sZWFuPXRydWV9LCBJZiBgdHJ1ZWAgd2lsbCBicm9hZGNhc3QgJHN0YXRlQ2hhbmdlU3RhcnQgYW5kICRzdGF0ZUNoYW5nZVN1Y2Nlc3MgZXZlbnRzLlxuICAgICAqIC0gKipgcmVsb2FkYCoqICh2MC4yLjUpIC0ge2Jvb2xlYW49ZmFsc2V9LCBJZiBgdHJ1ZWAgd2lsbCBmb3JjZSB0cmFuc2l0aW9uIGV2ZW4gaWYgdGhlIHN0YXRlIG9yIHBhcmFtcyBcbiAgICAgKiAgICBoYXZlIG5vdCBjaGFuZ2VkLCBha2EgYSByZWxvYWQgb2YgdGhlIHNhbWUgc3RhdGUuIEl0IGRpZmZlcnMgZnJvbSByZWxvYWRPblNlYXJjaCBiZWNhdXNlIHlvdSdkXG4gICAgICogICAgdXNlIHRoaXMgd2hlbiB5b3Ugd2FudCB0byBmb3JjZSBhIHJlbG9hZCB3aGVuICpldmVyeXRoaW5nKiBpcyB0aGUgc2FtZSwgaW5jbHVkaW5nIHNlYXJjaCBwYXJhbXMuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7cHJvbWlzZX0gQSBwcm9taXNlIHJlcHJlc2VudGluZyB0aGUgc3RhdGUgb2YgdGhlIG5ldyB0cmFuc2l0aW9uLlxuICAgICAqXG4gICAgICogUG9zc2libGUgc3VjY2VzcyB2YWx1ZXM6XG4gICAgICpcbiAgICAgKiAtICRzdGF0ZS5jdXJyZW50XG4gICAgICpcbiAgICAgKiA8YnIvPlBvc3NpYmxlIHJlamVjdGlvbiB2YWx1ZXM6XG4gICAgICpcbiAgICAgKiAtICd0cmFuc2l0aW9uIHN1cGVyc2VkZWQnIC0gd2hlbiBhIG5ld2VyIHRyYW5zaXRpb24gaGFzIGJlZW4gc3RhcnRlZCBhZnRlciB0aGlzIG9uZVxuICAgICAqIC0gJ3RyYW5zaXRpb24gcHJldmVudGVkJyAtIHdoZW4gYGV2ZW50LnByZXZlbnREZWZhdWx0KClgIGhhcyBiZWVuIGNhbGxlZCBpbiBhIGAkc3RhdGVDaGFuZ2VTdGFydGAgbGlzdGVuZXJcbiAgICAgKiAtICd0cmFuc2l0aW9uIGFib3J0ZWQnIC0gd2hlbiBgZXZlbnQucHJldmVudERlZmF1bHQoKWAgaGFzIGJlZW4gY2FsbGVkIGluIGEgYCRzdGF0ZU5vdEZvdW5kYCBsaXN0ZW5lciBvclxuICAgICAqICAgd2hlbiBhIGAkc3RhdGVOb3RGb3VuZGAgYGV2ZW50LnJldHJ5YCBwcm9taXNlIGVycm9ycy5cbiAgICAgKiAtICd0cmFuc2l0aW9uIGZhaWxlZCcgLSB3aGVuIGEgc3RhdGUgaGFzIGJlZW4gdW5zdWNjZXNzZnVsbHkgZm91bmQgYWZ0ZXIgMiB0cmllcy5cbiAgICAgKiAtICpyZXNvbHZlIGVycm9yKiAtIHdoZW4gYW4gZXJyb3IgaGFzIG9jY3VycmVkIHdpdGggYSBgcmVzb2x2ZWBcbiAgICAgKlxuICAgICAqL1xuICAgICRzdGF0ZS5nbyA9IGZ1bmN0aW9uIGdvKHRvLCBwYXJhbXMsIG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiAkc3RhdGUudHJhbnNpdGlvblRvKHRvLCBwYXJhbXMsIGV4dGVuZCh7IGluaGVyaXQ6IHRydWUsIHJlbGF0aXZlOiAkc3RhdGUuJGN1cnJlbnQgfSwgb3B0aW9ucykpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlI3RyYW5zaXRpb25Ub1xuICAgICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlXG4gICAgICpcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBMb3ctbGV2ZWwgbWV0aG9kIGZvciB0cmFuc2l0aW9uaW5nIHRvIGEgbmV3IHN0YXRlLiB7QGxpbmsgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSNtZXRob2RzX2dvICRzdGF0ZS5nb31cbiAgICAgKiB1c2VzIGB0cmFuc2l0aW9uVG9gIGludGVybmFsbHkuIGAkc3RhdGUuZ29gIGlzIHJlY29tbWVuZGVkIGluIG1vc3Qgc2l0dWF0aW9ucy5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogPHByZT5cbiAgICAgKiB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFsndWkucm91dGVyJ10pO1xuICAgICAqXG4gICAgICogYXBwLmNvbnRyb2xsZXIoJ2N0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCAkc3RhdGUpIHtcbiAgICAgKiAgICRzY29wZS5jaGFuZ2VTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgKiAgICAgJHN0YXRlLnRyYW5zaXRpb25UbygnY29udGFjdC5kZXRhaWwnKTtcbiAgICAgKiAgIH07XG4gICAgICogfSk7XG4gICAgICogPC9wcmU+XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdG8gU3RhdGUgbmFtZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdD19IHRvUGFyYW1zIEEgbWFwIG9mIHRoZSBwYXJhbWV0ZXJzIHRoYXQgd2lsbCBiZSBzZW50IHRvIHRoZSBzdGF0ZSxcbiAgICAgKiB3aWxsIHBvcHVsYXRlICRzdGF0ZVBhcmFtcy5cbiAgICAgKiBAcGFyYW0ge29iamVjdD19IG9wdGlvbnMgT3B0aW9ucyBvYmplY3QuIFRoZSBvcHRpb25zIGFyZTpcbiAgICAgKlxuICAgICAqIC0gKipgbG9jYXRpb25gKiogLSB7Ym9vbGVhbj10cnVlfHN0cmluZz19IC0gSWYgYHRydWVgIHdpbGwgdXBkYXRlIHRoZSB1cmwgaW4gdGhlIGxvY2F0aW9uIGJhciwgaWYgYGZhbHNlYFxuICAgICAqICAgIHdpbGwgbm90LiBJZiBzdHJpbmcsIG11c3QgYmUgYFwicmVwbGFjZVwiYCwgd2hpY2ggd2lsbCB1cGRhdGUgdXJsIGFuZCBhbHNvIHJlcGxhY2UgbGFzdCBoaXN0b3J5IHJlY29yZC5cbiAgICAgKiAtICoqYGluaGVyaXRgKiogLSB7Ym9vbGVhbj1mYWxzZX0sIElmIGB0cnVlYCB3aWxsIGluaGVyaXQgdXJsIHBhcmFtZXRlcnMgZnJvbSBjdXJyZW50IHVybC5cbiAgICAgKiAtICoqYHJlbGF0aXZlYCoqIC0ge29iamVjdD19LCBXaGVuIHRyYW5zaXRpb25pbmcgd2l0aCByZWxhdGl2ZSBwYXRoIChlLmcgJ14nKSwgXG4gICAgICogICAgZGVmaW5lcyB3aGljaCBzdGF0ZSB0byBiZSByZWxhdGl2ZSBmcm9tLlxuICAgICAqIC0gKipgbm90aWZ5YCoqIC0ge2Jvb2xlYW49dHJ1ZX0sIElmIGB0cnVlYCB3aWxsIGJyb2FkY2FzdCAkc3RhdGVDaGFuZ2VTdGFydCBhbmQgJHN0YXRlQ2hhbmdlU3VjY2VzcyBldmVudHMuXG4gICAgICogLSAqKmByZWxvYWRgKiogKHYwLjIuNSkgLSB7Ym9vbGVhbj1mYWxzZX0sIElmIGB0cnVlYCB3aWxsIGZvcmNlIHRyYW5zaXRpb24gZXZlbiBpZiB0aGUgc3RhdGUgb3IgcGFyYW1zIFxuICAgICAqICAgIGhhdmUgbm90IGNoYW5nZWQsIGFrYSBhIHJlbG9hZCBvZiB0aGUgc2FtZSBzdGF0ZS4gSXQgZGlmZmVycyBmcm9tIHJlbG9hZE9uU2VhcmNoIGJlY2F1c2UgeW91J2RcbiAgICAgKiAgICB1c2UgdGhpcyB3aGVuIHlvdSB3YW50IHRvIGZvcmNlIGEgcmVsb2FkIHdoZW4gKmV2ZXJ5dGhpbmcqIGlzIHRoZSBzYW1lLCBpbmNsdWRpbmcgc2VhcmNoIHBhcmFtcy5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtwcm9taXNlfSBBIHByb21pc2UgcmVwcmVzZW50aW5nIHRoZSBzdGF0ZSBvZiB0aGUgbmV3IHRyYW5zaXRpb24uIFNlZVxuICAgICAqIHtAbGluayB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlI21ldGhvZHNfZ28gJHN0YXRlLmdvfS5cbiAgICAgKi9cbiAgICAkc3RhdGUudHJhbnNpdGlvblRvID0gZnVuY3Rpb24gdHJhbnNpdGlvblRvKHRvLCB0b1BhcmFtcywgb3B0aW9ucykge1xuICAgICAgdG9QYXJhbXMgPSB0b1BhcmFtcyB8fCB7fTtcbiAgICAgIG9wdGlvbnMgPSBleHRlbmQoe1xuICAgICAgICBsb2NhdGlvbjogdHJ1ZSwgaW5oZXJpdDogZmFsc2UsIHJlbGF0aXZlOiBudWxsLCBub3RpZnk6IHRydWUsIHJlbG9hZDogZmFsc2UsICRyZXRyeTogZmFsc2VcbiAgICAgIH0sIG9wdGlvbnMgfHwge30pO1xuXG4gICAgICB2YXIgZnJvbSA9ICRzdGF0ZS4kY3VycmVudCwgZnJvbVBhcmFtcyA9ICRzdGF0ZS5wYXJhbXMsIGZyb21QYXRoID0gZnJvbS5wYXRoO1xuICAgICAgdmFyIGV2dCwgdG9TdGF0ZSA9IGZpbmRTdGF0ZSh0bywgb3B0aW9ucy5yZWxhdGl2ZSk7XG5cbiAgICAgIGlmICghaXNEZWZpbmVkKHRvU3RhdGUpKSB7XG4gICAgICAgIHZhciByZWRpcmVjdCA9IHsgdG86IHRvLCB0b1BhcmFtczogdG9QYXJhbXMsIG9wdGlvbnM6IG9wdGlvbnMgfTtcbiAgICAgICAgdmFyIHJlZGlyZWN0UmVzdWx0ID0gaGFuZGxlUmVkaXJlY3QocmVkaXJlY3QsIGZyb20uc2VsZiwgZnJvbVBhcmFtcywgb3B0aW9ucyk7XG5cbiAgICAgICAgaWYgKHJlZGlyZWN0UmVzdWx0KSB7XG4gICAgICAgICAgcmV0dXJuIHJlZGlyZWN0UmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWx3YXlzIHJldHJ5IG9uY2UgaWYgdGhlICRzdGF0ZU5vdEZvdW5kIHdhcyBub3QgcHJldmVudGVkXG4gICAgICAgIC8vIChoYW5kbGVzIGVpdGhlciByZWRpcmVjdCBjaGFuZ2VkIG9yIHN0YXRlIGxhenktZGVmaW5pdGlvbilcbiAgICAgICAgdG8gPSByZWRpcmVjdC50bztcbiAgICAgICAgdG9QYXJhbXMgPSByZWRpcmVjdC50b1BhcmFtcztcbiAgICAgICAgb3B0aW9ucyA9IHJlZGlyZWN0Lm9wdGlvbnM7XG4gICAgICAgIHRvU3RhdGUgPSBmaW5kU3RhdGUodG8sIG9wdGlvbnMucmVsYXRpdmUpO1xuXG4gICAgICAgIGlmICghaXNEZWZpbmVkKHRvU3RhdGUpKSB7XG4gICAgICAgICAgaWYgKCFvcHRpb25zLnJlbGF0aXZlKSB0aHJvdyBuZXcgRXJyb3IoXCJObyBzdWNoIHN0YXRlICdcIiArIHRvICsgXCInXCIpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCByZXNvbHZlICdcIiArIHRvICsgXCInIGZyb20gc3RhdGUgJ1wiICsgb3B0aW9ucy5yZWxhdGl2ZSArIFwiJ1wiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHRvU3RhdGVbYWJzdHJhY3RLZXldKSB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgdHJhbnNpdGlvbiB0byBhYnN0cmFjdCBzdGF0ZSAnXCIgKyB0byArIFwiJ1wiKTtcbiAgICAgIGlmIChvcHRpb25zLmluaGVyaXQpIHRvUGFyYW1zID0gaW5oZXJpdFBhcmFtcygkc3RhdGVQYXJhbXMsIHRvUGFyYW1zIHx8IHt9LCAkc3RhdGUuJGN1cnJlbnQsIHRvU3RhdGUpO1xuICAgICAgaWYgKCF0b1N0YXRlLnBhcmFtcy4kJHZhbGlkYXRlcyh0b1BhcmFtcykpIHJldHVybiBUcmFuc2l0aW9uRmFpbGVkO1xuXG4gICAgICB0b1BhcmFtcyA9IHRvU3RhdGUucGFyYW1zLiQkdmFsdWVzKHRvUGFyYW1zKTtcbiAgICAgIHRvID0gdG9TdGF0ZTtcblxuICAgICAgdmFyIHRvUGF0aCA9IHRvLnBhdGg7XG5cbiAgICAgIC8vIFN0YXJ0aW5nIGZyb20gdGhlIHJvb3Qgb2YgdGhlIHBhdGgsIGtlZXAgYWxsIGxldmVscyB0aGF0IGhhdmVuJ3QgY2hhbmdlZFxuICAgICAgdmFyIGtlZXAgPSAwLCBzdGF0ZSA9IHRvUGF0aFtrZWVwXSwgbG9jYWxzID0gcm9vdC5sb2NhbHMsIHRvTG9jYWxzID0gW107XG5cbiAgICAgIGlmICghb3B0aW9ucy5yZWxvYWQpIHtcbiAgICAgICAgd2hpbGUgKHN0YXRlICYmIHN0YXRlID09PSBmcm9tUGF0aFtrZWVwXSAmJiBzdGF0ZS5vd25QYXJhbXMuJCRlcXVhbHModG9QYXJhbXMsIGZyb21QYXJhbXMpKSB7XG4gICAgICAgICAgbG9jYWxzID0gdG9Mb2NhbHNba2VlcF0gPSBzdGF0ZS5sb2NhbHM7XG4gICAgICAgICAga2VlcCsrO1xuICAgICAgICAgIHN0YXRlID0gdG9QYXRoW2tlZXBdO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHdlJ3JlIGdvaW5nIHRvIHRoZSBzYW1lIHN0YXRlIGFuZCBhbGwgbG9jYWxzIGFyZSBrZXB0LCB3ZSd2ZSBnb3Qgbm90aGluZyB0byBkby5cbiAgICAgIC8vIEJ1dCBjbGVhciAndHJhbnNpdGlvbicsIGFzIHdlIHN0aWxsIHdhbnQgdG8gY2FuY2VsIGFueSBvdGhlciBwZW5kaW5nIHRyYW5zaXRpb25zLlxuICAgICAgLy8gVE9ETzogV2UgbWF5IG5vdCB3YW50IHRvIGJ1bXAgJ3RyYW5zaXRpb24nIGlmIHdlJ3JlIGNhbGxlZCBmcm9tIGEgbG9jYXRpb24gY2hhbmdlXG4gICAgICAvLyB0aGF0IHdlJ3ZlIGluaXRpYXRlZCBvdXJzZWx2ZXMsIGJlY2F1c2Ugd2UgbWlnaHQgYWNjaWRlbnRhbGx5IGFib3J0IGEgbGVnaXRpbWF0ZVxuICAgICAgLy8gdHJhbnNpdGlvbiBpbml0aWF0ZWQgZnJvbSBjb2RlP1xuICAgICAgaWYgKHNob3VsZFRyaWdnZXJSZWxvYWQodG8sIGZyb20sIGxvY2Fscywgb3B0aW9ucykpIHtcbiAgICAgICAgaWYgKHRvLnNlbGYucmVsb2FkT25TZWFyY2ggIT09IGZhbHNlKSAkdXJsUm91dGVyLnVwZGF0ZSgpO1xuICAgICAgICAkc3RhdGUudHJhbnNpdGlvbiA9IG51bGw7XG4gICAgICAgIHJldHVybiAkcS53aGVuKCRzdGF0ZS5jdXJyZW50KTtcbiAgICAgIH1cblxuICAgICAgLy8gRmlsdGVyIHBhcmFtZXRlcnMgYmVmb3JlIHdlIHBhc3MgdGhlbSB0byBldmVudCBoYW5kbGVycyBldGMuXG4gICAgICB0b1BhcmFtcyA9IGZpbHRlckJ5S2V5cyh0by5wYXJhbXMuJCRrZXlzKCksIHRvUGFyYW1zIHx8IHt9KTtcblxuICAgICAgLy8gQnJvYWRjYXN0IHN0YXJ0IGV2ZW50IGFuZCBjYW5jZWwgdGhlIHRyYW5zaXRpb24gaWYgcmVxdWVzdGVkXG4gICAgICBpZiAob3B0aW9ucy5ub3RpZnkpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBuZ2RvYyBldmVudFxuICAgICAgICAgKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlIyRzdGF0ZUNoYW5nZVN0YXJ0XG4gICAgICAgICAqIEBldmVudE9mIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVcbiAgICAgICAgICogQGV2ZW50VHlwZSBicm9hZGNhc3Qgb24gcm9vdCBzY29wZVxuICAgICAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgICAgICogRmlyZWQgd2hlbiB0aGUgc3RhdGUgdHJhbnNpdGlvbiAqKmJlZ2lucyoqLiBZb3UgY2FuIHVzZSBgZXZlbnQucHJldmVudERlZmF1bHQoKWBcbiAgICAgICAgICogdG8gcHJldmVudCB0aGUgdHJhbnNpdGlvbiBmcm9tIGhhcHBlbmluZyBhbmQgdGhlbiB0aGUgdHJhbnNpdGlvbiBwcm9taXNlIHdpbGwgYmVcbiAgICAgICAgICogcmVqZWN0ZWQgd2l0aCBhIGAndHJhbnNpdGlvbiBwcmV2ZW50ZWQnYCB2YWx1ZS5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IEV2ZW50IG9iamVjdC5cbiAgICAgICAgICogQHBhcmFtIHtTdGF0ZX0gdG9TdGF0ZSBUaGUgc3RhdGUgYmVpbmcgdHJhbnNpdGlvbmVkIHRvLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9QYXJhbXMgVGhlIHBhcmFtcyBzdXBwbGllZCB0byB0aGUgYHRvU3RhdGVgLlxuICAgICAgICAgKiBAcGFyYW0ge1N0YXRlfSBmcm9tU3RhdGUgVGhlIGN1cnJlbnQgc3RhdGUsIHByZS10cmFuc2l0aW9uLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gZnJvbVBhcmFtcyBUaGUgcGFyYW1zIHN1cHBsaWVkIHRvIHRoZSBgZnJvbVN0YXRlYC5cbiAgICAgICAgICpcbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICpcbiAgICAgICAgICogPHByZT5cbiAgICAgICAgICogJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JyxcbiAgICAgICAgICogZnVuY3Rpb24oZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zLCBmcm9tU3RhdGUsIGZyb21QYXJhbXMpe1xuICAgICAgICAgKiAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICogICAgIC8vIHRyYW5zaXRpb25UbygpIHByb21pc2Ugd2lsbCBiZSByZWplY3RlZCB3aXRoXG4gICAgICAgICAqICAgICAvLyBhICd0cmFuc2l0aW9uIHByZXZlbnRlZCcgZXJyb3JcbiAgICAgICAgICogfSlcbiAgICAgICAgICogPC9wcmU+XG4gICAgICAgICAqL1xuICAgICAgICBpZiAoJHJvb3RTY29wZS4kYnJvYWRjYXN0KCckc3RhdGVDaGFuZ2VTdGFydCcsIHRvLnNlbGYsIHRvUGFyYW1zLCBmcm9tLnNlbGYsIGZyb21QYXJhbXMpLmRlZmF1bHRQcmV2ZW50ZWQpIHtcbiAgICAgICAgICAkdXJsUm91dGVyLnVwZGF0ZSgpO1xuICAgICAgICAgIHJldHVybiBUcmFuc2l0aW9uUHJldmVudGVkO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFJlc29sdmUgbG9jYWxzIGZvciB0aGUgcmVtYWluaW5nIHN0YXRlcywgYnV0IGRvbid0IHVwZGF0ZSBhbnkgZ2xvYmFsIHN0YXRlIGp1c3RcbiAgICAgIC8vIHlldCAtLSBpZiBhbnl0aGluZyBmYWlscyB0byByZXNvbHZlIHRoZSBjdXJyZW50IHN0YXRlIG5lZWRzIHRvIHJlbWFpbiB1bnRvdWNoZWQuXG4gICAgICAvLyBXZSBhbHNvIHNldCB1cCBhbiBpbmhlcml0YW5jZSBjaGFpbiBmb3IgdGhlIGxvY2FscyBoZXJlLiBUaGlzIGFsbG93cyB0aGUgdmlldyBkaXJlY3RpdmVcbiAgICAgIC8vIHRvIHF1aWNrbHkgbG9vayB1cCB0aGUgY29ycmVjdCBkZWZpbml0aW9uIGZvciBlYWNoIHZpZXcgaW4gdGhlIGN1cnJlbnQgc3RhdGUuIEV2ZW5cbiAgICAgIC8vIHRob3VnaCB3ZSBjcmVhdGUgdGhlIGxvY2FscyBvYmplY3QgaXRzZWxmIG91dHNpZGUgcmVzb2x2ZVN0YXRlKCksIGl0IGlzIGluaXRpYWxseVxuICAgICAgLy8gZW1wdHkgYW5kIGdldHMgZmlsbGVkIGFzeW5jaHJvbm91c2x5LiBXZSBuZWVkIHRvIGtlZXAgdHJhY2sgb2YgdGhlIHByb21pc2UgZm9yIHRoZVxuICAgICAgLy8gKGZ1bGx5IHJlc29sdmVkKSBjdXJyZW50IGxvY2FscywgYW5kIHBhc3MgdGhpcyBkb3duIHRoZSBjaGFpbi5cbiAgICAgIHZhciByZXNvbHZlZCA9ICRxLndoZW4obG9jYWxzKTtcblxuICAgICAgZm9yICh2YXIgbCA9IGtlZXA7IGwgPCB0b1BhdGgubGVuZ3RoOyBsKyssIHN0YXRlID0gdG9QYXRoW2xdKSB7XG4gICAgICAgIGxvY2FscyA9IHRvTG9jYWxzW2xdID0gaW5oZXJpdChsb2NhbHMpO1xuICAgICAgICByZXNvbHZlZCA9IHJlc29sdmVTdGF0ZShzdGF0ZSwgdG9QYXJhbXMsIHN0YXRlID09PSB0bywgcmVzb2x2ZWQsIGxvY2Fscywgb3B0aW9ucyk7XG4gICAgICB9XG5cbiAgICAgIC8vIE9uY2UgZXZlcnl0aGluZyBpcyByZXNvbHZlZCwgd2UgYXJlIHJlYWR5IHRvIHBlcmZvcm0gdGhlIGFjdHVhbCB0cmFuc2l0aW9uXG4gICAgICAvLyBhbmQgcmV0dXJuIGEgcHJvbWlzZSBmb3IgdGhlIG5ldyBzdGF0ZS4gV2UgYWxzbyBrZWVwIHRyYWNrIG9mIHdoYXQgdGhlXG4gICAgICAvLyBjdXJyZW50IHByb21pc2UgaXMsIHNvIHRoYXQgd2UgY2FuIGRldGVjdCBvdmVybGFwcGluZyB0cmFuc2l0aW9ucyBhbmRcbiAgICAgIC8vIGtlZXAgb25seSB0aGUgb3V0Y29tZSBvZiB0aGUgbGFzdCB0cmFuc2l0aW9uLlxuICAgICAgdmFyIHRyYW5zaXRpb24gPSAkc3RhdGUudHJhbnNpdGlvbiA9IHJlc29sdmVkLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbCwgZW50ZXJpbmcsIGV4aXRpbmc7XG5cbiAgICAgICAgaWYgKCRzdGF0ZS50cmFuc2l0aW9uICE9PSB0cmFuc2l0aW9uKSByZXR1cm4gVHJhbnNpdGlvblN1cGVyc2VkZWQ7XG5cbiAgICAgICAgLy8gRXhpdCAnZnJvbScgc3RhdGVzIG5vdCBrZXB0XG4gICAgICAgIGZvciAobCA9IGZyb21QYXRoLmxlbmd0aCAtIDE7IGwgPj0ga2VlcDsgbC0tKSB7XG4gICAgICAgICAgZXhpdGluZyA9IGZyb21QYXRoW2xdO1xuICAgICAgICAgIGlmIChleGl0aW5nLnNlbGYub25FeGl0KSB7XG4gICAgICAgICAgICAkaW5qZWN0b3IuaW52b2tlKGV4aXRpbmcuc2VsZi5vbkV4aXQsIGV4aXRpbmcuc2VsZiwgZXhpdGluZy5sb2NhbHMuZ2xvYmFscyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGV4aXRpbmcubG9jYWxzID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEVudGVyICd0bycgc3RhdGVzIG5vdCBrZXB0XG4gICAgICAgIGZvciAobCA9IGtlZXA7IGwgPCB0b1BhdGgubGVuZ3RoOyBsKyspIHtcbiAgICAgICAgICBlbnRlcmluZyA9IHRvUGF0aFtsXTtcbiAgICAgICAgICBlbnRlcmluZy5sb2NhbHMgPSB0b0xvY2Fsc1tsXTtcbiAgICAgICAgICBpZiAoZW50ZXJpbmcuc2VsZi5vbkVudGVyKSB7XG4gICAgICAgICAgICAkaW5qZWN0b3IuaW52b2tlKGVudGVyaW5nLnNlbGYub25FbnRlciwgZW50ZXJpbmcuc2VsZiwgZW50ZXJpbmcubG9jYWxzLmdsb2JhbHMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJ1biBpdCBhZ2FpbiwgdG8gY2F0Y2ggYW55IHRyYW5zaXRpb25zIGluIGNhbGxiYWNrc1xuICAgICAgICBpZiAoJHN0YXRlLnRyYW5zaXRpb24gIT09IHRyYW5zaXRpb24pIHJldHVybiBUcmFuc2l0aW9uU3VwZXJzZWRlZDtcblxuICAgICAgICAvLyBVcGRhdGUgZ2xvYmFscyBpbiAkc3RhdGVcbiAgICAgICAgJHN0YXRlLiRjdXJyZW50ID0gdG87XG4gICAgICAgICRzdGF0ZS5jdXJyZW50ID0gdG8uc2VsZjtcbiAgICAgICAgJHN0YXRlLnBhcmFtcyA9IHRvUGFyYW1zO1xuICAgICAgICBjb3B5KCRzdGF0ZS5wYXJhbXMsICRzdGF0ZVBhcmFtcyk7XG4gICAgICAgICRzdGF0ZS50cmFuc2l0aW9uID0gbnVsbDtcblxuICAgICAgICBpZiAob3B0aW9ucy5sb2NhdGlvbiAmJiB0by5uYXZpZ2FibGUpIHtcbiAgICAgICAgICAkdXJsUm91dGVyLnB1c2godG8ubmF2aWdhYmxlLnVybCwgdG8ubmF2aWdhYmxlLmxvY2Fscy5nbG9iYWxzLiRzdGF0ZVBhcmFtcywge1xuICAgICAgICAgICAgJCRhdm9pZFJlc3luYzogdHJ1ZSwgcmVwbGFjZTogb3B0aW9ucy5sb2NhdGlvbiA9PT0gJ3JlcGxhY2UnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5ub3RpZnkpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBuZ2RvYyBldmVudFxuICAgICAgICAgKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlIyRzdGF0ZUNoYW5nZVN1Y2Nlc3NcbiAgICAgICAgICogQGV2ZW50T2YgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICAgICAgICAgKiBAZXZlbnRUeXBlIGJyb2FkY2FzdCBvbiByb290IHNjb3BlXG4gICAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICAgKiBGaXJlZCBvbmNlIHRoZSBzdGF0ZSB0cmFuc2l0aW9uIGlzICoqY29tcGxldGUqKi5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IEV2ZW50IG9iamVjdC5cbiAgICAgICAgICogQHBhcmFtIHtTdGF0ZX0gdG9TdGF0ZSBUaGUgc3RhdGUgYmVpbmcgdHJhbnNpdGlvbmVkIHRvLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9QYXJhbXMgVGhlIHBhcmFtcyBzdXBwbGllZCB0byB0aGUgYHRvU3RhdGVgLlxuICAgICAgICAgKiBAcGFyYW0ge1N0YXRlfSBmcm9tU3RhdGUgVGhlIGN1cnJlbnQgc3RhdGUsIHByZS10cmFuc2l0aW9uLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gZnJvbVBhcmFtcyBUaGUgcGFyYW1zIHN1cHBsaWVkIHRvIHRoZSBgZnJvbVN0YXRlYC5cbiAgICAgICAgICovXG4gICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCckc3RhdGVDaGFuZ2VTdWNjZXNzJywgdG8uc2VsZiwgdG9QYXJhbXMsIGZyb20uc2VsZiwgZnJvbVBhcmFtcyk7XG4gICAgICAgIH1cbiAgICAgICAgJHVybFJvdXRlci51cGRhdGUodHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuICRzdGF0ZS5jdXJyZW50O1xuICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIGlmICgkc3RhdGUudHJhbnNpdGlvbiAhPT0gdHJhbnNpdGlvbikgcmV0dXJuIFRyYW5zaXRpb25TdXBlcnNlZGVkO1xuXG4gICAgICAgICRzdGF0ZS50cmFuc2l0aW9uID0gbnVsbDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBuZ2RvYyBldmVudFxuICAgICAgICAgKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlIyRzdGF0ZUNoYW5nZUVycm9yXG4gICAgICAgICAqIEBldmVudE9mIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVcbiAgICAgICAgICogQGV2ZW50VHlwZSBicm9hZGNhc3Qgb24gcm9vdCBzY29wZVxuICAgICAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgICAgICogRmlyZWQgd2hlbiBhbiAqKmVycm9yIG9jY3VycyoqIGR1cmluZyB0cmFuc2l0aW9uLiBJdCdzIGltcG9ydGFudCB0byBub3RlIHRoYXQgaWYgeW91XG4gICAgICAgICAqIGhhdmUgYW55IGVycm9ycyBpbiB5b3VyIHJlc29sdmUgZnVuY3Rpb25zIChqYXZhc2NyaXB0IGVycm9ycywgbm9uLWV4aXN0ZW50IHNlcnZpY2VzLCBldGMpXG4gICAgICAgICAqIHRoZXkgd2lsbCBub3QgdGhyb3cgdHJhZGl0aW9uYWxseS4gWW91IG11c3QgbGlzdGVuIGZvciB0aGlzICRzdGF0ZUNoYW5nZUVycm9yIGV2ZW50IHRvXG4gICAgICAgICAqIGNhdGNoICoqQUxMKiogZXJyb3JzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gZXZlbnQgRXZlbnQgb2JqZWN0LlxuICAgICAgICAgKiBAcGFyYW0ge1N0YXRlfSB0b1N0YXRlIFRoZSBzdGF0ZSBiZWluZyB0cmFuc2l0aW9uZWQgdG8uXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0b1BhcmFtcyBUaGUgcGFyYW1zIHN1cHBsaWVkIHRvIHRoZSBgdG9TdGF0ZWAuXG4gICAgICAgICAqIEBwYXJhbSB7U3RhdGV9IGZyb21TdGF0ZSBUaGUgY3VycmVudCBzdGF0ZSwgcHJlLXRyYW5zaXRpb24uXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmcm9tUGFyYW1zIFRoZSBwYXJhbXMgc3VwcGxpZWQgdG8gdGhlIGBmcm9tU3RhdGVgLlxuICAgICAgICAgKiBAcGFyYW0ge0Vycm9yfSBlcnJvciBUaGUgcmVzb2x2ZSBlcnJvciBvYmplY3QuXG4gICAgICAgICAqL1xuICAgICAgICBldnQgPSAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJyRzdGF0ZUNoYW5nZUVycm9yJywgdG8uc2VsZiwgdG9QYXJhbXMsIGZyb20uc2VsZiwgZnJvbVBhcmFtcywgZXJyb3IpO1xuXG4gICAgICAgIGlmICghZXZ0LmRlZmF1bHRQcmV2ZW50ZWQpIHtcbiAgICAgICAgICAgICR1cmxSb3V0ZXIudXBkYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJHEucmVqZWN0KGVycm9yKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gdHJhbnNpdGlvbjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSNpc1xuICAgICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlXG4gICAgICpcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBTaW1pbGFyIHRvIHtAbGluayB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlI21ldGhvZHNfaW5jbHVkZXMgJHN0YXRlLmluY2x1ZGVzfSxcbiAgICAgKiBidXQgb25seSBjaGVja3MgZm9yIHRoZSBmdWxsIHN0YXRlIG5hbWUuIElmIHBhcmFtcyBpcyBzdXBwbGllZCB0aGVuIGl0IHdpbGwgYmVcbiAgICAgKiB0ZXN0ZWQgZm9yIHN0cmljdCBlcXVhbGl0eSBhZ2FpbnN0IHRoZSBjdXJyZW50IGFjdGl2ZSBwYXJhbXMgb2JqZWN0LCBzbyBhbGwgcGFyYW1zXG4gICAgICogbXVzdCBtYXRjaCB3aXRoIG5vbmUgbWlzc2luZyBhbmQgbm8gZXh0cmFzLlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiA8cHJlPlxuICAgICAqICRzdGF0ZS4kY3VycmVudC5uYW1lID0gJ2NvbnRhY3RzLmRldGFpbHMuaXRlbSc7XG4gICAgICpcbiAgICAgKiAvLyBhYnNvbHV0ZSBuYW1lXG4gICAgICogJHN0YXRlLmlzKCdjb250YWN0LmRldGFpbHMuaXRlbScpOyAvLyByZXR1cm5zIHRydWVcbiAgICAgKiAkc3RhdGUuaXMoY29udGFjdERldGFpbEl0ZW1TdGF0ZU9iamVjdCk7IC8vIHJldHVybnMgdHJ1ZVxuICAgICAqXG4gICAgICogLy8gcmVsYXRpdmUgbmFtZSAoLiBhbmQgXiksIHR5cGljYWxseSBmcm9tIGEgdGVtcGxhdGVcbiAgICAgKiAvLyBFLmcuIGZyb20gdGhlICdjb250YWN0cy5kZXRhaWxzJyB0ZW1wbGF0ZVxuICAgICAqIDxkaXYgbmctY2xhc3M9XCJ7aGlnaGxpZ2h0ZWQ6ICRzdGF0ZS5pcygnLml0ZW0nKX1cIj5JdGVtPC9kaXY+XG4gICAgICogPC9wcmU+XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHN0YXRlT3JOYW1lIFRoZSBzdGF0ZSBuYW1lIChhYnNvbHV0ZSBvciByZWxhdGl2ZSkgb3Igc3RhdGUgb2JqZWN0IHlvdSdkIGxpa2UgdG8gY2hlY2suXG4gICAgICogQHBhcmFtIHtvYmplY3Q9fSBwYXJhbXMgQSBwYXJhbSBvYmplY3QsIGUuZy4gYHtzZWN0aW9uSWQ6IHNlY3Rpb24uaWR9YCwgdGhhdCB5b3UnZCBsaWtlXG4gICAgICogdG8gdGVzdCBhZ2FpbnN0IHRoZSBjdXJyZW50IGFjdGl2ZSBzdGF0ZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdD19IG9wdGlvbnMgQW4gb3B0aW9ucyBvYmplY3QuICBUaGUgb3B0aW9ucyBhcmU6XG4gICAgICpcbiAgICAgKiAtICoqYHJlbGF0aXZlYCoqIC0ge3N0cmluZ3xvYmplY3R9IC0gIElmIGBzdGF0ZU9yTmFtZWAgaXMgYSByZWxhdGl2ZSBzdGF0ZSBuYW1lIGFuZCBgb3B0aW9ucy5yZWxhdGl2ZWAgaXMgc2V0LCAuaXMgd2lsbFxuICAgICAqIHRlc3QgcmVsYXRpdmUgdG8gYG9wdGlvbnMucmVsYXRpdmVgIHN0YXRlIChvciBuYW1lKS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIHRydWUgaWYgaXQgaXMgdGhlIHN0YXRlLlxuICAgICAqL1xuICAgICRzdGF0ZS5pcyA9IGZ1bmN0aW9uIGlzKHN0YXRlT3JOYW1lLCBwYXJhbXMsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBleHRlbmQoeyByZWxhdGl2ZTogJHN0YXRlLiRjdXJyZW50IH0sIG9wdGlvbnMgfHwge30pO1xuICAgICAgdmFyIHN0YXRlID0gZmluZFN0YXRlKHN0YXRlT3JOYW1lLCBvcHRpb25zLnJlbGF0aXZlKTtcblxuICAgICAgaWYgKCFpc0RlZmluZWQoc3RhdGUpKSB7IHJldHVybiB1bmRlZmluZWQ7IH1cbiAgICAgIGlmICgkc3RhdGUuJGN1cnJlbnQgIT09IHN0YXRlKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgcmV0dXJuIHBhcmFtcyA/IGVxdWFsRm9yS2V5cyhzdGF0ZS5wYXJhbXMuJCR2YWx1ZXMocGFyYW1zKSwgJHN0YXRlUGFyYW1zKSA6IHRydWU7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGUjaW5jbHVkZXNcbiAgICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICAgICAqXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogQSBtZXRob2QgdG8gZGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IGFjdGl2ZSBzdGF0ZSBpcyBlcXVhbCB0byBvciBpcyB0aGUgY2hpbGQgb2YgdGhlXG4gICAgICogc3RhdGUgc3RhdGVOYW1lLiBJZiBhbnkgcGFyYW1zIGFyZSBwYXNzZWQgdGhlbiB0aGV5IHdpbGwgYmUgdGVzdGVkIGZvciBhIG1hdGNoIGFzIHdlbGwuXG4gICAgICogTm90IGFsbCB0aGUgcGFyYW1ldGVycyBuZWVkIHRvIGJlIHBhc3NlZCwganVzdCB0aGUgb25lcyB5b3UnZCBsaWtlIHRvIHRlc3QgZm9yIGVxdWFsaXR5LlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBQYXJ0aWFsIGFuZCByZWxhdGl2ZSBuYW1lc1xuICAgICAqIDxwcmU+XG4gICAgICogJHN0YXRlLiRjdXJyZW50Lm5hbWUgPSAnY29udGFjdHMuZGV0YWlscy5pdGVtJztcbiAgICAgKlxuICAgICAqIC8vIFVzaW5nIHBhcnRpYWwgbmFtZXNcbiAgICAgKiAkc3RhdGUuaW5jbHVkZXMoXCJjb250YWN0c1wiKTsgLy8gcmV0dXJucyB0cnVlXG4gICAgICogJHN0YXRlLmluY2x1ZGVzKFwiY29udGFjdHMuZGV0YWlsc1wiKTsgLy8gcmV0dXJucyB0cnVlXG4gICAgICogJHN0YXRlLmluY2x1ZGVzKFwiY29udGFjdHMuZGV0YWlscy5pdGVtXCIpOyAvLyByZXR1cm5zIHRydWVcbiAgICAgKiAkc3RhdGUuaW5jbHVkZXMoXCJjb250YWN0cy5saXN0XCIpOyAvLyByZXR1cm5zIGZhbHNlXG4gICAgICogJHN0YXRlLmluY2x1ZGVzKFwiYWJvdXRcIik7IC8vIHJldHVybnMgZmFsc2VcbiAgICAgKlxuICAgICAqIC8vIFVzaW5nIHJlbGF0aXZlIG5hbWVzICguIGFuZCBeKSwgdHlwaWNhbGx5IGZyb20gYSB0ZW1wbGF0ZVxuICAgICAqIC8vIEUuZy4gZnJvbSB0aGUgJ2NvbnRhY3RzLmRldGFpbHMnIHRlbXBsYXRlXG4gICAgICogPGRpdiBuZy1jbGFzcz1cIntoaWdobGlnaHRlZDogJHN0YXRlLmluY2x1ZGVzKCcuaXRlbScpfVwiPkl0ZW08L2Rpdj5cbiAgICAgKiA8L3ByZT5cbiAgICAgKlxuICAgICAqIEJhc2ljIGdsb2JiaW5nIHBhdHRlcm5zXG4gICAgICogPHByZT5cbiAgICAgKiAkc3RhdGUuJGN1cnJlbnQubmFtZSA9ICdjb250YWN0cy5kZXRhaWxzLml0ZW0udXJsJztcbiAgICAgKlxuICAgICAqICRzdGF0ZS5pbmNsdWRlcyhcIiouZGV0YWlscy4qLipcIik7IC8vIHJldHVybnMgdHJ1ZVxuICAgICAqICRzdGF0ZS5pbmNsdWRlcyhcIiouZGV0YWlscy4qKlwiKTsgLy8gcmV0dXJucyB0cnVlXG4gICAgICogJHN0YXRlLmluY2x1ZGVzKFwiKiouaXRlbS4qKlwiKTsgLy8gcmV0dXJucyB0cnVlXG4gICAgICogJHN0YXRlLmluY2x1ZGVzKFwiKi5kZXRhaWxzLml0ZW0udXJsXCIpOyAvLyByZXR1cm5zIHRydWVcbiAgICAgKiAkc3RhdGUuaW5jbHVkZXMoXCIqLmRldGFpbHMuKi51cmxcIik7IC8vIHJldHVybnMgdHJ1ZVxuICAgICAqICRzdGF0ZS5pbmNsdWRlcyhcIiouZGV0YWlscy4qXCIpOyAvLyByZXR1cm5zIGZhbHNlXG4gICAgICogJHN0YXRlLmluY2x1ZGVzKFwiaXRlbS4qKlwiKTsgLy8gcmV0dXJucyBmYWxzZVxuICAgICAqIDwvcHJlPlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHN0YXRlT3JOYW1lIEEgcGFydGlhbCBuYW1lLCByZWxhdGl2ZSBuYW1lLCBvciBnbG9iIHBhdHRlcm5cbiAgICAgKiB0byBiZSBzZWFyY2hlZCBmb3Igd2l0aGluIHRoZSBjdXJyZW50IHN0YXRlIG5hbWUuXG4gICAgICogQHBhcmFtIHtvYmplY3Q9fSBwYXJhbXMgQSBwYXJhbSBvYmplY3QsIGUuZy4gYHtzZWN0aW9uSWQ6IHNlY3Rpb24uaWR9YCxcbiAgICAgKiB0aGF0IHlvdSdkIGxpa2UgdG8gdGVzdCBhZ2FpbnN0IHRoZSBjdXJyZW50IGFjdGl2ZSBzdGF0ZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdD19IG9wdGlvbnMgQW4gb3B0aW9ucyBvYmplY3QuICBUaGUgb3B0aW9ucyBhcmU6XG4gICAgICpcbiAgICAgKiAtICoqYHJlbGF0aXZlYCoqIC0ge3N0cmluZ3xvYmplY3Q9fSAtICBJZiBgc3RhdGVPck5hbWVgIGlzIGEgcmVsYXRpdmUgc3RhdGUgcmVmZXJlbmNlIGFuZCBgb3B0aW9ucy5yZWxhdGl2ZWAgaXMgc2V0LFxuICAgICAqIC5pbmNsdWRlcyB3aWxsIHRlc3QgcmVsYXRpdmUgdG8gYG9wdGlvbnMucmVsYXRpdmVgIHN0YXRlIChvciBuYW1lKS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIHRydWUgaWYgaXQgZG9lcyBpbmNsdWRlIHRoZSBzdGF0ZVxuICAgICAqL1xuICAgICRzdGF0ZS5pbmNsdWRlcyA9IGZ1bmN0aW9uIGluY2x1ZGVzKHN0YXRlT3JOYW1lLCBwYXJhbXMsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBleHRlbmQoeyByZWxhdGl2ZTogJHN0YXRlLiRjdXJyZW50IH0sIG9wdGlvbnMgfHwge30pO1xuICAgICAgaWYgKGlzU3RyaW5nKHN0YXRlT3JOYW1lKSAmJiBpc0dsb2Ioc3RhdGVPck5hbWUpKSB7XG4gICAgICAgIGlmICghZG9lc1N0YXRlTWF0Y2hHbG9iKHN0YXRlT3JOYW1lKSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZU9yTmFtZSA9ICRzdGF0ZS4kY3VycmVudC5uYW1lO1xuICAgICAgfVxuXG4gICAgICB2YXIgc3RhdGUgPSBmaW5kU3RhdGUoc3RhdGVPck5hbWUsIG9wdGlvbnMucmVsYXRpdmUpO1xuICAgICAgaWYgKCFpc0RlZmluZWQoc3RhdGUpKSB7IHJldHVybiB1bmRlZmluZWQ7IH1cbiAgICAgIGlmICghaXNEZWZpbmVkKCRzdGF0ZS4kY3VycmVudC5pbmNsdWRlc1tzdGF0ZS5uYW1lXSkpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICByZXR1cm4gcGFyYW1zID8gZXF1YWxGb3JLZXlzKHN0YXRlLnBhcmFtcy4kJHZhbHVlcyhwYXJhbXMpLCAkc3RhdGVQYXJhbXMsIG9iamVjdEtleXMocGFyYW1zKSkgOiB0cnVlO1xuICAgIH07XG5cblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGUjaHJlZlxuICAgICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlXG4gICAgICpcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBBIHVybCBnZW5lcmF0aW9uIG1ldGhvZCB0aGF0IHJldHVybnMgdGhlIGNvbXBpbGVkIHVybCBmb3IgdGhlIGdpdmVuIHN0YXRlIHBvcHVsYXRlZCB3aXRoIHRoZSBnaXZlbiBwYXJhbXMuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIDxwcmU+XG4gICAgICogZXhwZWN0KCRzdGF0ZS5ocmVmKFwiYWJvdXQucGVyc29uXCIsIHsgcGVyc29uOiBcImJvYlwiIH0pKS50b0VxdWFsKFwiL2Fib3V0L2JvYlwiKTtcbiAgICAgKiA8L3ByZT5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gc3RhdGVPck5hbWUgVGhlIHN0YXRlIG5hbWUgb3Igc3RhdGUgb2JqZWN0IHlvdSdkIGxpa2UgdG8gZ2VuZXJhdGUgYSB1cmwgZnJvbS5cbiAgICAgKiBAcGFyYW0ge29iamVjdD19IHBhcmFtcyBBbiBvYmplY3Qgb2YgcGFyYW1ldGVyIHZhbHVlcyB0byBmaWxsIHRoZSBzdGF0ZSdzIHJlcXVpcmVkIHBhcmFtZXRlcnMuXG4gICAgICogQHBhcmFtIHtvYmplY3Q9fSBvcHRpb25zIE9wdGlvbnMgb2JqZWN0LiBUaGUgb3B0aW9ucyBhcmU6XG4gICAgICpcbiAgICAgKiAtICoqYGxvc3N5YCoqIC0ge2Jvb2xlYW49dHJ1ZX0gLSAgSWYgdHJ1ZSwgYW5kIGlmIHRoZXJlIGlzIG5vIHVybCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YXRlIHByb3ZpZGVkIGluIHRoZVxuICAgICAqICAgIGZpcnN0IHBhcmFtZXRlciwgdGhlbiB0aGUgY29uc3RydWN0ZWQgaHJlZiB1cmwgd2lsbCBiZSBidWlsdCBmcm9tIHRoZSBmaXJzdCBuYXZpZ2FibGUgYW5jZXN0b3IgKGFrYVxuICAgICAqICAgIGFuY2VzdG9yIHdpdGggYSB2YWxpZCB1cmwpLlxuICAgICAqIC0gKipgaW5oZXJpdGAqKiAtIHtib29sZWFuPXRydWV9LCBJZiBgdHJ1ZWAgd2lsbCBpbmhlcml0IHVybCBwYXJhbWV0ZXJzIGZyb20gY3VycmVudCB1cmwuXG4gICAgICogLSAqKmByZWxhdGl2ZWAqKiAtIHtvYmplY3Q9JHN0YXRlLiRjdXJyZW50fSwgV2hlbiB0cmFuc2l0aW9uaW5nIHdpdGggcmVsYXRpdmUgcGF0aCAoZS5nICdeJyksIFxuICAgICAqICAgIGRlZmluZXMgd2hpY2ggc3RhdGUgdG8gYmUgcmVsYXRpdmUgZnJvbS5cbiAgICAgKiAtICoqYGFic29sdXRlYCoqIC0ge2Jvb2xlYW49ZmFsc2V9LCAgSWYgdHJ1ZSB3aWxsIGdlbmVyYXRlIGFuIGFic29sdXRlIHVybCwgZS5nLiBcImh0dHA6Ly93d3cuZXhhbXBsZS5jb20vZnVsbHVybFwiLlxuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IGNvbXBpbGVkIHN0YXRlIHVybFxuICAgICAqL1xuICAgICRzdGF0ZS5ocmVmID0gZnVuY3Rpb24gaHJlZihzdGF0ZU9yTmFtZSwgcGFyYW1zLCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gZXh0ZW5kKHtcbiAgICAgICAgbG9zc3k6ICAgIHRydWUsXG4gICAgICAgIGluaGVyaXQ6ICB0cnVlLFxuICAgICAgICBhYnNvbHV0ZTogZmFsc2UsXG4gICAgICAgIHJlbGF0aXZlOiAkc3RhdGUuJGN1cnJlbnRcbiAgICAgIH0sIG9wdGlvbnMgfHwge30pO1xuXG4gICAgICB2YXIgc3RhdGUgPSBmaW5kU3RhdGUoc3RhdGVPck5hbWUsIG9wdGlvbnMucmVsYXRpdmUpO1xuXG4gICAgICBpZiAoIWlzRGVmaW5lZChzdGF0ZSkpIHJldHVybiBudWxsO1xuICAgICAgaWYgKG9wdGlvbnMuaW5oZXJpdCkgcGFyYW1zID0gaW5oZXJpdFBhcmFtcygkc3RhdGVQYXJhbXMsIHBhcmFtcyB8fCB7fSwgJHN0YXRlLiRjdXJyZW50LCBzdGF0ZSk7XG4gICAgICBcbiAgICAgIHZhciBuYXYgPSAoc3RhdGUgJiYgb3B0aW9ucy5sb3NzeSkgPyBzdGF0ZS5uYXZpZ2FibGUgOiBzdGF0ZTtcblxuICAgICAgaWYgKCFuYXYgfHwgbmF2LnVybCA9PT0gdW5kZWZpbmVkIHx8IG5hdi51cmwgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gJHVybFJvdXRlci5ocmVmKG5hdi51cmwsIGZpbHRlckJ5S2V5cyhzdGF0ZS5wYXJhbXMuJCRrZXlzKCksIHBhcmFtcyB8fCB7fSksIHtcbiAgICAgICAgYWJzb2x1dGU6IG9wdGlvbnMuYWJzb2x1dGVcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlI2dldFxuICAgICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlXG4gICAgICpcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBSZXR1cm5zIHRoZSBzdGF0ZSBjb25maWd1cmF0aW9uIG9iamVjdCBmb3IgYW55IHNwZWNpZmljIHN0YXRlIG9yIGFsbCBzdGF0ZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3Q9fSBzdGF0ZU9yTmFtZSAoYWJzb2x1dGUgb3IgcmVsYXRpdmUpIElmIHByb3ZpZGVkLCB3aWxsIG9ubHkgZ2V0IHRoZSBjb25maWcgZm9yXG4gICAgICogdGhlIHJlcXVlc3RlZCBzdGF0ZS4gSWYgbm90IHByb3ZpZGVkLCByZXR1cm5zIGFuIGFycmF5IG9mIEFMTCBzdGF0ZSBjb25maWdzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdD19IGNvbnRleHQgV2hlbiBzdGF0ZU9yTmFtZSBpcyBhIHJlbGF0aXZlIHN0YXRlIHJlZmVyZW5jZSwgdGhlIHN0YXRlIHdpbGwgYmUgcmV0cmlldmVkIHJlbGF0aXZlIHRvIGNvbnRleHQuXG4gICAgICogQHJldHVybnMge09iamVjdHxBcnJheX0gU3RhdGUgY29uZmlndXJhdGlvbiBvYmplY3Qgb3IgYXJyYXkgb2YgYWxsIG9iamVjdHMuXG4gICAgICovXG4gICAgJHN0YXRlLmdldCA9IGZ1bmN0aW9uIChzdGF0ZU9yTmFtZSwgY29udGV4dCkge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHJldHVybiBtYXAob2JqZWN0S2V5cyhzdGF0ZXMpLCBmdW5jdGlvbihuYW1lKSB7IHJldHVybiBzdGF0ZXNbbmFtZV0uc2VsZjsgfSk7XG4gICAgICB2YXIgc3RhdGUgPSBmaW5kU3RhdGUoc3RhdGVPck5hbWUsIGNvbnRleHQgfHwgJHN0YXRlLiRjdXJyZW50KTtcbiAgICAgIHJldHVybiAoc3RhdGUgJiYgc3RhdGUuc2VsZikgPyBzdGF0ZS5zZWxmIDogbnVsbDtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gcmVzb2x2ZVN0YXRlKHN0YXRlLCBwYXJhbXMsIHBhcmFtc0FyZUZpbHRlcmVkLCBpbmhlcml0ZWQsIGRzdCwgb3B0aW9ucykge1xuICAgICAgLy8gTWFrZSBhIHJlc3RyaWN0ZWQgJHN0YXRlUGFyYW1zIHdpdGggb25seSB0aGUgcGFyYW1ldGVycyB0aGF0IGFwcGx5IHRvIHRoaXMgc3RhdGUgaWZcbiAgICAgIC8vIG5lY2Vzc2FyeS4gSW4gYWRkaXRpb24gdG8gYmVpbmcgYXZhaWxhYmxlIHRvIHRoZSBjb250cm9sbGVyIGFuZCBvbkVudGVyL29uRXhpdCBjYWxsYmFja3MsXG4gICAgICAvLyB3ZSBhbHNvIG5lZWQgJHN0YXRlUGFyYW1zIHRvIGJlIGF2YWlsYWJsZSBmb3IgYW55ICRpbmplY3RvciBjYWxscyB3ZSBtYWtlIGR1cmluZyB0aGVcbiAgICAgIC8vIGRlcGVuZGVuY3kgcmVzb2x1dGlvbiBwcm9jZXNzLlxuICAgICAgdmFyICRzdGF0ZVBhcmFtcyA9IChwYXJhbXNBcmVGaWx0ZXJlZCkgPyBwYXJhbXMgOiBmaWx0ZXJCeUtleXMoc3RhdGUucGFyYW1zLiQka2V5cygpLCBwYXJhbXMpO1xuICAgICAgdmFyIGxvY2FscyA9IHsgJHN0YXRlUGFyYW1zOiAkc3RhdGVQYXJhbXMgfTtcblxuICAgICAgLy8gUmVzb2x2ZSAnZ2xvYmFsJyBkZXBlbmRlbmNpZXMgZm9yIHRoZSBzdGF0ZSwgaS5lLiB0aG9zZSBub3Qgc3BlY2lmaWMgdG8gYSB2aWV3LlxuICAgICAgLy8gV2UncmUgYWxzbyBpbmNsdWRpbmcgJHN0YXRlUGFyYW1zIGluIHRoaXM7IHRoYXQgd2F5IHRoZSBwYXJhbWV0ZXJzIGFyZSByZXN0cmljdGVkXG4gICAgICAvLyB0byB0aGUgc2V0IHRoYXQgc2hvdWxkIGJlIHZpc2libGUgdG8gdGhlIHN0YXRlLCBhbmQgYXJlIGluZGVwZW5kZW50IG9mIHdoZW4gd2UgdXBkYXRlXG4gICAgICAvLyB0aGUgZ2xvYmFsICRzdGF0ZSBhbmQgJHN0YXRlUGFyYW1zIHZhbHVlcy5cbiAgICAgIGRzdC5yZXNvbHZlID0gJHJlc29sdmUucmVzb2x2ZShzdGF0ZS5yZXNvbHZlLCBsb2NhbHMsIGRzdC5yZXNvbHZlLCBzdGF0ZSk7XG4gICAgICB2YXIgcHJvbWlzZXMgPSBbZHN0LnJlc29sdmUudGhlbihmdW5jdGlvbiAoZ2xvYmFscykge1xuICAgICAgICBkc3QuZ2xvYmFscyA9IGdsb2JhbHM7XG4gICAgICB9KV07XG4gICAgICBpZiAoaW5oZXJpdGVkKSBwcm9taXNlcy5wdXNoKGluaGVyaXRlZCk7XG5cbiAgICAgIC8vIFJlc29sdmUgdGVtcGxhdGUgYW5kIGRlcGVuZGVuY2llcyBmb3IgYWxsIHZpZXdzLlxuICAgICAgZm9yRWFjaChzdGF0ZS52aWV3cywgZnVuY3Rpb24gKHZpZXcsIG5hbWUpIHtcbiAgICAgICAgdmFyIGluamVjdGFibGVzID0gKHZpZXcucmVzb2x2ZSAmJiB2aWV3LnJlc29sdmUgIT09IHN0YXRlLnJlc29sdmUgPyB2aWV3LnJlc29sdmUgOiB7fSk7XG4gICAgICAgIGluamVjdGFibGVzLiR0ZW1wbGF0ZSA9IFsgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiAkdmlldy5sb2FkKG5hbWUsIHsgdmlldzogdmlldywgbG9jYWxzOiBsb2NhbHMsIHBhcmFtczogJHN0YXRlUGFyYW1zLCBub3RpZnk6IG9wdGlvbnMubm90aWZ5IH0pIHx8ICcnO1xuICAgICAgICB9XTtcblxuICAgICAgICBwcm9taXNlcy5wdXNoKCRyZXNvbHZlLnJlc29sdmUoaW5qZWN0YWJsZXMsIGxvY2FscywgZHN0LnJlc29sdmUsIHN0YXRlKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAvLyBSZWZlcmVuY2VzIHRvIHRoZSBjb250cm9sbGVyIChvbmx5IGluc3RhbnRpYXRlZCBhdCBsaW5rIHRpbWUpXG4gICAgICAgICAgaWYgKGlzRnVuY3Rpb24odmlldy5jb250cm9sbGVyUHJvdmlkZXIpIHx8IGlzQXJyYXkodmlldy5jb250cm9sbGVyUHJvdmlkZXIpKSB7XG4gICAgICAgICAgICB2YXIgaW5qZWN0TG9jYWxzID0gYW5ndWxhci5leHRlbmQoe30sIGluamVjdGFibGVzLCBsb2NhbHMpO1xuICAgICAgICAgICAgcmVzdWx0LiQkY29udHJvbGxlciA9ICRpbmplY3Rvci5pbnZva2Uodmlldy5jb250cm9sbGVyUHJvdmlkZXIsIG51bGwsIGluamVjdExvY2Fscyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdC4kJGNvbnRyb2xsZXIgPSB2aWV3LmNvbnRyb2xsZXI7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFByb3ZpZGUgYWNjZXNzIHRvIHRoZSBzdGF0ZSBpdHNlbGYgZm9yIGludGVybmFsIHVzZVxuICAgICAgICAgIHJlc3VsdC4kJHN0YXRlID0gc3RhdGU7XG4gICAgICAgICAgcmVzdWx0LiQkY29udHJvbGxlckFzID0gdmlldy5jb250cm9sbGVyQXM7XG4gICAgICAgICAgZHN0W25hbWVdID0gcmVzdWx0O1xuICAgICAgICB9KSk7XG4gICAgICB9KTtcblxuICAgICAgLy8gV2FpdCBmb3IgYWxsIHRoZSBwcm9taXNlcyBhbmQgdGhlbiByZXR1cm4gdGhlIGFjdGl2YXRpb24gb2JqZWN0XG4gICAgICByZXR1cm4gJHEuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgICAgICAgcmV0dXJuIGRzdDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiAkc3RhdGU7XG4gIH1cblxuICBmdW5jdGlvbiBzaG91bGRUcmlnZ2VyUmVsb2FkKHRvLCBmcm9tLCBsb2NhbHMsIG9wdGlvbnMpIHtcbiAgICBpZiAodG8gPT09IGZyb20gJiYgKChsb2NhbHMgPT09IGZyb20ubG9jYWxzICYmICFvcHRpb25zLnJlbG9hZCkgfHwgKHRvLnNlbGYucmVsb2FkT25TZWFyY2ggPT09IGZhbHNlKSkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxufVxuXG5hbmd1bGFyLm1vZHVsZSgndWkucm91dGVyLnN0YXRlJylcbiAgLnZhbHVlKCckc3RhdGVQYXJhbXMnLCB7fSlcbiAgLnByb3ZpZGVyKCckc3RhdGUnLCAkU3RhdGVQcm92aWRlcik7XG5cblxuJFZpZXdQcm92aWRlci4kaW5qZWN0ID0gW107XG5mdW5jdGlvbiAkVmlld1Byb3ZpZGVyKCkge1xuXG4gIHRoaXMuJGdldCA9ICRnZXQ7XG4gIC8qKlxuICAgKiBAbmdkb2Mgb2JqZWN0XG4gICAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS4kdmlld1xuICAgKlxuICAgKiBAcmVxdWlyZXMgdWkucm91dGVyLnV0aWwuJHRlbXBsYXRlRmFjdG9yeVxuICAgKiBAcmVxdWlyZXMgJHJvb3RTY29wZVxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICpcbiAgICovXG4gICRnZXQuJGluamVjdCA9IFsnJHJvb3RTY29wZScsICckdGVtcGxhdGVGYWN0b3J5J107XG4gIGZ1bmN0aW9uICRnZXQoICAgJHJvb3RTY29wZSwgICAkdGVtcGxhdGVGYWN0b3J5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIC8vICR2aWV3LmxvYWQoJ2Z1bGwudmlld05hbWUnLCB7IHRlbXBsYXRlOiAuLi4sIGNvbnRyb2xsZXI6IC4uLiwgcmVzb2x2ZTogLi4uLCBhc3luYzogZmFsc2UsIHBhcmFtczogLi4uIH0pXG4gICAgICAvKipcbiAgICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAgICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiR2aWV3I2xvYWRcbiAgICAgICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIuc3RhdGUuJHZpZXdcbiAgICAgICAqXG4gICAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBuYW1lXG4gICAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBvcHRpb24gb2JqZWN0LlxuICAgICAgICovXG4gICAgICBsb2FkOiBmdW5jdGlvbiBsb2FkKG5hbWUsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHJlc3VsdCwgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgdGVtcGxhdGU6IG51bGwsIGNvbnRyb2xsZXI6IG51bGwsIHZpZXc6IG51bGwsIGxvY2FsczogbnVsbCwgbm90aWZ5OiB0cnVlLCBhc3luYzogdHJ1ZSwgcGFyYW1zOiB7fVxuICAgICAgICB9O1xuICAgICAgICBvcHRpb25zID0gZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgICAgICBpZiAob3B0aW9ucy52aWV3KSB7XG4gICAgICAgICAgcmVzdWx0ID0gJHRlbXBsYXRlRmFjdG9yeS5mcm9tQ29uZmlnKG9wdGlvbnMudmlldywgb3B0aW9ucy5wYXJhbXMsIG9wdGlvbnMubG9jYWxzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0ICYmIG9wdGlvbnMubm90aWZ5KSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAbmdkb2MgZXZlbnRcbiAgICAgICAgICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSMkdmlld0NvbnRlbnRMb2FkaW5nXG4gICAgICAgICAqIEBldmVudE9mIHVpLnJvdXRlci5zdGF0ZS4kdmlld1xuICAgICAgICAgKiBAZXZlbnRUeXBlIGJyb2FkY2FzdCBvbiByb290IHNjb3BlXG4gICAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICAgKlxuICAgICAgICAgKiBGaXJlZCBvbmNlIHRoZSB2aWV3ICoqYmVnaW5zIGxvYWRpbmcqKiwgKmJlZm9yZSogdGhlIERPTSBpcyByZW5kZXJlZC5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IEV2ZW50IG9iamVjdC5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IHZpZXdDb25maWcgVGhlIHZpZXcgY29uZmlnIHByb3BlcnRpZXMgKHRlbXBsYXRlLCBjb250cm9sbGVyLCBldGMpLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgKlxuICAgICAgICAgKiA8cHJlPlxuICAgICAgICAgKiAkc2NvcGUuJG9uKCckdmlld0NvbnRlbnRMb2FkaW5nJyxcbiAgICAgICAgICogZnVuY3Rpb24oZXZlbnQsIHZpZXdDb25maWcpe1xuICAgICAgICAgKiAgICAgLy8gQWNjZXNzIHRvIGFsbCB0aGUgdmlldyBjb25maWcgcHJvcGVydGllcy5cbiAgICAgICAgICogICAgIC8vIGFuZCBvbmUgc3BlY2lhbCBwcm9wZXJ0eSAndGFyZ2V0VmlldydcbiAgICAgICAgICogICAgIC8vIHZpZXdDb25maWcudGFyZ2V0Vmlld1xuICAgICAgICAgKiB9KTtcbiAgICAgICAgICogPC9wcmU+XG4gICAgICAgICAqL1xuICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnJHZpZXdDb250ZW50TG9hZGluZycsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfTtcbiAgfVxufVxuXG5hbmd1bGFyLm1vZHVsZSgndWkucm91dGVyLnN0YXRlJykucHJvdmlkZXIoJyR2aWV3JywgJFZpZXdQcm92aWRlcik7XG5cbi8qKlxuICogQG5nZG9jIG9iamVjdFxuICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiR1aVZpZXdTY3JvbGxQcm92aWRlclxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUHJvdmlkZXIgdGhhdCByZXR1cm5zIHRoZSB7QGxpbmsgdWkucm91dGVyLnN0YXRlLiR1aVZpZXdTY3JvbGx9IHNlcnZpY2UgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uICRWaWV3U2Nyb2xsUHJvdmlkZXIoKSB7XG5cbiAgdmFyIHVzZUFuY2hvclNjcm9sbCA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiR1aVZpZXdTY3JvbGxQcm92aWRlciN1c2VBbmNob3JTY3JvbGxcbiAgICogQG1ldGhvZE9mIHVpLnJvdXRlci5zdGF0ZS4kdWlWaWV3U2Nyb2xsUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFJldmVydHMgYmFjayB0byB1c2luZyB0aGUgY29yZSBbYCRhbmNob3JTY3JvbGxgXShodHRwOi8vZG9jcy5hbmd1bGFyanMub3JnL2FwaS9uZy4kYW5jaG9yU2Nyb2xsKSBzZXJ2aWNlIGZvclxuICAgKiBzY3JvbGxpbmcgYmFzZWQgb24gdGhlIHVybCBhbmNob3IuXG4gICAqL1xuICB0aGlzLnVzZUFuY2hvclNjcm9sbCA9IGZ1bmN0aW9uICgpIHtcbiAgICB1c2VBbmNob3JTY3JvbGwgPSB0cnVlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2Mgb2JqZWN0XG4gICAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS4kdWlWaWV3U2Nyb2xsXG4gICAqXG4gICAqIEByZXF1aXJlcyAkYW5jaG9yU2Nyb2xsXG4gICAqIEByZXF1aXJlcyAkdGltZW91dFxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogV2hlbiBjYWxsZWQgd2l0aCBhIGpxTGl0ZSBlbGVtZW50LCBpdCBzY3JvbGxzIHRoZSBlbGVtZW50IGludG8gdmlldyAoYWZ0ZXIgYVxuICAgKiBgJHRpbWVvdXRgIHNvIHRoZSBET00gaGFzIHRpbWUgdG8gcmVmcmVzaCkuXG4gICAqXG4gICAqIElmIHlvdSBwcmVmZXIgdG8gcmVseSBvbiBgJGFuY2hvclNjcm9sbGAgdG8gc2Nyb2xsIHRoZSB2aWV3IHRvIHRoZSBhbmNob3IsXG4gICAqIHRoaXMgY2FuIGJlIGVuYWJsZWQgYnkgY2FsbGluZyB7QGxpbmsgdWkucm91dGVyLnN0YXRlLiR1aVZpZXdTY3JvbGxQcm92aWRlciNtZXRob2RzX3VzZUFuY2hvclNjcm9sbCBgJHVpVmlld1Njcm9sbFByb3ZpZGVyLnVzZUFuY2hvclNjcm9sbCgpYH0uXG4gICAqL1xuICB0aGlzLiRnZXQgPSBbJyRhbmNob3JTY3JvbGwnLCAnJHRpbWVvdXQnLCBmdW5jdGlvbiAoJGFuY2hvclNjcm9sbCwgJHRpbWVvdXQpIHtcbiAgICBpZiAodXNlQW5jaG9yU2Nyb2xsKSB7XG4gICAgICByZXR1cm4gJGFuY2hvclNjcm9sbDtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKCRlbGVtZW50KSB7XG4gICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICRlbGVtZW50WzBdLnNjcm9sbEludG9WaWV3KCk7XG4gICAgICB9LCAwLCBmYWxzZSk7XG4gICAgfTtcbiAgfV07XG59XG5cbmFuZ3VsYXIubW9kdWxlKCd1aS5yb3V0ZXIuc3RhdGUnKS5wcm92aWRlcignJHVpVmlld1Njcm9sbCcsICRWaWV3U2Nyb2xsUHJvdmlkZXIpO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS5kaXJlY3RpdmU6dWktdmlld1xuICpcbiAqIEByZXF1aXJlcyB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlXG4gKiBAcmVxdWlyZXMgJGNvbXBpbGVcbiAqIEByZXF1aXJlcyAkY29udHJvbGxlclxuICogQHJlcXVpcmVzICRpbmplY3RvclxuICogQHJlcXVpcmVzIHVpLnJvdXRlci5zdGF0ZS4kdWlWaWV3U2Nyb2xsXG4gKiBAcmVxdWlyZXMgJGRvY3VtZW50XG4gKlxuICogQHJlc3RyaWN0IEVDQVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogVGhlIHVpLXZpZXcgZGlyZWN0aXZlIHRlbGxzICRzdGF0ZSB3aGVyZSB0byBwbGFjZSB5b3VyIHRlbXBsYXRlcy5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZz19IG5hbWUgQSB2aWV3IG5hbWUuIFRoZSBuYW1lIHNob3VsZCBiZSB1bmlxdWUgYW1vbmdzdCB0aGUgb3RoZXIgdmlld3MgaW4gdGhlXG4gKiBzYW1lIHN0YXRlLiBZb3UgY2FuIGhhdmUgdmlld3Mgb2YgdGhlIHNhbWUgbmFtZSB0aGF0IGxpdmUgaW4gZGlmZmVyZW50IHN0YXRlcy5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZz19IGF1dG9zY3JvbGwgSXQgYWxsb3dzIHlvdSB0byBzZXQgdGhlIHNjcm9sbCBiZWhhdmlvciBvZiB0aGUgYnJvd3NlciB3aW5kb3dcbiAqIHdoZW4gYSB2aWV3IGlzIHBvcHVsYXRlZC4gQnkgZGVmYXVsdCwgJGFuY2hvclNjcm9sbCBpcyBvdmVycmlkZGVuIGJ5IHVpLXJvdXRlcidzIGN1c3RvbSBzY3JvbGxcbiAqIHNlcnZpY2UsIHtAbGluayB1aS5yb3V0ZXIuc3RhdGUuJHVpVmlld1Njcm9sbH0uIFRoaXMgY3VzdG9tIHNlcnZpY2UgbGV0J3MgeW91XG4gKiBzY3JvbGwgdWktdmlldyBlbGVtZW50cyBpbnRvIHZpZXcgd2hlbiB0aGV5IGFyZSBwb3B1bGF0ZWQgZHVyaW5nIGEgc3RhdGUgYWN0aXZhdGlvbi5cbiAqXG4gKiAqTm90ZTogVG8gcmV2ZXJ0IGJhY2sgdG8gb2xkIFtgJGFuY2hvclNjcm9sbGBdKGh0dHA6Ly9kb2NzLmFuZ3VsYXJqcy5vcmcvYXBpL25nLiRhbmNob3JTY3JvbGwpXG4gKiBmdW5jdGlvbmFsaXR5LCBjYWxsIGAkdWlWaWV3U2Nyb2xsUHJvdmlkZXIudXNlQW5jaG9yU2Nyb2xsKClgLipcbiAqXG4gKiBAcGFyYW0ge3N0cmluZz19IG9ubG9hZCBFeHByZXNzaW9uIHRvIGV2YWx1YXRlIHdoZW5ldmVyIHRoZSB2aWV3IHVwZGF0ZXMuXG4gKiBcbiAqIEBleGFtcGxlXG4gKiBBIHZpZXcgY2FuIGJlIHVubmFtZWQgb3IgbmFtZWQuIFxuICogPHByZT5cbiAqIDwhLS0gVW5uYW1lZCAtLT5cbiAqIDxkaXYgdWktdmlldz48L2Rpdj4gXG4gKiBcbiAqIDwhLS0gTmFtZWQgLS0+XG4gKiA8ZGl2IHVpLXZpZXc9XCJ2aWV3TmFtZVwiPjwvZGl2PlxuICogPC9wcmU+XG4gKlxuICogWW91IGNhbiBvbmx5IGhhdmUgb25lIHVubmFtZWQgdmlldyB3aXRoaW4gYW55IHRlbXBsYXRlIChvciByb290IGh0bWwpLiBJZiB5b3UgYXJlIG9ubHkgdXNpbmcgYSBcbiAqIHNpbmdsZSB2aWV3IGFuZCBpdCBpcyB1bm5hbWVkIHRoZW4geW91IGNhbiBwb3B1bGF0ZSBpdCBsaWtlIHNvOlxuICogPHByZT5cbiAqIDxkaXYgdWktdmlldz48L2Rpdj4gXG4gKiAkc3RhdGVQcm92aWRlci5zdGF0ZShcImhvbWVcIiwge1xuICogICB0ZW1wbGF0ZTogXCI8aDE+SEVMTE8hPC9oMT5cIlxuICogfSlcbiAqIDwvcHJlPlxuICogXG4gKiBUaGUgYWJvdmUgaXMgYSBjb252ZW5pZW50IHNob3J0Y3V0IGVxdWl2YWxlbnQgdG8gc3BlY2lmeWluZyB5b3VyIHZpZXcgZXhwbGljaXRseSB3aXRoIHRoZSB7QGxpbmsgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVByb3ZpZGVyI3ZpZXdzIGB2aWV3c2B9XG4gKiBjb25maWcgcHJvcGVydHksIGJ5IG5hbWUsIGluIHRoaXMgY2FzZSBhbiBlbXB0eSBuYW1lOlxuICogPHByZT5cbiAqICRzdGF0ZVByb3ZpZGVyLnN0YXRlKFwiaG9tZVwiLCB7XG4gKiAgIHZpZXdzOiB7XG4gKiAgICAgXCJcIjoge1xuICogICAgICAgdGVtcGxhdGU6IFwiPGgxPkhFTExPITwvaDE+XCJcbiAqICAgICB9XG4gKiAgIH0gICAgXG4gKiB9KVxuICogPC9wcmU+XG4gKiBcbiAqIEJ1dCB0eXBpY2FsbHkgeW91J2xsIG9ubHkgdXNlIHRoZSB2aWV3cyBwcm9wZXJ0eSBpZiB5b3UgbmFtZSB5b3VyIHZpZXcgb3IgaGF2ZSBtb3JlIHRoYW4gb25lIHZpZXcgXG4gKiBpbiB0aGUgc2FtZSB0ZW1wbGF0ZS4gVGhlcmUncyBub3QgcmVhbGx5IGEgY29tcGVsbGluZyByZWFzb24gdG8gbmFtZSBhIHZpZXcgaWYgaXRzIHRoZSBvbmx5IG9uZSwgXG4gKiBidXQgeW91IGNvdWxkIGlmIHlvdSB3YW50ZWQsIGxpa2Ugc286XG4gKiA8cHJlPlxuICogPGRpdiB1aS12aWV3PVwibWFpblwiPjwvZGl2PlxuICogPC9wcmU+IFxuICogPHByZT5cbiAqICRzdGF0ZVByb3ZpZGVyLnN0YXRlKFwiaG9tZVwiLCB7XG4gKiAgIHZpZXdzOiB7XG4gKiAgICAgXCJtYWluXCI6IHtcbiAqICAgICAgIHRlbXBsYXRlOiBcIjxoMT5IRUxMTyE8L2gxPlwiXG4gKiAgICAgfVxuICogICB9ICAgIFxuICogfSlcbiAqIDwvcHJlPlxuICogXG4gKiBSZWFsbHkgdGhvdWdoLCB5b3UnbGwgdXNlIHZpZXdzIHRvIHNldCB1cCBtdWx0aXBsZSB2aWV3czpcbiAqIDxwcmU+XG4gKiA8ZGl2IHVpLXZpZXc+PC9kaXY+XG4gKiA8ZGl2IHVpLXZpZXc9XCJjaGFydFwiPjwvZGl2PiBcbiAqIDxkaXYgdWktdmlldz1cImRhdGFcIj48L2Rpdj4gXG4gKiA8L3ByZT5cbiAqIFxuICogPHByZT5cbiAqICRzdGF0ZVByb3ZpZGVyLnN0YXRlKFwiaG9tZVwiLCB7XG4gKiAgIHZpZXdzOiB7XG4gKiAgICAgXCJcIjoge1xuICogICAgICAgdGVtcGxhdGU6IFwiPGgxPkhFTExPITwvaDE+XCJcbiAqICAgICB9LFxuICogICAgIFwiY2hhcnRcIjoge1xuICogICAgICAgdGVtcGxhdGU6IFwiPGNoYXJ0X3RoaW5nLz5cIlxuICogICAgIH0sXG4gKiAgICAgXCJkYXRhXCI6IHtcbiAqICAgICAgIHRlbXBsYXRlOiBcIjxkYXRhX3RoaW5nLz5cIlxuICogICAgIH1cbiAqICAgfSAgICBcbiAqIH0pXG4gKiA8L3ByZT5cbiAqXG4gKiBFeGFtcGxlcyBmb3IgYGF1dG9zY3JvbGxgOlxuICpcbiAqIDxwcmU+XG4gKiA8IS0tIElmIGF1dG9zY3JvbGwgcHJlc2VudCB3aXRoIG5vIGV4cHJlc3Npb24sXG4gKiAgICAgIHRoZW4gc2Nyb2xsIHVpLXZpZXcgaW50byB2aWV3IC0tPlxuICogPHVpLXZpZXcgYXV0b3Njcm9sbC8+XG4gKlxuICogPCEtLSBJZiBhdXRvc2Nyb2xsIHByZXNlbnQgd2l0aCB2YWxpZCBleHByZXNzaW9uLFxuICogICAgICB0aGVuIHNjcm9sbCB1aS12aWV3IGludG8gdmlldyBpZiBleHByZXNzaW9uIGV2YWx1YXRlcyB0byB0cnVlIC0tPlxuICogPHVpLXZpZXcgYXV0b3Njcm9sbD0ndHJ1ZScvPlxuICogPHVpLXZpZXcgYXV0b3Njcm9sbD0nZmFsc2UnLz5cbiAqIDx1aS12aWV3IGF1dG9zY3JvbGw9J3Njb3BlVmFyaWFibGUnLz5cbiAqIDwvcHJlPlxuICovXG4kVmlld0RpcmVjdGl2ZS4kaW5qZWN0ID0gWyckc3RhdGUnLCAnJGluamVjdG9yJywgJyR1aVZpZXdTY3JvbGwnLCAnJGludGVycG9sYXRlJ107XG5mdW5jdGlvbiAkVmlld0RpcmVjdGl2ZSggICAkc3RhdGUsICAgJGluamVjdG9yLCAgICR1aVZpZXdTY3JvbGwsICAgJGludGVycG9sYXRlKSB7XG5cbiAgZnVuY3Rpb24gZ2V0U2VydmljZSgpIHtcbiAgICByZXR1cm4gKCRpbmplY3Rvci5oYXMpID8gZnVuY3Rpb24oc2VydmljZSkge1xuICAgICAgcmV0dXJuICRpbmplY3Rvci5oYXMoc2VydmljZSkgPyAkaW5qZWN0b3IuZ2V0KHNlcnZpY2UpIDogbnVsbDtcbiAgICB9IDogZnVuY3Rpb24oc2VydmljZSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoc2VydmljZSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICB2YXIgc2VydmljZSA9IGdldFNlcnZpY2UoKSxcbiAgICAgICRhbmltYXRvciA9IHNlcnZpY2UoJyRhbmltYXRvcicpLFxuICAgICAgJGFuaW1hdGUgPSBzZXJ2aWNlKCckYW5pbWF0ZScpO1xuXG4gIC8vIFJldHVybnMgYSBzZXQgb2YgRE9NIG1hbmlwdWxhdGlvbiBmdW5jdGlvbnMgYmFzZWQgb24gd2hpY2ggQW5ndWxhciB2ZXJzaW9uXG4gIC8vIGl0IHNob3VsZCB1c2VcbiAgZnVuY3Rpb24gZ2V0UmVuZGVyZXIoYXR0cnMsIHNjb3BlKSB7XG4gICAgdmFyIHN0YXRpY3MgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGVudGVyOiBmdW5jdGlvbiAoZWxlbWVudCwgdGFyZ2V0LCBjYikgeyB0YXJnZXQuYWZ0ZXIoZWxlbWVudCk7IGNiKCk7IH0sXG4gICAgICAgIGxlYXZlOiBmdW5jdGlvbiAoZWxlbWVudCwgY2IpIHsgZWxlbWVudC5yZW1vdmUoKTsgY2IoKTsgfVxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgaWYgKCRhbmltYXRlKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlbnRlcjogZnVuY3Rpb24oZWxlbWVudCwgdGFyZ2V0LCBjYikge1xuICAgICAgICAgIHZhciBwcm9taXNlID0gJGFuaW1hdGUuZW50ZXIoZWxlbWVudCwgbnVsbCwgdGFyZ2V0LCBjYik7XG4gICAgICAgICAgaWYgKHByb21pc2UgJiYgcHJvbWlzZS50aGVuKSBwcm9taXNlLnRoZW4oY2IpO1xuICAgICAgICB9LFxuICAgICAgICBsZWF2ZTogZnVuY3Rpb24oZWxlbWVudCwgY2IpIHtcbiAgICAgICAgICB2YXIgcHJvbWlzZSA9ICRhbmltYXRlLmxlYXZlKGVsZW1lbnQsIGNiKTtcbiAgICAgICAgICBpZiAocHJvbWlzZSAmJiBwcm9taXNlLnRoZW4pIHByb21pc2UudGhlbihjYik7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKCRhbmltYXRvcikge1xuICAgICAgdmFyIGFuaW1hdGUgPSAkYW5pbWF0b3IgJiYgJGFuaW1hdG9yKHNjb3BlLCBhdHRycyk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGVudGVyOiBmdW5jdGlvbihlbGVtZW50LCB0YXJnZXQsIGNiKSB7YW5pbWF0ZS5lbnRlcihlbGVtZW50LCBudWxsLCB0YXJnZXQpOyBjYigpOyB9LFxuICAgICAgICBsZWF2ZTogZnVuY3Rpb24oZWxlbWVudCwgY2IpIHsgYW5pbWF0ZS5sZWF2ZShlbGVtZW50KTsgY2IoKTsgfVxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3RhdGljcygpO1xuICB9XG5cbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0VDQScsXG4gICAgdGVybWluYWw6IHRydWUsXG4gICAgcHJpb3JpdHk6IDQwMCxcbiAgICB0cmFuc2NsdWRlOiAnZWxlbWVudCcsXG4gICAgY29tcGlsZTogZnVuY3Rpb24gKHRFbGVtZW50LCB0QXR0cnMsICR0cmFuc2NsdWRlKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKHNjb3BlLCAkZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgdmFyIHByZXZpb3VzRWwsIGN1cnJlbnRFbCwgY3VycmVudFNjb3BlLCBsYXRlc3RMb2NhbHMsXG4gICAgICAgICAgICBvbmxvYWRFeHAgICAgID0gYXR0cnMub25sb2FkIHx8ICcnLFxuICAgICAgICAgICAgYXV0b1Njcm9sbEV4cCA9IGF0dHJzLmF1dG9zY3JvbGwsXG4gICAgICAgICAgICByZW5kZXJlciAgICAgID0gZ2V0UmVuZGVyZXIoYXR0cnMsIHNjb3BlKTtcblxuICAgICAgICBzY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN1Y2Nlc3MnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICB1cGRhdGVWaWV3KGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNjb3BlLiRvbignJHZpZXdDb250ZW50TG9hZGluZycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHVwZGF0ZVZpZXcoZmFsc2UpO1xuICAgICAgICB9KTtcblxuICAgICAgICB1cGRhdGVWaWV3KHRydWUpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNsZWFudXBMYXN0VmlldygpIHtcbiAgICAgICAgICBpZiAocHJldmlvdXNFbCkge1xuICAgICAgICAgICAgcHJldmlvdXNFbC5yZW1vdmUoKTtcbiAgICAgICAgICAgIHByZXZpb3VzRWwgPSBudWxsO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChjdXJyZW50U2NvcGUpIHtcbiAgICAgICAgICAgIGN1cnJlbnRTY29wZS4kZGVzdHJveSgpO1xuICAgICAgICAgICAgY3VycmVudFNjb3BlID0gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoY3VycmVudEVsKSB7XG4gICAgICAgICAgICByZW5kZXJlci5sZWF2ZShjdXJyZW50RWwsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBwcmV2aW91c0VsID0gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBwcmV2aW91c0VsID0gY3VycmVudEVsO1xuICAgICAgICAgICAgY3VycmVudEVsID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVWaWV3KGZpcnN0VGltZSkge1xuICAgICAgICAgIHZhciBuZXdTY29wZSxcbiAgICAgICAgICAgICAgbmFtZSAgICAgICAgICAgID0gZ2V0VWlWaWV3TmFtZShzY29wZSwgYXR0cnMsICRlbGVtZW50LCAkaW50ZXJwb2xhdGUpLFxuICAgICAgICAgICAgICBwcmV2aW91c0xvY2FscyAgPSBuYW1lICYmICRzdGF0ZS4kY3VycmVudCAmJiAkc3RhdGUuJGN1cnJlbnQubG9jYWxzW25hbWVdO1xuXG4gICAgICAgICAgaWYgKCFmaXJzdFRpbWUgJiYgcHJldmlvdXNMb2NhbHMgPT09IGxhdGVzdExvY2FscykgcmV0dXJuOyAvLyBub3RoaW5nIHRvIGRvXG4gICAgICAgICAgbmV3U2NvcGUgPSBzY29wZS4kbmV3KCk7XG4gICAgICAgICAgbGF0ZXN0TG9jYWxzID0gJHN0YXRlLiRjdXJyZW50LmxvY2Fsc1tuYW1lXTtcblxuICAgICAgICAgIHZhciBjbG9uZSA9ICR0cmFuc2NsdWRlKG5ld1Njb3BlLCBmdW5jdGlvbihjbG9uZSkge1xuICAgICAgICAgICAgcmVuZGVyZXIuZW50ZXIoY2xvbmUsICRlbGVtZW50LCBmdW5jdGlvbiBvblVpVmlld0VudGVyKCkge1xuICAgICAgICAgICAgICBpZihjdXJyZW50U2NvcGUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50U2NvcGUuJGVtaXQoJyR2aWV3Q29udGVudEFuaW1hdGlvbkVuZGVkJyk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQoYXV0b1Njcm9sbEV4cCkgJiYgIWF1dG9TY3JvbGxFeHAgfHwgc2NvcGUuJGV2YWwoYXV0b1Njcm9sbEV4cCkpIHtcbiAgICAgICAgICAgICAgICAkdWlWaWV3U2Nyb2xsKGNsb25lKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjbGVhbnVwTGFzdFZpZXcoKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGN1cnJlbnRFbCA9IGNsb25lO1xuICAgICAgICAgIGN1cnJlbnRTY29wZSA9IG5ld1Njb3BlO1xuICAgICAgICAgIC8qKlxuICAgICAgICAgICAqIEBuZ2RvYyBldmVudFxuICAgICAgICAgICAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS5kaXJlY3RpdmU6dWktdmlldyMkdmlld0NvbnRlbnRMb2FkZWRcbiAgICAgICAgICAgKiBAZXZlbnRPZiB1aS5yb3V0ZXIuc3RhdGUuZGlyZWN0aXZlOnVpLXZpZXdcbiAgICAgICAgICAgKiBAZXZlbnRUeXBlIGVtaXRzIG9uIHVpLXZpZXcgZGlyZWN0aXZlIHNjb3BlXG4gICAgICAgICAgICogQGRlc2NyaXB0aW9uICAgICAgICAgICAqXG4gICAgICAgICAgICogRmlyZWQgb25jZSB0aGUgdmlldyBpcyAqKmxvYWRlZCoqLCAqYWZ0ZXIqIHRoZSBET00gaXMgcmVuZGVyZWQuXG4gICAgICAgICAgICpcbiAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gZXZlbnQgRXZlbnQgb2JqZWN0LlxuICAgICAgICAgICAqL1xuICAgICAgICAgIGN1cnJlbnRTY29wZS4kZW1pdCgnJHZpZXdDb250ZW50TG9hZGVkJyk7XG4gICAgICAgICAgY3VycmVudFNjb3BlLiRldmFsKG9ubG9hZEV4cCk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG59XG5cbiRWaWV3RGlyZWN0aXZlRmlsbC4kaW5qZWN0ID0gWyckY29tcGlsZScsICckY29udHJvbGxlcicsICckc3RhdGUnLCAnJGludGVycG9sYXRlJ107XG5mdW5jdGlvbiAkVmlld0RpcmVjdGl2ZUZpbGwgKCAgJGNvbXBpbGUsICAgJGNvbnRyb2xsZXIsICAgJHN0YXRlLCAgICRpbnRlcnBvbGF0ZSkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnRUNBJyxcbiAgICBwcmlvcml0eTogLTQwMCxcbiAgICBjb21waWxlOiBmdW5jdGlvbiAodEVsZW1lbnQpIHtcbiAgICAgIHZhciBpbml0aWFsID0gdEVsZW1lbnQuaHRtbCgpO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uIChzY29wZSwgJGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgIHZhciBjdXJyZW50ID0gJHN0YXRlLiRjdXJyZW50LFxuICAgICAgICAgICAgbmFtZSA9IGdldFVpVmlld05hbWUoc2NvcGUsIGF0dHJzLCAkZWxlbWVudCwgJGludGVycG9sYXRlKSxcbiAgICAgICAgICAgIGxvY2FscyAgPSBjdXJyZW50ICYmIGN1cnJlbnQubG9jYWxzW25hbWVdO1xuXG4gICAgICAgIGlmICghIGxvY2Fscykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgICRlbGVtZW50LmRhdGEoJyR1aVZpZXcnLCB7IG5hbWU6IG5hbWUsIHN0YXRlOiBsb2NhbHMuJCRzdGF0ZSB9KTtcbiAgICAgICAgJGVsZW1lbnQuaHRtbChsb2NhbHMuJHRlbXBsYXRlID8gbG9jYWxzLiR0ZW1wbGF0ZSA6IGluaXRpYWwpO1xuXG4gICAgICAgIHZhciBsaW5rID0gJGNvbXBpbGUoJGVsZW1lbnQuY29udGVudHMoKSk7XG5cbiAgICAgICAgaWYgKGxvY2Fscy4kJGNvbnRyb2xsZXIpIHtcbiAgICAgICAgICBsb2NhbHMuJHNjb3BlID0gc2NvcGU7XG4gICAgICAgICAgdmFyIGNvbnRyb2xsZXIgPSAkY29udHJvbGxlcihsb2NhbHMuJCRjb250cm9sbGVyLCBsb2NhbHMpO1xuICAgICAgICAgIGlmIChsb2NhbHMuJCRjb250cm9sbGVyQXMpIHtcbiAgICAgICAgICAgIHNjb3BlW2xvY2Fscy4kJGNvbnRyb2xsZXJBc10gPSBjb250cm9sbGVyO1xuICAgICAgICAgIH1cbiAgICAgICAgICAkZWxlbWVudC5kYXRhKCckbmdDb250cm9sbGVyQ29udHJvbGxlcicsIGNvbnRyb2xsZXIpO1xuICAgICAgICAgICRlbGVtZW50LmNoaWxkcmVuKCkuZGF0YSgnJG5nQ29udHJvbGxlckNvbnRyb2xsZXInLCBjb250cm9sbGVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxpbmsoc2NvcGUpO1xuICAgICAgfTtcbiAgICB9XG4gIH07XG59XG5cbi8qKlxuICogU2hhcmVkIHVpLXZpZXcgY29kZSBmb3IgYm90aCBkaXJlY3RpdmVzOlxuICogR2l2ZW4gc2NvcGUsIGVsZW1lbnQsIGFuZCBpdHMgYXR0cmlidXRlcywgcmV0dXJuIHRoZSB2aWV3J3MgbmFtZVxuICovXG5mdW5jdGlvbiBnZXRVaVZpZXdOYW1lKHNjb3BlLCBhdHRycywgZWxlbWVudCwgJGludGVycG9sYXRlKSB7XG4gIHZhciBuYW1lID0gJGludGVycG9sYXRlKGF0dHJzLnVpVmlldyB8fCBhdHRycy5uYW1lIHx8ICcnKShzY29wZSk7XG4gIHZhciBpbmhlcml0ZWQgPSBlbGVtZW50LmluaGVyaXRlZERhdGEoJyR1aVZpZXcnKTtcbiAgcmV0dXJuIG5hbWUuaW5kZXhPZignQCcpID49IDAgPyAgbmFtZSA6ICAobmFtZSArICdAJyArIChpbmhlcml0ZWQgPyBpbmhlcml0ZWQuc3RhdGUubmFtZSA6ICcnKSk7XG59XG5cbmFuZ3VsYXIubW9kdWxlKCd1aS5yb3V0ZXIuc3RhdGUnKS5kaXJlY3RpdmUoJ3VpVmlldycsICRWaWV3RGlyZWN0aXZlKTtcbmFuZ3VsYXIubW9kdWxlKCd1aS5yb3V0ZXIuc3RhdGUnKS5kaXJlY3RpdmUoJ3VpVmlldycsICRWaWV3RGlyZWN0aXZlRmlsbCk7XG5cbmZ1bmN0aW9uIHBhcnNlU3RhdGVSZWYocmVmLCBjdXJyZW50KSB7XG4gIHZhciBwcmVwYXJzZWQgPSByZWYubWF0Y2goL15cXHMqKHtbXn1dKn0pXFxzKiQvKSwgcGFyc2VkO1xuICBpZiAocHJlcGFyc2VkKSByZWYgPSBjdXJyZW50ICsgJygnICsgcHJlcGFyc2VkWzFdICsgJyknO1xuICBwYXJzZWQgPSByZWYucmVwbGFjZSgvXFxuL2csIFwiIFwiKS5tYXRjaCgvXihbXihdKz8pXFxzKihcXCgoLiopXFwpKT8kLyk7XG4gIGlmICghcGFyc2VkIHx8IHBhcnNlZC5sZW5ndGggIT09IDQpIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgc3RhdGUgcmVmICdcIiArIHJlZiArIFwiJ1wiKTtcbiAgcmV0dXJuIHsgc3RhdGU6IHBhcnNlZFsxXSwgcGFyYW1FeHByOiBwYXJzZWRbM10gfHwgbnVsbCB9O1xufVxuXG5mdW5jdGlvbiBzdGF0ZUNvbnRleHQoZWwpIHtcbiAgdmFyIHN0YXRlRGF0YSA9IGVsLnBhcmVudCgpLmluaGVyaXRlZERhdGEoJyR1aVZpZXcnKTtcblxuICBpZiAoc3RhdGVEYXRhICYmIHN0YXRlRGF0YS5zdGF0ZSAmJiBzdGF0ZURhdGEuc3RhdGUubmFtZSkge1xuICAgIHJldHVybiBzdGF0ZURhdGEuc3RhdGU7XG4gIH1cbn1cblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuZGlyZWN0aXZlOnVpLXNyZWZcbiAqXG4gKiBAcmVxdWlyZXMgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICogQHJlcXVpcmVzICR0aW1lb3V0XG4gKlxuICogQHJlc3RyaWN0IEFcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIEEgZGlyZWN0aXZlIHRoYXQgYmluZHMgYSBsaW5rIChgPGE+YCB0YWcpIHRvIGEgc3RhdGUuIElmIHRoZSBzdGF0ZSBoYXMgYW4gYXNzb2NpYXRlZCBcbiAqIFVSTCwgdGhlIGRpcmVjdGl2ZSB3aWxsIGF1dG9tYXRpY2FsbHkgZ2VuZXJhdGUgJiB1cGRhdGUgdGhlIGBocmVmYCBhdHRyaWJ1dGUgdmlhIFxuICogdGhlIHtAbGluayB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlI21ldGhvZHNfaHJlZiAkc3RhdGUuaHJlZigpfSBtZXRob2QuIENsaWNraW5nIFxuICogdGhlIGxpbmsgd2lsbCB0cmlnZ2VyIGEgc3RhdGUgdHJhbnNpdGlvbiB3aXRoIG9wdGlvbmFsIHBhcmFtZXRlcnMuIFxuICpcbiAqIEFsc28gbWlkZGxlLWNsaWNraW5nLCByaWdodC1jbGlja2luZywgYW5kIGN0cmwtY2xpY2tpbmcgb24gdGhlIGxpbmsgd2lsbCBiZSBcbiAqIGhhbmRsZWQgbmF0aXZlbHkgYnkgdGhlIGJyb3dzZXIuXG4gKlxuICogWW91IGNhbiBhbHNvIHVzZSByZWxhdGl2ZSBzdGF0ZSBwYXRocyB3aXRoaW4gdWktc3JlZiwganVzdCBsaWtlIHRoZSByZWxhdGl2ZSBcbiAqIHBhdGhzIHBhc3NlZCB0byBgJHN0YXRlLmdvKClgLiBZb3UganVzdCBuZWVkIHRvIGJlIGF3YXJlIHRoYXQgdGhlIHBhdGggaXMgcmVsYXRpdmVcbiAqIHRvIHRoZSBzdGF0ZSB0aGF0IHRoZSBsaW5rIGxpdmVzIGluLCBpbiBvdGhlciB3b3JkcyB0aGUgc3RhdGUgdGhhdCBsb2FkZWQgdGhlIFxuICogdGVtcGxhdGUgY29udGFpbmluZyB0aGUgbGluay5cbiAqXG4gKiBZb3UgY2FuIHNwZWNpZnkgb3B0aW9ucyB0byBwYXNzIHRvIHtAbGluayB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlI2dvICRzdGF0ZS5nbygpfVxuICogdXNpbmcgdGhlIGB1aS1zcmVmLW9wdHNgIGF0dHJpYnV0ZS4gT3B0aW9ucyBhcmUgcmVzdHJpY3RlZCB0byBgbG9jYXRpb25gLCBgaW5oZXJpdGAsXG4gKiBhbmQgYHJlbG9hZGAuXG4gKlxuICogQGV4YW1wbGVcbiAqIEhlcmUncyBhbiBleGFtcGxlIG9mIGhvdyB5b3UnZCB1c2UgdWktc3JlZiBhbmQgaG93IGl0IHdvdWxkIGNvbXBpbGUuIElmIHlvdSBoYXZlIHRoZSBcbiAqIGZvbGxvd2luZyB0ZW1wbGF0ZTpcbiAqIDxwcmU+XG4gKiA8YSB1aS1zcmVmPVwiaG9tZVwiPkhvbWU8L2E+IHwgPGEgdWktc3JlZj1cImFib3V0XCI+QWJvdXQ8L2E+IHwgPGEgdWktc3JlZj1cIntwYWdlOiAyfVwiPk5leHQgcGFnZTwvYT5cbiAqIFxuICogPHVsPlxuICogICAgIDxsaSBuZy1yZXBlYXQ9XCJjb250YWN0IGluIGNvbnRhY3RzXCI+XG4gKiAgICAgICAgIDxhIHVpLXNyZWY9XCJjb250YWN0cy5kZXRhaWwoeyBpZDogY29udGFjdC5pZCB9KVwiPnt7IGNvbnRhY3QubmFtZSB9fTwvYT5cbiAqICAgICA8L2xpPlxuICogPC91bD5cbiAqIDwvcHJlPlxuICogXG4gKiBUaGVuIHRoZSBjb21waWxlZCBodG1sIHdvdWxkIGJlIChhc3N1bWluZyBIdG1sNU1vZGUgaXMgb2ZmIGFuZCBjdXJyZW50IHN0YXRlIGlzIGNvbnRhY3RzKTpcbiAqIDxwcmU+XG4gKiA8YSBocmVmPVwiIy9ob21lXCIgdWktc3JlZj1cImhvbWVcIj5Ib21lPC9hPiB8IDxhIGhyZWY9XCIjL2Fib3V0XCIgdWktc3JlZj1cImFib3V0XCI+QWJvdXQ8L2E+IHwgPGEgaHJlZj1cIiMvY29udGFjdHM/cGFnZT0yXCIgdWktc3JlZj1cIntwYWdlOiAyfVwiPk5leHQgcGFnZTwvYT5cbiAqIFxuICogPHVsPlxuICogICAgIDxsaSBuZy1yZXBlYXQ9XCJjb250YWN0IGluIGNvbnRhY3RzXCI+XG4gKiAgICAgICAgIDxhIGhyZWY9XCIjL2NvbnRhY3RzLzFcIiB1aS1zcmVmPVwiY29udGFjdHMuZGV0YWlsKHsgaWQ6IGNvbnRhY3QuaWQgfSlcIj5Kb2U8L2E+XG4gKiAgICAgPC9saT5cbiAqICAgICA8bGkgbmctcmVwZWF0PVwiY29udGFjdCBpbiBjb250YWN0c1wiPlxuICogICAgICAgICA8YSBocmVmPVwiIy9jb250YWN0cy8yXCIgdWktc3JlZj1cImNvbnRhY3RzLmRldGFpbCh7IGlkOiBjb250YWN0LmlkIH0pXCI+QWxpY2U8L2E+XG4gKiAgICAgPC9saT5cbiAqICAgICA8bGkgbmctcmVwZWF0PVwiY29udGFjdCBpbiBjb250YWN0c1wiPlxuICogICAgICAgICA8YSBocmVmPVwiIy9jb250YWN0cy8zXCIgdWktc3JlZj1cImNvbnRhY3RzLmRldGFpbCh7IGlkOiBjb250YWN0LmlkIH0pXCI+Qm9iPC9hPlxuICogICAgIDwvbGk+XG4gKiA8L3VsPlxuICpcbiAqIDxhIHVpLXNyZWY9XCJob21lXCIgdWktc3JlZi1vcHRzPVwie3JlbG9hZDogdHJ1ZX1cIj5Ib21lPC9hPlxuICogPC9wcmU+XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHVpLXNyZWYgJ3N0YXRlTmFtZScgY2FuIGJlIGFueSB2YWxpZCBhYnNvbHV0ZSBvciByZWxhdGl2ZSBzdGF0ZVxuICogQHBhcmFtIHtPYmplY3R9IHVpLXNyZWYtb3B0cyBvcHRpb25zIHRvIHBhc3MgdG8ge0BsaW5rIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGUjZ28gJHN0YXRlLmdvKCl9XG4gKi9cbiRTdGF0ZVJlZkRpcmVjdGl2ZS4kaW5qZWN0ID0gWyckc3RhdGUnLCAnJHRpbWVvdXQnXTtcbmZ1bmN0aW9uICRTdGF0ZVJlZkRpcmVjdGl2ZSgkc3RhdGUsICR0aW1lb3V0KSB7XG4gIHZhciBhbGxvd2VkT3B0aW9ucyA9IFsnbG9jYXRpb24nLCAnaW5oZXJpdCcsICdyZWxvYWQnXTtcblxuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnQScsXG4gICAgcmVxdWlyZTogWyc/XnVpU3JlZkFjdGl2ZScsICc/XnVpU3JlZkFjdGl2ZUVxJ10sXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCB1aVNyZWZBY3RpdmUpIHtcbiAgICAgIHZhciByZWYgPSBwYXJzZVN0YXRlUmVmKGF0dHJzLnVpU3JlZiwgJHN0YXRlLmN1cnJlbnQubmFtZSk7XG4gICAgICB2YXIgcGFyYW1zID0gbnVsbCwgdXJsID0gbnVsbCwgYmFzZSA9IHN0YXRlQ29udGV4dChlbGVtZW50KSB8fCAkc3RhdGUuJGN1cnJlbnQ7XG4gICAgICB2YXIgbmV3SHJlZiA9IG51bGwsIGlzQW5jaG9yID0gZWxlbWVudC5wcm9wKFwidGFnTmFtZVwiKSA9PT0gXCJBXCI7XG4gICAgICB2YXIgaXNGb3JtID0gZWxlbWVudFswXS5ub2RlTmFtZSA9PT0gXCJGT1JNXCI7XG4gICAgICB2YXIgYXR0ciA9IGlzRm9ybSA/IFwiYWN0aW9uXCIgOiBcImhyZWZcIiwgbmF2ID0gdHJ1ZTtcblxuICAgICAgdmFyIG9wdGlvbnMgPSB7IHJlbGF0aXZlOiBiYXNlLCBpbmhlcml0OiB0cnVlIH07XG4gICAgICB2YXIgb3B0aW9uc092ZXJyaWRlID0gc2NvcGUuJGV2YWwoYXR0cnMudWlTcmVmT3B0cykgfHwge307XG5cbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChhbGxvd2VkT3B0aW9ucywgZnVuY3Rpb24ob3B0aW9uKSB7XG4gICAgICAgIGlmIChvcHRpb24gaW4gb3B0aW9uc092ZXJyaWRlKSB7XG4gICAgICAgICAgb3B0aW9uc1tvcHRpb25dID0gb3B0aW9uc092ZXJyaWRlW29wdGlvbl07XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICB2YXIgdXBkYXRlID0gZnVuY3Rpb24obmV3VmFsKSB7XG4gICAgICAgIGlmIChuZXdWYWwpIHBhcmFtcyA9IGFuZ3VsYXIuY29weShuZXdWYWwpO1xuICAgICAgICBpZiAoIW5hdikgcmV0dXJuO1xuXG4gICAgICAgIG5ld0hyZWYgPSAkc3RhdGUuaHJlZihyZWYuc3RhdGUsIHBhcmFtcywgb3B0aW9ucyk7XG5cbiAgICAgICAgdmFyIGFjdGl2ZURpcmVjdGl2ZSA9IHVpU3JlZkFjdGl2ZVsxXSB8fCB1aVNyZWZBY3RpdmVbMF07XG4gICAgICAgIGlmIChhY3RpdmVEaXJlY3RpdmUpIHtcbiAgICAgICAgICBhY3RpdmVEaXJlY3RpdmUuJCRzZXRTdGF0ZUluZm8ocmVmLnN0YXRlLCBwYXJhbXMpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuZXdIcmVmID09PSBudWxsKSB7XG4gICAgICAgICAgbmF2ID0gZmFsc2U7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGF0dHJzLiRzZXQoYXR0ciwgbmV3SHJlZik7XG4gICAgICB9O1xuXG4gICAgICBpZiAocmVmLnBhcmFtRXhwcikge1xuICAgICAgICBzY29wZS4kd2F0Y2gocmVmLnBhcmFtRXhwciwgZnVuY3Rpb24obmV3VmFsLCBvbGRWYWwpIHtcbiAgICAgICAgICBpZiAobmV3VmFsICE9PSBwYXJhbXMpIHVwZGF0ZShuZXdWYWwpO1xuICAgICAgICB9LCB0cnVlKTtcbiAgICAgICAgcGFyYW1zID0gYW5ndWxhci5jb3B5KHNjb3BlLiRldmFsKHJlZi5wYXJhbUV4cHIpKTtcbiAgICAgIH1cbiAgICAgIHVwZGF0ZSgpO1xuXG4gICAgICBpZiAoaXNGb3JtKSByZXR1cm47XG5cbiAgICAgIGVsZW1lbnQuYmluZChcImNsaWNrXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdmFyIGJ1dHRvbiA9IGUud2hpY2ggfHwgZS5idXR0b247XG4gICAgICAgIGlmICggIShidXR0b24gPiAxIHx8IGUuY3RybEtleSB8fCBlLm1ldGFLZXkgfHwgZS5zaGlmdEtleSB8fCBlbGVtZW50LmF0dHIoJ3RhcmdldCcpKSApIHtcbiAgICAgICAgICAvLyBIQUNLOiBUaGlzIGlzIHRvIGFsbG93IG5nLWNsaWNrcyB0byBiZSBwcm9jZXNzZWQgYmVmb3JlIHRoZSB0cmFuc2l0aW9uIGlzIGluaXRpYXRlZDpcbiAgICAgICAgICB2YXIgdHJhbnNpdGlvbiA9ICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKHJlZi5zdGF0ZSwgcGFyYW1zLCBvcHRpb25zKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAvLyBpZiB0aGUgc3RhdGUgaGFzIG5vIFVSTCwgaWdub3JlIG9uZSBwcmV2ZW50RGVmYXVsdCBmcm9tIHRoZSA8YT4gZGlyZWN0aXZlLlxuICAgICAgICAgIHZhciBpZ25vcmVQcmV2ZW50RGVmYXVsdENvdW50ID0gaXNBbmNob3IgJiYgIW5ld0hyZWYgPyAxOiAwO1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChpZ25vcmVQcmV2ZW50RGVmYXVsdENvdW50LS0gPD0gMClcbiAgICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHRyYW5zaXRpb24pO1xuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuZGlyZWN0aXZlOnVpLXNyZWYtYWN0aXZlXG4gKlxuICogQHJlcXVpcmVzIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVcbiAqIEByZXF1aXJlcyB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlUGFyYW1zXG4gKiBAcmVxdWlyZXMgJGludGVycG9sYXRlXG4gKlxuICogQHJlc3RyaWN0IEFcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIEEgZGlyZWN0aXZlIHdvcmtpbmcgYWxvbmdzaWRlIHVpLXNyZWYgdG8gYWRkIGNsYXNzZXMgdG8gYW4gZWxlbWVudCB3aGVuIHRoZVxuICogcmVsYXRlZCB1aS1zcmVmIGRpcmVjdGl2ZSdzIHN0YXRlIGlzIGFjdGl2ZSwgYW5kIHJlbW92aW5nIHRoZW0gd2hlbiBpdCBpcyBpbmFjdGl2ZS5cbiAqIFRoZSBwcmltYXJ5IHVzZS1jYXNlIGlzIHRvIHNpbXBsaWZ5IHRoZSBzcGVjaWFsIGFwcGVhcmFuY2Ugb2YgbmF2aWdhdGlvbiBtZW51c1xuICogcmVseWluZyBvbiBgdWktc3JlZmAsIGJ5IGhhdmluZyB0aGUgXCJhY3RpdmVcIiBzdGF0ZSdzIG1lbnUgYnV0dG9uIGFwcGVhciBkaWZmZXJlbnQsXG4gKiBkaXN0aW5ndWlzaGluZyBpdCBmcm9tIHRoZSBpbmFjdGl2ZSBtZW51IGl0ZW1zLlxuICpcbiAqIHVpLXNyZWYtYWN0aXZlIGNhbiBsaXZlIG9uIHRoZSBzYW1lIGVsZW1lbnQgYXMgdWktc3JlZiBvciBvbiBhIHBhcmVudCBlbGVtZW50LiBUaGUgZmlyc3RcbiAqIHVpLXNyZWYtYWN0aXZlIGZvdW5kIGF0IHRoZSBzYW1lIGxldmVsIG9yIGFib3ZlIHRoZSB1aS1zcmVmIHdpbGwgYmUgdXNlZC5cbiAqXG4gKiBXaWxsIGFjdGl2YXRlIHdoZW4gdGhlIHVpLXNyZWYncyB0YXJnZXQgc3RhdGUgb3IgYW55IGNoaWxkIHN0YXRlIGlzIGFjdGl2ZS4gSWYgeW91XG4gKiBuZWVkIHRvIGFjdGl2YXRlIG9ubHkgd2hlbiB0aGUgdWktc3JlZiB0YXJnZXQgc3RhdGUgaXMgYWN0aXZlIGFuZCAqbm90KiBhbnkgb2ZcbiAqIGl0J3MgY2hpbGRyZW4sIHRoZW4geW91IHdpbGwgdXNlXG4gKiB7QGxpbmsgdWkucm91dGVyLnN0YXRlLmRpcmVjdGl2ZTp1aS1zcmVmLWFjdGl2ZS1lcSB1aS1zcmVmLWFjdGl2ZS1lcX1cbiAqXG4gKiBAZXhhbXBsZVxuICogR2l2ZW4gdGhlIGZvbGxvd2luZyB0ZW1wbGF0ZTpcbiAqIDxwcmU+XG4gKiA8dWw+XG4gKiAgIDxsaSB1aS1zcmVmLWFjdGl2ZT1cImFjdGl2ZVwiIGNsYXNzPVwiaXRlbVwiPlxuICogICAgIDxhIGhyZWYgdWktc3JlZj1cImFwcC51c2VyKHt1c2VyOiAnYmlsYm9iYWdnaW5zJ30pXCI+QGJpbGJvYmFnZ2luczwvYT5cbiAqICAgPC9saT5cbiAqIDwvdWw+XG4gKiA8L3ByZT5cbiAqXG4gKlxuICogV2hlbiB0aGUgYXBwIHN0YXRlIGlzIFwiYXBwLnVzZXJcIiAob3IgYW55IGNoaWxkcmVuIHN0YXRlcyksIGFuZCBjb250YWlucyB0aGUgc3RhdGUgcGFyYW1ldGVyIFwidXNlclwiIHdpdGggdmFsdWUgXCJiaWxib2JhZ2dpbnNcIixcbiAqIHRoZSByZXN1bHRpbmcgSFRNTCB3aWxsIGFwcGVhciBhcyAobm90ZSB0aGUgJ2FjdGl2ZScgY2xhc3MpOlxuICogPHByZT5cbiAqIDx1bD5cbiAqICAgPGxpIHVpLXNyZWYtYWN0aXZlPVwiYWN0aXZlXCIgY2xhc3M9XCJpdGVtIGFjdGl2ZVwiPlxuICogICAgIDxhIHVpLXNyZWY9XCJhcHAudXNlcih7dXNlcjogJ2JpbGJvYmFnZ2lucyd9KVwiIGhyZWY9XCIvdXNlcnMvYmlsYm9iYWdnaW5zXCI+QGJpbGJvYmFnZ2luczwvYT5cbiAqICAgPC9saT5cbiAqIDwvdWw+XG4gKiA8L3ByZT5cbiAqXG4gKiBUaGUgY2xhc3MgbmFtZSBpcyBpbnRlcnBvbGF0ZWQgKipvbmNlKiogZHVyaW5nIHRoZSBkaXJlY3RpdmVzIGxpbmsgdGltZSAoYW55IGZ1cnRoZXIgY2hhbmdlcyB0byB0aGVcbiAqIGludGVycG9sYXRlZCB2YWx1ZSBhcmUgaWdub3JlZCkuXG4gKlxuICogTXVsdGlwbGUgY2xhc3NlcyBtYXkgYmUgc3BlY2lmaWVkIGluIGEgc3BhY2Utc2VwYXJhdGVkIGZvcm1hdDpcbiAqIDxwcmU+XG4gKiA8dWw+XG4gKiAgIDxsaSB1aS1zcmVmLWFjdGl2ZT0nY2xhc3MxIGNsYXNzMiBjbGFzczMnPlxuICogICAgIDxhIHVpLXNyZWY9XCJhcHAudXNlclwiPmxpbms8L2E+XG4gKiAgIDwvbGk+XG4gKiA8L3VsPlxuICogPC9wcmU+XG4gKi9cblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuZGlyZWN0aXZlOnVpLXNyZWYtYWN0aXZlLWVxXG4gKlxuICogQHJlcXVpcmVzIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVcbiAqIEByZXF1aXJlcyB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlUGFyYW1zXG4gKiBAcmVxdWlyZXMgJGludGVycG9sYXRlXG4gKlxuICogQHJlc3RyaWN0IEFcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFRoZSBzYW1lIGFzIHtAbGluayB1aS5yb3V0ZXIuc3RhdGUuZGlyZWN0aXZlOnVpLXNyZWYtYWN0aXZlIHVpLXNyZWYtYWN0aXZlfSBidXQgd2lsbCBvbmx5IGFjdGl2YXRlXG4gKiB3aGVuIHRoZSBleGFjdCB0YXJnZXQgc3RhdGUgdXNlZCBpbiB0aGUgYHVpLXNyZWZgIGlzIGFjdGl2ZTsgbm8gY2hpbGQgc3RhdGVzLlxuICpcbiAqL1xuJFN0YXRlUmVmQWN0aXZlRGlyZWN0aXZlLiRpbmplY3QgPSBbJyRzdGF0ZScsICckc3RhdGVQYXJhbXMnLCAnJGludGVycG9sYXRlJ107XG5mdW5jdGlvbiAkU3RhdGVSZWZBY3RpdmVEaXJlY3RpdmUoJHN0YXRlLCAkc3RhdGVQYXJhbXMsICRpbnRlcnBvbGF0ZSkge1xuICByZXR1cm4gIHtcbiAgICByZXN0cmljdDogXCJBXCIsXG4gICAgY29udHJvbGxlcjogWyckc2NvcGUnLCAnJGVsZW1lbnQnLCAnJGF0dHJzJywgZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycykge1xuICAgICAgdmFyIHN0YXRlLCBwYXJhbXMsIGFjdGl2ZUNsYXNzO1xuXG4gICAgICAvLyBUaGVyZSBwcm9iYWJseSBpc24ndCBtdWNoIHBvaW50IGluICRvYnNlcnZpbmcgdGhpc1xuICAgICAgLy8gdWlTcmVmQWN0aXZlIGFuZCB1aVNyZWZBY3RpdmVFcSBzaGFyZSB0aGUgc2FtZSBkaXJlY3RpdmUgb2JqZWN0IHdpdGggc29tZVxuICAgICAgLy8gc2xpZ2h0IGRpZmZlcmVuY2UgaW4gbG9naWMgcm91dGluZ1xuICAgICAgYWN0aXZlQ2xhc3MgPSAkaW50ZXJwb2xhdGUoJGF0dHJzLnVpU3JlZkFjdGl2ZUVxIHx8ICRhdHRycy51aVNyZWZBY3RpdmUgfHwgJycsIGZhbHNlKSgkc2NvcGUpO1xuXG4gICAgICAvLyBBbGxvdyB1aVNyZWYgdG8gY29tbXVuaWNhdGUgd2l0aCB1aVNyZWZBY3RpdmVbRXF1YWxzXVxuICAgICAgdGhpcy4kJHNldFN0YXRlSW5mbyA9IGZ1bmN0aW9uIChuZXdTdGF0ZSwgbmV3UGFyYW1zKSB7XG4gICAgICAgIHN0YXRlID0gJHN0YXRlLmdldChuZXdTdGF0ZSwgc3RhdGVDb250ZXh0KCRlbGVtZW50KSk7XG4gICAgICAgIHBhcmFtcyA9IG5ld1BhcmFtcztcbiAgICAgICAgdXBkYXRlKCk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdWNjZXNzJywgdXBkYXRlKTtcblxuICAgICAgLy8gVXBkYXRlIHJvdXRlIHN0YXRlXG4gICAgICBmdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgICAgIGlmIChpc01hdGNoKCkpIHtcbiAgICAgICAgICAkZWxlbWVudC5hZGRDbGFzcyhhY3RpdmVDbGFzcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJGVsZW1lbnQucmVtb3ZlQ2xhc3MoYWN0aXZlQ2xhc3MpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGlzTWF0Y2goKSB7XG4gICAgICAgIGlmICh0eXBlb2YgJGF0dHJzLnVpU3JlZkFjdGl2ZUVxICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHJldHVybiBzdGF0ZSAmJiAkc3RhdGUuaXMoc3RhdGUubmFtZSwgcGFyYW1zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gc3RhdGUgJiYgJHN0YXRlLmluY2x1ZGVzKHN0YXRlLm5hbWUsIHBhcmFtcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XVxuICB9O1xufVxuXG5hbmd1bGFyLm1vZHVsZSgndWkucm91dGVyLnN0YXRlJylcbiAgLmRpcmVjdGl2ZSgndWlTcmVmJywgJFN0YXRlUmVmRGlyZWN0aXZlKVxuICAuZGlyZWN0aXZlKCd1aVNyZWZBY3RpdmUnLCAkU3RhdGVSZWZBY3RpdmVEaXJlY3RpdmUpXG4gIC5kaXJlY3RpdmUoJ3VpU3JlZkFjdGl2ZUVxJywgJFN0YXRlUmVmQWN0aXZlRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBAbmdkb2MgZmlsdGVyXG4gKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuZmlsdGVyOmlzU3RhdGVcbiAqXG4gKiBAcmVxdWlyZXMgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogVHJhbnNsYXRlcyB0byB7QGxpbmsgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSNtZXRob2RzX2lzICRzdGF0ZS5pcyhcInN0YXRlTmFtZVwiKX0uXG4gKi9cbiRJc1N0YXRlRmlsdGVyLiRpbmplY3QgPSBbJyRzdGF0ZSddO1xuZnVuY3Rpb24gJElzU3RhdGVGaWx0ZXIoJHN0YXRlKSB7XG4gIHZhciBpc0ZpbHRlciA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgIHJldHVybiAkc3RhdGUuaXMoc3RhdGUpO1xuICB9O1xuICBpc0ZpbHRlci4kc3RhdGVmdWwgPSB0cnVlO1xuICByZXR1cm4gaXNGaWx0ZXI7XG59XG5cbi8qKlxuICogQG5nZG9jIGZpbHRlclxuICogQG5hbWUgdWkucm91dGVyLnN0YXRlLmZpbHRlcjppbmNsdWRlZEJ5U3RhdGVcbiAqXG4gKiBAcmVxdWlyZXMgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogVHJhbnNsYXRlcyB0byB7QGxpbmsgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSNtZXRob2RzX2luY2x1ZGVzICRzdGF0ZS5pbmNsdWRlcygnZnVsbE9yUGFydGlhbFN0YXRlTmFtZScpfS5cbiAqL1xuJEluY2x1ZGVkQnlTdGF0ZUZpbHRlci4kaW5qZWN0ID0gWyckc3RhdGUnXTtcbmZ1bmN0aW9uICRJbmNsdWRlZEJ5U3RhdGVGaWx0ZXIoJHN0YXRlKSB7XG4gIHZhciBpbmNsdWRlc0ZpbHRlciA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgIHJldHVybiAkc3RhdGUuaW5jbHVkZXMoc3RhdGUpO1xuICB9O1xuICBpbmNsdWRlc0ZpbHRlci4kc3RhdGVmdWwgPSB0cnVlO1xuICByZXR1cm4gIGluY2x1ZGVzRmlsdGVyO1xufVxuXG5hbmd1bGFyLm1vZHVsZSgndWkucm91dGVyLnN0YXRlJylcbiAgLmZpbHRlcignaXNTdGF0ZScsICRJc1N0YXRlRmlsdGVyKVxuICAuZmlsdGVyKCdpbmNsdWRlZEJ5U3RhdGUnLCAkSW5jbHVkZWRCeVN0YXRlRmlsdGVyKTtcbn0pKHdpbmRvdywgd2luZG93LmFuZ3VsYXIpOyJdLCJmaWxlIjoic2NyaXB0cy92ZW5kb3JzL2FuZ3VsYXItdWktcm91dGVyL3JlbGVhc2UvYW5ndWxhci11aS1yb3V0ZXIuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==