/**
 * @license AngularJS v1.3.9
 * (c) 2010-2014 Google, Inc. http://angularjs.org
 * License: MIT
 */
(function(window, angular, undefined) {'use strict';

var $resourceMinErr = angular.$$minErr('$resource');

// Helper functions and regex to lookup a dotted path on an object
// stopping at undefined/null.  The path must be composed of ASCII
// identifiers (just like $parse)
var MEMBER_NAME_REGEX = /^(\.[a-zA-Z_$][0-9a-zA-Z_$]*)+$/;

function isValidDottedPath(path) {
  return (path != null && path !== '' && path !== 'hasOwnProperty' &&
      MEMBER_NAME_REGEX.test('.' + path));
}

function lookupDottedPath(obj, path) {
  if (!isValidDottedPath(path)) {
    throw $resourceMinErr('badmember', 'Dotted member path "@{0}" is invalid.', path);
  }
  var keys = path.split('.');
  for (var i = 0, ii = keys.length; i < ii && obj !== undefined; i++) {
    var key = keys[i];
    obj = (obj !== null) ? obj[key] : undefined;
  }
  return obj;
}

/**
 * Create a shallow copy of an object and clear other fields from the destination
 */
function shallowClearAndCopy(src, dst) {
  dst = dst || {};

  angular.forEach(dst, function(value, key) {
    delete dst[key];
  });

  for (var key in src) {
    if (src.hasOwnProperty(key) && !(key.charAt(0) === '$' && key.charAt(1) === '$')) {
      dst[key] = src[key];
    }
  }

  return dst;
}

/**
 * @ngdoc module
 * @name ngResource
 * @description
 *
 * # ngResource
 *
 * The `ngResource` module provides interaction support with RESTful services
 * via the $resource service.
 *
 *
 * <div doc-module-components="ngResource"></div>
 *
 * See {@link ngResource.$resource `$resource`} for usage.
 */

/**
 * @ngdoc service
 * @name $resource
 * @requires $http
 *
 * @description
 * A factory which creates a resource object that lets you interact with
 * [RESTful](http://en.wikipedia.org/wiki/Representational_State_Transfer) server-side data sources.
 *
 * The returned resource object has action methods which provide high-level behaviors without
 * the need to interact with the low level {@link ng.$http $http} service.
 *
 * Requires the {@link ngResource `ngResource`} module to be installed.
 *
 * By default, trailing slashes will be stripped from the calculated URLs,
 * which can pose problems with server backends that do not expect that
 * behavior.  This can be disabled by configuring the `$resourceProvider` like
 * this:
 *
 * ```js
     app.config(['$resourceProvider', function($resourceProvider) {
       // Don't strip trailing slashes from calculated URLs
       $resourceProvider.defaults.stripTrailingSlashes = false;
     }]);
 * ```
 *
 * @param {string} url A parametrized URL template with parameters prefixed by `:` as in
 *   `/user/:username`. If you are using a URL with a port number (e.g.
 *   `http://example.com:8080/api`), it will be respected.
 *
 *   If you are using a url with a suffix, just add the suffix, like this:
 *   `$resource('http://example.com/resource.json')` or `$resource('http://example.com/:id.json')`
 *   or even `$resource('http://example.com/resource/:resource_id.:format')`
 *   If the parameter before the suffix is empty, :resource_id in this case, then the `/.` will be
 *   collapsed down to a single `.`.  If you need this sequence to appear and not collapse then you
 *   can escape it with `/\.`.
 *
 * @param {Object=} paramDefaults Default values for `url` parameters. These can be overridden in
 *   `actions` methods. If any of the parameter value is a function, it will be executed every time
 *   when a param value needs to be obtained for a request (unless the param was overridden).
 *
 *   Each key value in the parameter object is first bound to url template if present and then any
 *   excess keys are appended to the url search query after the `?`.
 *
 *   Given a template `/path/:verb` and parameter `{verb:'greet', salutation:'Hello'}` results in
 *   URL `/path/greet?salutation=Hello`.
 *
 *   If the parameter value is prefixed with `@` then the value for that parameter will be extracted
 *   from the corresponding property on the `data` object (provided when calling an action method).  For
 *   example, if the `defaultParam` object is `{someParam: '@someProp'}` then the value of `someParam`
 *   will be `data.someProp`.
 *
 * @param {Object.<Object>=} actions Hash with declaration of custom actions that should extend
 *   the default set of resource actions. The declaration should be created in the format of {@link
 *   ng.$http#usage $http.config}:
 *
 *       {action1: {method:?, params:?, isArray:?, headers:?, ...},
 *        action2: {method:?, params:?, isArray:?, headers:?, ...},
 *        ...}
 *
 *   Where:
 *
 *   - **`action`** – {string} – The name of action. This name becomes the name of the method on
 *     your resource object.
 *   - **`method`** – {string} – Case insensitive HTTP method (e.g. `GET`, `POST`, `PUT`,
 *     `DELETE`, `JSONP`, etc).
 *   - **`params`** – {Object=} – Optional set of pre-bound parameters for this action. If any of
 *     the parameter value is a function, it will be executed every time when a param value needs to
 *     be obtained for a request (unless the param was overridden).
 *   - **`url`** – {string} – action specific `url` override. The url templating is supported just
 *     like for the resource-level urls.
 *   - **`isArray`** – {boolean=} – If true then the returned object for this action is an array,
 *     see `returns` section.
 *   - **`transformRequest`** –
 *     `{function(data, headersGetter)|Array.<function(data, headersGetter)>}` –
 *     transform function or an array of such functions. The transform function takes the http
 *     request body and headers and returns its transformed (typically serialized) version.
 *     By default, transformRequest will contain one function that checks if the request data is
 *     an object and serializes to using `angular.toJson`. To prevent this behavior, set
 *     `transformRequest` to an empty array: `transformRequest: []`
 *   - **`transformResponse`** –
 *     `{function(data, headersGetter)|Array.<function(data, headersGetter)>}` –
 *     transform function or an array of such functions. The transform function takes the http
 *     response body and headers and returns its transformed (typically deserialized) version.
 *     By default, transformResponse will contain one function that checks if the response looks like
 *     a JSON string and deserializes it using `angular.fromJson`. To prevent this behavior, set
 *     `transformResponse` to an empty array: `transformResponse: []`
 *   - **`cache`** – `{boolean|Cache}` – If true, a default $http cache will be used to cache the
 *     GET request, otherwise if a cache instance built with
 *     {@link ng.$cacheFactory $cacheFactory}, this cache will be used for
 *     caching.
 *   - **`timeout`** – `{number|Promise}` – timeout in milliseconds, or {@link ng.$q promise} that
 *     should abort the request when resolved.
 *   - **`withCredentials`** - `{boolean}` - whether to set the `withCredentials` flag on the
 *     XHR object. See
 *     [requests with credentials](https://developer.mozilla.org/en/http_access_control#section_5)
 *     for more information.
 *   - **`responseType`** - `{string}` - see
 *     [requestType](https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest#responseType).
 *   - **`interceptor`** - `{Object=}` - The interceptor object has two optional methods -
 *     `response` and `responseError`. Both `response` and `responseError` interceptors get called
 *     with `http response` object. See {@link ng.$http $http interceptors}.
 *
 * @param {Object} options Hash with custom settings that should extend the
 *   default `$resourceProvider` behavior.  The only supported option is
 *
 *   Where:
 *
 *   - **`stripTrailingSlashes`** – {boolean} – If true then the trailing
 *   slashes from any calculated URL will be stripped. (Defaults to true.)
 *
 * @returns {Object} A resource "class" object with methods for the default set of resource actions
 *   optionally extended with custom `actions`. The default set contains these actions:
 *   ```js
 *   { 'get':    {method:'GET'},
 *     'save':   {method:'POST'},
 *     'query':  {method:'GET', isArray:true},
 *     'remove': {method:'DELETE'},
 *     'delete': {method:'DELETE'} };
 *   ```
 *
 *   Calling these methods invoke an {@link ng.$http} with the specified http method,
 *   destination and parameters. When the data is returned from the server then the object is an
 *   instance of the resource class. The actions `save`, `remove` and `delete` are available on it
 *   as  methods with the `$` prefix. This allows you to easily perform CRUD operations (create,
 *   read, update, delete) on server-side data like this:
 *   ```js
 *   var User = $resource('/user/:userId', {userId:'@id'});
 *   var user = User.get({userId:123}, function() {
 *     user.abc = true;
 *     user.$save();
 *   });
 *   ```
 *
 *   It is important to realize that invoking a $resource object method immediately returns an
 *   empty reference (object or array depending on `isArray`). Once the data is returned from the
 *   server the existing reference is populated with the actual data. This is a useful trick since
 *   usually the resource is assigned to a model which is then rendered by the view. Having an empty
 *   object results in no rendering, once the data arrives from the server then the object is
 *   populated with the data and the view automatically re-renders itself showing the new data. This
 *   means that in most cases one never has to write a callback function for the action methods.
 *
 *   The action methods on the class object or instance object can be invoked with the following
 *   parameters:
 *
 *   - HTTP GET "class" actions: `Resource.action([parameters], [success], [error])`
 *   - non-GET "class" actions: `Resource.action([parameters], postData, [success], [error])`
 *   - non-GET instance actions:  `instance.$action([parameters], [success], [error])`
 *
 *   Success callback is called with (value, responseHeaders) arguments. Error callback is called
 *   with (httpResponse) argument.
 *
 *   Class actions return empty instance (with additional properties below).
 *   Instance actions return promise of the action.
 *
 *   The Resource instances and collection have these additional properties:
 *
 *   - `$promise`: the {@link ng.$q promise} of the original server interaction that created this
 *     instance or collection.
 *
 *     On success, the promise is resolved with the same resource instance or collection object,
 *     updated with data from server. This makes it easy to use in
 *     {@link ngRoute.$routeProvider resolve section of $routeProvider.when()} to defer view
 *     rendering until the resource(s) are loaded.
 *
 *     On failure, the promise is resolved with the {@link ng.$http http response} object, without
 *     the `resource` property.
 *
 *     If an interceptor object was provided, the promise will instead be resolved with the value
 *     returned by the interceptor.
 *
 *   - `$resolved`: `true` after first server interaction is completed (either with success or
 *      rejection), `false` before that. Knowing if the Resource has been resolved is useful in
 *      data-binding.
 *
 * @example
 *
 * # Credit card resource
 *
 * ```js
     // Define CreditCard class
     var CreditCard = $resource('/user/:userId/card/:cardId',
      {userId:123, cardId:'@id'}, {
       charge: {method:'POST', params:{charge:true}}
      });

     // We can retrieve a collection from the server
     var cards = CreditCard.query(function() {
       // GET: /user/123/card
       // server returns: [ {id:456, number:'1234', name:'Smith'} ];

       var card = cards[0];
       // each item is an instance of CreditCard
       expect(card instanceof CreditCard).toEqual(true);
       card.name = "J. Smith";
       // non GET methods are mapped onto the instances
       card.$save();
       // POST: /user/123/card/456 {id:456, number:'1234', name:'J. Smith'}
       // server returns: {id:456, number:'1234', name: 'J. Smith'};

       // our custom method is mapped as well.
       card.$charge({amount:9.99});
       // POST: /user/123/card/456?amount=9.99&charge=true {id:456, number:'1234', name:'J. Smith'}
     });

     // we can create an instance as well
     var newCard = new CreditCard({number:'0123'});
     newCard.name = "Mike Smith";
     newCard.$save();
     // POST: /user/123/card {number:'0123', name:'Mike Smith'}
     // server returns: {id:789, number:'0123', name: 'Mike Smith'};
     expect(newCard.id).toEqual(789);
 * ```
 *
 * The object returned from this function execution is a resource "class" which has "static" method
 * for each action in the definition.
 *
 * Calling these methods invoke `$http` on the `url` template with the given `method`, `params` and
 * `headers`.
 * When the data is returned from the server then the object is an instance of the resource type and
 * all of the non-GET methods are available with `$` prefix. This allows you to easily support CRUD
 * operations (create, read, update, delete) on server-side data.

   ```js
     var User = $resource('/user/:userId', {userId:'@id'});
     User.get({userId:123}, function(user) {
       user.abc = true;
       user.$save();
     });
   ```
 *
 * It's worth noting that the success callback for `get`, `query` and other methods gets passed
 * in the response that came from the server as well as $http header getter function, so one
 * could rewrite the above example and get access to http headers as:
 *
   ```js
     var User = $resource('/user/:userId', {userId:'@id'});
     User.get({userId:123}, function(u, getResponseHeaders){
       u.abc = true;
       u.$save(function(u, putResponseHeaders) {
         //u => saved user object
         //putResponseHeaders => $http header getter
       });
     });
   ```
 *
 * You can also access the raw `$http` promise via the `$promise` property on the object returned
 *
   ```
     var User = $resource('/user/:userId', {userId:'@id'});
     User.get({userId:123})
         .$promise.then(function(user) {
           $scope.user = user;
         });
   ```

 * # Creating a custom 'PUT' request
 * In this example we create a custom method on our resource to make a PUT request
 * ```js
 *    var app = angular.module('app', ['ngResource', 'ngRoute']);
 *
 *    // Some APIs expect a PUT request in the format URL/object/ID
 *    // Here we are creating an 'update' method
 *    app.factory('Notes', ['$resource', function($resource) {
 *    return $resource('/notes/:id', null,
 *        {
 *            'update': { method:'PUT' }
 *        });
 *    }]);
 *
 *    // In our controller we get the ID from the URL using ngRoute and $routeParams
 *    // We pass in $routeParams and our Notes factory along with $scope
 *    app.controller('NotesCtrl', ['$scope', '$routeParams', 'Notes',
                                      function($scope, $routeParams, Notes) {
 *    // First get a note object from the factory
 *    var note = Notes.get({ id:$routeParams.id });
 *    $id = note.id;
 *
 *    // Now call update passing in the ID first then the object you are updating
 *    Notes.update({ id:$id }, note);
 *
 *    // This will PUT /notes/ID with the note object in the request payload
 *    }]);
 * ```
 */
angular.module('ngResource', ['ng']).
  provider('$resource', function() {
    var provider = this;

    this.defaults = {
      // Strip slashes by default
      stripTrailingSlashes: true,

      // Default actions configuration
      actions: {
        'get': {method: 'GET'},
        'save': {method: 'POST'},
        'query': {method: 'GET', isArray: true},
        'remove': {method: 'DELETE'},
        'delete': {method: 'DELETE'}
      }
    };

    this.$get = ['$http', '$q', function($http, $q) {

      var noop = angular.noop,
        forEach = angular.forEach,
        extend = angular.extend,
        copy = angular.copy,
        isFunction = angular.isFunction;

      /**
       * We need our custom method because encodeURIComponent is too aggressive and doesn't follow
       * http://www.ietf.org/rfc/rfc3986.txt with regards to the character set
       * (pchar) allowed in path segments:
       *    segment       = *pchar
       *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
       *    pct-encoded   = "%" HEXDIG HEXDIG
       *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
       *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
       *                     / "*" / "+" / "," / ";" / "="
       */
      function encodeUriSegment(val) {
        return encodeUriQuery(val, true).
          replace(/%26/gi, '&').
          replace(/%3D/gi, '=').
          replace(/%2B/gi, '+');
      }


      /**
       * This method is intended for encoding *key* or *value* parts of query component. We need a
       * custom method because encodeURIComponent is too aggressive and encodes stuff that doesn't
       * have to be encoded per http://tools.ietf.org/html/rfc3986:
       *    query       = *( pchar / "/" / "?" )
       *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
       *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
       *    pct-encoded   = "%" HEXDIG HEXDIG
       *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
       *                     / "*" / "+" / "," / ";" / "="
       */
      function encodeUriQuery(val, pctEncodeSpaces) {
        return encodeURIComponent(val).
          replace(/%40/gi, '@').
          replace(/%3A/gi, ':').
          replace(/%24/g, '$').
          replace(/%2C/gi, ',').
          replace(/%20/g, (pctEncodeSpaces ? '%20' : '+'));
      }

      function Route(template, defaults) {
        this.template = template;
        this.defaults = extend({}, provider.defaults, defaults);
        this.urlParams = {};
      }

      Route.prototype = {
        setUrlParams: function(config, params, actionUrl) {
          var self = this,
            url = actionUrl || self.template,
            val,
            encodedVal;

          var urlParams = self.urlParams = {};
          forEach(url.split(/\W/), function(param) {
            if (param === 'hasOwnProperty') {
              throw $resourceMinErr('badname', "hasOwnProperty is not a valid parameter name.");
            }
            if (!(new RegExp("^\\d+$").test(param)) && param &&
              (new RegExp("(^|[^\\\\]):" + param + "(\\W|$)").test(url))) {
              urlParams[param] = true;
            }
          });
          url = url.replace(/\\:/g, ':');

          params = params || {};
          forEach(self.urlParams, function(_, urlParam) {
            val = params.hasOwnProperty(urlParam) ? params[urlParam] : self.defaults[urlParam];
            if (angular.isDefined(val) && val !== null) {
              encodedVal = encodeUriSegment(val);
              url = url.replace(new RegExp(":" + urlParam + "(\\W|$)", "g"), function(match, p1) {
                return encodedVal + p1;
              });
            } else {
              url = url.replace(new RegExp("(\/?):" + urlParam + "(\\W|$)", "g"), function(match,
                  leadingSlashes, tail) {
                if (tail.charAt(0) == '/') {
                  return tail;
                } else {
                  return leadingSlashes + tail;
                }
              });
            }
          });

          // strip trailing slashes and set the url (unless this behavior is specifically disabled)
          if (self.defaults.stripTrailingSlashes) {
            url = url.replace(/\/+$/, '') || '/';
          }

          // then replace collapse `/.` if found in the last URL path segment before the query
          // E.g. `http://url.com/id./format?q=x` becomes `http://url.com/id.format?q=x`
          url = url.replace(/\/\.(?=\w+($|\?))/, '.');
          // replace escaped `/\.` with `/.`
          config.url = url.replace(/\/\\\./, '/.');


          // set params - delegate param encoding to $http
          forEach(params, function(value, key) {
            if (!self.urlParams[key]) {
              config.params = config.params || {};
              config.params[key] = value;
            }
          });
        }
      };


      function resourceFactory(url, paramDefaults, actions, options) {
        var route = new Route(url, options);

        actions = extend({}, provider.defaults.actions, actions);

        function extractParams(data, actionParams) {
          var ids = {};
          actionParams = extend({}, paramDefaults, actionParams);
          forEach(actionParams, function(value, key) {
            if (isFunction(value)) { value = value(); }
            ids[key] = value && value.charAt && value.charAt(0) == '@' ?
              lookupDottedPath(data, value.substr(1)) : value;
          });
          return ids;
        }

        function defaultResponseInterceptor(response) {
          return response.resource;
        }

        function Resource(value) {
          shallowClearAndCopy(value || {}, this);
        }

        Resource.prototype.toJSON = function() {
          var data = extend({}, this);
          delete data.$promise;
          delete data.$resolved;
          return data;
        };

        forEach(actions, function(action, name) {
          var hasBody = /^(POST|PUT|PATCH)$/i.test(action.method);

          Resource[name] = function(a1, a2, a3, a4) {
            var params = {}, data, success, error;

            /* jshint -W086 */ /* (purposefully fall through case statements) */
            switch (arguments.length) {
              case 4:
                error = a4;
                success = a3;
              //fallthrough
              case 3:
              case 2:
                if (isFunction(a2)) {
                  if (isFunction(a1)) {
                    success = a1;
                    error = a2;
                    break;
                  }

                  success = a2;
                  error = a3;
                  //fallthrough
                } else {
                  params = a1;
                  data = a2;
                  success = a3;
                  break;
                }
              case 1:
                if (isFunction(a1)) success = a1;
                else if (hasBody) data = a1;
                else params = a1;
                break;
              case 0: break;
              default:
                throw $resourceMinErr('badargs',
                  "Expected up to 4 arguments [params, data, success, error], got {0} arguments",
                  arguments.length);
            }
            /* jshint +W086 */ /* (purposefully fall through case statements) */

            var isInstanceCall = this instanceof Resource;
            var value = isInstanceCall ? data : (action.isArray ? [] : new Resource(data));
            var httpConfig = {};
            var responseInterceptor = action.interceptor && action.interceptor.response ||
              defaultResponseInterceptor;
            var responseErrorInterceptor = action.interceptor && action.interceptor.responseError ||
              undefined;

            forEach(action, function(value, key) {
              if (key != 'params' && key != 'isArray' && key != 'interceptor') {
                httpConfig[key] = copy(value);
              }
            });

            if (hasBody) httpConfig.data = data;
            route.setUrlParams(httpConfig,
              extend({}, extractParams(data, action.params || {}), params),
              action.url);

            var promise = $http(httpConfig).then(function(response) {
              var data = response.data,
                promise = value.$promise;

              if (data) {
                // Need to convert action.isArray to boolean in case it is undefined
                // jshint -W018
                if (angular.isArray(data) !== (!!action.isArray)) {
                  throw $resourceMinErr('badcfg',
                      'Error in resource configuration for action `{0}`. Expected response to ' +
                      'contain an {1} but got an {2}', name, action.isArray ? 'array' : 'object',
                    angular.isArray(data) ? 'array' : 'object');
                }
                // jshint +W018
                if (action.isArray) {
                  value.length = 0;
                  forEach(data, function(item) {
                    if (typeof item === "object") {
                      value.push(new Resource(item));
                    } else {
                      // Valid JSON values may be string literals, and these should not be converted
                      // into objects. These items will not have access to the Resource prototype
                      // methods, but unfortunately there
                      value.push(item);
                    }
                  });
                } else {
                  shallowClearAndCopy(data, value);
                  value.$promise = promise;
                }
              }

              value.$resolved = true;

              response.resource = value;

              return response;
            }, function(response) {
              value.$resolved = true;

              (error || noop)(response);

              return $q.reject(response);
            });

            promise = promise.then(
              function(response) {
                var value = responseInterceptor(response);
                (success || noop)(value, response.headers);
                return value;
              },
              responseErrorInterceptor);

            if (!isInstanceCall) {
              // we are creating instance / collection
              // - set the initial promise
              // - return the instance / collection
              value.$promise = promise;
              value.$resolved = false;

              return value;
            }

            // instance call
            return promise;
          };


          Resource.prototype['$' + name] = function(params, success, error) {
            if (isFunction(params)) {
              error = success; success = params; params = {};
            }
            var result = Resource[name].call(this, params, this, success, error);
            return result.$promise || result;
          };
        });

        Resource.bind = function(additionalParamDefaults) {
          return resourceFactory(url, extend({}, paramDefaults, additionalParamDefaults), actions);
        };

        return Resource;
      }

      return resourceFactory;
    }];
  });


})(window, window.angular);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL3ZlbmRvcnMvYW5ndWxhci1yZXNvdXJjZS9hbmd1bGFyLXJlc291cmNlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2UgQW5ndWxhckpTIHYxLjMuOVxuICogKGMpIDIwMTAtMjAxNCBHb29nbGUsIEluYy4gaHR0cDovL2FuZ3VsYXJqcy5vcmdcbiAqIExpY2Vuc2U6IE1JVFxuICovXG4oZnVuY3Rpb24od2luZG93LCBhbmd1bGFyLCB1bmRlZmluZWQpIHsndXNlIHN0cmljdCc7XG5cbnZhciAkcmVzb3VyY2VNaW5FcnIgPSBhbmd1bGFyLiQkbWluRXJyKCckcmVzb3VyY2UnKTtcblxuLy8gSGVscGVyIGZ1bmN0aW9ucyBhbmQgcmVnZXggdG8gbG9va3VwIGEgZG90dGVkIHBhdGggb24gYW4gb2JqZWN0XG4vLyBzdG9wcGluZyBhdCB1bmRlZmluZWQvbnVsbC4gIFRoZSBwYXRoIG11c3QgYmUgY29tcG9zZWQgb2YgQVNDSUlcbi8vIGlkZW50aWZpZXJzIChqdXN0IGxpa2UgJHBhcnNlKVxudmFyIE1FTUJFUl9OQU1FX1JFR0VYID0gL14oXFwuW2EtekEtWl8kXVswLTlhLXpBLVpfJF0qKSskLztcblxuZnVuY3Rpb24gaXNWYWxpZERvdHRlZFBhdGgocGF0aCkge1xuICByZXR1cm4gKHBhdGggIT0gbnVsbCAmJiBwYXRoICE9PSAnJyAmJiBwYXRoICE9PSAnaGFzT3duUHJvcGVydHknICYmXG4gICAgICBNRU1CRVJfTkFNRV9SRUdFWC50ZXN0KCcuJyArIHBhdGgpKTtcbn1cblxuZnVuY3Rpb24gbG9va3VwRG90dGVkUGF0aChvYmosIHBhdGgpIHtcbiAgaWYgKCFpc1ZhbGlkRG90dGVkUGF0aChwYXRoKSkge1xuICAgIHRocm93ICRyZXNvdXJjZU1pbkVycignYmFkbWVtYmVyJywgJ0RvdHRlZCBtZW1iZXIgcGF0aCBcIkB7MH1cIiBpcyBpbnZhbGlkLicsIHBhdGgpO1xuICB9XG4gIHZhciBrZXlzID0gcGF0aC5zcGxpdCgnLicpO1xuICBmb3IgKHZhciBpID0gMCwgaWkgPSBrZXlzLmxlbmd0aDsgaSA8IGlpICYmIG9iaiAhPT0gdW5kZWZpbmVkOyBpKyspIHtcbiAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICBvYmogPSAob2JqICE9PSBudWxsKSA/IG9ialtrZXldIDogdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgc2hhbGxvdyBjb3B5IG9mIGFuIG9iamVjdCBhbmQgY2xlYXIgb3RoZXIgZmllbGRzIGZyb20gdGhlIGRlc3RpbmF0aW9uXG4gKi9cbmZ1bmN0aW9uIHNoYWxsb3dDbGVhckFuZENvcHkoc3JjLCBkc3QpIHtcbiAgZHN0ID0gZHN0IHx8IHt9O1xuXG4gIGFuZ3VsYXIuZm9yRWFjaChkc3QsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICBkZWxldGUgZHN0W2tleV07XG4gIH0pO1xuXG4gIGZvciAodmFyIGtleSBpbiBzcmMpIHtcbiAgICBpZiAoc3JjLmhhc093blByb3BlcnR5KGtleSkgJiYgIShrZXkuY2hhckF0KDApID09PSAnJCcgJiYga2V5LmNoYXJBdCgxKSA9PT0gJyQnKSkge1xuICAgICAgZHN0W2tleV0gPSBzcmNba2V5XTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZHN0O1xufVxuXG4vKipcbiAqIEBuZ2RvYyBtb2R1bGVcbiAqIEBuYW1lIG5nUmVzb3VyY2VcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqICMgbmdSZXNvdXJjZVxuICpcbiAqIFRoZSBgbmdSZXNvdXJjZWAgbW9kdWxlIHByb3ZpZGVzIGludGVyYWN0aW9uIHN1cHBvcnQgd2l0aCBSRVNUZnVsIHNlcnZpY2VzXG4gKiB2aWEgdGhlICRyZXNvdXJjZSBzZXJ2aWNlLlxuICpcbiAqXG4gKiA8ZGl2IGRvYy1tb2R1bGUtY29tcG9uZW50cz1cIm5nUmVzb3VyY2VcIj48L2Rpdj5cbiAqXG4gKiBTZWUge0BsaW5rIG5nUmVzb3VyY2UuJHJlc291cmNlIGAkcmVzb3VyY2VgfSBmb3IgdXNhZ2UuXG4gKi9cblxuLyoqXG4gKiBAbmdkb2Mgc2VydmljZVxuICogQG5hbWUgJHJlc291cmNlXG4gKiBAcmVxdWlyZXMgJGh0dHBcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIEEgZmFjdG9yeSB3aGljaCBjcmVhdGVzIGEgcmVzb3VyY2Ugb2JqZWN0IHRoYXQgbGV0cyB5b3UgaW50ZXJhY3Qgd2l0aFxuICogW1JFU1RmdWxdKGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvUmVwcmVzZW50YXRpb25hbF9TdGF0ZV9UcmFuc2Zlcikgc2VydmVyLXNpZGUgZGF0YSBzb3VyY2VzLlxuICpcbiAqIFRoZSByZXR1cm5lZCByZXNvdXJjZSBvYmplY3QgaGFzIGFjdGlvbiBtZXRob2RzIHdoaWNoIHByb3ZpZGUgaGlnaC1sZXZlbCBiZWhhdmlvcnMgd2l0aG91dFxuICogdGhlIG5lZWQgdG8gaW50ZXJhY3Qgd2l0aCB0aGUgbG93IGxldmVsIHtAbGluayBuZy4kaHR0cCAkaHR0cH0gc2VydmljZS5cbiAqXG4gKiBSZXF1aXJlcyB0aGUge0BsaW5rIG5nUmVzb3VyY2UgYG5nUmVzb3VyY2VgfSBtb2R1bGUgdG8gYmUgaW5zdGFsbGVkLlxuICpcbiAqIEJ5IGRlZmF1bHQsIHRyYWlsaW5nIHNsYXNoZXMgd2lsbCBiZSBzdHJpcHBlZCBmcm9tIHRoZSBjYWxjdWxhdGVkIFVSTHMsXG4gKiB3aGljaCBjYW4gcG9zZSBwcm9ibGVtcyB3aXRoIHNlcnZlciBiYWNrZW5kcyB0aGF0IGRvIG5vdCBleHBlY3QgdGhhdFxuICogYmVoYXZpb3IuICBUaGlzIGNhbiBiZSBkaXNhYmxlZCBieSBjb25maWd1cmluZyB0aGUgYCRyZXNvdXJjZVByb3ZpZGVyYCBsaWtlXG4gKiB0aGlzOlxuICpcbiAqIGBgYGpzXG4gICAgIGFwcC5jb25maWcoWyckcmVzb3VyY2VQcm92aWRlcicsIGZ1bmN0aW9uKCRyZXNvdXJjZVByb3ZpZGVyKSB7XG4gICAgICAgLy8gRG9uJ3Qgc3RyaXAgdHJhaWxpbmcgc2xhc2hlcyBmcm9tIGNhbGN1bGF0ZWQgVVJMc1xuICAgICAgICRyZXNvdXJjZVByb3ZpZGVyLmRlZmF1bHRzLnN0cmlwVHJhaWxpbmdTbGFzaGVzID0gZmFsc2U7XG4gICAgIH1dKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgQSBwYXJhbWV0cml6ZWQgVVJMIHRlbXBsYXRlIHdpdGggcGFyYW1ldGVycyBwcmVmaXhlZCBieSBgOmAgYXMgaW5cbiAqICAgYC91c2VyLzp1c2VybmFtZWAuIElmIHlvdSBhcmUgdXNpbmcgYSBVUkwgd2l0aCBhIHBvcnQgbnVtYmVyIChlLmcuXG4gKiAgIGBodHRwOi8vZXhhbXBsZS5jb206ODA4MC9hcGlgKSwgaXQgd2lsbCBiZSByZXNwZWN0ZWQuXG4gKlxuICogICBJZiB5b3UgYXJlIHVzaW5nIGEgdXJsIHdpdGggYSBzdWZmaXgsIGp1c3QgYWRkIHRoZSBzdWZmaXgsIGxpa2UgdGhpczpcbiAqICAgYCRyZXNvdXJjZSgnaHR0cDovL2V4YW1wbGUuY29tL3Jlc291cmNlLmpzb24nKWAgb3IgYCRyZXNvdXJjZSgnaHR0cDovL2V4YW1wbGUuY29tLzppZC5qc29uJylgXG4gKiAgIG9yIGV2ZW4gYCRyZXNvdXJjZSgnaHR0cDovL2V4YW1wbGUuY29tL3Jlc291cmNlLzpyZXNvdXJjZV9pZC46Zm9ybWF0JylgXG4gKiAgIElmIHRoZSBwYXJhbWV0ZXIgYmVmb3JlIHRoZSBzdWZmaXggaXMgZW1wdHksIDpyZXNvdXJjZV9pZCBpbiB0aGlzIGNhc2UsIHRoZW4gdGhlIGAvLmAgd2lsbCBiZVxuICogICBjb2xsYXBzZWQgZG93biB0byBhIHNpbmdsZSBgLmAuICBJZiB5b3UgbmVlZCB0aGlzIHNlcXVlbmNlIHRvIGFwcGVhciBhbmQgbm90IGNvbGxhcHNlIHRoZW4geW91XG4gKiAgIGNhbiBlc2NhcGUgaXQgd2l0aCBgL1xcLmAuXG4gKlxuICogQHBhcmFtIHtPYmplY3Q9fSBwYXJhbURlZmF1bHRzIERlZmF1bHQgdmFsdWVzIGZvciBgdXJsYCBwYXJhbWV0ZXJzLiBUaGVzZSBjYW4gYmUgb3ZlcnJpZGRlbiBpblxuICogICBgYWN0aW9uc2AgbWV0aG9kcy4gSWYgYW55IG9mIHRoZSBwYXJhbWV0ZXIgdmFsdWUgaXMgYSBmdW5jdGlvbiwgaXQgd2lsbCBiZSBleGVjdXRlZCBldmVyeSB0aW1lXG4gKiAgIHdoZW4gYSBwYXJhbSB2YWx1ZSBuZWVkcyB0byBiZSBvYnRhaW5lZCBmb3IgYSByZXF1ZXN0ICh1bmxlc3MgdGhlIHBhcmFtIHdhcyBvdmVycmlkZGVuKS5cbiAqXG4gKiAgIEVhY2gga2V5IHZhbHVlIGluIHRoZSBwYXJhbWV0ZXIgb2JqZWN0IGlzIGZpcnN0IGJvdW5kIHRvIHVybCB0ZW1wbGF0ZSBpZiBwcmVzZW50IGFuZCB0aGVuIGFueVxuICogICBleGNlc3Mga2V5cyBhcmUgYXBwZW5kZWQgdG8gdGhlIHVybCBzZWFyY2ggcXVlcnkgYWZ0ZXIgdGhlIGA/YC5cbiAqXG4gKiAgIEdpdmVuIGEgdGVtcGxhdGUgYC9wYXRoLzp2ZXJiYCBhbmQgcGFyYW1ldGVyIGB7dmVyYjonZ3JlZXQnLCBzYWx1dGF0aW9uOidIZWxsbyd9YCByZXN1bHRzIGluXG4gKiAgIFVSTCBgL3BhdGgvZ3JlZXQ/c2FsdXRhdGlvbj1IZWxsb2AuXG4gKlxuICogICBJZiB0aGUgcGFyYW1ldGVyIHZhbHVlIGlzIHByZWZpeGVkIHdpdGggYEBgIHRoZW4gdGhlIHZhbHVlIGZvciB0aGF0IHBhcmFtZXRlciB3aWxsIGJlIGV4dHJhY3RlZFxuICogICBmcm9tIHRoZSBjb3JyZXNwb25kaW5nIHByb3BlcnR5IG9uIHRoZSBgZGF0YWAgb2JqZWN0IChwcm92aWRlZCB3aGVuIGNhbGxpbmcgYW4gYWN0aW9uIG1ldGhvZCkuICBGb3JcbiAqICAgZXhhbXBsZSwgaWYgdGhlIGBkZWZhdWx0UGFyYW1gIG9iamVjdCBpcyBge3NvbWVQYXJhbTogJ0Bzb21lUHJvcCd9YCB0aGVuIHRoZSB2YWx1ZSBvZiBgc29tZVBhcmFtYFxuICogICB3aWxsIGJlIGBkYXRhLnNvbWVQcm9wYC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdC48T2JqZWN0Pj19IGFjdGlvbnMgSGFzaCB3aXRoIGRlY2xhcmF0aW9uIG9mIGN1c3RvbSBhY3Rpb25zIHRoYXQgc2hvdWxkIGV4dGVuZFxuICogICB0aGUgZGVmYXVsdCBzZXQgb2YgcmVzb3VyY2UgYWN0aW9ucy4gVGhlIGRlY2xhcmF0aW9uIHNob3VsZCBiZSBjcmVhdGVkIGluIHRoZSBmb3JtYXQgb2Yge0BsaW5rXG4gKiAgIG5nLiRodHRwI3VzYWdlICRodHRwLmNvbmZpZ306XG4gKlxuICogICAgICAge2FjdGlvbjE6IHttZXRob2Q6PywgcGFyYW1zOj8sIGlzQXJyYXk6PywgaGVhZGVyczo/LCAuLi59LFxuICogICAgICAgIGFjdGlvbjI6IHttZXRob2Q6PywgcGFyYW1zOj8sIGlzQXJyYXk6PywgaGVhZGVyczo/LCAuLi59LFxuICogICAgICAgIC4uLn1cbiAqXG4gKiAgIFdoZXJlOlxuICpcbiAqICAgLSAqKmBhY3Rpb25gKiog4oCTIHtzdHJpbmd9IOKAkyBUaGUgbmFtZSBvZiBhY3Rpb24uIFRoaXMgbmFtZSBiZWNvbWVzIHRoZSBuYW1lIG9mIHRoZSBtZXRob2Qgb25cbiAqICAgICB5b3VyIHJlc291cmNlIG9iamVjdC5cbiAqICAgLSAqKmBtZXRob2RgKiog4oCTIHtzdHJpbmd9IOKAkyBDYXNlIGluc2Vuc2l0aXZlIEhUVFAgbWV0aG9kIChlLmcuIGBHRVRgLCBgUE9TVGAsIGBQVVRgLFxuICogICAgIGBERUxFVEVgLCBgSlNPTlBgLCBldGMpLlxuICogICAtICoqYHBhcmFtc2AqKiDigJMge09iamVjdD19IOKAkyBPcHRpb25hbCBzZXQgb2YgcHJlLWJvdW5kIHBhcmFtZXRlcnMgZm9yIHRoaXMgYWN0aW9uLiBJZiBhbnkgb2ZcbiAqICAgICB0aGUgcGFyYW1ldGVyIHZhbHVlIGlzIGEgZnVuY3Rpb24sIGl0IHdpbGwgYmUgZXhlY3V0ZWQgZXZlcnkgdGltZSB3aGVuIGEgcGFyYW0gdmFsdWUgbmVlZHMgdG9cbiAqICAgICBiZSBvYnRhaW5lZCBmb3IgYSByZXF1ZXN0ICh1bmxlc3MgdGhlIHBhcmFtIHdhcyBvdmVycmlkZGVuKS5cbiAqICAgLSAqKmB1cmxgKiog4oCTIHtzdHJpbmd9IOKAkyBhY3Rpb24gc3BlY2lmaWMgYHVybGAgb3ZlcnJpZGUuIFRoZSB1cmwgdGVtcGxhdGluZyBpcyBzdXBwb3J0ZWQganVzdFxuICogICAgIGxpa2UgZm9yIHRoZSByZXNvdXJjZS1sZXZlbCB1cmxzLlxuICogICAtICoqYGlzQXJyYXlgKiog4oCTIHtib29sZWFuPX0g4oCTIElmIHRydWUgdGhlbiB0aGUgcmV0dXJuZWQgb2JqZWN0IGZvciB0aGlzIGFjdGlvbiBpcyBhbiBhcnJheSxcbiAqICAgICBzZWUgYHJldHVybnNgIHNlY3Rpb24uXG4gKiAgIC0gKipgdHJhbnNmb3JtUmVxdWVzdGAqKiDigJNcbiAqICAgICBge2Z1bmN0aW9uKGRhdGEsIGhlYWRlcnNHZXR0ZXIpfEFycmF5LjxmdW5jdGlvbihkYXRhLCBoZWFkZXJzR2V0dGVyKT59YCDigJNcbiAqICAgICB0cmFuc2Zvcm0gZnVuY3Rpb24gb3IgYW4gYXJyYXkgb2Ygc3VjaCBmdW5jdGlvbnMuIFRoZSB0cmFuc2Zvcm0gZnVuY3Rpb24gdGFrZXMgdGhlIGh0dHBcbiAqICAgICByZXF1ZXN0IGJvZHkgYW5kIGhlYWRlcnMgYW5kIHJldHVybnMgaXRzIHRyYW5zZm9ybWVkICh0eXBpY2FsbHkgc2VyaWFsaXplZCkgdmVyc2lvbi5cbiAqICAgICBCeSBkZWZhdWx0LCB0cmFuc2Zvcm1SZXF1ZXN0IHdpbGwgY29udGFpbiBvbmUgZnVuY3Rpb24gdGhhdCBjaGVja3MgaWYgdGhlIHJlcXVlc3QgZGF0YSBpc1xuICogICAgIGFuIG9iamVjdCBhbmQgc2VyaWFsaXplcyB0byB1c2luZyBgYW5ndWxhci50b0pzb25gLiBUbyBwcmV2ZW50IHRoaXMgYmVoYXZpb3IsIHNldFxuICogICAgIGB0cmFuc2Zvcm1SZXF1ZXN0YCB0byBhbiBlbXB0eSBhcnJheTogYHRyYW5zZm9ybVJlcXVlc3Q6IFtdYFxuICogICAtICoqYHRyYW5zZm9ybVJlc3BvbnNlYCoqIOKAk1xuICogICAgIGB7ZnVuY3Rpb24oZGF0YSwgaGVhZGVyc0dldHRlcil8QXJyYXkuPGZ1bmN0aW9uKGRhdGEsIGhlYWRlcnNHZXR0ZXIpPn1gIOKAk1xuICogICAgIHRyYW5zZm9ybSBmdW5jdGlvbiBvciBhbiBhcnJheSBvZiBzdWNoIGZ1bmN0aW9ucy4gVGhlIHRyYW5zZm9ybSBmdW5jdGlvbiB0YWtlcyB0aGUgaHR0cFxuICogICAgIHJlc3BvbnNlIGJvZHkgYW5kIGhlYWRlcnMgYW5kIHJldHVybnMgaXRzIHRyYW5zZm9ybWVkICh0eXBpY2FsbHkgZGVzZXJpYWxpemVkKSB2ZXJzaW9uLlxuICogICAgIEJ5IGRlZmF1bHQsIHRyYW5zZm9ybVJlc3BvbnNlIHdpbGwgY29udGFpbiBvbmUgZnVuY3Rpb24gdGhhdCBjaGVja3MgaWYgdGhlIHJlc3BvbnNlIGxvb2tzIGxpa2VcbiAqICAgICBhIEpTT04gc3RyaW5nIGFuZCBkZXNlcmlhbGl6ZXMgaXQgdXNpbmcgYGFuZ3VsYXIuZnJvbUpzb25gLiBUbyBwcmV2ZW50IHRoaXMgYmVoYXZpb3IsIHNldFxuICogICAgIGB0cmFuc2Zvcm1SZXNwb25zZWAgdG8gYW4gZW1wdHkgYXJyYXk6IGB0cmFuc2Zvcm1SZXNwb25zZTogW11gXG4gKiAgIC0gKipgY2FjaGVgKiog4oCTIGB7Ym9vbGVhbnxDYWNoZX1gIOKAkyBJZiB0cnVlLCBhIGRlZmF1bHQgJGh0dHAgY2FjaGUgd2lsbCBiZSB1c2VkIHRvIGNhY2hlIHRoZVxuICogICAgIEdFVCByZXF1ZXN0LCBvdGhlcndpc2UgaWYgYSBjYWNoZSBpbnN0YW5jZSBidWlsdCB3aXRoXG4gKiAgICAge0BsaW5rIG5nLiRjYWNoZUZhY3RvcnkgJGNhY2hlRmFjdG9yeX0sIHRoaXMgY2FjaGUgd2lsbCBiZSB1c2VkIGZvclxuICogICAgIGNhY2hpbmcuXG4gKiAgIC0gKipgdGltZW91dGAqKiDigJMgYHtudW1iZXJ8UHJvbWlzZX1gIOKAkyB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcywgb3Ige0BsaW5rIG5nLiRxIHByb21pc2V9IHRoYXRcbiAqICAgICBzaG91bGQgYWJvcnQgdGhlIHJlcXVlc3Qgd2hlbiByZXNvbHZlZC5cbiAqICAgLSAqKmB3aXRoQ3JlZGVudGlhbHNgKiogLSBge2Jvb2xlYW59YCAtIHdoZXRoZXIgdG8gc2V0IHRoZSBgd2l0aENyZWRlbnRpYWxzYCBmbGFnIG9uIHRoZVxuICogICAgIFhIUiBvYmplY3QuIFNlZVxuICogICAgIFtyZXF1ZXN0cyB3aXRoIGNyZWRlbnRpYWxzXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9odHRwX2FjY2Vzc19jb250cm9sI3NlY3Rpb25fNSlcbiAqICAgICBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAqICAgLSAqKmByZXNwb25zZVR5cGVgKiogLSBge3N0cmluZ31gIC0gc2VlXG4gKiAgICAgW3JlcXVlc3RUeXBlXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL0RPTS9YTUxIdHRwUmVxdWVzdCNyZXNwb25zZVR5cGUpLlxuICogICAtICoqYGludGVyY2VwdG9yYCoqIC0gYHtPYmplY3Q9fWAgLSBUaGUgaW50ZXJjZXB0b3Igb2JqZWN0IGhhcyB0d28gb3B0aW9uYWwgbWV0aG9kcyAtXG4gKiAgICAgYHJlc3BvbnNlYCBhbmQgYHJlc3BvbnNlRXJyb3JgLiBCb3RoIGByZXNwb25zZWAgYW5kIGByZXNwb25zZUVycm9yYCBpbnRlcmNlcHRvcnMgZ2V0IGNhbGxlZFxuICogICAgIHdpdGggYGh0dHAgcmVzcG9uc2VgIG9iamVjdC4gU2VlIHtAbGluayBuZy4kaHR0cCAkaHR0cCBpbnRlcmNlcHRvcnN9LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIEhhc2ggd2l0aCBjdXN0b20gc2V0dGluZ3MgdGhhdCBzaG91bGQgZXh0ZW5kIHRoZVxuICogICBkZWZhdWx0IGAkcmVzb3VyY2VQcm92aWRlcmAgYmVoYXZpb3IuICBUaGUgb25seSBzdXBwb3J0ZWQgb3B0aW9uIGlzXG4gKlxuICogICBXaGVyZTpcbiAqXG4gKiAgIC0gKipgc3RyaXBUcmFpbGluZ1NsYXNoZXNgKiog4oCTIHtib29sZWFufSDigJMgSWYgdHJ1ZSB0aGVuIHRoZSB0cmFpbGluZ1xuICogICBzbGFzaGVzIGZyb20gYW55IGNhbGN1bGF0ZWQgVVJMIHdpbGwgYmUgc3RyaXBwZWQuIChEZWZhdWx0cyB0byB0cnVlLilcbiAqXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBBIHJlc291cmNlIFwiY2xhc3NcIiBvYmplY3Qgd2l0aCBtZXRob2RzIGZvciB0aGUgZGVmYXVsdCBzZXQgb2YgcmVzb3VyY2UgYWN0aW9uc1xuICogICBvcHRpb25hbGx5IGV4dGVuZGVkIHdpdGggY3VzdG9tIGBhY3Rpb25zYC4gVGhlIGRlZmF1bHQgc2V0IGNvbnRhaW5zIHRoZXNlIGFjdGlvbnM6XG4gKiAgIGBgYGpzXG4gKiAgIHsgJ2dldCc6ICAgIHttZXRob2Q6J0dFVCd9LFxuICogICAgICdzYXZlJzogICB7bWV0aG9kOidQT1NUJ30sXG4gKiAgICAgJ3F1ZXJ5JzogIHttZXRob2Q6J0dFVCcsIGlzQXJyYXk6dHJ1ZX0sXG4gKiAgICAgJ3JlbW92ZSc6IHttZXRob2Q6J0RFTEVURSd9LFxuICogICAgICdkZWxldGUnOiB7bWV0aG9kOidERUxFVEUnfSB9O1xuICogICBgYGBcbiAqXG4gKiAgIENhbGxpbmcgdGhlc2UgbWV0aG9kcyBpbnZva2UgYW4ge0BsaW5rIG5nLiRodHRwfSB3aXRoIHRoZSBzcGVjaWZpZWQgaHR0cCBtZXRob2QsXG4gKiAgIGRlc3RpbmF0aW9uIGFuZCBwYXJhbWV0ZXJzLiBXaGVuIHRoZSBkYXRhIGlzIHJldHVybmVkIGZyb20gdGhlIHNlcnZlciB0aGVuIHRoZSBvYmplY3QgaXMgYW5cbiAqICAgaW5zdGFuY2Ugb2YgdGhlIHJlc291cmNlIGNsYXNzLiBUaGUgYWN0aW9ucyBgc2F2ZWAsIGByZW1vdmVgIGFuZCBgZGVsZXRlYCBhcmUgYXZhaWxhYmxlIG9uIGl0XG4gKiAgIGFzICBtZXRob2RzIHdpdGggdGhlIGAkYCBwcmVmaXguIFRoaXMgYWxsb3dzIHlvdSB0byBlYXNpbHkgcGVyZm9ybSBDUlVEIG9wZXJhdGlvbnMgKGNyZWF0ZSxcbiAqICAgcmVhZCwgdXBkYXRlLCBkZWxldGUpIG9uIHNlcnZlci1zaWRlIGRhdGEgbGlrZSB0aGlzOlxuICogICBgYGBqc1xuICogICB2YXIgVXNlciA9ICRyZXNvdXJjZSgnL3VzZXIvOnVzZXJJZCcsIHt1c2VySWQ6J0BpZCd9KTtcbiAqICAgdmFyIHVzZXIgPSBVc2VyLmdldCh7dXNlcklkOjEyM30sIGZ1bmN0aW9uKCkge1xuICogICAgIHVzZXIuYWJjID0gdHJ1ZTtcbiAqICAgICB1c2VyLiRzYXZlKCk7XG4gKiAgIH0pO1xuICogICBgYGBcbiAqXG4gKiAgIEl0IGlzIGltcG9ydGFudCB0byByZWFsaXplIHRoYXQgaW52b2tpbmcgYSAkcmVzb3VyY2Ugb2JqZWN0IG1ldGhvZCBpbW1lZGlhdGVseSByZXR1cm5zIGFuXG4gKiAgIGVtcHR5IHJlZmVyZW5jZSAob2JqZWN0IG9yIGFycmF5IGRlcGVuZGluZyBvbiBgaXNBcnJheWApLiBPbmNlIHRoZSBkYXRhIGlzIHJldHVybmVkIGZyb20gdGhlXG4gKiAgIHNlcnZlciB0aGUgZXhpc3RpbmcgcmVmZXJlbmNlIGlzIHBvcHVsYXRlZCB3aXRoIHRoZSBhY3R1YWwgZGF0YS4gVGhpcyBpcyBhIHVzZWZ1bCB0cmljayBzaW5jZVxuICogICB1c3VhbGx5IHRoZSByZXNvdXJjZSBpcyBhc3NpZ25lZCB0byBhIG1vZGVsIHdoaWNoIGlzIHRoZW4gcmVuZGVyZWQgYnkgdGhlIHZpZXcuIEhhdmluZyBhbiBlbXB0eVxuICogICBvYmplY3QgcmVzdWx0cyBpbiBubyByZW5kZXJpbmcsIG9uY2UgdGhlIGRhdGEgYXJyaXZlcyBmcm9tIHRoZSBzZXJ2ZXIgdGhlbiB0aGUgb2JqZWN0IGlzXG4gKiAgIHBvcHVsYXRlZCB3aXRoIHRoZSBkYXRhIGFuZCB0aGUgdmlldyBhdXRvbWF0aWNhbGx5IHJlLXJlbmRlcnMgaXRzZWxmIHNob3dpbmcgdGhlIG5ldyBkYXRhLiBUaGlzXG4gKiAgIG1lYW5zIHRoYXQgaW4gbW9zdCBjYXNlcyBvbmUgbmV2ZXIgaGFzIHRvIHdyaXRlIGEgY2FsbGJhY2sgZnVuY3Rpb24gZm9yIHRoZSBhY3Rpb24gbWV0aG9kcy5cbiAqXG4gKiAgIFRoZSBhY3Rpb24gbWV0aG9kcyBvbiB0aGUgY2xhc3Mgb2JqZWN0IG9yIGluc3RhbmNlIG9iamVjdCBjYW4gYmUgaW52b2tlZCB3aXRoIHRoZSBmb2xsb3dpbmdcbiAqICAgcGFyYW1ldGVyczpcbiAqXG4gKiAgIC0gSFRUUCBHRVQgXCJjbGFzc1wiIGFjdGlvbnM6IGBSZXNvdXJjZS5hY3Rpb24oW3BhcmFtZXRlcnNdLCBbc3VjY2Vzc10sIFtlcnJvcl0pYFxuICogICAtIG5vbi1HRVQgXCJjbGFzc1wiIGFjdGlvbnM6IGBSZXNvdXJjZS5hY3Rpb24oW3BhcmFtZXRlcnNdLCBwb3N0RGF0YSwgW3N1Y2Nlc3NdLCBbZXJyb3JdKWBcbiAqICAgLSBub24tR0VUIGluc3RhbmNlIGFjdGlvbnM6ICBgaW5zdGFuY2UuJGFjdGlvbihbcGFyYW1ldGVyc10sIFtzdWNjZXNzXSwgW2Vycm9yXSlgXG4gKlxuICogICBTdWNjZXNzIGNhbGxiYWNrIGlzIGNhbGxlZCB3aXRoICh2YWx1ZSwgcmVzcG9uc2VIZWFkZXJzKSBhcmd1bWVudHMuIEVycm9yIGNhbGxiYWNrIGlzIGNhbGxlZFxuICogICB3aXRoIChodHRwUmVzcG9uc2UpIGFyZ3VtZW50LlxuICpcbiAqICAgQ2xhc3MgYWN0aW9ucyByZXR1cm4gZW1wdHkgaW5zdGFuY2UgKHdpdGggYWRkaXRpb25hbCBwcm9wZXJ0aWVzIGJlbG93KS5cbiAqICAgSW5zdGFuY2UgYWN0aW9ucyByZXR1cm4gcHJvbWlzZSBvZiB0aGUgYWN0aW9uLlxuICpcbiAqICAgVGhlIFJlc291cmNlIGluc3RhbmNlcyBhbmQgY29sbGVjdGlvbiBoYXZlIHRoZXNlIGFkZGl0aW9uYWwgcHJvcGVydGllczpcbiAqXG4gKiAgIC0gYCRwcm9taXNlYDogdGhlIHtAbGluayBuZy4kcSBwcm9taXNlfSBvZiB0aGUgb3JpZ2luYWwgc2VydmVyIGludGVyYWN0aW9uIHRoYXQgY3JlYXRlZCB0aGlzXG4gKiAgICAgaW5zdGFuY2Ugb3IgY29sbGVjdGlvbi5cbiAqXG4gKiAgICAgT24gc3VjY2VzcywgdGhlIHByb21pc2UgaXMgcmVzb2x2ZWQgd2l0aCB0aGUgc2FtZSByZXNvdXJjZSBpbnN0YW5jZSBvciBjb2xsZWN0aW9uIG9iamVjdCxcbiAqICAgICB1cGRhdGVkIHdpdGggZGF0YSBmcm9tIHNlcnZlci4gVGhpcyBtYWtlcyBpdCBlYXN5IHRvIHVzZSBpblxuICogICAgIHtAbGluayBuZ1JvdXRlLiRyb3V0ZVByb3ZpZGVyIHJlc29sdmUgc2VjdGlvbiBvZiAkcm91dGVQcm92aWRlci53aGVuKCl9IHRvIGRlZmVyIHZpZXdcbiAqICAgICByZW5kZXJpbmcgdW50aWwgdGhlIHJlc291cmNlKHMpIGFyZSBsb2FkZWQuXG4gKlxuICogICAgIE9uIGZhaWx1cmUsIHRoZSBwcm9taXNlIGlzIHJlc29sdmVkIHdpdGggdGhlIHtAbGluayBuZy4kaHR0cCBodHRwIHJlc3BvbnNlfSBvYmplY3QsIHdpdGhvdXRcbiAqICAgICB0aGUgYHJlc291cmNlYCBwcm9wZXJ0eS5cbiAqXG4gKiAgICAgSWYgYW4gaW50ZXJjZXB0b3Igb2JqZWN0IHdhcyBwcm92aWRlZCwgdGhlIHByb21pc2Ugd2lsbCBpbnN0ZWFkIGJlIHJlc29sdmVkIHdpdGggdGhlIHZhbHVlXG4gKiAgICAgcmV0dXJuZWQgYnkgdGhlIGludGVyY2VwdG9yLlxuICpcbiAqICAgLSBgJHJlc29sdmVkYDogYHRydWVgIGFmdGVyIGZpcnN0IHNlcnZlciBpbnRlcmFjdGlvbiBpcyBjb21wbGV0ZWQgKGVpdGhlciB3aXRoIHN1Y2Nlc3Mgb3JcbiAqICAgICAgcmVqZWN0aW9uKSwgYGZhbHNlYCBiZWZvcmUgdGhhdC4gS25vd2luZyBpZiB0aGUgUmVzb3VyY2UgaGFzIGJlZW4gcmVzb2x2ZWQgaXMgdXNlZnVsIGluXG4gKiAgICAgIGRhdGEtYmluZGluZy5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqICMgQ3JlZGl0IGNhcmQgcmVzb3VyY2VcbiAqXG4gKiBgYGBqc1xuICAgICAvLyBEZWZpbmUgQ3JlZGl0Q2FyZCBjbGFzc1xuICAgICB2YXIgQ3JlZGl0Q2FyZCA9ICRyZXNvdXJjZSgnL3VzZXIvOnVzZXJJZC9jYXJkLzpjYXJkSWQnLFxuICAgICAge3VzZXJJZDoxMjMsIGNhcmRJZDonQGlkJ30sIHtcbiAgICAgICBjaGFyZ2U6IHttZXRob2Q6J1BPU1QnLCBwYXJhbXM6e2NoYXJnZTp0cnVlfX1cbiAgICAgIH0pO1xuXG4gICAgIC8vIFdlIGNhbiByZXRyaWV2ZSBhIGNvbGxlY3Rpb24gZnJvbSB0aGUgc2VydmVyXG4gICAgIHZhciBjYXJkcyA9IENyZWRpdENhcmQucXVlcnkoZnVuY3Rpb24oKSB7XG4gICAgICAgLy8gR0VUOiAvdXNlci8xMjMvY2FyZFxuICAgICAgIC8vIHNlcnZlciByZXR1cm5zOiBbIHtpZDo0NTYsIG51bWJlcjonMTIzNCcsIG5hbWU6J1NtaXRoJ30gXTtcblxuICAgICAgIHZhciBjYXJkID0gY2FyZHNbMF07XG4gICAgICAgLy8gZWFjaCBpdGVtIGlzIGFuIGluc3RhbmNlIG9mIENyZWRpdENhcmRcbiAgICAgICBleHBlY3QoY2FyZCBpbnN0YW5jZW9mIENyZWRpdENhcmQpLnRvRXF1YWwodHJ1ZSk7XG4gICAgICAgY2FyZC5uYW1lID0gXCJKLiBTbWl0aFwiO1xuICAgICAgIC8vIG5vbiBHRVQgbWV0aG9kcyBhcmUgbWFwcGVkIG9udG8gdGhlIGluc3RhbmNlc1xuICAgICAgIGNhcmQuJHNhdmUoKTtcbiAgICAgICAvLyBQT1NUOiAvdXNlci8xMjMvY2FyZC80NTYge2lkOjQ1NiwgbnVtYmVyOicxMjM0JywgbmFtZTonSi4gU21pdGgnfVxuICAgICAgIC8vIHNlcnZlciByZXR1cm5zOiB7aWQ6NDU2LCBudW1iZXI6JzEyMzQnLCBuYW1lOiAnSi4gU21pdGgnfTtcblxuICAgICAgIC8vIG91ciBjdXN0b20gbWV0aG9kIGlzIG1hcHBlZCBhcyB3ZWxsLlxuICAgICAgIGNhcmQuJGNoYXJnZSh7YW1vdW50OjkuOTl9KTtcbiAgICAgICAvLyBQT1NUOiAvdXNlci8xMjMvY2FyZC80NTY/YW1vdW50PTkuOTkmY2hhcmdlPXRydWUge2lkOjQ1NiwgbnVtYmVyOicxMjM0JywgbmFtZTonSi4gU21pdGgnfVxuICAgICB9KTtcblxuICAgICAvLyB3ZSBjYW4gY3JlYXRlIGFuIGluc3RhbmNlIGFzIHdlbGxcbiAgICAgdmFyIG5ld0NhcmQgPSBuZXcgQ3JlZGl0Q2FyZCh7bnVtYmVyOicwMTIzJ30pO1xuICAgICBuZXdDYXJkLm5hbWUgPSBcIk1pa2UgU21pdGhcIjtcbiAgICAgbmV3Q2FyZC4kc2F2ZSgpO1xuICAgICAvLyBQT1NUOiAvdXNlci8xMjMvY2FyZCB7bnVtYmVyOicwMTIzJywgbmFtZTonTWlrZSBTbWl0aCd9XG4gICAgIC8vIHNlcnZlciByZXR1cm5zOiB7aWQ6Nzg5LCBudW1iZXI6JzAxMjMnLCBuYW1lOiAnTWlrZSBTbWl0aCd9O1xuICAgICBleHBlY3QobmV3Q2FyZC5pZCkudG9FcXVhbCg3ODkpO1xuICogYGBgXG4gKlxuICogVGhlIG9iamVjdCByZXR1cm5lZCBmcm9tIHRoaXMgZnVuY3Rpb24gZXhlY3V0aW9uIGlzIGEgcmVzb3VyY2UgXCJjbGFzc1wiIHdoaWNoIGhhcyBcInN0YXRpY1wiIG1ldGhvZFxuICogZm9yIGVhY2ggYWN0aW9uIGluIHRoZSBkZWZpbml0aW9uLlxuICpcbiAqIENhbGxpbmcgdGhlc2UgbWV0aG9kcyBpbnZva2UgYCRodHRwYCBvbiB0aGUgYHVybGAgdGVtcGxhdGUgd2l0aCB0aGUgZ2l2ZW4gYG1ldGhvZGAsIGBwYXJhbXNgIGFuZFxuICogYGhlYWRlcnNgLlxuICogV2hlbiB0aGUgZGF0YSBpcyByZXR1cm5lZCBmcm9tIHRoZSBzZXJ2ZXIgdGhlbiB0aGUgb2JqZWN0IGlzIGFuIGluc3RhbmNlIG9mIHRoZSByZXNvdXJjZSB0eXBlIGFuZFxuICogYWxsIG9mIHRoZSBub24tR0VUIG1ldGhvZHMgYXJlIGF2YWlsYWJsZSB3aXRoIGAkYCBwcmVmaXguIFRoaXMgYWxsb3dzIHlvdSB0byBlYXNpbHkgc3VwcG9ydCBDUlVEXG4gKiBvcGVyYXRpb25zIChjcmVhdGUsIHJlYWQsIHVwZGF0ZSwgZGVsZXRlKSBvbiBzZXJ2ZXItc2lkZSBkYXRhLlxuXG4gICBgYGBqc1xuICAgICB2YXIgVXNlciA9ICRyZXNvdXJjZSgnL3VzZXIvOnVzZXJJZCcsIHt1c2VySWQ6J0BpZCd9KTtcbiAgICAgVXNlci5nZXQoe3VzZXJJZDoxMjN9LCBmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgdXNlci5hYmMgPSB0cnVlO1xuICAgICAgIHVzZXIuJHNhdmUoKTtcbiAgICAgfSk7XG4gICBgYGBcbiAqXG4gKiBJdCdzIHdvcnRoIG5vdGluZyB0aGF0IHRoZSBzdWNjZXNzIGNhbGxiYWNrIGZvciBgZ2V0YCwgYHF1ZXJ5YCBhbmQgb3RoZXIgbWV0aG9kcyBnZXRzIHBhc3NlZFxuICogaW4gdGhlIHJlc3BvbnNlIHRoYXQgY2FtZSBmcm9tIHRoZSBzZXJ2ZXIgYXMgd2VsbCBhcyAkaHR0cCBoZWFkZXIgZ2V0dGVyIGZ1bmN0aW9uLCBzbyBvbmVcbiAqIGNvdWxkIHJld3JpdGUgdGhlIGFib3ZlIGV4YW1wbGUgYW5kIGdldCBhY2Nlc3MgdG8gaHR0cCBoZWFkZXJzIGFzOlxuICpcbiAgIGBgYGpzXG4gICAgIHZhciBVc2VyID0gJHJlc291cmNlKCcvdXNlci86dXNlcklkJywge3VzZXJJZDonQGlkJ30pO1xuICAgICBVc2VyLmdldCh7dXNlcklkOjEyM30sIGZ1bmN0aW9uKHUsIGdldFJlc3BvbnNlSGVhZGVycyl7XG4gICAgICAgdS5hYmMgPSB0cnVlO1xuICAgICAgIHUuJHNhdmUoZnVuY3Rpb24odSwgcHV0UmVzcG9uc2VIZWFkZXJzKSB7XG4gICAgICAgICAvL3UgPT4gc2F2ZWQgdXNlciBvYmplY3RcbiAgICAgICAgIC8vcHV0UmVzcG9uc2VIZWFkZXJzID0+ICRodHRwIGhlYWRlciBnZXR0ZXJcbiAgICAgICB9KTtcbiAgICAgfSk7XG4gICBgYGBcbiAqXG4gKiBZb3UgY2FuIGFsc28gYWNjZXNzIHRoZSByYXcgYCRodHRwYCBwcm9taXNlIHZpYSB0aGUgYCRwcm9taXNlYCBwcm9wZXJ0eSBvbiB0aGUgb2JqZWN0IHJldHVybmVkXG4gKlxuICAgYGBgXG4gICAgIHZhciBVc2VyID0gJHJlc291cmNlKCcvdXNlci86dXNlcklkJywge3VzZXJJZDonQGlkJ30pO1xuICAgICBVc2VyLmdldCh7dXNlcklkOjEyM30pXG4gICAgICAgICAuJHByb21pc2UudGhlbihmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgIH0pO1xuICAgYGBgXG5cbiAqICMgQ3JlYXRpbmcgYSBjdXN0b20gJ1BVVCcgcmVxdWVzdFxuICogSW4gdGhpcyBleGFtcGxlIHdlIGNyZWF0ZSBhIGN1c3RvbSBtZXRob2Qgb24gb3VyIHJlc291cmNlIHRvIG1ha2UgYSBQVVQgcmVxdWVzdFxuICogYGBganNcbiAqICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnYXBwJywgWyduZ1Jlc291cmNlJywgJ25nUm91dGUnXSk7XG4gKlxuICogICAgLy8gU29tZSBBUElzIGV4cGVjdCBhIFBVVCByZXF1ZXN0IGluIHRoZSBmb3JtYXQgVVJML29iamVjdC9JRFxuICogICAgLy8gSGVyZSB3ZSBhcmUgY3JlYXRpbmcgYW4gJ3VwZGF0ZScgbWV0aG9kXG4gKiAgICBhcHAuZmFjdG9yeSgnTm90ZXMnLCBbJyRyZXNvdXJjZScsIGZ1bmN0aW9uKCRyZXNvdXJjZSkge1xuICogICAgcmV0dXJuICRyZXNvdXJjZSgnL25vdGVzLzppZCcsIG51bGwsXG4gKiAgICAgICAge1xuICogICAgICAgICAgICAndXBkYXRlJzogeyBtZXRob2Q6J1BVVCcgfVxuICogICAgICAgIH0pO1xuICogICAgfV0pO1xuICpcbiAqICAgIC8vIEluIG91ciBjb250cm9sbGVyIHdlIGdldCB0aGUgSUQgZnJvbSB0aGUgVVJMIHVzaW5nIG5nUm91dGUgYW5kICRyb3V0ZVBhcmFtc1xuICogICAgLy8gV2UgcGFzcyBpbiAkcm91dGVQYXJhbXMgYW5kIG91ciBOb3RlcyBmYWN0b3J5IGFsb25nIHdpdGggJHNjb3BlXG4gKiAgICBhcHAuY29udHJvbGxlcignTm90ZXNDdHJsJywgWyckc2NvcGUnLCAnJHJvdXRlUGFyYW1zJywgJ05vdGVzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oJHNjb3BlLCAkcm91dGVQYXJhbXMsIE5vdGVzKSB7XG4gKiAgICAvLyBGaXJzdCBnZXQgYSBub3RlIG9iamVjdCBmcm9tIHRoZSBmYWN0b3J5XG4gKiAgICB2YXIgbm90ZSA9IE5vdGVzLmdldCh7IGlkOiRyb3V0ZVBhcmFtcy5pZCB9KTtcbiAqICAgICRpZCA9IG5vdGUuaWQ7XG4gKlxuICogICAgLy8gTm93IGNhbGwgdXBkYXRlIHBhc3NpbmcgaW4gdGhlIElEIGZpcnN0IHRoZW4gdGhlIG9iamVjdCB5b3UgYXJlIHVwZGF0aW5nXG4gKiAgICBOb3Rlcy51cGRhdGUoeyBpZDokaWQgfSwgbm90ZSk7XG4gKlxuICogICAgLy8gVGhpcyB3aWxsIFBVVCAvbm90ZXMvSUQgd2l0aCB0aGUgbm90ZSBvYmplY3QgaW4gdGhlIHJlcXVlc3QgcGF5bG9hZFxuICogICAgfV0pO1xuICogYGBgXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCduZ1Jlc291cmNlJywgWyduZyddKS5cbiAgcHJvdmlkZXIoJyRyZXNvdXJjZScsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBwcm92aWRlciA9IHRoaXM7XG5cbiAgICB0aGlzLmRlZmF1bHRzID0ge1xuICAgICAgLy8gU3RyaXAgc2xhc2hlcyBieSBkZWZhdWx0XG4gICAgICBzdHJpcFRyYWlsaW5nU2xhc2hlczogdHJ1ZSxcblxuICAgICAgLy8gRGVmYXVsdCBhY3Rpb25zIGNvbmZpZ3VyYXRpb25cbiAgICAgIGFjdGlvbnM6IHtcbiAgICAgICAgJ2dldCc6IHttZXRob2Q6ICdHRVQnfSxcbiAgICAgICAgJ3NhdmUnOiB7bWV0aG9kOiAnUE9TVCd9LFxuICAgICAgICAncXVlcnknOiB7bWV0aG9kOiAnR0VUJywgaXNBcnJheTogdHJ1ZX0sXG4gICAgICAgICdyZW1vdmUnOiB7bWV0aG9kOiAnREVMRVRFJ30sXG4gICAgICAgICdkZWxldGUnOiB7bWV0aG9kOiAnREVMRVRFJ31cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy4kZ2V0ID0gWyckaHR0cCcsICckcScsIGZ1bmN0aW9uKCRodHRwLCAkcSkge1xuXG4gICAgICB2YXIgbm9vcCA9IGFuZ3VsYXIubm9vcCxcbiAgICAgICAgZm9yRWFjaCA9IGFuZ3VsYXIuZm9yRWFjaCxcbiAgICAgICAgZXh0ZW5kID0gYW5ndWxhci5leHRlbmQsXG4gICAgICAgIGNvcHkgPSBhbmd1bGFyLmNvcHksXG4gICAgICAgIGlzRnVuY3Rpb24gPSBhbmd1bGFyLmlzRnVuY3Rpb247XG5cbiAgICAgIC8qKlxuICAgICAgICogV2UgbmVlZCBvdXIgY3VzdG9tIG1ldGhvZCBiZWNhdXNlIGVuY29kZVVSSUNvbXBvbmVudCBpcyB0b28gYWdncmVzc2l2ZSBhbmQgZG9lc24ndCBmb2xsb3dcbiAgICAgICAqIGh0dHA6Ly93d3cuaWV0Zi5vcmcvcmZjL3JmYzM5ODYudHh0IHdpdGggcmVnYXJkcyB0byB0aGUgY2hhcmFjdGVyIHNldFxuICAgICAgICogKHBjaGFyKSBhbGxvd2VkIGluIHBhdGggc2VnbWVudHM6XG4gICAgICAgKiAgICBzZWdtZW50ICAgICAgID0gKnBjaGFyXG4gICAgICAgKiAgICBwY2hhciAgICAgICAgID0gdW5yZXNlcnZlZCAvIHBjdC1lbmNvZGVkIC8gc3ViLWRlbGltcyAvIFwiOlwiIC8gXCJAXCJcbiAgICAgICAqICAgIHBjdC1lbmNvZGVkICAgPSBcIiVcIiBIRVhESUcgSEVYRElHXG4gICAgICAgKiAgICB1bnJlc2VydmVkICAgID0gQUxQSEEgLyBESUdJVCAvIFwiLVwiIC8gXCIuXCIgLyBcIl9cIiAvIFwiflwiXG4gICAgICAgKiAgICBzdWItZGVsaW1zICAgID0gXCIhXCIgLyBcIiRcIiAvIFwiJlwiIC8gXCInXCIgLyBcIihcIiAvIFwiKVwiXG4gICAgICAgKiAgICAgICAgICAgICAgICAgICAgIC8gXCIqXCIgLyBcIitcIiAvIFwiLFwiIC8gXCI7XCIgLyBcIj1cIlxuICAgICAgICovXG4gICAgICBmdW5jdGlvbiBlbmNvZGVVcmlTZWdtZW50KHZhbCkge1xuICAgICAgICByZXR1cm4gZW5jb2RlVXJpUXVlcnkodmFsLCB0cnVlKS5cbiAgICAgICAgICByZXBsYWNlKC8lMjYvZ2ksICcmJykuXG4gICAgICAgICAgcmVwbGFjZSgvJTNEL2dpLCAnPScpLlxuICAgICAgICAgIHJlcGxhY2UoLyUyQi9naSwgJysnKTtcbiAgICAgIH1cblxuXG4gICAgICAvKipcbiAgICAgICAqIFRoaXMgbWV0aG9kIGlzIGludGVuZGVkIGZvciBlbmNvZGluZyAqa2V5KiBvciAqdmFsdWUqIHBhcnRzIG9mIHF1ZXJ5IGNvbXBvbmVudC4gV2UgbmVlZCBhXG4gICAgICAgKiBjdXN0b20gbWV0aG9kIGJlY2F1c2UgZW5jb2RlVVJJQ29tcG9uZW50IGlzIHRvbyBhZ2dyZXNzaXZlIGFuZCBlbmNvZGVzIHN0dWZmIHRoYXQgZG9lc24ndFxuICAgICAgICogaGF2ZSB0byBiZSBlbmNvZGVkIHBlciBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzOTg2OlxuICAgICAgICogICAgcXVlcnkgICAgICAgPSAqKCBwY2hhciAvIFwiL1wiIC8gXCI/XCIgKVxuICAgICAgICogICAgcGNoYXIgICAgICAgICA9IHVucmVzZXJ2ZWQgLyBwY3QtZW5jb2RlZCAvIHN1Yi1kZWxpbXMgLyBcIjpcIiAvIFwiQFwiXG4gICAgICAgKiAgICB1bnJlc2VydmVkICAgID0gQUxQSEEgLyBESUdJVCAvIFwiLVwiIC8gXCIuXCIgLyBcIl9cIiAvIFwiflwiXG4gICAgICAgKiAgICBwY3QtZW5jb2RlZCAgID0gXCIlXCIgSEVYRElHIEhFWERJR1xuICAgICAgICogICAgc3ViLWRlbGltcyAgICA9IFwiIVwiIC8gXCIkXCIgLyBcIiZcIiAvIFwiJ1wiIC8gXCIoXCIgLyBcIilcIlxuICAgICAgICogICAgICAgICAgICAgICAgICAgICAvIFwiKlwiIC8gXCIrXCIgLyBcIixcIiAvIFwiO1wiIC8gXCI9XCJcbiAgICAgICAqL1xuICAgICAgZnVuY3Rpb24gZW5jb2RlVXJpUXVlcnkodmFsLCBwY3RFbmNvZGVTcGFjZXMpIHtcbiAgICAgICAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudCh2YWwpLlxuICAgICAgICAgIHJlcGxhY2UoLyU0MC9naSwgJ0AnKS5cbiAgICAgICAgICByZXBsYWNlKC8lM0EvZ2ksICc6JykuXG4gICAgICAgICAgcmVwbGFjZSgvJTI0L2csICckJykuXG4gICAgICAgICAgcmVwbGFjZSgvJTJDL2dpLCAnLCcpLlxuICAgICAgICAgIHJlcGxhY2UoLyUyMC9nLCAocGN0RW5jb2RlU3BhY2VzID8gJyUyMCcgOiAnKycpKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gUm91dGUodGVtcGxhdGUsIGRlZmF1bHRzKSB7XG4gICAgICAgIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgICAgICAgdGhpcy5kZWZhdWx0cyA9IGV4dGVuZCh7fSwgcHJvdmlkZXIuZGVmYXVsdHMsIGRlZmF1bHRzKTtcbiAgICAgICAgdGhpcy51cmxQYXJhbXMgPSB7fTtcbiAgICAgIH1cblxuICAgICAgUm91dGUucHJvdG90eXBlID0ge1xuICAgICAgICBzZXRVcmxQYXJhbXM6IGZ1bmN0aW9uKGNvbmZpZywgcGFyYW1zLCBhY3Rpb25VcmwpIHtcbiAgICAgICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgICAgICB1cmwgPSBhY3Rpb25VcmwgfHwgc2VsZi50ZW1wbGF0ZSxcbiAgICAgICAgICAgIHZhbCxcbiAgICAgICAgICAgIGVuY29kZWRWYWw7XG5cbiAgICAgICAgICB2YXIgdXJsUGFyYW1zID0gc2VsZi51cmxQYXJhbXMgPSB7fTtcbiAgICAgICAgICBmb3JFYWNoKHVybC5zcGxpdCgvXFxXLyksIGZ1bmN0aW9uKHBhcmFtKSB7XG4gICAgICAgICAgICBpZiAocGFyYW0gPT09ICdoYXNPd25Qcm9wZXJ0eScpIHtcbiAgICAgICAgICAgICAgdGhyb3cgJHJlc291cmNlTWluRXJyKCdiYWRuYW1lJywgXCJoYXNPd25Qcm9wZXJ0eSBpcyBub3QgYSB2YWxpZCBwYXJhbWV0ZXIgbmFtZS5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIShuZXcgUmVnRXhwKFwiXlxcXFxkKyRcIikudGVzdChwYXJhbSkpICYmIHBhcmFtICYmXG4gICAgICAgICAgICAgIChuZXcgUmVnRXhwKFwiKF58W15cXFxcXFxcXF0pOlwiICsgcGFyYW0gKyBcIihcXFxcV3wkKVwiKS50ZXN0KHVybCkpKSB7XG4gICAgICAgICAgICAgIHVybFBhcmFtc1twYXJhbV0gPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHVybCA9IHVybC5yZXBsYWNlKC9cXFxcOi9nLCAnOicpO1xuXG4gICAgICAgICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuICAgICAgICAgIGZvckVhY2goc2VsZi51cmxQYXJhbXMsIGZ1bmN0aW9uKF8sIHVybFBhcmFtKSB7XG4gICAgICAgICAgICB2YWwgPSBwYXJhbXMuaGFzT3duUHJvcGVydHkodXJsUGFyYW0pID8gcGFyYW1zW3VybFBhcmFtXSA6IHNlbGYuZGVmYXVsdHNbdXJsUGFyYW1dO1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKHZhbCkgJiYgdmFsICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIGVuY29kZWRWYWwgPSBlbmNvZGVVcmlTZWdtZW50KHZhbCk7XG4gICAgICAgICAgICAgIHVybCA9IHVybC5yZXBsYWNlKG5ldyBSZWdFeHAoXCI6XCIgKyB1cmxQYXJhbSArIFwiKFxcXFxXfCQpXCIsIFwiZ1wiKSwgZnVuY3Rpb24obWF0Y2gsIHAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVuY29kZWRWYWwgKyBwMTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB1cmwgPSB1cmwucmVwbGFjZShuZXcgUmVnRXhwKFwiKFxcLz8pOlwiICsgdXJsUGFyYW0gKyBcIihcXFxcV3wkKVwiLCBcImdcIiksIGZ1bmN0aW9uKG1hdGNoLFxuICAgICAgICAgICAgICAgICAgbGVhZGluZ1NsYXNoZXMsIHRhaWwpIHtcbiAgICAgICAgICAgICAgICBpZiAodGFpbC5jaGFyQXQoMCkgPT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdGFpbDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGxlYWRpbmdTbGFzaGVzICsgdGFpbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gc3RyaXAgdHJhaWxpbmcgc2xhc2hlcyBhbmQgc2V0IHRoZSB1cmwgKHVubGVzcyB0aGlzIGJlaGF2aW9yIGlzIHNwZWNpZmljYWxseSBkaXNhYmxlZClcbiAgICAgICAgICBpZiAoc2VsZi5kZWZhdWx0cy5zdHJpcFRyYWlsaW5nU2xhc2hlcykge1xuICAgICAgICAgICAgdXJsID0gdXJsLnJlcGxhY2UoL1xcLyskLywgJycpIHx8ICcvJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyB0aGVuIHJlcGxhY2UgY29sbGFwc2UgYC8uYCBpZiBmb3VuZCBpbiB0aGUgbGFzdCBVUkwgcGF0aCBzZWdtZW50IGJlZm9yZSB0aGUgcXVlcnlcbiAgICAgICAgICAvLyBFLmcuIGBodHRwOi8vdXJsLmNvbS9pZC4vZm9ybWF0P3E9eGAgYmVjb21lcyBgaHR0cDovL3VybC5jb20vaWQuZm9ybWF0P3E9eGBcbiAgICAgICAgICB1cmwgPSB1cmwucmVwbGFjZSgvXFwvXFwuKD89XFx3KygkfFxcPykpLywgJy4nKTtcbiAgICAgICAgICAvLyByZXBsYWNlIGVzY2FwZWQgYC9cXC5gIHdpdGggYC8uYFxuICAgICAgICAgIGNvbmZpZy51cmwgPSB1cmwucmVwbGFjZSgvXFwvXFxcXFxcLi8sICcvLicpO1xuXG5cbiAgICAgICAgICAvLyBzZXQgcGFyYW1zIC0gZGVsZWdhdGUgcGFyYW0gZW5jb2RpbmcgdG8gJGh0dHBcbiAgICAgICAgICBmb3JFYWNoKHBhcmFtcywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgICAgaWYgKCFzZWxmLnVybFBhcmFtc1trZXldKSB7XG4gICAgICAgICAgICAgIGNvbmZpZy5wYXJhbXMgPSBjb25maWcucGFyYW1zIHx8IHt9O1xuICAgICAgICAgICAgICBjb25maWcucGFyYW1zW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuXG4gICAgICBmdW5jdGlvbiByZXNvdXJjZUZhY3RvcnkodXJsLCBwYXJhbURlZmF1bHRzLCBhY3Rpb25zLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciByb3V0ZSA9IG5ldyBSb3V0ZSh1cmwsIG9wdGlvbnMpO1xuXG4gICAgICAgIGFjdGlvbnMgPSBleHRlbmQoe30sIHByb3ZpZGVyLmRlZmF1bHRzLmFjdGlvbnMsIGFjdGlvbnMpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGV4dHJhY3RQYXJhbXMoZGF0YSwgYWN0aW9uUGFyYW1zKSB7XG4gICAgICAgICAgdmFyIGlkcyA9IHt9O1xuICAgICAgICAgIGFjdGlvblBhcmFtcyA9IGV4dGVuZCh7fSwgcGFyYW1EZWZhdWx0cywgYWN0aW9uUGFyYW1zKTtcbiAgICAgICAgICBmb3JFYWNoKGFjdGlvblBhcmFtcywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7IHZhbHVlID0gdmFsdWUoKTsgfVxuICAgICAgICAgICAgaWRzW2tleV0gPSB2YWx1ZSAmJiB2YWx1ZS5jaGFyQXQgJiYgdmFsdWUuY2hhckF0KDApID09ICdAJyA/XG4gICAgICAgICAgICAgIGxvb2t1cERvdHRlZFBhdGgoZGF0YSwgdmFsdWUuc3Vic3RyKDEpKSA6IHZhbHVlO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiBpZHM7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBkZWZhdWx0UmVzcG9uc2VJbnRlcmNlcHRvcihyZXNwb25zZSkge1xuICAgICAgICAgIHJldHVybiByZXNwb25zZS5yZXNvdXJjZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIFJlc291cmNlKHZhbHVlKSB7XG4gICAgICAgICAgc2hhbGxvd0NsZWFyQW5kQ29weSh2YWx1ZSB8fCB7fSwgdGhpcyk7XG4gICAgICAgIH1cblxuICAgICAgICBSZXNvdXJjZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSBleHRlbmQoe30sIHRoaXMpO1xuICAgICAgICAgIGRlbGV0ZSBkYXRhLiRwcm9taXNlO1xuICAgICAgICAgIGRlbGV0ZSBkYXRhLiRyZXNvbHZlZDtcbiAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfTtcblxuICAgICAgICBmb3JFYWNoKGFjdGlvbnMsIGZ1bmN0aW9uKGFjdGlvbiwgbmFtZSkge1xuICAgICAgICAgIHZhciBoYXNCb2R5ID0gL14oUE9TVHxQVVR8UEFUQ0gpJC9pLnRlc3QoYWN0aW9uLm1ldGhvZCk7XG5cbiAgICAgICAgICBSZXNvdXJjZVtuYW1lXSA9IGZ1bmN0aW9uKGExLCBhMiwgYTMsIGE0KSB7XG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge30sIGRhdGEsIHN1Y2Nlc3MsIGVycm9yO1xuXG4gICAgICAgICAgICAvKiBqc2hpbnQgLVcwODYgKi8gLyogKHB1cnBvc2VmdWxseSBmYWxsIHRocm91Z2ggY2FzZSBzdGF0ZW1lbnRzKSAqL1xuICAgICAgICAgICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgICAgICBlcnJvciA9IGE0O1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3MgPSBhMztcbiAgICAgICAgICAgICAgLy9mYWxsdGhyb3VnaFxuICAgICAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihhMikpIHtcbiAgICAgICAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGExKSkge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzID0gYTE7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yID0gYTI7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBzdWNjZXNzID0gYTI7XG4gICAgICAgICAgICAgICAgICBlcnJvciA9IGEzO1xuICAgICAgICAgICAgICAgICAgLy9mYWxsdGhyb3VnaFxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBwYXJhbXMgPSBhMTtcbiAgICAgICAgICAgICAgICAgIGRhdGEgPSBhMjtcbiAgICAgICAgICAgICAgICAgIHN1Y2Nlc3MgPSBhMztcbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGExKSkgc3VjY2VzcyA9IGExO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGhhc0JvZHkpIGRhdGEgPSBhMTtcbiAgICAgICAgICAgICAgICBlbHNlIHBhcmFtcyA9IGExO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlIDA6IGJyZWFrO1xuICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93ICRyZXNvdXJjZU1pbkVycignYmFkYXJncycsXG4gICAgICAgICAgICAgICAgICBcIkV4cGVjdGVkIHVwIHRvIDQgYXJndW1lbnRzIFtwYXJhbXMsIGRhdGEsIHN1Y2Nlc3MsIGVycm9yXSwgZ290IHswfSBhcmd1bWVudHNcIixcbiAgICAgICAgICAgICAgICAgIGFyZ3VtZW50cy5sZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLyoganNoaW50ICtXMDg2ICovIC8qIChwdXJwb3NlZnVsbHkgZmFsbCB0aHJvdWdoIGNhc2Ugc3RhdGVtZW50cykgKi9cblxuICAgICAgICAgICAgdmFyIGlzSW5zdGFuY2VDYWxsID0gdGhpcyBpbnN0YW5jZW9mIFJlc291cmNlO1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gaXNJbnN0YW5jZUNhbGwgPyBkYXRhIDogKGFjdGlvbi5pc0FycmF5ID8gW10gOiBuZXcgUmVzb3VyY2UoZGF0YSkpO1xuICAgICAgICAgICAgdmFyIGh0dHBDb25maWcgPSB7fTtcbiAgICAgICAgICAgIHZhciByZXNwb25zZUludGVyY2VwdG9yID0gYWN0aW9uLmludGVyY2VwdG9yICYmIGFjdGlvbi5pbnRlcmNlcHRvci5yZXNwb25zZSB8fFxuICAgICAgICAgICAgICBkZWZhdWx0UmVzcG9uc2VJbnRlcmNlcHRvcjtcbiAgICAgICAgICAgIHZhciByZXNwb25zZUVycm9ySW50ZXJjZXB0b3IgPSBhY3Rpb24uaW50ZXJjZXB0b3IgJiYgYWN0aW9uLmludGVyY2VwdG9yLnJlc3BvbnNlRXJyb3IgfHxcbiAgICAgICAgICAgICAgdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICBmb3JFYWNoKGFjdGlvbiwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgICAgICBpZiAoa2V5ICE9ICdwYXJhbXMnICYmIGtleSAhPSAnaXNBcnJheScgJiYga2V5ICE9ICdpbnRlcmNlcHRvcicpIHtcbiAgICAgICAgICAgICAgICBodHRwQ29uZmlnW2tleV0gPSBjb3B5KHZhbHVlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChoYXNCb2R5KSBodHRwQ29uZmlnLmRhdGEgPSBkYXRhO1xuICAgICAgICAgICAgcm91dGUuc2V0VXJsUGFyYW1zKGh0dHBDb25maWcsXG4gICAgICAgICAgICAgIGV4dGVuZCh7fSwgZXh0cmFjdFBhcmFtcyhkYXRhLCBhY3Rpb24ucGFyYW1zIHx8IHt9KSwgcGFyYW1zKSxcbiAgICAgICAgICAgICAgYWN0aW9uLnVybCk7XG5cbiAgICAgICAgICAgIHZhciBwcm9taXNlID0gJGh0dHAoaHR0cENvbmZpZykudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmRhdGEsXG4gICAgICAgICAgICAgICAgcHJvbWlzZSA9IHZhbHVlLiRwcm9taXNlO1xuXG4gICAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gTmVlZCB0byBjb252ZXJ0IGFjdGlvbi5pc0FycmF5IHRvIGJvb2xlYW4gaW4gY2FzZSBpdCBpcyB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAvLyBqc2hpbnQgLVcwMThcbiAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc0FycmF5KGRhdGEpICE9PSAoISFhY3Rpb24uaXNBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgIHRocm93ICRyZXNvdXJjZU1pbkVycignYmFkY2ZnJyxcbiAgICAgICAgICAgICAgICAgICAgICAnRXJyb3IgaW4gcmVzb3VyY2UgY29uZmlndXJhdGlvbiBmb3IgYWN0aW9uIGB7MH1gLiBFeHBlY3RlZCByZXNwb25zZSB0byAnICtcbiAgICAgICAgICAgICAgICAgICAgICAnY29udGFpbiBhbiB7MX0gYnV0IGdvdCBhbiB7Mn0nLCBuYW1lLCBhY3Rpb24uaXNBcnJheSA/ICdhcnJheScgOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5pc0FycmF5KGRhdGEpID8gJ2FycmF5JyA6ICdvYmplY3QnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8ganNoaW50ICtXMDE4XG4gICAgICAgICAgICAgICAgaWYgKGFjdGlvbi5pc0FycmF5KSB7XG4gICAgICAgICAgICAgICAgICB2YWx1ZS5sZW5ndGggPSAwO1xuICAgICAgICAgICAgICAgICAgZm9yRWFjaChkYXRhLCBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlLnB1c2gobmV3IFJlc291cmNlKGl0ZW0pKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBWYWxpZCBKU09OIHZhbHVlcyBtYXkgYmUgc3RyaW5nIGxpdGVyYWxzLCBhbmQgdGhlc2Ugc2hvdWxkIG5vdCBiZSBjb252ZXJ0ZWRcbiAgICAgICAgICAgICAgICAgICAgICAvLyBpbnRvIG9iamVjdHMuIFRoZXNlIGl0ZW1zIHdpbGwgbm90IGhhdmUgYWNjZXNzIHRvIHRoZSBSZXNvdXJjZSBwcm90b3R5cGVcbiAgICAgICAgICAgICAgICAgICAgICAvLyBtZXRob2RzLCBidXQgdW5mb3J0dW5hdGVseSB0aGVyZVxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBzaGFsbG93Q2xlYXJBbmRDb3B5KGRhdGEsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgIHZhbHVlLiRwcm9taXNlID0gcHJvbWlzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICB2YWx1ZS4kcmVzb2x2ZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICAgIHJlc3BvbnNlLnJlc291cmNlID0gdmFsdWU7XG5cbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgdmFsdWUuJHJlc29sdmVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAoZXJyb3IgfHwgbm9vcCkocmVzcG9uc2UpO1xuXG4gICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oXG4gICAgICAgICAgICAgIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gcmVzcG9uc2VJbnRlcmNlcHRvcihyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgKHN1Y2Nlc3MgfHwgbm9vcCkodmFsdWUsIHJlc3BvbnNlLmhlYWRlcnMpO1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgcmVzcG9uc2VFcnJvckludGVyY2VwdG9yKTtcblxuICAgICAgICAgICAgaWYgKCFpc0luc3RhbmNlQ2FsbCkge1xuICAgICAgICAgICAgICAvLyB3ZSBhcmUgY3JlYXRpbmcgaW5zdGFuY2UgLyBjb2xsZWN0aW9uXG4gICAgICAgICAgICAgIC8vIC0gc2V0IHRoZSBpbml0aWFsIHByb21pc2VcbiAgICAgICAgICAgICAgLy8gLSByZXR1cm4gdGhlIGluc3RhbmNlIC8gY29sbGVjdGlvblxuICAgICAgICAgICAgICB2YWx1ZS4kcHJvbWlzZSA9IHByb21pc2U7XG4gICAgICAgICAgICAgIHZhbHVlLiRyZXNvbHZlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaW5zdGFuY2UgY2FsbFxuICAgICAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgICAgICAgfTtcblxuXG4gICAgICAgICAgUmVzb3VyY2UucHJvdG90eXBlWyckJyArIG5hbWVdID0gZnVuY3Rpb24ocGFyYW1zLCBzdWNjZXNzLCBlcnJvcikge1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24ocGFyYW1zKSkge1xuICAgICAgICAgICAgICBlcnJvciA9IHN1Y2Nlc3M7IHN1Y2Nlc3MgPSBwYXJhbXM7IHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IFJlc291cmNlW25hbWVdLmNhbGwodGhpcywgcGFyYW1zLCB0aGlzLCBzdWNjZXNzLCBlcnJvcik7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0LiRwcm9taXNlIHx8IHJlc3VsdDtcbiAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgICAgICBSZXNvdXJjZS5iaW5kID0gZnVuY3Rpb24oYWRkaXRpb25hbFBhcmFtRGVmYXVsdHMpIHtcbiAgICAgICAgICByZXR1cm4gcmVzb3VyY2VGYWN0b3J5KHVybCwgZXh0ZW5kKHt9LCBwYXJhbURlZmF1bHRzLCBhZGRpdGlvbmFsUGFyYW1EZWZhdWx0cyksIGFjdGlvbnMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBSZXNvdXJjZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc291cmNlRmFjdG9yeTtcbiAgICB9XTtcbiAgfSk7XG5cblxufSkod2luZG93LCB3aW5kb3cuYW5ndWxhcik7XG4iXSwiZmlsZSI6InNjcmlwdHMvdmVuZG9ycy9hbmd1bGFyLXJlc291cmNlL2FuZ3VsYXItcmVzb3VyY2UuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==