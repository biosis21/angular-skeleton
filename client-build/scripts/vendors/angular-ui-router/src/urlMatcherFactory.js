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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL3ZlbmRvcnMvYW5ndWxhci11aS1yb3V0ZXIvc3JjL3VybE1hdGNoZXJGYWN0b3J5LmpzIl0sInNvdXJjZXNDb250ZW50IjpbInZhciAkJFVNRlA7IC8vIHJlZmVyZW5jZSB0byAkVXJsTWF0Y2hlckZhY3RvcnlQcm92aWRlclxuXG4vKipcbiAqIEBuZ2RvYyBvYmplY3RcbiAqIEBuYW1lIHVpLnJvdXRlci51dGlsLnR5cGU6VXJsTWF0Y2hlclxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogTWF0Y2hlcyBVUkxzIGFnYWluc3QgcGF0dGVybnMgYW5kIGV4dHJhY3RzIG5hbWVkIHBhcmFtZXRlcnMgZnJvbSB0aGUgcGF0aCBvciB0aGUgc2VhcmNoXG4gKiBwYXJ0IG9mIHRoZSBVUkwuIEEgVVJMIHBhdHRlcm4gY29uc2lzdHMgb2YgYSBwYXRoIHBhdHRlcm4sIG9wdGlvbmFsbHkgZm9sbG93ZWQgYnkgJz8nIGFuZCBhIGxpc3RcbiAqIG9mIHNlYXJjaCBwYXJhbWV0ZXJzLiBNdWx0aXBsZSBzZWFyY2ggcGFyYW1ldGVyIG5hbWVzIGFyZSBzZXBhcmF0ZWQgYnkgJyYnLiBTZWFyY2ggcGFyYW1ldGVyc1xuICogZG8gbm90IGluZmx1ZW5jZSB3aGV0aGVyIG9yIG5vdCBhIFVSTCBpcyBtYXRjaGVkLCBidXQgdGhlaXIgdmFsdWVzIGFyZSBwYXNzZWQgdGhyb3VnaCBpbnRvXG4gKiB0aGUgbWF0Y2hlZCBwYXJhbWV0ZXJzIHJldHVybmVkIGJ5IHtAbGluayB1aS5yb3V0ZXIudXRpbC50eXBlOlVybE1hdGNoZXIjbWV0aG9kc19leGVjIGV4ZWN9LlxuICogXG4gKiBQYXRoIHBhcmFtZXRlciBwbGFjZWhvbGRlcnMgY2FuIGJlIHNwZWNpZmllZCB1c2luZyBzaW1wbGUgY29sb24vY2F0Y2gtYWxsIHN5bnRheCBvciBjdXJseSBicmFjZVxuICogc3ludGF4LCB3aGljaCBvcHRpb25hbGx5IGFsbG93cyBhIHJlZ3VsYXIgZXhwcmVzc2lvbiBmb3IgdGhlIHBhcmFtZXRlciB0byBiZSBzcGVjaWZpZWQ6XG4gKlxuICogKiBgJzonYCBuYW1lIC0gY29sb24gcGxhY2Vob2xkZXJcbiAqICogYCcqJ2AgbmFtZSAtIGNhdGNoLWFsbCBwbGFjZWhvbGRlclxuICogKiBgJ3snIG5hbWUgJ30nYCAtIGN1cmx5IHBsYWNlaG9sZGVyXG4gKiAqIGAneycgbmFtZSAnOicgcmVnZXhwfHR5cGUgJ30nYCAtIGN1cmx5IHBsYWNlaG9sZGVyIHdpdGggcmVnZXhwIG9yIHR5cGUgbmFtZS4gU2hvdWxkIHRoZVxuICogICByZWdleHAgaXRzZWxmIGNvbnRhaW4gY3VybHkgYnJhY2VzLCB0aGV5IG11c3QgYmUgaW4gbWF0Y2hlZCBwYWlycyBvciBlc2NhcGVkIHdpdGggYSBiYWNrc2xhc2guXG4gKlxuICogUGFyYW1ldGVyIG5hbWVzIG1heSBjb250YWluIG9ubHkgd29yZCBjaGFyYWN0ZXJzIChsYXRpbiBsZXR0ZXJzLCBkaWdpdHMsIGFuZCB1bmRlcnNjb3JlKSBhbmRcbiAqIG11c3QgYmUgdW5pcXVlIHdpdGhpbiB0aGUgcGF0dGVybiAoYWNyb3NzIGJvdGggcGF0aCBhbmQgc2VhcmNoIHBhcmFtZXRlcnMpLiBGb3IgY29sb24gXG4gKiBwbGFjZWhvbGRlcnMgb3IgY3VybHkgcGxhY2Vob2xkZXJzIHdpdGhvdXQgYW4gZXhwbGljaXQgcmVnZXhwLCBhIHBhdGggcGFyYW1ldGVyIG1hdGNoZXMgYW55XG4gKiBudW1iZXIgb2YgY2hhcmFjdGVycyBvdGhlciB0aGFuICcvJy4gRm9yIGNhdGNoLWFsbCBwbGFjZWhvbGRlcnMgdGhlIHBhdGggcGFyYW1ldGVyIG1hdGNoZXNcbiAqIGFueSBudW1iZXIgb2YgY2hhcmFjdGVycy5cbiAqIFxuICogRXhhbXBsZXM6XG4gKiBcbiAqICogYCcvaGVsbG8vJ2AgLSBNYXRjaGVzIG9ubHkgaWYgdGhlIHBhdGggaXMgZXhhY3RseSAnL2hlbGxvLycuIFRoZXJlIGlzIG5vIHNwZWNpYWwgdHJlYXRtZW50IGZvclxuICogICB0cmFpbGluZyBzbGFzaGVzLCBhbmQgcGF0dGVybnMgaGF2ZSB0byBtYXRjaCB0aGUgZW50aXJlIHBhdGgsIG5vdCBqdXN0IGEgcHJlZml4LlxuICogKiBgJy91c2VyLzppZCdgIC0gTWF0Y2hlcyAnL3VzZXIvYm9iJyBvciAnL3VzZXIvMTIzNCEhIScgb3IgZXZlbiAnL3VzZXIvJyBidXQgbm90ICcvdXNlcicgb3JcbiAqICAgJy91c2VyL2JvYi9kZXRhaWxzJy4gVGhlIHNlY29uZCBwYXRoIHNlZ21lbnQgd2lsbCBiZSBjYXB0dXJlZCBhcyB0aGUgcGFyYW1ldGVyICdpZCcuXG4gKiAqIGAnL3VzZXIve2lkfSdgIC0gU2FtZSBhcyB0aGUgcHJldmlvdXMgZXhhbXBsZSwgYnV0IHVzaW5nIGN1cmx5IGJyYWNlIHN5bnRheC5cbiAqICogYCcvdXNlci97aWQ6W14vXSp9J2AgLSBTYW1lIGFzIHRoZSBwcmV2aW91cyBleGFtcGxlLlxuICogKiBgJy91c2VyL3tpZDpbMC05YS1mQS1GXXsxLDh9fSdgIC0gU2ltaWxhciB0byB0aGUgcHJldmlvdXMgZXhhbXBsZSwgYnV0IG9ubHkgbWF0Y2hlcyBpZiB0aGUgaWRcbiAqICAgcGFyYW1ldGVyIGNvbnNpc3RzIG9mIDEgdG8gOCBoZXggZGlnaXRzLlxuICogKiBgJy9maWxlcy97cGF0aDouKn0nYCAtIE1hdGNoZXMgYW55IFVSTCBzdGFydGluZyB3aXRoICcvZmlsZXMvJyBhbmQgY2FwdHVyZXMgdGhlIHJlc3Qgb2YgdGhlXG4gKiAgIHBhdGggaW50byB0aGUgcGFyYW1ldGVyICdwYXRoJy5cbiAqICogYCcvZmlsZXMvKnBhdGgnYCAtIGRpdHRvLlxuICogKiBgJy9jYWxlbmRhci97c3RhcnQ6ZGF0ZX0nYCAtIE1hdGNoZXMgXCIvY2FsZW5kYXIvMjAxNC0xMS0xMlwiIChiZWNhdXNlIHRoZSBwYXR0ZXJuIGRlZmluZWRcbiAqICAgaW4gdGhlIGJ1aWx0LWluICBgZGF0ZWAgVHlwZSBtYXRjaGVzIGAyMDE0LTExLTEyYCkgYW5kIHByb3ZpZGVzIGEgRGF0ZSBvYmplY3QgaW4gJHN0YXRlUGFyYW1zLnN0YXJ0XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdHRlcm4gIFRoZSBwYXR0ZXJuIHRvIGNvbXBpbGUgaW50byBhIG1hdGNoZXIuXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnICBBIGNvbmZpZ3VyYXRpb24gb2JqZWN0IGhhc2g6XG4gKiBAcGFyYW0ge09iamVjdD19IHBhcmVudE1hdGNoZXIgVXNlZCB0byBjb25jYXRlbmF0ZSB0aGUgcGF0dGVybi9jb25maWcgb250b1xuICogICBhbiBleGlzdGluZyBVcmxNYXRjaGVyXG4gKlxuICogKiBgY2FzZUluc2Vuc2l0aXZlYCAtIGB0cnVlYCBpZiBVUkwgbWF0Y2hpbmcgc2hvdWxkIGJlIGNhc2UgaW5zZW5zaXRpdmUsIG90aGVyd2lzZSBgZmFsc2VgLCB0aGUgZGVmYXVsdCB2YWx1ZSAoZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkpIGlzIGBmYWxzZWAuXG4gKiAqIGBzdHJpY3RgIC0gYGZhbHNlYCBpZiBtYXRjaGluZyBhZ2FpbnN0IGEgVVJMIHdpdGggYSB0cmFpbGluZyBzbGFzaCBzaG91bGQgYmUgdHJlYXRlZCBhcyBlcXVpdmFsZW50IHRvIGEgVVJMIHdpdGhvdXQgYSB0cmFpbGluZyBzbGFzaCwgdGhlIGRlZmF1bHQgdmFsdWUgaXMgYHRydWVgLlxuICpcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBwcmVmaXggIEEgc3RhdGljIHByZWZpeCBvZiB0aGlzIHBhdHRlcm4uIFRoZSBtYXRjaGVyIGd1YXJhbnRlZXMgdGhhdCBhbnlcbiAqICAgVVJMIG1hdGNoaW5nIHRoaXMgbWF0Y2hlciAoaS5lLiBhbnkgc3RyaW5nIGZvciB3aGljaCB7QGxpbmsgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyI21ldGhvZHNfZXhlYyBleGVjKCl9IHJldHVybnNcbiAqICAgbm9uLW51bGwpIHdpbGwgc3RhcnQgd2l0aCB0aGlzIHByZWZpeC5cbiAqXG4gKiBAcHJvcGVydHkge3N0cmluZ30gc291cmNlICBUaGUgcGF0dGVybiB0aGF0IHdhcyBwYXNzZWQgaW50byB0aGUgY29uc3RydWN0b3JcbiAqXG4gKiBAcHJvcGVydHkge3N0cmluZ30gc291cmNlUGF0aCAgVGhlIHBhdGggcG9ydGlvbiBvZiB0aGUgc291cmNlIHByb3BlcnR5XG4gKlxuICogQHByb3BlcnR5IHtzdHJpbmd9IHNvdXJjZVNlYXJjaCAgVGhlIHNlYXJjaCBwb3J0aW9uIG9mIHRoZSBzb3VyY2UgcHJvcGVydHlcbiAqXG4gKiBAcHJvcGVydHkge3N0cmluZ30gcmVnZXggIFRoZSBjb25zdHJ1Y3RlZCByZWdleCB0aGF0IHdpbGwgYmUgdXNlZCB0byBtYXRjaCBhZ2FpbnN0IHRoZSB1cmwgd2hlbiBcbiAqICAgaXQgaXMgdGltZSB0byBkZXRlcm1pbmUgd2hpY2ggdXJsIHdpbGwgbWF0Y2guXG4gKlxuICogQHJldHVybnMge09iamVjdH0gIE5ldyBgVXJsTWF0Y2hlcmAgb2JqZWN0XG4gKi9cbmZ1bmN0aW9uIFVybE1hdGNoZXIocGF0dGVybiwgY29uZmlnLCBwYXJlbnRNYXRjaGVyKSB7XG4gIGNvbmZpZyA9IGV4dGVuZCh7IHBhcmFtczoge30gfSwgaXNPYmplY3QoY29uZmlnKSA/IGNvbmZpZyA6IHt9KTtcblxuICAvLyBGaW5kIGFsbCBwbGFjZWhvbGRlcnMgYW5kIGNyZWF0ZSBhIGNvbXBpbGVkIHBhdHRlcm4sIHVzaW5nIGVpdGhlciBjbGFzc2ljIG9yIGN1cmx5IHN5bnRheDpcbiAgLy8gICAnKicgbmFtZVxuICAvLyAgICc6JyBuYW1lXG4gIC8vICAgJ3snIG5hbWUgJ30nXG4gIC8vICAgJ3snIG5hbWUgJzonIHJlZ2V4cCAnfSdcbiAgLy8gVGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiBpcyBzb21ld2hhdCBjb21wbGljYXRlZCBkdWUgdG8gdGhlIG5lZWQgdG8gYWxsb3cgY3VybHkgYnJhY2VzXG4gIC8vIGluc2lkZSB0aGUgcmVndWxhciBleHByZXNzaW9uLiBUaGUgcGxhY2Vob2xkZXIgcmVnZXhwIGJyZWFrcyBkb3duIGFzIGZvbGxvd3M6XG4gIC8vICAgIChbOipdKShbXFx3XFxbXFxdXSspICAgICAgICAgICAgICAtIGNsYXNzaWMgcGxhY2Vob2xkZXIgKCQxIC8gJDIpIChzZWFyY2ggdmVyc2lvbiBoYXMgLSBmb3Igc25ha2UtY2FzZSlcbiAgLy8gICAgXFx7KFtcXHdcXFtcXF1dKykoPzpcXDooIC4uLiApKT9cXH0gIC0gY3VybHkgYnJhY2UgcGxhY2Vob2xkZXIgKCQzKSB3aXRoIG9wdGlvbmFsIHJlZ2V4cC90eXBlIC4uLiAoJDQpIChzZWFyY2ggdmVyc2lvbiBoYXMgLSBmb3Igc25ha2UtY2FzZVxuICAvLyAgICAoPzogLi4uIHwgLi4uIHwgLi4uICkrICAgICAgICAgLSB0aGUgcmVnZXhwIGNvbnNpc3RzIG9mIGFueSBudW1iZXIgb2YgYXRvbXMsIGFuIGF0b20gYmVpbmcgZWl0aGVyXG4gIC8vICAgIFtee31cXFxcXSsgICAgICAgICAgICAgICAgICAgICAgIC0gYW55dGhpbmcgb3RoZXIgdGhhbiBjdXJseSBicmFjZXMgb3IgYmFja3NsYXNoXG4gIC8vICAgIFxcXFwuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0gYSBiYWNrc2xhc2ggZXNjYXBlXG4gIC8vICAgIFxceyg/Oltee31cXFxcXSt8XFxcXC4pKlxcfSAgICAgICAgICAtIGEgbWF0Y2hlZCBzZXQgb2YgY3VybHkgYnJhY2VzIGNvbnRhaW5pbmcgb3RoZXIgYXRvbXNcbiAgdmFyIHBsYWNlaG9sZGVyICAgICAgID0gLyhbOipdKShbXFx3XFxbXFxdXSspfFxceyhbXFx3XFxbXFxdXSspKD86XFw6KCg/Oltee31cXFxcXSt8XFxcXC58XFx7KD86W157fVxcXFxdK3xcXFxcLikqXFx9KSspKT9cXH0vZyxcbiAgICAgIHNlYXJjaFBsYWNlaG9sZGVyID0gLyhbOl0/KShbXFx3XFxbXFxdLV0rKXxcXHsoW1xcd1xcW1xcXS1dKykoPzpcXDooKD86W157fVxcXFxdK3xcXFxcLnxcXHsoPzpbXnt9XFxcXF0rfFxcXFwuKSpcXH0pKykpP1xcfS9nLFxuICAgICAgY29tcGlsZWQgPSAnXicsIGxhc3QgPSAwLCBtLFxuICAgICAgc2VnbWVudHMgPSB0aGlzLnNlZ21lbnRzID0gW10sXG4gICAgICBwYXJlbnRQYXJhbXMgPSBwYXJlbnRNYXRjaGVyID8gcGFyZW50TWF0Y2hlci5wYXJhbXMgOiB7fSxcbiAgICAgIHBhcmFtcyA9IHRoaXMucGFyYW1zID0gcGFyZW50TWF0Y2hlciA/IHBhcmVudE1hdGNoZXIucGFyYW1zLiQkbmV3KCkgOiBuZXcgJCRVTUZQLlBhcmFtU2V0KCksXG4gICAgICBwYXJhbU5hbWVzID0gW107XG5cbiAgZnVuY3Rpb24gYWRkUGFyYW1ldGVyKGlkLCB0eXBlLCBjb25maWcsIGxvY2F0aW9uKSB7XG4gICAgcGFyYW1OYW1lcy5wdXNoKGlkKTtcbiAgICBpZiAocGFyZW50UGFyYW1zW2lkXSkgcmV0dXJuIHBhcmVudFBhcmFtc1tpZF07XG4gICAgaWYgKCEvXlxcdysoLStcXHcrKSooPzpcXFtcXF0pPyQvLnRlc3QoaWQpKSB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHBhcmFtZXRlciBuYW1lICdcIiArIGlkICsgXCInIGluIHBhdHRlcm4gJ1wiICsgcGF0dGVybiArIFwiJ1wiKTtcbiAgICBpZiAocGFyYW1zW2lkXSkgdGhyb3cgbmV3IEVycm9yKFwiRHVwbGljYXRlIHBhcmFtZXRlciBuYW1lICdcIiArIGlkICsgXCInIGluIHBhdHRlcm4gJ1wiICsgcGF0dGVybiArIFwiJ1wiKTtcbiAgICBwYXJhbXNbaWRdID0gbmV3ICQkVU1GUC5QYXJhbShpZCwgdHlwZSwgY29uZmlnLCBsb2NhdGlvbik7XG4gICAgcmV0dXJuIHBhcmFtc1tpZF07XG4gIH1cblxuICBmdW5jdGlvbiBxdW90ZVJlZ0V4cChzdHJpbmcsIHBhdHRlcm4sIHNxdWFzaCkge1xuICAgIHZhciBzdXJyb3VuZFBhdHRlcm4gPSBbJycsJyddLCByZXN1bHQgPSBzdHJpbmcucmVwbGFjZSgvW1xcXFxcXFtcXF1cXF4kKis/LigpfHt9XS9nLCBcIlxcXFwkJlwiKTtcbiAgICBpZiAoIXBhdHRlcm4pIHJldHVybiByZXN1bHQ7XG4gICAgc3dpdGNoKHNxdWFzaCkge1xuICAgICAgY2FzZSBmYWxzZTogc3Vycm91bmRQYXR0ZXJuID0gWycoJywgJyknXTsgICBicmVhaztcbiAgICAgIGNhc2UgdHJ1ZTogIHN1cnJvdW5kUGF0dGVybiA9IFsnPygnLCAnKT8nXTsgYnJlYWs7XG4gICAgICBkZWZhdWx0OiAgICBzdXJyb3VuZFBhdHRlcm4gPSBbJygnICsgc3F1YXNoICsgXCJ8XCIsICcpPyddOyAgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQgKyBzdXJyb3VuZFBhdHRlcm5bMF0gKyBwYXR0ZXJuICsgc3Vycm91bmRQYXR0ZXJuWzFdO1xuICB9XG5cbiAgdGhpcy5zb3VyY2UgPSBwYXR0ZXJuO1xuXG4gIC8vIFNwbGl0IGludG8gc3RhdGljIHNlZ21lbnRzIHNlcGFyYXRlZCBieSBwYXRoIHBhcmFtZXRlciBwbGFjZWhvbGRlcnMuXG4gIC8vIFRoZSBudW1iZXIgb2Ygc2VnbWVudHMgaXMgYWx3YXlzIDEgbW9yZSB0aGFuIHRoZSBudW1iZXIgb2YgcGFyYW1ldGVycy5cbiAgZnVuY3Rpb24gbWF0Y2hEZXRhaWxzKG0sIGlzU2VhcmNoKSB7XG4gICAgdmFyIGlkLCByZWdleHAsIHNlZ21lbnQsIHR5cGUsIGNmZywgYXJyYXlNb2RlO1xuICAgIGlkICAgICAgICAgID0gbVsyXSB8fCBtWzNdOyAvLyBJRVs3OF0gcmV0dXJucyAnJyBmb3IgdW5tYXRjaGVkIGdyb3VwcyBpbnN0ZWFkIG9mIG51bGxcbiAgICBjZmcgICAgICAgICA9IGNvbmZpZy5wYXJhbXNbaWRdO1xuICAgIHNlZ21lbnQgICAgID0gcGF0dGVybi5zdWJzdHJpbmcobGFzdCwgbS5pbmRleCk7XG4gICAgcmVnZXhwICAgICAgPSBpc1NlYXJjaCA/IG1bNF0gOiBtWzRdIHx8IChtWzFdID09ICcqJyA/ICcuKicgOiBudWxsKTtcbiAgICB0eXBlICAgICAgICA9ICQkVU1GUC50eXBlKHJlZ2V4cCB8fCBcInN0cmluZ1wiKSB8fCBpbmhlcml0KCQkVU1GUC50eXBlKFwic3RyaW5nXCIpLCB7IHBhdHRlcm46IG5ldyBSZWdFeHAocmVnZXhwKSB9KTtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGlkLCByZWdleHA6IHJlZ2V4cCwgc2VnbWVudDogc2VnbWVudCwgdHlwZTogdHlwZSwgY2ZnOiBjZmdcbiAgICB9O1xuICB9XG5cbiAgdmFyIHAsIHBhcmFtLCBzZWdtZW50O1xuICB3aGlsZSAoKG0gPSBwbGFjZWhvbGRlci5leGVjKHBhdHRlcm4pKSkge1xuICAgIHAgPSBtYXRjaERldGFpbHMobSwgZmFsc2UpO1xuICAgIGlmIChwLnNlZ21lbnQuaW5kZXhPZignPycpID49IDApIGJyZWFrOyAvLyB3ZSdyZSBpbnRvIHRoZSBzZWFyY2ggcGFydFxuXG4gICAgcGFyYW0gPSBhZGRQYXJhbWV0ZXIocC5pZCwgcC50eXBlLCBwLmNmZywgXCJwYXRoXCIpO1xuICAgIGNvbXBpbGVkICs9IHF1b3RlUmVnRXhwKHAuc2VnbWVudCwgcGFyYW0udHlwZS5wYXR0ZXJuLnNvdXJjZSwgcGFyYW0uc3F1YXNoKTtcbiAgICBzZWdtZW50cy5wdXNoKHAuc2VnbWVudCk7XG4gICAgbGFzdCA9IHBsYWNlaG9sZGVyLmxhc3RJbmRleDtcbiAgfVxuICBzZWdtZW50ID0gcGF0dGVybi5zdWJzdHJpbmcobGFzdCk7XG5cbiAgLy8gRmluZCBhbnkgc2VhcmNoIHBhcmFtZXRlciBuYW1lcyBhbmQgcmVtb3ZlIHRoZW0gZnJvbSB0aGUgbGFzdCBzZWdtZW50XG4gIHZhciBpID0gc2VnbWVudC5pbmRleE9mKCc/Jyk7XG5cbiAgaWYgKGkgPj0gMCkge1xuICAgIHZhciBzZWFyY2ggPSB0aGlzLnNvdXJjZVNlYXJjaCA9IHNlZ21lbnQuc3Vic3RyaW5nKGkpO1xuICAgIHNlZ21lbnQgPSBzZWdtZW50LnN1YnN0cmluZygwLCBpKTtcbiAgICB0aGlzLnNvdXJjZVBhdGggPSBwYXR0ZXJuLnN1YnN0cmluZygwLCBsYXN0ICsgaSk7XG5cbiAgICBpZiAoc2VhcmNoLmxlbmd0aCA+IDApIHtcbiAgICAgIGxhc3QgPSAwO1xuICAgICAgd2hpbGUgKChtID0gc2VhcmNoUGxhY2Vob2xkZXIuZXhlYyhzZWFyY2gpKSkge1xuICAgICAgICBwID0gbWF0Y2hEZXRhaWxzKG0sIHRydWUpO1xuICAgICAgICBwYXJhbSA9IGFkZFBhcmFtZXRlcihwLmlkLCBwLnR5cGUsIHAuY2ZnLCBcInNlYXJjaFwiKTtcbiAgICAgICAgbGFzdCA9IHBsYWNlaG9sZGVyLmxhc3RJbmRleDtcbiAgICAgICAgLy8gY2hlY2sgaWYgPyZcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5zb3VyY2VQYXRoID0gcGF0dGVybjtcbiAgICB0aGlzLnNvdXJjZVNlYXJjaCA9ICcnO1xuICB9XG5cbiAgY29tcGlsZWQgKz0gcXVvdGVSZWdFeHAoc2VnbWVudCkgKyAoY29uZmlnLnN0cmljdCA9PT0gZmFsc2UgPyAnXFwvPycgOiAnJykgKyAnJCc7XG4gIHNlZ21lbnRzLnB1c2goc2VnbWVudCk7XG5cbiAgdGhpcy5yZWdleHAgPSBuZXcgUmVnRXhwKGNvbXBpbGVkLCBjb25maWcuY2FzZUluc2Vuc2l0aXZlID8gJ2knIDogdW5kZWZpbmVkKTtcbiAgdGhpcy5wcmVmaXggPSBzZWdtZW50c1swXTtcbiAgdGhpcy4kJHBhcmFtTmFtZXMgPSBwYXJhbU5hbWVzO1xufVxuXG4vKipcbiAqIEBuZ2RvYyBmdW5jdGlvblxuICogQG5hbWUgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyI2NvbmNhdFxuICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLnR5cGU6VXJsTWF0Y2hlclxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUmV0dXJucyBhIG5ldyBtYXRjaGVyIGZvciBhIHBhdHRlcm4gY29uc3RydWN0ZWQgYnkgYXBwZW5kaW5nIHRoZSBwYXRoIHBhcnQgYW5kIGFkZGluZyB0aGVcbiAqIHNlYXJjaCBwYXJhbWV0ZXJzIG9mIHRoZSBzcGVjaWZpZWQgcGF0dGVybiB0byB0aGlzIHBhdHRlcm4uIFRoZSBjdXJyZW50IHBhdHRlcm4gaXMgbm90XG4gKiBtb2RpZmllZC4gVGhpcyBjYW4gYmUgdW5kZXJzdG9vZCBhcyBjcmVhdGluZyBhIHBhdHRlcm4gZm9yIFVSTHMgdGhhdCBhcmUgcmVsYXRpdmUgdG8gKG9yXG4gKiBzdWZmaXhlcyBvZikgdGhlIGN1cnJlbnQgcGF0dGVybi5cbiAqXG4gKiBAZXhhbXBsZVxuICogVGhlIGZvbGxvd2luZyB0d28gbWF0Y2hlcnMgYXJlIGVxdWl2YWxlbnQ6XG4gKiA8cHJlPlxuICogbmV3IFVybE1hdGNoZXIoJy91c2VyL3tpZH0/cScpLmNvbmNhdCgnL2RldGFpbHM/ZGF0ZScpO1xuICogbmV3IFVybE1hdGNoZXIoJy91c2VyL3tpZH0vZGV0YWlscz9xJmRhdGUnKTtcbiAqIDwvcHJlPlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXR0ZXJuICBUaGUgcGF0dGVybiB0byBhcHBlbmQuXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnICBBbiBvYmplY3QgaGFzaCBvZiB0aGUgY29uZmlndXJhdGlvbiBmb3IgdGhlIG1hdGNoZXIuXG4gKiBAcmV0dXJucyB7VXJsTWF0Y2hlcn0gIEEgbWF0Y2hlciBmb3IgdGhlIGNvbmNhdGVuYXRlZCBwYXR0ZXJuLlxuICovXG5VcmxNYXRjaGVyLnByb3RvdHlwZS5jb25jYXQgPSBmdW5jdGlvbiAocGF0dGVybiwgY29uZmlnKSB7XG4gIC8vIEJlY2F1c2Ugb3JkZXIgb2Ygc2VhcmNoIHBhcmFtZXRlcnMgaXMgaXJyZWxldmFudCwgd2UgY2FuIGFkZCBvdXIgb3duIHNlYXJjaFxuICAvLyBwYXJhbWV0ZXJzIHRvIHRoZSBlbmQgb2YgdGhlIG5ldyBwYXR0ZXJuLiBQYXJzZSB0aGUgbmV3IHBhdHRlcm4gYnkgaXRzZWxmXG4gIC8vIGFuZCB0aGVuIGpvaW4gdGhlIGJpdHMgdG9nZXRoZXIsIGJ1dCBpdCdzIG11Y2ggZWFzaWVyIHRvIGRvIHRoaXMgb24gYSBzdHJpbmcgbGV2ZWwuXG4gIHZhciBkZWZhdWx0Q29uZmlnID0ge1xuICAgIGNhc2VJbnNlbnNpdGl2ZTogJCRVTUZQLmNhc2VJbnNlbnNpdGl2ZSgpLFxuICAgIHN0cmljdDogJCRVTUZQLnN0cmljdE1vZGUoKSxcbiAgICBzcXVhc2g6ICQkVU1GUC5kZWZhdWx0U3F1YXNoUG9saWN5KClcbiAgfTtcbiAgcmV0dXJuIG5ldyBVcmxNYXRjaGVyKHRoaXMuc291cmNlUGF0aCArIHBhdHRlcm4gKyB0aGlzLnNvdXJjZVNlYXJjaCwgZXh0ZW5kKGRlZmF1bHRDb25maWcsIGNvbmZpZyksIHRoaXMpO1xufTtcblxuVXJsTWF0Y2hlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLnNvdXJjZTtcbn07XG5cbi8qKlxuICogQG5nZG9jIGZ1bmN0aW9uXG4gKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC50eXBlOlVybE1hdGNoZXIjZXhlY1xuICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLnR5cGU6VXJsTWF0Y2hlclxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogVGVzdHMgdGhlIHNwZWNpZmllZCBwYXRoIGFnYWluc3QgdGhpcyBtYXRjaGVyLCBhbmQgcmV0dXJucyBhbiBvYmplY3QgY29udGFpbmluZyB0aGUgY2FwdHVyZWRcbiAqIHBhcmFtZXRlciB2YWx1ZXMsIG9yIG51bGwgaWYgdGhlIHBhdGggZG9lcyBub3QgbWF0Y2guIFRoZSByZXR1cm5lZCBvYmplY3QgY29udGFpbnMgdGhlIHZhbHVlc1xuICogb2YgYW55IHNlYXJjaCBwYXJhbWV0ZXJzIHRoYXQgYXJlIG1lbnRpb25lZCBpbiB0aGUgcGF0dGVybiwgYnV0IHRoZWlyIHZhbHVlIG1heSBiZSBudWxsIGlmXG4gKiB0aGV5IGFyZSBub3QgcHJlc2VudCBpbiBgc2VhcmNoUGFyYW1zYC4gVGhpcyBtZWFucyB0aGF0IHNlYXJjaCBwYXJhbWV0ZXJzIGFyZSBhbHdheXMgdHJlYXRlZFxuICogYXMgb3B0aW9uYWwuXG4gKlxuICogQGV4YW1wbGVcbiAqIDxwcmU+XG4gKiBuZXcgVXJsTWF0Y2hlcignL3VzZXIve2lkfT9xJnInKS5leGVjKCcvdXNlci9ib2InLCB7XG4gKiAgIHg6ICcxJywgcTogJ2hlbGxvJ1xuICogfSk7XG4gKiAvLyByZXR1cm5zIHsgaWQ6ICdib2InLCBxOiAnaGVsbG8nLCByOiBudWxsIH1cbiAqIDwvcHJlPlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoICBUaGUgVVJMIHBhdGggdG8gbWF0Y2gsIGUuZy4gYCRsb2NhdGlvbi5wYXRoKClgLlxuICogQHBhcmFtIHtPYmplY3R9IHNlYXJjaFBhcmFtcyAgVVJMIHNlYXJjaCBwYXJhbWV0ZXJzLCBlLmcuIGAkbG9jYXRpb24uc2VhcmNoKClgLlxuICogQHJldHVybnMge09iamVjdH0gIFRoZSBjYXB0dXJlZCBwYXJhbWV0ZXIgdmFsdWVzLlxuICovXG5VcmxNYXRjaGVyLnByb3RvdHlwZS5leGVjID0gZnVuY3Rpb24gKHBhdGgsIHNlYXJjaFBhcmFtcykge1xuICB2YXIgbSA9IHRoaXMucmVnZXhwLmV4ZWMocGF0aCk7XG4gIGlmICghbSkgcmV0dXJuIG51bGw7XG4gIHNlYXJjaFBhcmFtcyA9IHNlYXJjaFBhcmFtcyB8fCB7fTtcblxuICB2YXIgcGFyYW1OYW1lcyA9IHRoaXMucGFyYW1ldGVycygpLCBuVG90YWwgPSBwYXJhbU5hbWVzLmxlbmd0aCxcbiAgICBuUGF0aCA9IHRoaXMuc2VnbWVudHMubGVuZ3RoIC0gMSxcbiAgICB2YWx1ZXMgPSB7fSwgaSwgaiwgY2ZnLCBwYXJhbU5hbWU7XG5cbiAgaWYgKG5QYXRoICE9PSBtLmxlbmd0aCAtIDEpIHRocm93IG5ldyBFcnJvcihcIlVuYmFsYW5jZWQgY2FwdHVyZSBncm91cCBpbiByb3V0ZSAnXCIgKyB0aGlzLnNvdXJjZSArIFwiJ1wiKTtcblxuICBmdW5jdGlvbiBkZWNvZGVQYXRoQXJyYXkoc3RyaW5nKSB7XG4gICAgZnVuY3Rpb24gcmV2ZXJzZVN0cmluZyhzdHIpIHsgcmV0dXJuIHN0ci5zcGxpdChcIlwiKS5yZXZlcnNlKCkuam9pbihcIlwiKTsgfVxuICAgIGZ1bmN0aW9uIHVucXVvdGVEYXNoZXMoc3RyKSB7IHJldHVybiBzdHIucmVwbGFjZSgvXFxcXC0vLCBcIi1cIik7IH1cblxuICAgIHZhciBzcGxpdCA9IHJldmVyc2VTdHJpbmcoc3RyaW5nKS5zcGxpdCgvLSg/IVxcXFwpLyk7XG4gICAgdmFyIGFsbFJldmVyc2VkID0gbWFwKHNwbGl0LCByZXZlcnNlU3RyaW5nKTtcbiAgICByZXR1cm4gbWFwKGFsbFJldmVyc2VkLCB1bnF1b3RlRGFzaGVzKS5yZXZlcnNlKCk7XG4gIH1cblxuICBmb3IgKGkgPSAwOyBpIDwgblBhdGg7IGkrKykge1xuICAgIHBhcmFtTmFtZSA9IHBhcmFtTmFtZXNbaV07XG4gICAgdmFyIHBhcmFtID0gdGhpcy5wYXJhbXNbcGFyYW1OYW1lXTtcbiAgICB2YXIgcGFyYW1WYWwgPSBtW2krMV07XG4gICAgLy8gaWYgdGhlIHBhcmFtIHZhbHVlIG1hdGNoZXMgYSBwcmUtcmVwbGFjZSBwYWlyLCByZXBsYWNlIHRoZSB2YWx1ZSBiZWZvcmUgZGVjb2RpbmcuXG4gICAgZm9yIChqID0gMDsgaiA8IHBhcmFtLnJlcGxhY2U7IGorKykge1xuICAgICAgaWYgKHBhcmFtLnJlcGxhY2Vbal0uZnJvbSA9PT0gcGFyYW1WYWwpIHBhcmFtVmFsID0gcGFyYW0ucmVwbGFjZVtqXS50bztcbiAgICB9XG4gICAgaWYgKHBhcmFtVmFsICYmIHBhcmFtLmFycmF5ID09PSB0cnVlKSBwYXJhbVZhbCA9IGRlY29kZVBhdGhBcnJheShwYXJhbVZhbCk7XG4gICAgdmFsdWVzW3BhcmFtTmFtZV0gPSBwYXJhbS52YWx1ZShwYXJhbVZhbCk7XG4gIH1cbiAgZm9yICgvKiovOyBpIDwgblRvdGFsOyBpKyspIHtcbiAgICBwYXJhbU5hbWUgPSBwYXJhbU5hbWVzW2ldO1xuICAgIHZhbHVlc1twYXJhbU5hbWVdID0gdGhpcy5wYXJhbXNbcGFyYW1OYW1lXS52YWx1ZShzZWFyY2hQYXJhbXNbcGFyYW1OYW1lXSk7XG4gIH1cblxuICByZXR1cm4gdmFsdWVzO1xufTtcblxuLyoqXG4gKiBAbmdkb2MgZnVuY3Rpb25cbiAqIEBuYW1lIHVpLnJvdXRlci51dGlsLnR5cGU6VXJsTWF0Y2hlciNwYXJhbWV0ZXJzXG4gKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSZXR1cm5zIHRoZSBuYW1lcyBvZiBhbGwgcGF0aCBhbmQgc2VhcmNoIHBhcmFtZXRlcnMgb2YgdGhpcyBwYXR0ZXJuIGluIGFuIHVuc3BlY2lmaWVkIG9yZGVyLlxuICogXG4gKiBAcmV0dXJucyB7QXJyYXkuPHN0cmluZz59ICBBbiBhcnJheSBvZiBwYXJhbWV0ZXIgbmFtZXMuIE11c3QgYmUgdHJlYXRlZCBhcyByZWFkLW9ubHkuIElmIHRoZVxuICogICAgcGF0dGVybiBoYXMgbm8gcGFyYW1ldGVycywgYW4gZW1wdHkgYXJyYXkgaXMgcmV0dXJuZWQuXG4gKi9cblVybE1hdGNoZXIucHJvdG90eXBlLnBhcmFtZXRlcnMgPSBmdW5jdGlvbiAocGFyYW0pIHtcbiAgaWYgKCFpc0RlZmluZWQocGFyYW0pKSByZXR1cm4gdGhpcy4kJHBhcmFtTmFtZXM7XG4gIHJldHVybiB0aGlzLnBhcmFtc1twYXJhbV0gfHwgbnVsbDtcbn07XG5cbi8qKlxuICogQG5nZG9jIGZ1bmN0aW9uXG4gKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC50eXBlOlVybE1hdGNoZXIjdmFsaWRhdGVcbiAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC50eXBlOlVybE1hdGNoZXJcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIENoZWNrcyBhbiBvYmplY3QgaGFzaCBvZiBwYXJhbWV0ZXJzIHRvIHZhbGlkYXRlIHRoZWlyIGNvcnJlY3RuZXNzIGFjY29yZGluZyB0byB0aGUgcGFyYW1ldGVyXG4gKiB0eXBlcyBvZiB0aGlzIGBVcmxNYXRjaGVyYC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIFRoZSBvYmplY3QgaGFzaCBvZiBwYXJhbWV0ZXJzIHRvIHZhbGlkYXRlLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGBwYXJhbXNgIHZhbGlkYXRlcywgb3RoZXJ3aXNlIGBmYWxzZWAuXG4gKi9cblVybE1hdGNoZXIucHJvdG90eXBlLnZhbGlkYXRlcyA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgcmV0dXJuIHRoaXMucGFyYW1zLiQkdmFsaWRhdGVzKHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEBuZ2RvYyBmdW5jdGlvblxuICogQG5hbWUgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyI2Zvcm1hdFxuICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLnR5cGU6VXJsTWF0Y2hlclxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogQ3JlYXRlcyBhIFVSTCB0aGF0IG1hdGNoZXMgdGhpcyBwYXR0ZXJuIGJ5IHN1YnN0aXR1dGluZyB0aGUgc3BlY2lmaWVkIHZhbHVlc1xuICogZm9yIHRoZSBwYXRoIGFuZCBzZWFyY2ggcGFyYW1ldGVycy4gTnVsbCB2YWx1ZXMgZm9yIHBhdGggcGFyYW1ldGVycyBhcmVcbiAqIHRyZWF0ZWQgYXMgZW1wdHkgc3RyaW5ncy5cbiAqXG4gKiBAZXhhbXBsZVxuICogPHByZT5cbiAqIG5ldyBVcmxNYXRjaGVyKCcvdXNlci97aWR9P3EnKS5mb3JtYXQoeyBpZDonYm9iJywgcToneWVzJyB9KTtcbiAqIC8vIHJldHVybnMgJy91c2VyL2JvYj9xPXllcydcbiAqIDwvcHJlPlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZXMgIHRoZSB2YWx1ZXMgdG8gc3Vic3RpdHV0ZSBmb3IgdGhlIHBhcmFtZXRlcnMgaW4gdGhpcyBwYXR0ZXJuLlxuICogQHJldHVybnMge3N0cmluZ30gIHRoZSBmb3JtYXR0ZWQgVVJMIChwYXRoIGFuZCBvcHRpb25hbGx5IHNlYXJjaCBwYXJ0KS5cbiAqL1xuVXJsTWF0Y2hlci5wcm90b3R5cGUuZm9ybWF0ID0gZnVuY3Rpb24gKHZhbHVlcykge1xuICB2YWx1ZXMgPSB2YWx1ZXMgfHwge307XG4gIHZhciBzZWdtZW50cyA9IHRoaXMuc2VnbWVudHMsIHBhcmFtcyA9IHRoaXMucGFyYW1ldGVycygpLCBwYXJhbXNldCA9IHRoaXMucGFyYW1zO1xuICBpZiAoIXRoaXMudmFsaWRhdGVzKHZhbHVlcykpIHJldHVybiBudWxsO1xuXG4gIHZhciBpLCBzZWFyY2ggPSBmYWxzZSwgblBhdGggPSBzZWdtZW50cy5sZW5ndGggLSAxLCBuVG90YWwgPSBwYXJhbXMubGVuZ3RoLCByZXN1bHQgPSBzZWdtZW50c1swXTtcblxuICBmdW5jdGlvbiBlbmNvZGVEYXNoZXMoc3RyKSB7IC8vIFJlcGxhY2UgZGFzaGVzIHdpdGggZW5jb2RlZCBcIlxcLVwiXG4gICAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChzdHIpLnJlcGxhY2UoLy0vZywgZnVuY3Rpb24oYykgeyByZXR1cm4gJyU1QyUnICsgYy5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpOyB9KTtcbiAgfVxuXG4gIGZvciAoaSA9IDA7IGkgPCBuVG90YWw7IGkrKykge1xuICAgIHZhciBpc1BhdGhQYXJhbSA9IGkgPCBuUGF0aDtcbiAgICB2YXIgbmFtZSA9IHBhcmFtc1tpXSwgcGFyYW0gPSBwYXJhbXNldFtuYW1lXSwgdmFsdWUgPSBwYXJhbS52YWx1ZSh2YWx1ZXNbbmFtZV0pO1xuICAgIHZhciBpc0RlZmF1bHRWYWx1ZSA9IHBhcmFtLmlzT3B0aW9uYWwgJiYgcGFyYW0udHlwZS5lcXVhbHMocGFyYW0udmFsdWUoKSwgdmFsdWUpO1xuICAgIHZhciBzcXVhc2ggPSBpc0RlZmF1bHRWYWx1ZSA/IHBhcmFtLnNxdWFzaCA6IGZhbHNlO1xuICAgIHZhciBlbmNvZGVkID0gcGFyYW0udHlwZS5lbmNvZGUodmFsdWUpO1xuXG4gICAgaWYgKGlzUGF0aFBhcmFtKSB7XG4gICAgICB2YXIgbmV4dFNlZ21lbnQgPSBzZWdtZW50c1tpICsgMV07XG4gICAgICBpZiAoc3F1YXNoID09PSBmYWxzZSkge1xuICAgICAgICBpZiAoZW5jb2RlZCAhPSBudWxsKSB7XG4gICAgICAgICAgaWYgKGlzQXJyYXkoZW5jb2RlZCkpIHtcbiAgICAgICAgICAgIHJlc3VsdCArPSBtYXAoZW5jb2RlZCwgZW5jb2RlRGFzaGVzKS5qb2luKFwiLVwiKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0ICs9IGVuY29kZVVSSUNvbXBvbmVudChlbmNvZGVkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ICs9IG5leHRTZWdtZW50O1xuICAgICAgfSBlbHNlIGlmIChzcXVhc2ggPT09IHRydWUpIHtcbiAgICAgICAgdmFyIGNhcHR1cmUgPSByZXN1bHQubWF0Y2goL1xcLyQvKSA/IC9cXC8/KC4qKS8gOiAvKC4qKS87XG4gICAgICAgIHJlc3VsdCArPSBuZXh0U2VnbWVudC5tYXRjaChjYXB0dXJlKVsxXTtcbiAgICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoc3F1YXNoKSkge1xuICAgICAgICByZXN1bHQgKz0gc3F1YXNoICsgbmV4dFNlZ21lbnQ7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChlbmNvZGVkID09IG51bGwgfHwgKGlzRGVmYXVsdFZhbHVlICYmIHNxdWFzaCAhPT0gZmFsc2UpKSBjb250aW51ZTtcbiAgICAgIGlmICghaXNBcnJheShlbmNvZGVkKSkgZW5jb2RlZCA9IFsgZW5jb2RlZCBdO1xuICAgICAgZW5jb2RlZCA9IG1hcChlbmNvZGVkLCBlbmNvZGVVUklDb21wb25lbnQpLmpvaW4oJyYnICsgbmFtZSArICc9Jyk7XG4gICAgICByZXN1bHQgKz0gKHNlYXJjaCA/ICcmJyA6ICc/JykgKyAobmFtZSArICc9JyArIGVuY29kZWQpO1xuICAgICAgc2VhcmNoID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuLyoqXG4gKiBAbmdkb2Mgb2JqZWN0XG4gKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC50eXBlOlR5cGVcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIEltcGxlbWVudHMgYW4gaW50ZXJmYWNlIHRvIGRlZmluZSBjdXN0b20gcGFyYW1ldGVyIHR5cGVzIHRoYXQgY2FuIGJlIGRlY29kZWQgZnJvbSBhbmQgZW5jb2RlZCB0b1xuICogc3RyaW5nIHBhcmFtZXRlcnMgbWF0Y2hlZCBpbiBhIFVSTC4gVXNlZCBieSB7QGxpbmsgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyIGBVcmxNYXRjaGVyYH1cbiAqIG9iamVjdHMgd2hlbiBtYXRjaGluZyBvciBmb3JtYXR0aW5nIFVSTHMsIG9yIGNvbXBhcmluZyBvciB2YWxpZGF0aW5nIHBhcmFtZXRlciB2YWx1ZXMuXG4gKlxuICogU2VlIHtAbGluayB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnkjbWV0aG9kc190eXBlIGAkdXJsTWF0Y2hlckZhY3RvcnkjdHlwZSgpYH0gZm9yIG1vcmVcbiAqIGluZm9ybWF0aW9uIG9uIHJlZ2lzdGVyaW5nIGN1c3RvbSB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnICBBIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHdoaWNoIGNvbnRhaW5zIHRoZSBjdXN0b20gdHlwZSBkZWZpbml0aW9uLiAgVGhlIG9iamVjdCdzXG4gKiAgICAgICAgcHJvcGVydGllcyB3aWxsIG92ZXJyaWRlIHRoZSBkZWZhdWx0IG1ldGhvZHMgYW5kL29yIHBhdHRlcm4gaW4gYFR5cGVgJ3MgcHVibGljIGludGVyZmFjZS5cbiAqIEBleGFtcGxlXG4gKiA8cHJlPlxuICoge1xuICogICBkZWNvZGU6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gcGFyc2VJbnQodmFsLCAxMCk7IH0sXG4gKiAgIGVuY29kZTogZnVuY3Rpb24odmFsKSB7IHJldHVybiB2YWwgJiYgdmFsLnRvU3RyaW5nKCk7IH0sXG4gKiAgIGVxdWFsczogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gdGhpcy5pcyhhKSAmJiBhID09PSBiOyB9LFxuICogICBpczogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhbmd1bGFyLmlzTnVtYmVyKHZhbCkgaXNGaW5pdGUodmFsKSAmJiB2YWwgJSAxID09PSAwOyB9LFxuICogICBwYXR0ZXJuOiAvXFxkKy9cbiAqIH1cbiAqIDwvcHJlPlxuICpcbiAqIEBwcm9wZXJ0eSB7UmVnRXhwfSBwYXR0ZXJuIFRoZSByZWd1bGFyIGV4cHJlc3Npb24gcGF0dGVybiB1c2VkIHRvIG1hdGNoIHZhbHVlcyBvZiB0aGlzIHR5cGUgd2hlblxuICogICAgICAgICAgIGNvbWluZyBmcm9tIGEgc3Vic3RyaW5nIG9mIGEgVVJMLlxuICpcbiAqIEByZXR1cm5zIHtPYmplY3R9ICBSZXR1cm5zIGEgbmV3IGBUeXBlYCBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIFR5cGUoY29uZmlnKSB7XG4gIGV4dGVuZCh0aGlzLCBjb25maWcpO1xufVxuXG4vKipcbiAqIEBuZ2RvYyBmdW5jdGlvblxuICogQG5hbWUgdWkucm91dGVyLnV0aWwudHlwZTpUeXBlI2lzXG4gKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwudHlwZTpUeXBlXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlY3RzIHdoZXRoZXIgYSB2YWx1ZSBpcyBvZiBhIHBhcnRpY3VsYXIgdHlwZS4gQWNjZXB0cyBhIG5hdGl2ZSAoZGVjb2RlZCkgdmFsdWVcbiAqIGFuZCBkZXRlcm1pbmVzIHdoZXRoZXIgaXQgbWF0Y2hlcyB0aGUgY3VycmVudCBgVHlwZWAgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsICBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5ICBPcHRpb25hbC4gSWYgdGhlIHR5cGUgY2hlY2sgaXMgaGFwcGVuaW5nIGluIHRoZSBjb250ZXh0IG9mIGEgc3BlY2lmaWNcbiAqICAgICAgICB7QGxpbmsgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyIGBVcmxNYXRjaGVyYH0gb2JqZWN0LCB0aGlzIGlzIHRoZSBuYW1lIG9mIHRoZVxuICogICAgICAgIHBhcmFtZXRlciBpbiB3aGljaCBgdmFsYCBpcyBzdG9yZWQuIENhbiBiZSB1c2VkIGZvciBtZXRhLXByb2dyYW1taW5nIG9mIGBUeXBlYCBvYmplY3RzLlxuICogQHJldHVybnMge0Jvb2xlYW59ICBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgdmFsdWUgbWF0Y2hlcyB0aGUgdHlwZSwgb3RoZXJ3aXNlIGBmYWxzZWAuXG4gKi9cblR5cGUucHJvdG90eXBlLmlzID0gZnVuY3Rpb24odmFsLCBrZXkpIHtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEBuZ2RvYyBmdW5jdGlvblxuICogQG5hbWUgdWkucm91dGVyLnV0aWwudHlwZTpUeXBlI2VuY29kZVxuICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLnR5cGU6VHlwZVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRW5jb2RlcyBhIGN1c3RvbS9uYXRpdmUgdHlwZSB2YWx1ZSB0byBhIHN0cmluZyB0aGF0IGNhbiBiZSBlbWJlZGRlZCBpbiBhIFVSTC4gTm90ZSB0aGF0IHRoZVxuICogcmV0dXJuIHZhbHVlIGRvZXMgKm5vdCogbmVlZCB0byBiZSBVUkwtc2FmZSAoaS5lLiBwYXNzZWQgdGhyb3VnaCBgZW5jb2RlVVJJQ29tcG9uZW50KClgKSwgaXRcbiAqIG9ubHkgbmVlZHMgdG8gYmUgYSByZXByZXNlbnRhdGlvbiBvZiBgdmFsYCB0aGF0IGhhcyBiZWVuIGNvZXJjZWQgdG8gYSBzdHJpbmcuXG4gKlxuICogQHBhcmFtIHsqfSB2YWwgIFRoZSB2YWx1ZSB0byBlbmNvZGUuXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5ICBUaGUgbmFtZSBvZiB0aGUgcGFyYW1ldGVyIGluIHdoaWNoIGB2YWxgIGlzIHN0b3JlZC4gQ2FuIGJlIHVzZWQgZm9yXG4gKiAgICAgICAgbWV0YS1wcm9ncmFtbWluZyBvZiBgVHlwZWAgb2JqZWN0cy5cbiAqIEByZXR1cm5zIHtzdHJpbmd9ICBSZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGB2YWxgIHRoYXQgY2FuIGJlIGVuY29kZWQgaW4gYSBVUkwuXG4gKi9cblR5cGUucHJvdG90eXBlLmVuY29kZSA9IGZ1bmN0aW9uKHZhbCwga2V5KSB7XG4gIHJldHVybiB2YWw7XG59O1xuXG4vKipcbiAqIEBuZ2RvYyBmdW5jdGlvblxuICogQG5hbWUgdWkucm91dGVyLnV0aWwudHlwZTpUeXBlI2RlY29kZVxuICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLnR5cGU6VHlwZVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogQ29udmVydHMgYSBwYXJhbWV0ZXIgdmFsdWUgKGZyb20gVVJMIHN0cmluZyBvciB0cmFuc2l0aW9uIHBhcmFtKSB0byBhIGN1c3RvbS9uYXRpdmUgdmFsdWUuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbCAgVGhlIFVSTCBwYXJhbWV0ZXIgdmFsdWUgdG8gZGVjb2RlLlxuICogQHBhcmFtIHtzdHJpbmd9IGtleSAgVGhlIG5hbWUgb2YgdGhlIHBhcmFtZXRlciBpbiB3aGljaCBgdmFsYCBpcyBzdG9yZWQuIENhbiBiZSB1c2VkIGZvclxuICogICAgICAgIG1ldGEtcHJvZ3JhbW1pbmcgb2YgYFR5cGVgIG9iamVjdHMuXG4gKiBAcmV0dXJucyB7Kn0gIFJldHVybnMgYSBjdXN0b20gcmVwcmVzZW50YXRpb24gb2YgdGhlIFVSTCBwYXJhbWV0ZXIgdmFsdWUuXG4gKi9cblR5cGUucHJvdG90eXBlLmRlY29kZSA9IGZ1bmN0aW9uKHZhbCwga2V5KSB7XG4gIHJldHVybiB2YWw7XG59O1xuXG4vKipcbiAqIEBuZ2RvYyBmdW5jdGlvblxuICogQG5hbWUgdWkucm91dGVyLnV0aWwudHlwZTpUeXBlI2VxdWFsc1xuICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLnR5cGU6VHlwZVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIHR3byBkZWNvZGVkIHZhbHVlcyBhcmUgZXF1aXZhbGVudC5cbiAqXG4gKiBAcGFyYW0geyp9IGEgIEEgdmFsdWUgdG8gY29tcGFyZSBhZ2FpbnN0LlxuICogQHBhcmFtIHsqfSBiICBBIHZhbHVlIHRvIGNvbXBhcmUgYWdhaW5zdC5cbiAqIEByZXR1cm5zIHtCb29sZWFufSAgUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIHZhbHVlcyBhcmUgZXF1aXZhbGVudC9lcXVhbCwgb3RoZXJ3aXNlIGBmYWxzZWAuXG4gKi9cblR5cGUucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgcmV0dXJuIGEgPT0gYjtcbn07XG5cblR5cGUucHJvdG90eXBlLiRzdWJQYXR0ZXJuID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzdWIgPSB0aGlzLnBhdHRlcm4udG9TdHJpbmcoKTtcbiAgcmV0dXJuIHN1Yi5zdWJzdHIoMSwgc3ViLmxlbmd0aCAtIDIpO1xufTtcblxuVHlwZS5wcm90b3R5cGUucGF0dGVybiA9IC8uKi87XG5cblR5cGUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiBcIntUeXBlOlwiICsgdGhpcy5uYW1lICsgXCJ9XCI7IH07XG5cbi8qXG4gKiBXcmFwcyBhbiBleGlzdGluZyBjdXN0b20gVHlwZSBhcyBhbiBhcnJheSBvZiBUeXBlLCBkZXBlbmRpbmcgb24gJ21vZGUnLlxuICogZS5nLjpcbiAqIC0gdXJsbWF0Y2hlciBwYXR0ZXJuIFwiL3BhdGg/e3F1ZXJ5UGFyYW1bXTppbnR9XCJcbiAqIC0gdXJsOiBcIi9wYXRoP3F1ZXJ5UGFyYW09MSZxdWVyeVBhcmFtPTJcbiAqIC0gJHN0YXRlUGFyYW1zLnF1ZXJ5UGFyYW0gd2lsbCBiZSBbMSwgMl1cbiAqIGlmIGBtb2RlYCBpcyBcImF1dG9cIiwgdGhlblxuICogLSB1cmw6IFwiL3BhdGg/cXVlcnlQYXJhbT0xIHdpbGwgY3JlYXRlICRzdGF0ZVBhcmFtcy5xdWVyeVBhcmFtOiAxXG4gKiAtIHVybDogXCIvcGF0aD9xdWVyeVBhcmFtPTEmcXVlcnlQYXJhbT0yIHdpbGwgY3JlYXRlICRzdGF0ZVBhcmFtcy5xdWVyeVBhcmFtOiBbMSwgMl1cbiAqL1xuVHlwZS5wcm90b3R5cGUuJGFzQXJyYXkgPSBmdW5jdGlvbihtb2RlLCBpc1NlYXJjaCkge1xuICBpZiAoIW1vZGUpIHJldHVybiB0aGlzO1xuICBpZiAobW9kZSA9PT0gXCJhdXRvXCIgJiYgIWlzU2VhcmNoKSB0aHJvdyBuZXcgRXJyb3IoXCInYXV0bycgYXJyYXkgbW9kZSBpcyBmb3IgcXVlcnkgcGFyYW1ldGVycyBvbmx5XCIpO1xuICByZXR1cm4gbmV3IEFycmF5VHlwZSh0aGlzLCBtb2RlKTtcblxuICBmdW5jdGlvbiBBcnJheVR5cGUodHlwZSwgbW9kZSkge1xuICAgIGZ1bmN0aW9uIGJpbmRUbyh0eXBlLCBjYWxsYmFja05hbWUpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHR5cGVbY2FsbGJhY2tOYW1lXS5hcHBseSh0eXBlLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBXcmFwIG5vbi1hcnJheSB2YWx1ZSBhcyBhcnJheVxuICAgIGZ1bmN0aW9uIGFycmF5V3JhcCh2YWwpIHsgcmV0dXJuIGlzQXJyYXkodmFsKSA/IHZhbCA6IChpc0RlZmluZWQodmFsKSA/IFsgdmFsIF0gOiBbXSk7IH1cbiAgICAvLyBVbndyYXAgYXJyYXkgdmFsdWUgZm9yIFwiYXV0b1wiIG1vZGUuIFJldHVybiB1bmRlZmluZWQgZm9yIGVtcHR5IGFycmF5LlxuICAgIGZ1bmN0aW9uIGFycmF5VW53cmFwKHZhbCkge1xuICAgICAgc3dpdGNoKHZhbC5sZW5ndGgpIHtcbiAgICAgICAgY2FzZSAwOiByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICBjYXNlIDE6IHJldHVybiBtb2RlID09PSBcImF1dG9cIiA/IHZhbFswXSA6IHZhbDtcbiAgICAgICAgZGVmYXVsdDogcmV0dXJuIHZhbDtcbiAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gZmFsc2V5KHZhbCkgeyByZXR1cm4gIXZhbDsgfVxuXG4gICAgLy8gV3JhcHMgdHlwZSAoLmlzLy5lbmNvZGUvLmRlY29kZSkgZnVuY3Rpb25zIHRvIG9wZXJhdGUgb24gZWFjaCB2YWx1ZSBvZiBhbiBhcnJheVxuICAgIGZ1bmN0aW9uIGFycmF5SGFuZGxlcihjYWxsYmFjaywgYWxsVHJ1dGh5TW9kZSkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uIGhhbmRsZUFycmF5KHZhbCkge1xuICAgICAgICB2YWwgPSBhcnJheVdyYXAodmFsKTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IG1hcCh2YWwsIGNhbGxiYWNrKTtcbiAgICAgICAgaWYgKGFsbFRydXRoeU1vZGUgPT09IHRydWUpXG4gICAgICAgICAgcmV0dXJuIGZpbHRlcihyZXN1bHQsIGZhbHNleSkubGVuZ3RoID09PSAwO1xuICAgICAgICByZXR1cm4gYXJyYXlVbndyYXAocmVzdWx0KTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gV3JhcHMgdHlwZSAoLmVxdWFscykgZnVuY3Rpb25zIHRvIG9wZXJhdGUgb24gZWFjaCB2YWx1ZSBvZiBhbiBhcnJheVxuICAgIGZ1bmN0aW9uIGFycmF5RXF1YWxzSGFuZGxlcihjYWxsYmFjaykge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uIGhhbmRsZUFycmF5KHZhbDEsIHZhbDIpIHtcbiAgICAgICAgdmFyIGxlZnQgPSBhcnJheVdyYXAodmFsMSksIHJpZ2h0ID0gYXJyYXlXcmFwKHZhbDIpO1xuICAgICAgICBpZiAobGVmdC5sZW5ndGggIT09IHJpZ2h0Lmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlZnQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoIWNhbGxiYWNrKGxlZnRbaV0sIHJpZ2h0W2ldKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICB0aGlzLmVuY29kZSA9IGFycmF5SGFuZGxlcihiaW5kVG8odHlwZSwgJ2VuY29kZScpKTtcbiAgICB0aGlzLmRlY29kZSA9IGFycmF5SGFuZGxlcihiaW5kVG8odHlwZSwgJ2RlY29kZScpKTtcbiAgICB0aGlzLmlzICAgICA9IGFycmF5SGFuZGxlcihiaW5kVG8odHlwZSwgJ2lzJyksIHRydWUpO1xuICAgIHRoaXMuZXF1YWxzID0gYXJyYXlFcXVhbHNIYW5kbGVyKGJpbmRUbyh0eXBlLCAnZXF1YWxzJykpO1xuICAgIHRoaXMucGF0dGVybiA9IHR5cGUucGF0dGVybjtcbiAgICB0aGlzLiRhcnJheU1vZGUgPSBtb2RlO1xuICB9XG59O1xuXG5cblxuLyoqXG4gKiBAbmdkb2Mgb2JqZWN0XG4gKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnlcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIEZhY3RvcnkgZm9yIHtAbGluayB1aS5yb3V0ZXIudXRpbC50eXBlOlVybE1hdGNoZXIgYFVybE1hdGNoZXJgfSBpbnN0YW5jZXMuIFRoZSBmYWN0b3J5XG4gKiBpcyBhbHNvIGF2YWlsYWJsZSB0byBwcm92aWRlcnMgdW5kZXIgdGhlIG5hbWUgYCR1cmxNYXRjaGVyRmFjdG9yeVByb3ZpZGVyYC5cbiAqL1xuZnVuY3Rpb24gJFVybE1hdGNoZXJGYWN0b3J5KCkge1xuICAkJFVNRlAgPSB0aGlzO1xuXG4gIHZhciBpc0Nhc2VJbnNlbnNpdGl2ZSA9IGZhbHNlLCBpc1N0cmljdE1vZGUgPSB0cnVlLCBkZWZhdWx0U3F1YXNoUG9saWN5ID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gdmFsVG9TdHJpbmcodmFsKSB7IHJldHVybiB2YWwgIT0gbnVsbCA/IHZhbC50b1N0cmluZygpLnJlcGxhY2UoL1xcLy9nLCBcIiUyRlwiKSA6IHZhbDsgfVxuICBmdW5jdGlvbiB2YWxGcm9tU3RyaW5nKHZhbCkgeyByZXR1cm4gdmFsICE9IG51bGwgPyB2YWwudG9TdHJpbmcoKS5yZXBsYWNlKC8lMkYvZywgXCIvXCIpIDogdmFsOyB9XG4vLyAgVE9ETzogaW4gMS4wLCBtYWtlIHN0cmluZyAuaXMoKSByZXR1cm4gZmFsc2UgaWYgdmFsdWUgaXMgdW5kZWZpbmVkIGJ5IGRlZmF1bHQuXG4vLyAgZnVuY3Rpb24gcmVnZXhwTWF0Y2hlcyh2YWwpIHsgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi8gcmV0dXJuIGlzRGVmaW5lZCh2YWwpICYmIHRoaXMucGF0dGVybi50ZXN0KHZhbCk7IH1cbiAgZnVuY3Rpb24gcmVnZXhwTWF0Y2hlcyh2YWwpIHsgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi8gcmV0dXJuIHRoaXMucGF0dGVybi50ZXN0KHZhbCk7IH1cblxuICB2YXIgJHR5cGVzID0ge30sIGVucXVldWUgPSB0cnVlLCB0eXBlUXVldWUgPSBbXSwgaW5qZWN0b3IsIGRlZmF1bHRUeXBlcyA9IHtcbiAgICBzdHJpbmc6IHtcbiAgICAgIGVuY29kZTogdmFsVG9TdHJpbmcsXG4gICAgICBkZWNvZGU6IHZhbEZyb21TdHJpbmcsXG4gICAgICBpczogcmVnZXhwTWF0Y2hlcyxcbiAgICAgIHBhdHRlcm46IC9bXi9dKi9cbiAgICB9LFxuICAgIGludDoge1xuICAgICAgZW5jb2RlOiB2YWxUb1N0cmluZyxcbiAgICAgIGRlY29kZTogZnVuY3Rpb24odmFsKSB7IHJldHVybiBwYXJzZUludCh2YWwsIDEwKTsgfSxcbiAgICAgIGlzOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGlzRGVmaW5lZCh2YWwpICYmIHRoaXMuZGVjb2RlKHZhbC50b1N0cmluZygpKSA9PT0gdmFsOyB9LFxuICAgICAgcGF0dGVybjogL1xcZCsvXG4gICAgfSxcbiAgICBib29sOiB7XG4gICAgICBlbmNvZGU6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gdmFsID8gMSA6IDA7IH0sXG4gICAgICBkZWNvZGU6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gcGFyc2VJbnQodmFsLCAxMCkgIT09IDA7IH0sXG4gICAgICBpczogZnVuY3Rpb24odmFsKSB7IHJldHVybiB2YWwgPT09IHRydWUgfHwgdmFsID09PSBmYWxzZTsgfSxcbiAgICAgIHBhdHRlcm46IC8wfDEvXG4gICAgfSxcbiAgICBkYXRlOiB7XG4gICAgICBlbmNvZGU6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzKHZhbCkpXG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIFsgdmFsLmdldEZ1bGxZZWFyKCksXG4gICAgICAgICAgKCcwJyArICh2YWwuZ2V0TW9udGgoKSArIDEpKS5zbGljZSgtMiksXG4gICAgICAgICAgKCcwJyArIHZhbC5nZXREYXRlKCkpLnNsaWNlKC0yKVxuICAgICAgICBdLmpvaW4oXCItXCIpO1xuICAgICAgfSxcbiAgICAgIGRlY29kZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICBpZiAodGhpcy5pcyh2YWwpKSByZXR1cm4gdmFsO1xuICAgICAgICB2YXIgbWF0Y2ggPSB0aGlzLmNhcHR1cmUuZXhlYyh2YWwpO1xuICAgICAgICByZXR1cm4gbWF0Y2ggPyBuZXcgRGF0ZShtYXRjaFsxXSwgbWF0Y2hbMl0gLSAxLCBtYXRjaFszXSkgOiB1bmRlZmluZWQ7XG4gICAgICB9LFxuICAgICAgaXM6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gdmFsIGluc3RhbmNlb2YgRGF0ZSAmJiAhaXNOYU4odmFsLnZhbHVlT2YoKSk7IH0sXG4gICAgICBlcXVhbHM6IGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiB0aGlzLmlzKGEpICYmIHRoaXMuaXMoYikgJiYgYS50b0lTT1N0cmluZygpID09PSBiLnRvSVNPU3RyaW5nKCk7IH0sXG4gICAgICBwYXR0ZXJuOiAvWzAtOV17NH0tKD86MFsxLTldfDFbMC0yXSktKD86MFsxLTldfFsxLTJdWzAtOV18M1swLTFdKS8sXG4gICAgICBjYXB0dXJlOiAvKFswLTldezR9KS0oMFsxLTldfDFbMC0yXSktKDBbMS05XXxbMS0yXVswLTldfDNbMC0xXSkvXG4gICAgfSxcbiAgICBqc29uOiB7XG4gICAgICBlbmNvZGU6IGFuZ3VsYXIudG9Kc29uLFxuICAgICAgZGVjb2RlOiBhbmd1bGFyLmZyb21Kc29uLFxuICAgICAgaXM6IGFuZ3VsYXIuaXNPYmplY3QsXG4gICAgICBlcXVhbHM6IGFuZ3VsYXIuZXF1YWxzLFxuICAgICAgcGF0dGVybjogL1teL10qL1xuICAgIH0sXG4gICAgYW55OiB7IC8vIGRvZXMgbm90IGVuY29kZS9kZWNvZGVcbiAgICAgIGVuY29kZTogYW5ndWxhci5pZGVudGl0eSxcbiAgICAgIGRlY29kZTogYW5ndWxhci5pZGVudGl0eSxcbiAgICAgIGlzOiBhbmd1bGFyLmlkZW50aXR5LFxuICAgICAgZXF1YWxzOiBhbmd1bGFyLmVxdWFscyxcbiAgICAgIHBhdHRlcm46IC8uKi9cbiAgICB9XG4gIH07XG5cbiAgZnVuY3Rpb24gZ2V0RGVmYXVsdENvbmZpZygpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3RyaWN0OiBpc1N0cmljdE1vZGUsXG4gICAgICBjYXNlSW5zZW5zaXRpdmU6IGlzQ2FzZUluc2Vuc2l0aXZlXG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzSW5qZWN0YWJsZSh2YWx1ZSkge1xuICAgIHJldHVybiAoaXNGdW5jdGlvbih2YWx1ZSkgfHwgKGlzQXJyYXkodmFsdWUpICYmIGlzRnVuY3Rpb24odmFsdWVbdmFsdWUubGVuZ3RoIC0gMV0pKSk7XG4gIH1cblxuICAvKipcbiAgICogW0ludGVybmFsXSBHZXQgdGhlIGRlZmF1bHQgdmFsdWUgb2YgYSBwYXJhbWV0ZXIsIHdoaWNoIG1heSBiZSBhbiBpbmplY3RhYmxlIGZ1bmN0aW9uLlxuICAgKi9cbiAgJFVybE1hdGNoZXJGYWN0b3J5LiQkZ2V0RGVmYXVsdFZhbHVlID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgaWYgKCFpc0luamVjdGFibGUoY29uZmlnLnZhbHVlKSkgcmV0dXJuIGNvbmZpZy52YWx1ZTtcbiAgICBpZiAoIWluamVjdG9yKSB0aHJvdyBuZXcgRXJyb3IoXCJJbmplY3RhYmxlIGZ1bmN0aW9ucyBjYW5ub3QgYmUgY2FsbGVkIGF0IGNvbmZpZ3VyYXRpb24gdGltZVwiKTtcbiAgICByZXR1cm4gaW5qZWN0b3IuaW52b2tlKGNvbmZpZy52YWx1ZSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnkjY2FzZUluc2Vuc2l0aXZlXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnlcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIERlZmluZXMgd2hldGhlciBVUkwgbWF0Y2hpbmcgc2hvdWxkIGJlIGNhc2Ugc2Vuc2l0aXZlICh0aGUgZGVmYXVsdCBiZWhhdmlvciksIG9yIG5vdC5cbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFufSB2YWx1ZSBgZmFsc2VgIHRvIG1hdGNoIFVSTCBpbiBhIGNhc2Ugc2Vuc2l0aXZlIG1hbm5lcjsgb3RoZXJ3aXNlIGB0cnVlYDtcbiAgICogQHJldHVybnMge2Jvb2xlYW59IHRoZSBjdXJyZW50IHZhbHVlIG9mIGNhc2VJbnNlbnNpdGl2ZVxuICAgKi9cbiAgdGhpcy5jYXNlSW5zZW5zaXRpdmUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmIChpc0RlZmluZWQodmFsdWUpKVxuICAgICAgaXNDYXNlSW5zZW5zaXRpdmUgPSB2YWx1ZTtcbiAgICByZXR1cm4gaXNDYXNlSW5zZW5zaXRpdmU7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3Rvcnkjc3RyaWN0TW9kZVxuICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwuJHVybE1hdGNoZXJGYWN0b3J5XG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBEZWZpbmVzIHdoZXRoZXIgVVJMcyBzaG91bGQgbWF0Y2ggdHJhaWxpbmcgc2xhc2hlcywgb3Igbm90ICh0aGUgZGVmYXVsdCBiZWhhdmlvcikuXG4gICAqXG4gICAqIEBwYXJhbSB7Ym9vbGVhbj19IHZhbHVlIGBmYWxzZWAgdG8gbWF0Y2ggdHJhaWxpbmcgc2xhc2hlcyBpbiBVUkxzLCBvdGhlcndpc2UgYHRydWVgLlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdGhlIGN1cnJlbnQgdmFsdWUgb2Ygc3RyaWN0TW9kZVxuICAgKi9cbiAgdGhpcy5zdHJpY3RNb2RlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoaXNEZWZpbmVkKHZhbHVlKSlcbiAgICAgIGlzU3RyaWN0TW9kZSA9IHZhbHVlO1xuICAgIHJldHVybiBpc1N0cmljdE1vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnkjZGVmYXVsdFNxdWFzaFBvbGljeVxuICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwuJHVybE1hdGNoZXJGYWN0b3J5XG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBTZXRzIHRoZSBkZWZhdWx0IGJlaGF2aW9yIHdoZW4gZ2VuZXJhdGluZyBvciBtYXRjaGluZyBVUkxzIHdpdGggZGVmYXVsdCBwYXJhbWV0ZXIgdmFsdWVzLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgQSBzdHJpbmcgdGhhdCBkZWZpbmVzIHRoZSBkZWZhdWx0IHBhcmFtZXRlciBVUkwgc3F1YXNoaW5nIGJlaGF2aW9yLlxuICAgKiAgICBgbm9zcXVhc2hgOiBXaGVuIGdlbmVyYXRpbmcgYW4gaHJlZiB3aXRoIGEgZGVmYXVsdCBwYXJhbWV0ZXIgdmFsdWUsIGRvIG5vdCBzcXVhc2ggdGhlIHBhcmFtZXRlciB2YWx1ZSBmcm9tIHRoZSBVUkxcbiAgICogICAgYHNsYXNoYDogV2hlbiBnZW5lcmF0aW5nIGFuIGhyZWYgd2l0aCBhIGRlZmF1bHQgcGFyYW1ldGVyIHZhbHVlLCBzcXVhc2ggKHJlbW92ZSkgdGhlIHBhcmFtZXRlciB2YWx1ZSwgYW5kLCBpZiB0aGVcbiAgICogICAgICAgICAgICAgcGFyYW1ldGVyIGlzIHN1cnJvdW5kZWQgYnkgc2xhc2hlcywgc3F1YXNoIChyZW1vdmUpIG9uZSBzbGFzaCBmcm9tIHRoZSBVUkxcbiAgICogICAgYW55IG90aGVyIHN0cmluZywgZS5nLiBcIn5cIjogV2hlbiBnZW5lcmF0aW5nIGFuIGhyZWYgd2l0aCBhIGRlZmF1bHQgcGFyYW1ldGVyIHZhbHVlLCBzcXVhc2ggKHJlbW92ZSlcbiAgICogICAgICAgICAgICAgdGhlIHBhcmFtZXRlciB2YWx1ZSBmcm9tIHRoZSBVUkwgYW5kIHJlcGxhY2UgaXQgd2l0aCB0aGlzIHN0cmluZy5cbiAgICovXG4gIHRoaXMuZGVmYXVsdFNxdWFzaFBvbGljeSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKCFpc0RlZmluZWQodmFsdWUpKSByZXR1cm4gZGVmYXVsdFNxdWFzaFBvbGljeTtcbiAgICBpZiAodmFsdWUgIT09IHRydWUgJiYgdmFsdWUgIT09IGZhbHNlICYmICFpc1N0cmluZyh2YWx1ZSkpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHNxdWFzaCBwb2xpY3k6IFwiICsgdmFsdWUgKyBcIi4gVmFsaWQgcG9saWNpZXM6IGZhbHNlLCB0cnVlLCBhcmJpdHJhcnktc3RyaW5nXCIpO1xuICAgIGRlZmF1bHRTcXVhc2hQb2xpY3kgPSB2YWx1ZTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnkjY29tcGlsZVxuICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwuJHVybE1hdGNoZXJGYWN0b3J5XG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBDcmVhdGVzIGEge0BsaW5rIHVpLnJvdXRlci51dGlsLnR5cGU6VXJsTWF0Y2hlciBgVXJsTWF0Y2hlcmB9IGZvciB0aGUgc3BlY2lmaWVkIHBhdHRlcm4uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwYXR0ZXJuICBUaGUgVVJMIHBhdHRlcm4uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgIFRoZSBjb25maWcgb2JqZWN0IGhhc2guXG4gICAqIEByZXR1cm5zIHtVcmxNYXRjaGVyfSAgVGhlIFVybE1hdGNoZXIuXG4gICAqL1xuICB0aGlzLmNvbXBpbGUgPSBmdW5jdGlvbiAocGF0dGVybiwgY29uZmlnKSB7XG4gICAgcmV0dXJuIG5ldyBVcmxNYXRjaGVyKHBhdHRlcm4sIGV4dGVuZChnZXREZWZhdWx0Q29uZmlnKCksIGNvbmZpZykpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgdWkucm91dGVyLnV0aWwuJHVybE1hdGNoZXJGYWN0b3J5I2lzTWF0Y2hlclxuICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwuJHVybE1hdGNoZXJGYWN0b3J5XG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIHNwZWNpZmllZCBvYmplY3QgaXMgYSBgVXJsTWF0Y2hlcmAsIG9yIGZhbHNlIG90aGVyd2lzZS5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAgVGhlIG9iamVjdCB0byBwZXJmb3JtIHRoZSB0eXBlIGNoZWNrIGFnYWluc3QuXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSAgUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIG9iamVjdCBtYXRjaGVzIHRoZSBgVXJsTWF0Y2hlcmAgaW50ZXJmYWNlLCBieVxuICAgKiAgICAgICAgICBpbXBsZW1lbnRpbmcgYWxsIHRoZSBzYW1lIG1ldGhvZHMuXG4gICAqL1xuICB0aGlzLmlzTWF0Y2hlciA9IGZ1bmN0aW9uIChvKSB7XG4gICAgaWYgKCFpc09iamVjdChvKSkgcmV0dXJuIGZhbHNlO1xuICAgIHZhciByZXN1bHQgPSB0cnVlO1xuXG4gICAgZm9yRWFjaChVcmxNYXRjaGVyLnByb3RvdHlwZSwgZnVuY3Rpb24odmFsLCBuYW1lKSB7XG4gICAgICBpZiAoaXNGdW5jdGlvbih2YWwpKSB7XG4gICAgICAgIHJlc3VsdCA9IHJlc3VsdCAmJiAoaXNEZWZpbmVkKG9bbmFtZV0pICYmIGlzRnVuY3Rpb24ob1tuYW1lXSkpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnkjdHlwZVxuICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwuJHVybE1hdGNoZXJGYWN0b3J5XG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBSZWdpc3RlcnMgYSBjdXN0b20ge0BsaW5rIHVpLnJvdXRlci51dGlsLnR5cGU6VHlwZSBgVHlwZWB9IG9iamVjdCB0aGF0IGNhbiBiZSB1c2VkIHRvXG4gICAqIGdlbmVyYXRlIFVSTHMgd2l0aCB0eXBlZCBwYXJhbWV0ZXJzLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSAgVGhlIHR5cGUgbmFtZS5cbiAgICogQHBhcmFtIHtPYmplY3R8RnVuY3Rpb259IGRlZmluaXRpb24gICBUaGUgdHlwZSBkZWZpbml0aW9uLiBTZWVcbiAgICogICAgICAgIHtAbGluayB1aS5yb3V0ZXIudXRpbC50eXBlOlR5cGUgYFR5cGVgfSBmb3IgaW5mb3JtYXRpb24gb24gdGhlIHZhbHVlcyBhY2NlcHRlZC5cbiAgICogQHBhcmFtIHtPYmplY3R8RnVuY3Rpb259IGRlZmluaXRpb25GbiAob3B0aW9uYWwpIEEgZnVuY3Rpb24gdGhhdCBpcyBpbmplY3RlZCBiZWZvcmUgdGhlIGFwcFxuICAgKiAgICAgICAgcnVudGltZSBzdGFydHMuICBUaGUgcmVzdWx0IG9mIHRoaXMgZnVuY3Rpb24gaXMgbWVyZ2VkIGludG8gdGhlIGV4aXN0aW5nIGBkZWZpbml0aW9uYC5cbiAgICogICAgICAgIFNlZSB7QGxpbmsgdWkucm91dGVyLnV0aWwudHlwZTpUeXBlIGBUeXBlYH0gZm9yIGluZm9ybWF0aW9uIG9uIHRoZSB2YWx1ZXMgYWNjZXB0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIHtPYmplY3R9ICBSZXR1cm5zIGAkdXJsTWF0Y2hlckZhY3RvcnlQcm92aWRlcmAuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIFRoaXMgaXMgYSBzaW1wbGUgZXhhbXBsZSBvZiBhIGN1c3RvbSB0eXBlIHRoYXQgZW5jb2RlcyBhbmQgZGVjb2RlcyBpdGVtcyBmcm9tIGFuXG4gICAqIGFycmF5LCB1c2luZyB0aGUgYXJyYXkgaW5kZXggYXMgdGhlIFVSTC1lbmNvZGVkIHZhbHVlOlxuICAgKlxuICAgKiA8cHJlPlxuICAgKiB2YXIgbGlzdCA9IFsnSm9obicsICdQYXVsJywgJ0dlb3JnZScsICdSaW5nbyddO1xuICAgKlxuICAgKiAkdXJsTWF0Y2hlckZhY3RvcnlQcm92aWRlci50eXBlKCdsaXN0SXRlbScsIHtcbiAgICogICBlbmNvZGU6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICogICAgIC8vIFJlcHJlc2VudCB0aGUgbGlzdCBpdGVtIGluIHRoZSBVUkwgdXNpbmcgaXRzIGNvcnJlc3BvbmRpbmcgaW5kZXhcbiAgICogICAgIHJldHVybiBsaXN0LmluZGV4T2YoaXRlbSk7XG4gICAqICAgfSxcbiAgICogICBkZWNvZGU6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICogICAgIC8vIExvb2sgdXAgdGhlIGxpc3QgaXRlbSBieSBpbmRleFxuICAgKiAgICAgcmV0dXJuIGxpc3RbcGFyc2VJbnQoaXRlbSwgMTApXTtcbiAgICogICB9LFxuICAgKiAgIGlzOiBmdW5jdGlvbihpdGVtKSB7XG4gICAqICAgICAvLyBFbnN1cmUgdGhlIGl0ZW0gaXMgdmFsaWQgYnkgY2hlY2tpbmcgdG8gc2VlIHRoYXQgaXQgYXBwZWFyc1xuICAgKiAgICAgLy8gaW4gdGhlIGxpc3RcbiAgICogICAgIHJldHVybiBsaXN0LmluZGV4T2YoaXRlbSkgPiAtMTtcbiAgICogICB9XG4gICAqIH0pO1xuICAgKlxuICAgKiAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbGlzdCcsIHtcbiAgICogICB1cmw6IFwiL2xpc3Qve2l0ZW06bGlzdEl0ZW19XCIsXG4gICAqICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGVQYXJhbXMpIHtcbiAgICogICAgIGNvbnNvbGUubG9nKCRzdGF0ZVBhcmFtcy5pdGVtKTtcbiAgICogICB9XG4gICAqIH0pO1xuICAgKlxuICAgKiAvLyAuLi5cbiAgICpcbiAgICogLy8gQ2hhbmdlcyBVUkwgdG8gJy9saXN0LzMnLCBsb2dzIFwiUmluZ29cIiB0byB0aGUgY29uc29sZVxuICAgKiAkc3RhdGUuZ28oJ2xpc3QnLCB7IGl0ZW06IFwiUmluZ29cIiB9KTtcbiAgICogPC9wcmU+XG4gICAqXG4gICAqIFRoaXMgaXMgYSBtb3JlIGNvbXBsZXggZXhhbXBsZSBvZiBhIHR5cGUgdGhhdCByZWxpZXMgb24gZGVwZW5kZW5jeSBpbmplY3Rpb24gdG9cbiAgICogaW50ZXJhY3Qgd2l0aCBzZXJ2aWNlcywgYW5kIHVzZXMgdGhlIHBhcmFtZXRlciBuYW1lIGZyb20gdGhlIFVSTCB0byBpbmZlciBob3cgdG9cbiAgICogaGFuZGxlIGVuY29kaW5nIGFuZCBkZWNvZGluZyBwYXJhbWV0ZXIgdmFsdWVzOlxuICAgKlxuICAgKiA8cHJlPlxuICAgKiAvLyBEZWZpbmVzIGEgY3VzdG9tIHR5cGUgdGhhdCBnZXRzIGEgdmFsdWUgZnJvbSBhIHNlcnZpY2UsXG4gICAqIC8vIHdoZXJlIGVhY2ggc2VydmljZSBnZXRzIGRpZmZlcmVudCB0eXBlcyBvZiB2YWx1ZXMgZnJvbVxuICAgKiAvLyBhIGJhY2tlbmQgQVBJOlxuICAgKiAkdXJsTWF0Y2hlckZhY3RvcnlQcm92aWRlci50eXBlKCdkYk9iamVjdCcsIHt9LCBmdW5jdGlvbihVc2VycywgUG9zdHMpIHtcbiAgICpcbiAgICogICAvLyBNYXRjaGVzIHVwIHNlcnZpY2VzIHRvIFVSTCBwYXJhbWV0ZXIgbmFtZXNcbiAgICogICB2YXIgc2VydmljZXMgPSB7XG4gICAqICAgICB1c2VyOiBVc2VycyxcbiAgICogICAgIHBvc3Q6IFBvc3RzXG4gICAqICAgfTtcbiAgICpcbiAgICogICByZXR1cm4ge1xuICAgKiAgICAgZW5jb2RlOiBmdW5jdGlvbihvYmplY3QpIHtcbiAgICogICAgICAgLy8gUmVwcmVzZW50IHRoZSBvYmplY3QgaW4gdGhlIFVSTCB1c2luZyBpdHMgdW5pcXVlIElEXG4gICAqICAgICAgIHJldHVybiBvYmplY3QuaWQ7XG4gICAqICAgICB9LFxuICAgKiAgICAgZGVjb2RlOiBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAqICAgICAgIC8vIExvb2sgdXAgdGhlIG9iamVjdCBieSBJRCwgdXNpbmcgdGhlIHBhcmFtZXRlclxuICAgKiAgICAgICAvLyBuYW1lIChrZXkpIHRvIGNhbGwgdGhlIGNvcnJlY3Qgc2VydmljZVxuICAgKiAgICAgICByZXR1cm4gc2VydmljZXNba2V5XS5maW5kQnlJZCh2YWx1ZSk7XG4gICAqICAgICB9LFxuICAgKiAgICAgaXM6IGZ1bmN0aW9uKG9iamVjdCwga2V5KSB7XG4gICAqICAgICAgIC8vIENoZWNrIHRoYXQgb2JqZWN0IGlzIGEgdmFsaWQgZGJPYmplY3RcbiAgICogICAgICAgcmV0dXJuIGFuZ3VsYXIuaXNPYmplY3Qob2JqZWN0KSAmJiBvYmplY3QuaWQgJiYgc2VydmljZXNba2V5XTtcbiAgICogICAgIH1cbiAgICogICAgIGVxdWFsczogZnVuY3Rpb24oYSwgYikge1xuICAgKiAgICAgICAvLyBDaGVjayB0aGUgZXF1YWxpdHkgb2YgZGVjb2RlZCBvYmplY3RzIGJ5IGNvbXBhcmluZ1xuICAgKiAgICAgICAvLyB0aGVpciB1bmlxdWUgSURzXG4gICAqICAgICAgIHJldHVybiBhLmlkID09PSBiLmlkO1xuICAgKiAgICAgfVxuICAgKiAgIH07XG4gICAqIH0pO1xuICAgKlxuICAgKiAvLyBJbiBhIGNvbmZpZygpIGJsb2NrLCB5b3UgY2FuIHRoZW4gYXR0YWNoIFVSTHMgd2l0aFxuICAgKiAvLyB0eXBlLWFubm90YXRlZCBwYXJhbWV0ZXJzOlxuICAgKiAkc3RhdGVQcm92aWRlci5zdGF0ZSgndXNlcnMnLCB7XG4gICAqICAgdXJsOiBcIi91c2Vyc1wiLFxuICAgKiAgIC8vIC4uLlxuICAgKiB9KS5zdGF0ZSgndXNlcnMuaXRlbScsIHtcbiAgICogICB1cmw6IFwiL3t1c2VyOmRiT2JqZWN0fVwiLFxuICAgKiAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zKSB7XG4gICAqICAgICAvLyAkc3RhdGVQYXJhbXMudXNlciB3aWxsIG5vdyBiZSBhbiBvYmplY3QgcmV0dXJuZWQgZnJvbVxuICAgKiAgICAgLy8gdGhlIFVzZXJzIHNlcnZpY2VcbiAgICogICB9LFxuICAgKiAgIC8vIC4uLlxuICAgKiB9KTtcbiAgICogPC9wcmU+XG4gICAqL1xuICB0aGlzLnR5cGUgPSBmdW5jdGlvbiAobmFtZSwgZGVmaW5pdGlvbiwgZGVmaW5pdGlvbkZuKSB7XG4gICAgaWYgKCFpc0RlZmluZWQoZGVmaW5pdGlvbikpIHJldHVybiAkdHlwZXNbbmFtZV07XG4gICAgaWYgKCR0eXBlcy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkgdGhyb3cgbmV3IEVycm9yKFwiQSB0eXBlIG5hbWVkICdcIiArIG5hbWUgKyBcIicgaGFzIGFscmVhZHkgYmVlbiBkZWZpbmVkLlwiKTtcblxuICAgICR0eXBlc1tuYW1lXSA9IG5ldyBUeXBlKGV4dGVuZCh7IG5hbWU6IG5hbWUgfSwgZGVmaW5pdGlvbikpO1xuICAgIGlmIChkZWZpbml0aW9uRm4pIHtcbiAgICAgIHR5cGVRdWV1ZS5wdXNoKHsgbmFtZTogbmFtZSwgZGVmOiBkZWZpbml0aW9uRm4gfSk7XG4gICAgICBpZiAoIWVucXVldWUpIGZsdXNoVHlwZVF1ZXVlKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8vIGBmbHVzaFR5cGVRdWV1ZSgpYCB3YWl0cyB1bnRpbCBgJHVybE1hdGNoZXJGYWN0b3J5YCBpcyBpbmplY3RlZCBiZWZvcmUgaW52b2tpbmcgdGhlIHF1ZXVlZCBgZGVmaW5pdGlvbkZuYHNcbiAgZnVuY3Rpb24gZmx1c2hUeXBlUXVldWUoKSB7XG4gICAgd2hpbGUodHlwZVF1ZXVlLmxlbmd0aCkge1xuICAgICAgdmFyIHR5cGUgPSB0eXBlUXVldWUuc2hpZnQoKTtcbiAgICAgIGlmICh0eXBlLnBhdHRlcm4pIHRocm93IG5ldyBFcnJvcihcIllvdSBjYW5ub3Qgb3ZlcnJpZGUgYSB0eXBlJ3MgLnBhdHRlcm4gYXQgcnVudGltZS5cIik7XG4gICAgICBhbmd1bGFyLmV4dGVuZCgkdHlwZXNbdHlwZS5uYW1lXSwgaW5qZWN0b3IuaW52b2tlKHR5cGUuZGVmKSk7XG4gICAgfVxuICB9XG5cbiAgLy8gUmVnaXN0ZXIgZGVmYXVsdCB0eXBlcy4gU3RvcmUgdGhlbSBpbiB0aGUgcHJvdG90eXBlIG9mICR0eXBlcy5cbiAgZm9yRWFjaChkZWZhdWx0VHlwZXMsIGZ1bmN0aW9uKHR5cGUsIG5hbWUpIHsgJHR5cGVzW25hbWVdID0gbmV3IFR5cGUoZXh0ZW5kKHtuYW1lOiBuYW1lfSwgdHlwZSkpOyB9KTtcbiAgJHR5cGVzID0gaW5oZXJpdCgkdHlwZXMsIHt9KTtcblxuICAvKiBObyBuZWVkIHRvIGRvY3VtZW50ICRnZXQsIHNpbmNlIGl0IHJldHVybnMgdGhpcyAqL1xuICB0aGlzLiRnZXQgPSBbJyRpbmplY3RvcicsIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcbiAgICBpbmplY3RvciA9ICRpbmplY3RvcjtcbiAgICBlbnF1ZXVlID0gZmFsc2U7XG4gICAgZmx1c2hUeXBlUXVldWUoKTtcblxuICAgIGZvckVhY2goZGVmYXVsdFR5cGVzLCBmdW5jdGlvbih0eXBlLCBuYW1lKSB7XG4gICAgICBpZiAoISR0eXBlc1tuYW1lXSkgJHR5cGVzW25hbWVdID0gbmV3IFR5cGUodHlwZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1dO1xuXG4gIHRoaXMuUGFyYW0gPSBmdW5jdGlvbiBQYXJhbShpZCwgdHlwZSwgY29uZmlnLCBsb2NhdGlvbikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBjb25maWcgPSB1bndyYXBTaG9ydGhhbmQoY29uZmlnKTtcbiAgICB0eXBlID0gZ2V0VHlwZShjb25maWcsIHR5cGUsIGxvY2F0aW9uKTtcbiAgICB2YXIgYXJyYXlNb2RlID0gZ2V0QXJyYXlNb2RlKCk7XG4gICAgdHlwZSA9IGFycmF5TW9kZSA/IHR5cGUuJGFzQXJyYXkoYXJyYXlNb2RlLCBsb2NhdGlvbiA9PT0gXCJzZWFyY2hcIikgOiB0eXBlO1xuICAgIGlmICh0eXBlLm5hbWUgPT09IFwic3RyaW5nXCIgJiYgIWFycmF5TW9kZSAmJiBsb2NhdGlvbiA9PT0gXCJwYXRoXCIgJiYgY29uZmlnLnZhbHVlID09PSB1bmRlZmluZWQpXG4gICAgICBjb25maWcudmFsdWUgPSBcIlwiOyAvLyBmb3IgMC4yLng7IGluIDAuMy4wKyBkbyBub3QgYXV0b21hdGljYWxseSBkZWZhdWx0IHRvIFwiXCJcbiAgICB2YXIgaXNPcHRpb25hbCA9IGNvbmZpZy52YWx1ZSAhPT0gdW5kZWZpbmVkO1xuICAgIHZhciBzcXVhc2ggPSBnZXRTcXVhc2hQb2xpY3koY29uZmlnLCBpc09wdGlvbmFsKTtcbiAgICB2YXIgcmVwbGFjZSA9IGdldFJlcGxhY2UoY29uZmlnLCBhcnJheU1vZGUsIGlzT3B0aW9uYWwsIHNxdWFzaCk7XG5cbiAgICBmdW5jdGlvbiB1bndyYXBTaG9ydGhhbmQoY29uZmlnKSB7XG4gICAgICB2YXIga2V5cyA9IGlzT2JqZWN0KGNvbmZpZykgPyBvYmplY3RLZXlzKGNvbmZpZykgOiBbXTtcbiAgICAgIHZhciBpc1Nob3J0aGFuZCA9IGluZGV4T2Yoa2V5cywgXCJ2YWx1ZVwiKSA9PT0gLTEgJiYgaW5kZXhPZihrZXlzLCBcInR5cGVcIikgPT09IC0xICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmRleE9mKGtleXMsIFwic3F1YXNoXCIpID09PSAtMSAmJiBpbmRleE9mKGtleXMsIFwiYXJyYXlcIikgPT09IC0xO1xuICAgICAgaWYgKGlzU2hvcnRoYW5kKSBjb25maWcgPSB7IHZhbHVlOiBjb25maWcgfTtcbiAgICAgIGNvbmZpZy4kJGZuID0gaXNJbmplY3RhYmxlKGNvbmZpZy52YWx1ZSkgPyBjb25maWcudmFsdWUgOiBmdW5jdGlvbiAoKSB7IHJldHVybiBjb25maWcudmFsdWU7IH07XG4gICAgICByZXR1cm4gY29uZmlnO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFR5cGUoY29uZmlnLCB1cmxUeXBlLCBsb2NhdGlvbikge1xuICAgICAgaWYgKGNvbmZpZy50eXBlICYmIHVybFR5cGUpIHRocm93IG5ldyBFcnJvcihcIlBhcmFtICdcIitpZCtcIicgaGFzIHR3byB0eXBlIGNvbmZpZ3VyYXRpb25zLlwiKTtcbiAgICAgIGlmICh1cmxUeXBlKSByZXR1cm4gdXJsVHlwZTtcbiAgICAgIGlmICghY29uZmlnLnR5cGUpIHJldHVybiAobG9jYXRpb24gPT09IFwiY29uZmlnXCIgPyAkdHlwZXMuYW55IDogJHR5cGVzLnN0cmluZyk7XG4gICAgICByZXR1cm4gY29uZmlnLnR5cGUgaW5zdGFuY2VvZiBUeXBlID8gY29uZmlnLnR5cGUgOiBuZXcgVHlwZShjb25maWcudHlwZSk7XG4gICAgfVxuXG4gICAgLy8gYXJyYXkgY29uZmlnOiBwYXJhbSBuYW1lIChwYXJhbVtdKSBvdmVycmlkZXMgZGVmYXVsdCBzZXR0aW5ncy4gIGV4cGxpY2l0IGNvbmZpZyBvdmVycmlkZXMgcGFyYW0gbmFtZS5cbiAgICBmdW5jdGlvbiBnZXRBcnJheU1vZGUoKSB7XG4gICAgICB2YXIgYXJyYXlEZWZhdWx0cyA9IHsgYXJyYXk6IChsb2NhdGlvbiA9PT0gXCJzZWFyY2hcIiA/IFwiYXV0b1wiIDogZmFsc2UpIH07XG4gICAgICB2YXIgYXJyYXlQYXJhbU5vbWVuY2xhdHVyZSA9IGlkLm1hdGNoKC9cXFtcXF0kLykgPyB7IGFycmF5OiB0cnVlIH0gOiB7fTtcbiAgICAgIHJldHVybiBleHRlbmQoYXJyYXlEZWZhdWx0cywgYXJyYXlQYXJhbU5vbWVuY2xhdHVyZSwgY29uZmlnKS5hcnJheTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIGZhbHNlLCB0cnVlLCBvciB0aGUgc3F1YXNoIHZhbHVlIHRvIGluZGljYXRlIHRoZSBcImRlZmF1bHQgcGFyYW1ldGVyIHVybCBzcXVhc2ggcG9saWN5XCIuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0U3F1YXNoUG9saWN5KGNvbmZpZywgaXNPcHRpb25hbCkge1xuICAgICAgdmFyIHNxdWFzaCA9IGNvbmZpZy5zcXVhc2g7XG4gICAgICBpZiAoIWlzT3B0aW9uYWwgfHwgc3F1YXNoID09PSBmYWxzZSkgcmV0dXJuIGZhbHNlO1xuICAgICAgaWYgKCFpc0RlZmluZWQoc3F1YXNoKSB8fCBzcXVhc2ggPT0gbnVsbCkgcmV0dXJuIGRlZmF1bHRTcXVhc2hQb2xpY3k7XG4gICAgICBpZiAoc3F1YXNoID09PSB0cnVlIHx8IGlzU3RyaW5nKHNxdWFzaCkpIHJldHVybiBzcXVhc2g7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHNxdWFzaCBwb2xpY3k6ICdcIiArIHNxdWFzaCArIFwiJy4gVmFsaWQgcG9saWNpZXM6IGZhbHNlLCB0cnVlLCBvciBhcmJpdHJhcnkgc3RyaW5nXCIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFJlcGxhY2UoY29uZmlnLCBhcnJheU1vZGUsIGlzT3B0aW9uYWwsIHNxdWFzaCkge1xuICAgICAgdmFyIHJlcGxhY2UsIGNvbmZpZ3VyZWRLZXlzLCBkZWZhdWx0UG9saWN5ID0gW1xuICAgICAgICB7IGZyb206IFwiXCIsICAgdG86IChpc09wdGlvbmFsIHx8IGFycmF5TW9kZSA/IHVuZGVmaW5lZCA6IFwiXCIpIH0sXG4gICAgICAgIHsgZnJvbTogbnVsbCwgdG86IChpc09wdGlvbmFsIHx8IGFycmF5TW9kZSA/IHVuZGVmaW5lZCA6IFwiXCIpIH1cbiAgICAgIF07XG4gICAgICByZXBsYWNlID0gaXNBcnJheShjb25maWcucmVwbGFjZSkgPyBjb25maWcucmVwbGFjZSA6IFtdO1xuICAgICAgaWYgKGlzU3RyaW5nKHNxdWFzaCkpXG4gICAgICAgIHJlcGxhY2UucHVzaCh7IGZyb206IHNxdWFzaCwgdG86IHVuZGVmaW5lZCB9KTtcbiAgICAgIGNvbmZpZ3VyZWRLZXlzID0gbWFwKHJlcGxhY2UsIGZ1bmN0aW9uKGl0ZW0pIHsgcmV0dXJuIGl0ZW0uZnJvbTsgfSApO1xuICAgICAgcmV0dXJuIGZpbHRlcihkZWZhdWx0UG9saWN5LCBmdW5jdGlvbihpdGVtKSB7IHJldHVybiBpbmRleE9mKGNvbmZpZ3VyZWRLZXlzLCBpdGVtLmZyb20pID09PSAtMTsgfSkuY29uY2F0KHJlcGxhY2UpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFtJbnRlcm5hbF0gR2V0IHRoZSBkZWZhdWx0IHZhbHVlIG9mIGEgcGFyYW1ldGVyLCB3aGljaCBtYXkgYmUgYW4gaW5qZWN0YWJsZSBmdW5jdGlvbi5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiAkJGdldERlZmF1bHRWYWx1ZSgpIHtcbiAgICAgIGlmICghaW5qZWN0b3IpIHRocm93IG5ldyBFcnJvcihcIkluamVjdGFibGUgZnVuY3Rpb25zIGNhbm5vdCBiZSBjYWxsZWQgYXQgY29uZmlndXJhdGlvbiB0aW1lXCIpO1xuICAgICAgcmV0dXJuIGluamVjdG9yLmludm9rZShjb25maWcuJCRmbik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogW0ludGVybmFsXSBHZXRzIHRoZSBkZWNvZGVkIHJlcHJlc2VudGF0aW9uIG9mIGEgdmFsdWUgaWYgdGhlIHZhbHVlIGlzIGRlZmluZWQsIG90aGVyd2lzZSwgcmV0dXJucyB0aGVcbiAgICAgKiBkZWZhdWx0IHZhbHVlLCB3aGljaCBtYXkgYmUgdGhlIHJlc3VsdCBvZiBhbiBpbmplY3RhYmxlIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uICR2YWx1ZSh2YWx1ZSkge1xuICAgICAgZnVuY3Rpb24gaGFzUmVwbGFjZVZhbCh2YWwpIHsgcmV0dXJuIGZ1bmN0aW9uKG9iaikgeyByZXR1cm4gb2JqLmZyb20gPT09IHZhbDsgfTsgfVxuICAgICAgZnVuY3Rpb24gJHJlcGxhY2UodmFsdWUpIHtcbiAgICAgICAgdmFyIHJlcGxhY2VtZW50ID0gbWFwKGZpbHRlcihzZWxmLnJlcGxhY2UsIGhhc1JlcGxhY2VWYWwodmFsdWUpKSwgZnVuY3Rpb24ob2JqKSB7IHJldHVybiBvYmoudG87IH0pO1xuICAgICAgICByZXR1cm4gcmVwbGFjZW1lbnQubGVuZ3RoID8gcmVwbGFjZW1lbnRbMF0gOiB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHZhbHVlID0gJHJlcGxhY2UodmFsdWUpO1xuICAgICAgcmV0dXJuIGlzRGVmaW5lZCh2YWx1ZSkgPyBzZWxmLnR5cGUuZGVjb2RlKHZhbHVlKSA6ICQkZ2V0RGVmYXVsdFZhbHVlKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdG9TdHJpbmcoKSB7IHJldHVybiBcIntQYXJhbTpcIiArIGlkICsgXCIgXCIgKyB0eXBlICsgXCIgc3F1YXNoOiAnXCIgKyBzcXVhc2ggKyBcIicgb3B0aW9uYWw6IFwiICsgaXNPcHRpb25hbCArIFwifVwiOyB9XG5cbiAgICBleHRlbmQodGhpcywge1xuICAgICAgaWQ6IGlkLFxuICAgICAgdHlwZTogdHlwZSxcbiAgICAgIGxvY2F0aW9uOiBsb2NhdGlvbixcbiAgICAgIGFycmF5OiBhcnJheU1vZGUsXG4gICAgICBzcXVhc2g6IHNxdWFzaCxcbiAgICAgIHJlcGxhY2U6IHJlcGxhY2UsXG4gICAgICBpc09wdGlvbmFsOiBpc09wdGlvbmFsLFxuICAgICAgdmFsdWU6ICR2YWx1ZSxcbiAgICAgIGR5bmFtaWM6IHVuZGVmaW5lZCxcbiAgICAgIGNvbmZpZzogY29uZmlnLFxuICAgICAgdG9TdHJpbmc6IHRvU3RyaW5nXG4gICAgfSk7XG4gIH07XG5cbiAgZnVuY3Rpb24gUGFyYW1TZXQocGFyYW1zKSB7XG4gICAgZXh0ZW5kKHRoaXMsIHBhcmFtcyB8fCB7fSk7XG4gIH1cblxuICBQYXJhbVNldC5wcm90b3R5cGUgPSB7XG4gICAgJCRuZXc6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGluaGVyaXQodGhpcywgZXh0ZW5kKG5ldyBQYXJhbVNldCgpLCB7ICQkcGFyZW50OiB0aGlzfSkpO1xuICAgIH0sXG4gICAgJCRrZXlzOiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIga2V5cyA9IFtdLCBjaGFpbiA9IFtdLCBwYXJlbnQgPSB0aGlzLFxuICAgICAgICBpZ25vcmUgPSBvYmplY3RLZXlzKFBhcmFtU2V0LnByb3RvdHlwZSk7XG4gICAgICB3aGlsZSAocGFyZW50KSB7IGNoYWluLnB1c2gocGFyZW50KTsgcGFyZW50ID0gcGFyZW50LiQkcGFyZW50OyB9XG4gICAgICBjaGFpbi5yZXZlcnNlKCk7XG4gICAgICBmb3JFYWNoKGNoYWluLCBmdW5jdGlvbihwYXJhbXNldCkge1xuICAgICAgICBmb3JFYWNoKG9iamVjdEtleXMocGFyYW1zZXQpLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIGlmIChpbmRleE9mKGtleXMsIGtleSkgPT09IC0xICYmIGluZGV4T2YoaWdub3JlLCBrZXkpID09PSAtMSkga2V5cy5wdXNoKGtleSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4ga2V5cztcbiAgICB9LFxuICAgICQkdmFsdWVzOiBmdW5jdGlvbihwYXJhbVZhbHVlcykge1xuICAgICAgdmFyIHZhbHVlcyA9IHt9LCBzZWxmID0gdGhpcztcbiAgICAgIGZvckVhY2goc2VsZi4kJGtleXMoKSwgZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhbHVlc1trZXldID0gc2VsZltrZXldLnZhbHVlKHBhcmFtVmFsdWVzICYmIHBhcmFtVmFsdWVzW2tleV0pO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH0sXG4gICAgJCRlcXVhbHM6IGZ1bmN0aW9uKHBhcmFtVmFsdWVzMSwgcGFyYW1WYWx1ZXMyKSB7XG4gICAgICB2YXIgZXF1YWwgPSB0cnVlLCBzZWxmID0gdGhpcztcbiAgICAgIGZvckVhY2goc2VsZi4kJGtleXMoKSwgZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBsZWZ0ID0gcGFyYW1WYWx1ZXMxICYmIHBhcmFtVmFsdWVzMVtrZXldLCByaWdodCA9IHBhcmFtVmFsdWVzMiAmJiBwYXJhbVZhbHVlczJba2V5XTtcbiAgICAgICAgaWYgKCFzZWxmW2tleV0udHlwZS5lcXVhbHMobGVmdCwgcmlnaHQpKSBlcXVhbCA9IGZhbHNlO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gZXF1YWw7XG4gICAgfSxcbiAgICAkJHZhbGlkYXRlczogZnVuY3Rpb24gJCR2YWxpZGF0ZShwYXJhbVZhbHVlcykge1xuICAgICAgdmFyIHJlc3VsdCA9IHRydWUsIGlzT3B0aW9uYWwsIHZhbCwgcGFyYW0sIHNlbGYgPSB0aGlzO1xuXG4gICAgICBmb3JFYWNoKHRoaXMuJCRrZXlzKCksIGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBwYXJhbSA9IHNlbGZba2V5XTtcbiAgICAgICAgdmFsID0gcGFyYW1WYWx1ZXNba2V5XTtcbiAgICAgICAgaXNPcHRpb25hbCA9ICF2YWwgJiYgcGFyYW0uaXNPcHRpb25hbDtcbiAgICAgICAgcmVzdWx0ID0gcmVzdWx0ICYmIChpc09wdGlvbmFsIHx8ICEhcGFyYW0udHlwZS5pcyh2YWwpKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgICQkcGFyZW50OiB1bmRlZmluZWRcbiAgfTtcblxuICB0aGlzLlBhcmFtU2V0ID0gUGFyYW1TZXQ7XG59XG5cbi8vIFJlZ2lzdGVyIGFzIGEgcHJvdmlkZXIgc28gaXQncyBhdmFpbGFibGUgdG8gb3RoZXIgcHJvdmlkZXJzXG5hbmd1bGFyLm1vZHVsZSgndWkucm91dGVyLnV0aWwnKS5wcm92aWRlcignJHVybE1hdGNoZXJGYWN0b3J5JywgJFVybE1hdGNoZXJGYWN0b3J5KTtcbmFuZ3VsYXIubW9kdWxlKCd1aS5yb3V0ZXIudXRpbCcpLnJ1bihbJyR1cmxNYXRjaGVyRmFjdG9yeScsIGZ1bmN0aW9uKCR1cmxNYXRjaGVyRmFjdG9yeSkgeyB9XSk7XG4iXSwiZmlsZSI6InNjcmlwdHMvdmVuZG9ycy9hbmd1bGFyLXVpLXJvdXRlci9zcmMvdXJsTWF0Y2hlckZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==