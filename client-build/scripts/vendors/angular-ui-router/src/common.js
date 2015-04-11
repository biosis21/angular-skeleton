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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL3ZlbmRvcnMvYW5ndWxhci11aS1yb3V0ZXIvc3JjL2NvbW1vbi5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKmpzaGludCBnbG9iYWxzdHJpY3Q6dHJ1ZSovXG4vKmdsb2JhbCBhbmd1bGFyOmZhbHNlKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIGlzRGVmaW5lZCA9IGFuZ3VsYXIuaXNEZWZpbmVkLFxuICAgIGlzRnVuY3Rpb24gPSBhbmd1bGFyLmlzRnVuY3Rpb24sXG4gICAgaXNTdHJpbmcgPSBhbmd1bGFyLmlzU3RyaW5nLFxuICAgIGlzT2JqZWN0ID0gYW5ndWxhci5pc09iamVjdCxcbiAgICBpc0FycmF5ID0gYW5ndWxhci5pc0FycmF5LFxuICAgIGZvckVhY2ggPSBhbmd1bGFyLmZvckVhY2gsXG4gICAgZXh0ZW5kID0gYW5ndWxhci5leHRlbmQsXG4gICAgY29weSA9IGFuZ3VsYXIuY29weTtcblxuZnVuY3Rpb24gaW5oZXJpdChwYXJlbnQsIGV4dHJhKSB7XG4gIHJldHVybiBleHRlbmQobmV3IChleHRlbmQoZnVuY3Rpb24oKSB7fSwgeyBwcm90b3R5cGU6IHBhcmVudCB9KSkoKSwgZXh0cmEpO1xufVxuXG5mdW5jdGlvbiBtZXJnZShkc3QpIHtcbiAgZm9yRWFjaChhcmd1bWVudHMsIGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogIT09IGRzdCkge1xuICAgICAgZm9yRWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgaWYgKCFkc3QuaGFzT3duUHJvcGVydHkoa2V5KSkgZHN0W2tleV0gPSB2YWx1ZTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBkc3Q7XG59XG5cbi8qKlxuICogRmluZHMgdGhlIGNvbW1vbiBhbmNlc3RvciBwYXRoIGJldHdlZW4gdHdvIHN0YXRlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZmlyc3QgVGhlIGZpcnN0IHN0YXRlLlxuICogQHBhcmFtIHtPYmplY3R9IHNlY29uZCBUaGUgc2Vjb25kIHN0YXRlLlxuICogQHJldHVybiB7QXJyYXl9IFJldHVybnMgYW4gYXJyYXkgb2Ygc3RhdGUgbmFtZXMgaW4gZGVzY2VuZGluZyBvcmRlciwgbm90IGluY2x1ZGluZyB0aGUgcm9vdC5cbiAqL1xuZnVuY3Rpb24gYW5jZXN0b3JzKGZpcnN0LCBzZWNvbmQpIHtcbiAgdmFyIHBhdGggPSBbXTtcblxuICBmb3IgKHZhciBuIGluIGZpcnN0LnBhdGgpIHtcbiAgICBpZiAoZmlyc3QucGF0aFtuXSAhPT0gc2Vjb25kLnBhdGhbbl0pIGJyZWFrO1xuICAgIHBhdGgucHVzaChmaXJzdC5wYXRoW25dKTtcbiAgfVxuICByZXR1cm4gcGF0aDtcbn1cblxuLyoqXG4gKiBJRTgtc2FmZSB3cmFwcGVyIGZvciBgT2JqZWN0LmtleXMoKWAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBBIEphdmFTY3JpcHQgb2JqZWN0LlxuICogQHJldHVybiB7QXJyYXl9IFJldHVybnMgdGhlIGtleXMgb2YgdGhlIG9iamVjdCBhcyBhbiBhcnJheS5cbiAqL1xuZnVuY3Rpb24gb2JqZWN0S2V5cyhvYmplY3QpIHtcbiAgaWYgKE9iamVjdC5rZXlzKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iamVjdCk7XG4gIH1cbiAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gIGFuZ3VsYXIuZm9yRWFjaChvYmplY3QsIGZ1bmN0aW9uKHZhbCwga2V5KSB7XG4gICAgcmVzdWx0LnB1c2goa2V5KTtcbiAgfSk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogSUU4LXNhZmUgd3JhcHBlciBmb3IgYEFycmF5LnByb3RvdHlwZS5pbmRleE9mKClgLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IEEgSmF2YVNjcmlwdCBhcnJheS5cbiAqIEBwYXJhbSB7Kn0gdmFsdWUgQSB2YWx1ZSB0byBzZWFyY2ggdGhlIGFycmF5IGZvci5cbiAqIEByZXR1cm4ge051bWJlcn0gUmV0dXJucyB0aGUgYXJyYXkgaW5kZXggdmFsdWUgb2YgYHZhbHVlYCwgb3IgYC0xYCBpZiBub3QgcHJlc2VudC5cbiAqL1xuZnVuY3Rpb24gaW5kZXhPZihhcnJheSwgdmFsdWUpIHtcbiAgaWYgKEFycmF5LnByb3RvdHlwZS5pbmRleE9mKSB7XG4gICAgcmV0dXJuIGFycmF5LmluZGV4T2YodmFsdWUsIE51bWJlcihhcmd1bWVudHNbMl0pIHx8IDApO1xuICB9XG4gIHZhciBsZW4gPSBhcnJheS5sZW5ndGggPj4+IDAsIGZyb20gPSBOdW1iZXIoYXJndW1lbnRzWzJdKSB8fCAwO1xuICBmcm9tID0gKGZyb20gPCAwKSA/IE1hdGguY2VpbChmcm9tKSA6IE1hdGguZmxvb3IoZnJvbSk7XG5cbiAgaWYgKGZyb20gPCAwKSBmcm9tICs9IGxlbjtcblxuICBmb3IgKDsgZnJvbSA8IGxlbjsgZnJvbSsrKSB7XG4gICAgaWYgKGZyb20gaW4gYXJyYXkgJiYgYXJyYXlbZnJvbV0gPT09IHZhbHVlKSByZXR1cm4gZnJvbTtcbiAgfVxuICByZXR1cm4gLTE7XG59XG5cbi8qKlxuICogTWVyZ2VzIGEgc2V0IG9mIHBhcmFtZXRlcnMgd2l0aCBhbGwgcGFyYW1ldGVycyBpbmhlcml0ZWQgYmV0d2VlbiB0aGUgY29tbW9uIHBhcmVudHMgb2YgdGhlXG4gKiBjdXJyZW50IHN0YXRlIGFuZCBhIGdpdmVuIGRlc3RpbmF0aW9uIHN0YXRlLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBjdXJyZW50UGFyYW1zIFRoZSB2YWx1ZSBvZiB0aGUgY3VycmVudCBzdGF0ZSBwYXJhbWV0ZXJzICgkc3RhdGVQYXJhbXMpLlxuICogQHBhcmFtIHtPYmplY3R9IG5ld1BhcmFtcyBUaGUgc2V0IG9mIHBhcmFtZXRlcnMgd2hpY2ggd2lsbCBiZSBjb21wb3NpdGVkIHdpdGggaW5oZXJpdGVkIHBhcmFtcy5cbiAqIEBwYXJhbSB7T2JqZWN0fSAkY3VycmVudCBJbnRlcm5hbCBkZWZpbml0aW9uIG9mIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIGN1cnJlbnQgc3RhdGUuXG4gKiBAcGFyYW0ge09iamVjdH0gJHRvIEludGVybmFsIGRlZmluaXRpb24gb2Ygb2JqZWN0IHJlcHJlc2VudGluZyBzdGF0ZSB0byB0cmFuc2l0aW9uIHRvLlxuICovXG5mdW5jdGlvbiBpbmhlcml0UGFyYW1zKGN1cnJlbnRQYXJhbXMsIG5ld1BhcmFtcywgJGN1cnJlbnQsICR0bykge1xuICB2YXIgcGFyZW50cyA9IGFuY2VzdG9ycygkY3VycmVudCwgJHRvKSwgcGFyZW50UGFyYW1zLCBpbmhlcml0ZWQgPSB7fSwgaW5oZXJpdExpc3QgPSBbXTtcblxuICBmb3IgKHZhciBpIGluIHBhcmVudHMpIHtcbiAgICBpZiAoIXBhcmVudHNbaV0ucGFyYW1zKSBjb250aW51ZTtcbiAgICBwYXJlbnRQYXJhbXMgPSBvYmplY3RLZXlzKHBhcmVudHNbaV0ucGFyYW1zKTtcbiAgICBpZiAoIXBhcmVudFBhcmFtcy5sZW5ndGgpIGNvbnRpbnVlO1xuXG4gICAgZm9yICh2YXIgaiBpbiBwYXJlbnRQYXJhbXMpIHtcbiAgICAgIGlmIChpbmRleE9mKGluaGVyaXRMaXN0LCBwYXJlbnRQYXJhbXNbal0pID49IDApIGNvbnRpbnVlO1xuICAgICAgaW5oZXJpdExpc3QucHVzaChwYXJlbnRQYXJhbXNbal0pO1xuICAgICAgaW5oZXJpdGVkW3BhcmVudFBhcmFtc1tqXV0gPSBjdXJyZW50UGFyYW1zW3BhcmVudFBhcmFtc1tqXV07XG4gICAgfVxuICB9XG4gIHJldHVybiBleHRlbmQoe30sIGluaGVyaXRlZCwgbmV3UGFyYW1zKTtcbn1cblxuLyoqXG4gKiBQZXJmb3JtcyBhIG5vbi1zdHJpY3QgY29tcGFyaXNvbiBvZiB0aGUgc3Vic2V0IG9mIHR3byBvYmplY3RzLCBkZWZpbmVkIGJ5IGEgbGlzdCBvZiBrZXlzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBhIFRoZSBmaXJzdCBvYmplY3QuXG4gKiBAcGFyYW0ge09iamVjdH0gYiBUaGUgc2Vjb25kIG9iamVjdC5cbiAqIEBwYXJhbSB7QXJyYXl9IGtleXMgVGhlIGxpc3Qgb2Yga2V5cyB3aXRoaW4gZWFjaCBvYmplY3QgdG8gY29tcGFyZS4gSWYgdGhlIGxpc3QgaXMgZW1wdHkgb3Igbm90IHNwZWNpZmllZCxcbiAqICAgICAgICAgICAgICAgICAgICAgaXQgZGVmYXVsdHMgdG8gdGhlIGxpc3Qgb2Yga2V5cyBpbiBgYWAuXG4gKiBAcmV0dXJuIHtCb29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUga2V5cyBtYXRjaCwgb3RoZXJ3aXNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGVxdWFsRm9yS2V5cyhhLCBiLCBrZXlzKSB7XG4gIGlmICgha2V5cykge1xuICAgIGtleXMgPSBbXTtcbiAgICBmb3IgKHZhciBuIGluIGEpIGtleXMucHVzaChuKTsgLy8gVXNlZCBpbnN0ZWFkIG9mIE9iamVjdC5rZXlzKCkgZm9yIElFOCBjb21wYXRpYmlsaXR5XG4gIH1cblxuICBmb3IgKHZhciBpPTA7IGk8a2V5cy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBrID0ga2V5c1tpXTtcbiAgICBpZiAoYVtrXSAhPSBiW2tdKSByZXR1cm4gZmFsc2U7IC8vIE5vdCAnPT09JywgdmFsdWVzIGFyZW4ndCBuZWNlc3NhcmlseSBub3JtYWxpemVkXG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgc3Vic2V0IG9mIGFuIG9iamVjdCwgYmFzZWQgb24gYSBsaXN0IG9mIGtleXMuXG4gKlxuICogQHBhcmFtIHtBcnJheX0ga2V5c1xuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlc1xuICogQHJldHVybiB7Qm9vbGVhbn0gUmV0dXJucyBhIHN1YnNldCBvZiBgdmFsdWVzYC5cbiAqL1xuZnVuY3Rpb24gZmlsdGVyQnlLZXlzKGtleXMsIHZhbHVlcykge1xuICB2YXIgZmlsdGVyZWQgPSB7fTtcblxuICBmb3JFYWNoKGtleXMsIGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgZmlsdGVyZWRbbmFtZV0gPSB2YWx1ZXNbbmFtZV07XG4gIH0pO1xuICByZXR1cm4gZmlsdGVyZWQ7XG59XG5cbi8vIGxpa2UgXy5pbmRleEJ5XG4vLyB3aGVuIHlvdSBrbm93IHRoYXQgeW91ciBpbmRleCB2YWx1ZXMgd2lsbCBiZSB1bmlxdWUsIG9yIHlvdSB3YW50IGxhc3Qtb25lLWluIHRvIHdpblxuZnVuY3Rpb24gaW5kZXhCeShhcnJheSwgcHJvcE5hbWUpIHtcbiAgdmFyIHJlc3VsdCA9IHt9O1xuICBmb3JFYWNoKGFycmF5LCBmdW5jdGlvbihpdGVtKSB7XG4gICAgcmVzdWx0W2l0ZW1bcHJvcE5hbWVdXSA9IGl0ZW07XG4gIH0pO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vLyBleHRyYWN0ZWQgZnJvbSB1bmRlcnNjb3JlLmpzXG4vLyBSZXR1cm4gYSBjb3B5IG9mIHRoZSBvYmplY3Qgb25seSBjb250YWluaW5nIHRoZSB3aGl0ZWxpc3RlZCBwcm9wZXJ0aWVzLlxuZnVuY3Rpb24gcGljayhvYmopIHtcbiAgdmFyIGNvcHkgPSB7fTtcbiAgdmFyIGtleXMgPSBBcnJheS5wcm90b3R5cGUuY29uY2F0LmFwcGx5KEFycmF5LnByb3RvdHlwZSwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gIGZvckVhY2goa2V5cywgZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKGtleSBpbiBvYmopIGNvcHlba2V5XSA9IG9ialtrZXldO1xuICB9KTtcbiAgcmV0dXJuIGNvcHk7XG59XG5cbi8vIGV4dHJhY3RlZCBmcm9tIHVuZGVyc2NvcmUuanNcbi8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCBvbWl0dGluZyB0aGUgYmxhY2tsaXN0ZWQgcHJvcGVydGllcy5cbmZ1bmN0aW9uIG9taXQob2JqKSB7XG4gIHZhciBjb3B5ID0ge307XG4gIHZhciBrZXlzID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdC5hcHBseShBcnJheS5wcm90b3R5cGUsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgaWYgKGluZGV4T2Yoa2V5cywga2V5KSA9PSAtMSkgY29weVtrZXldID0gb2JqW2tleV07XG4gIH1cbiAgcmV0dXJuIGNvcHk7XG59XG5cbmZ1bmN0aW9uIHBsdWNrKGNvbGxlY3Rpb24sIGtleSkge1xuICB2YXIgcmVzdWx0ID0gaXNBcnJheShjb2xsZWN0aW9uKSA/IFtdIDoge307XG5cbiAgZm9yRWFjaChjb2xsZWN0aW9uLCBmdW5jdGlvbih2YWwsIGkpIHtcbiAgICByZXN1bHRbaV0gPSBpc0Z1bmN0aW9uKGtleSkgPyBrZXkodmFsKSA6IHZhbFtrZXldO1xuICB9KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZmlsdGVyKGNvbGxlY3Rpb24sIGNhbGxiYWNrKSB7XG4gIHZhciBhcnJheSA9IGlzQXJyYXkoY29sbGVjdGlvbik7XG4gIHZhciByZXN1bHQgPSBhcnJheSA/IFtdIDoge307XG4gIGZvckVhY2goY29sbGVjdGlvbiwgZnVuY3Rpb24odmFsLCBpKSB7XG4gICAgaWYgKGNhbGxiYWNrKHZhbCwgaSkpIHtcbiAgICAgIHJlc3VsdFthcnJheSA/IHJlc3VsdC5sZW5ndGggOiBpXSA9IHZhbDtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBtYXAoY29sbGVjdGlvbiwgY2FsbGJhY2spIHtcbiAgdmFyIHJlc3VsdCA9IGlzQXJyYXkoY29sbGVjdGlvbikgPyBbXSA6IHt9O1xuXG4gIGZvckVhY2goY29sbGVjdGlvbiwgZnVuY3Rpb24odmFsLCBpKSB7XG4gICAgcmVzdWx0W2ldID0gY2FsbGJhY2sodmFsLCBpKTtcbiAgfSk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogQG5nZG9jIG92ZXJ2aWV3XG4gKiBAbmFtZSB1aS5yb3V0ZXIudXRpbFxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogIyB1aS5yb3V0ZXIudXRpbCBzdWItbW9kdWxlXG4gKlxuICogVGhpcyBtb2R1bGUgaXMgYSBkZXBlbmRlbmN5IG9mIG90aGVyIHN1Yi1tb2R1bGVzLiBEbyBub3QgaW5jbHVkZSB0aGlzIG1vZHVsZSBhcyBhIGRlcGVuZGVuY3lcbiAqIGluIHlvdXIgYW5ndWxhciBhcHAgKHVzZSB7QGxpbmsgdWkucm91dGVyfSBtb2R1bGUgaW5zdGVhZCkuXG4gKlxuICovXG5hbmd1bGFyLm1vZHVsZSgndWkucm91dGVyLnV0aWwnLCBbJ25nJ10pO1xuXG4vKipcbiAqIEBuZ2RvYyBvdmVydmlld1xuICogQG5hbWUgdWkucm91dGVyLnJvdXRlclxuICogXG4gKiBAcmVxdWlyZXMgdWkucm91dGVyLnV0aWxcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdWkucm91dGVyLnJvdXRlciBzdWItbW9kdWxlXG4gKlxuICogVGhpcyBtb2R1bGUgaXMgYSBkZXBlbmRlbmN5IG9mIG90aGVyIHN1Yi1tb2R1bGVzLiBEbyBub3QgaW5jbHVkZSB0aGlzIG1vZHVsZSBhcyBhIGRlcGVuZGVuY3lcbiAqIGluIHlvdXIgYW5ndWxhciBhcHAgKHVzZSB7QGxpbmsgdWkucm91dGVyfSBtb2R1bGUgaW5zdGVhZCkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd1aS5yb3V0ZXIucm91dGVyJywgWyd1aS5yb3V0ZXIudXRpbCddKTtcblxuLyoqXG4gKiBAbmdkb2Mgb3ZlcnZpZXdcbiAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZVxuICogXG4gKiBAcmVxdWlyZXMgdWkucm91dGVyLnJvdXRlclxuICogQHJlcXVpcmVzIHVpLnJvdXRlci51dGlsXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHVpLnJvdXRlci5zdGF0ZSBzdWItbW9kdWxlXG4gKlxuICogVGhpcyBtb2R1bGUgaXMgYSBkZXBlbmRlbmN5IG9mIHRoZSBtYWluIHVpLnJvdXRlciBtb2R1bGUuIERvIG5vdCBpbmNsdWRlIHRoaXMgbW9kdWxlIGFzIGEgZGVwZW5kZW5jeVxuICogaW4geW91ciBhbmd1bGFyIGFwcCAodXNlIHtAbGluayB1aS5yb3V0ZXJ9IG1vZHVsZSBpbnN0ZWFkKS5cbiAqIFxuICovXG5hbmd1bGFyLm1vZHVsZSgndWkucm91dGVyLnN0YXRlJywgWyd1aS5yb3V0ZXIucm91dGVyJywgJ3VpLnJvdXRlci51dGlsJ10pO1xuXG4vKipcbiAqIEBuZ2RvYyBvdmVydmlld1xuICogQG5hbWUgdWkucm91dGVyXG4gKlxuICogQHJlcXVpcmVzIHVpLnJvdXRlci5zdGF0ZVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogIyB1aS5yb3V0ZXJcbiAqIFxuICogIyMgVGhlIG1haW4gbW9kdWxlIGZvciB1aS5yb3V0ZXIgXG4gKiBUaGVyZSBhcmUgc2V2ZXJhbCBzdWItbW9kdWxlcyBpbmNsdWRlZCB3aXRoIHRoZSB1aS5yb3V0ZXIgbW9kdWxlLCBob3dldmVyIG9ubHkgdGhpcyBtb2R1bGUgaXMgbmVlZGVkXG4gKiBhcyBhIGRlcGVuZGVuY3kgd2l0aGluIHlvdXIgYW5ndWxhciBhcHAuIFRoZSBvdGhlciBtb2R1bGVzIGFyZSBmb3Igb3JnYW5pemF0aW9uIHB1cnBvc2VzLiBcbiAqXG4gKiBUaGUgbW9kdWxlcyBhcmU6XG4gKiAqIHVpLnJvdXRlciAtIHRoZSBtYWluIFwidW1icmVsbGFcIiBtb2R1bGVcbiAqICogdWkucm91dGVyLnJvdXRlciAtIFxuICogXG4gKiAqWW91J2xsIG5lZWQgdG8gaW5jbHVkZSAqKm9ubHkqKiB0aGlzIG1vZHVsZSBhcyB0aGUgZGVwZW5kZW5jeSB3aXRoaW4geW91ciBhbmd1bGFyIGFwcC4qXG4gKiBcbiAqIDxwcmU+XG4gKiA8IWRvY3R5cGUgaHRtbD5cbiAqIDxodG1sIG5nLWFwcD1cIm15QXBwXCI+XG4gKiA8aGVhZD5cbiAqICAgPHNjcmlwdCBzcmM9XCJqcy9hbmd1bGFyLmpzXCI+PC9zY3JpcHQ+XG4gKiAgIDwhLS0gSW5jbHVkZSB0aGUgdWktcm91dGVyIHNjcmlwdCAtLT5cbiAqICAgPHNjcmlwdCBzcmM9XCJqcy9hbmd1bGFyLXVpLXJvdXRlci5taW4uanNcIj48L3NjcmlwdD5cbiAqICAgPHNjcmlwdD5cbiAqICAgICAvLyAuLi5hbmQgYWRkICd1aS5yb3V0ZXInIGFzIGEgZGVwZW5kZW5jeVxuICogICAgIHZhciBteUFwcCA9IGFuZ3VsYXIubW9kdWxlKCdteUFwcCcsIFsndWkucm91dGVyJ10pO1xuICogICA8L3NjcmlwdD5cbiAqIDwvaGVhZD5cbiAqIDxib2R5PlxuICogPC9ib2R5PlxuICogPC9odG1sPlxuICogPC9wcmU+XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd1aS5yb3V0ZXInLCBbJ3VpLnJvdXRlci5zdGF0ZSddKTtcblxuYW5ndWxhci5tb2R1bGUoJ3VpLnJvdXRlci5jb21wYXQnLCBbJ3VpLnJvdXRlciddKTtcbiJdLCJmaWxlIjoic2NyaXB0cy92ZW5kb3JzL2FuZ3VsYXItdWktcm91dGVyL3NyYy9jb21tb24uanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==