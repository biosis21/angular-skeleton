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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL3ZlbmRvcnMvYW5ndWxhci11aS1yb3V0ZXIvc3JjL3RlbXBsYXRlRmFjdG9yeS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBuZ2RvYyBvYmplY3RcbiAqIEBuYW1lIHVpLnJvdXRlci51dGlsLiR0ZW1wbGF0ZUZhY3RvcnlcbiAqXG4gKiBAcmVxdWlyZXMgJGh0dHBcbiAqIEByZXF1aXJlcyAkdGVtcGxhdGVDYWNoZVxuICogQHJlcXVpcmVzICRpbmplY3RvclxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogU2VydmljZS4gTWFuYWdlcyBsb2FkaW5nIG9mIHRlbXBsYXRlcy5cbiAqL1xuJFRlbXBsYXRlRmFjdG9yeS4kaW5qZWN0ID0gWyckaHR0cCcsICckdGVtcGxhdGVDYWNoZScsICckaW5qZWN0b3InXTtcbmZ1bmN0aW9uICRUZW1wbGF0ZUZhY3RvcnkoICAkaHR0cCwgICAkdGVtcGxhdGVDYWNoZSwgICAkaW5qZWN0b3IpIHtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci51dGlsLiR0ZW1wbGF0ZUZhY3RvcnkjZnJvbUNvbmZpZ1xuICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwuJHRlbXBsYXRlRmFjdG9yeVxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogQ3JlYXRlcyBhIHRlbXBsYXRlIGZyb20gYSBjb25maWd1cmF0aW9uIG9iamVjdC4gXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgQ29uZmlndXJhdGlvbiBvYmplY3QgZm9yIHdoaWNoIHRvIGxvYWQgYSB0ZW1wbGF0ZS4gXG4gICAqIFRoZSBmb2xsb3dpbmcgcHJvcGVydGllcyBhcmUgc2VhcmNoIGluIHRoZSBzcGVjaWZpZWQgb3JkZXIsIGFuZCB0aGUgZmlyc3Qgb25lIFxuICAgKiB0aGF0IGlzIGRlZmluZWQgaXMgdXNlZCB0byBjcmVhdGUgdGhlIHRlbXBsYXRlOlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IGNvbmZpZy50ZW1wbGF0ZSBodG1sIHN0cmluZyB0ZW1wbGF0ZSBvciBmdW5jdGlvbiB0byBcbiAgICogbG9hZCB2aWEge0BsaW5rIHVpLnJvdXRlci51dGlsLiR0ZW1wbGF0ZUZhY3RvcnkjZnJvbVN0cmluZyBmcm9tU3RyaW5nfS5cbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBjb25maWcudGVtcGxhdGVVcmwgdXJsIHRvIGxvYWQgb3IgYSBmdW5jdGlvbiByZXR1cm5pbmcgXG4gICAqIHRoZSB1cmwgdG8gbG9hZCB2aWEge0BsaW5rIHVpLnJvdXRlci51dGlsLiR0ZW1wbGF0ZUZhY3RvcnkjZnJvbVVybCBmcm9tVXJsfS5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY29uZmlnLnRlbXBsYXRlUHJvdmlkZXIgZnVuY3Rpb24gdG8gaW52b2tlIHZpYSBcbiAgICoge0BsaW5rIHVpLnJvdXRlci51dGlsLiR0ZW1wbGF0ZUZhY3RvcnkjZnJvbVByb3ZpZGVyIGZyb21Qcm92aWRlcn0uXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgIFBhcmFtZXRlcnMgdG8gcGFzcyB0byB0aGUgdGVtcGxhdGUgZnVuY3Rpb24uXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBsb2NhbHMgTG9jYWxzIHRvIHBhc3MgdG8gYGludm9rZWAgaWYgdGhlIHRlbXBsYXRlIGlzIGxvYWRlZCBcbiAgICogdmlhIGEgYHRlbXBsYXRlUHJvdmlkZXJgLiBEZWZhdWx0cyB0byBgeyBwYXJhbXM6IHBhcmFtcyB9YC5cbiAgICpcbiAgICogQHJldHVybiB7c3RyaW5nfG9iamVjdH0gIFRoZSB0ZW1wbGF0ZSBodG1sIGFzIGEgc3RyaW5nLCBvciBhIHByb21pc2UgZm9yIFxuICAgKiB0aGF0IHN0cmluZyxvciBgbnVsbGAgaWYgbm8gdGVtcGxhdGUgaXMgY29uZmlndXJlZC5cbiAgICovXG4gIHRoaXMuZnJvbUNvbmZpZyA9IGZ1bmN0aW9uIChjb25maWcsIHBhcmFtcywgbG9jYWxzKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIGlzRGVmaW5lZChjb25maWcudGVtcGxhdGUpID8gdGhpcy5mcm9tU3RyaW5nKGNvbmZpZy50ZW1wbGF0ZSwgcGFyYW1zKSA6XG4gICAgICBpc0RlZmluZWQoY29uZmlnLnRlbXBsYXRlVXJsKSA/IHRoaXMuZnJvbVVybChjb25maWcudGVtcGxhdGVVcmwsIHBhcmFtcykgOlxuICAgICAgaXNEZWZpbmVkKGNvbmZpZy50ZW1wbGF0ZVByb3ZpZGVyKSA/IHRoaXMuZnJvbVByb3ZpZGVyKGNvbmZpZy50ZW1wbGF0ZVByb3ZpZGVyLCBwYXJhbXMsIGxvY2FscykgOlxuICAgICAgbnVsbFxuICAgICk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC4kdGVtcGxhdGVGYWN0b3J5I2Zyb21TdHJpbmdcbiAgICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLiR0ZW1wbGF0ZUZhY3RvcnlcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIENyZWF0ZXMgYSB0ZW1wbGF0ZSBmcm9tIGEgc3RyaW5nIG9yIGEgZnVuY3Rpb24gcmV0dXJuaW5nIGEgc3RyaW5nLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHRlbXBsYXRlIGh0bWwgdGVtcGxhdGUgYXMgYSBzdHJpbmcgb3IgZnVuY3Rpb24gdGhhdCBcbiAgICogcmV0dXJucyBhbiBodG1sIHRlbXBsYXRlIGFzIGEgc3RyaW5nLlxuICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIFBhcmFtZXRlcnMgdG8gcGFzcyB0byB0aGUgdGVtcGxhdGUgZnVuY3Rpb24uXG4gICAqXG4gICAqIEByZXR1cm4ge3N0cmluZ3xvYmplY3R9IFRoZSB0ZW1wbGF0ZSBodG1sIGFzIGEgc3RyaW5nLCBvciBhIHByb21pc2UgZm9yIHRoYXQgXG4gICAqIHN0cmluZy5cbiAgICovXG4gIHRoaXMuZnJvbVN0cmluZyA9IGZ1bmN0aW9uICh0ZW1wbGF0ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIGlzRnVuY3Rpb24odGVtcGxhdGUpID8gdGVtcGxhdGUocGFyYW1zKSA6IHRlbXBsYXRlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgdWkucm91dGVyLnV0aWwuJHRlbXBsYXRlRmFjdG9yeSNmcm9tVXJsXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC4kdGVtcGxhdGVGYWN0b3J5XG4gICAqIFxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogTG9hZHMgYSB0ZW1wbGF0ZSBmcm9tIHRoZSBhIFVSTCB2aWEgYCRodHRwYCBhbmQgYCR0ZW1wbGF0ZUNhY2hlYC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd8RnVuY3Rpb259IHVybCB1cmwgb2YgdGhlIHRlbXBsYXRlIHRvIGxvYWQsIG9yIGEgZnVuY3Rpb24gXG4gICAqIHRoYXQgcmV0dXJucyBhIHVybC5cbiAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyBQYXJhbWV0ZXJzIHRvIHBhc3MgdG8gdGhlIHVybCBmdW5jdGlvbi5cbiAgICogQHJldHVybiB7c3RyaW5nfFByb21pc2UuPHN0cmluZz59IFRoZSB0ZW1wbGF0ZSBodG1sIGFzIGEgc3RyaW5nLCBvciBhIHByb21pc2UgXG4gICAqIGZvciB0aGF0IHN0cmluZy5cbiAgICovXG4gIHRoaXMuZnJvbVVybCA9IGZ1bmN0aW9uICh1cmwsIHBhcmFtcykge1xuICAgIGlmIChpc0Z1bmN0aW9uKHVybCkpIHVybCA9IHVybChwYXJhbXMpO1xuICAgIGlmICh1cmwgPT0gbnVsbCkgcmV0dXJuIG51bGw7XG4gICAgZWxzZSByZXR1cm4gJGh0dHBcbiAgICAgICAgLmdldCh1cmwsIHsgY2FjaGU6ICR0ZW1wbGF0ZUNhY2hlLCBoZWFkZXJzOiB7IEFjY2VwdDogJ3RleHQvaHRtbCcgfX0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7IHJldHVybiByZXNwb25zZS5kYXRhOyB9KTtcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci51dGlsLiR0ZW1wbGF0ZUZhY3RvcnkjZnJvbVByb3ZpZGVyXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC4kdGVtcGxhdGVGYWN0b3J5XG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBDcmVhdGVzIGEgdGVtcGxhdGUgYnkgaW52b2tpbmcgYW4gaW5qZWN0YWJsZSBwcm92aWRlciBmdW5jdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gcHJvdmlkZXIgRnVuY3Rpb24gdG8gaW52b2tlIHZpYSBgJGluamVjdG9yLmludm9rZWBcbiAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyBQYXJhbWV0ZXJzIGZvciB0aGUgdGVtcGxhdGUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBsb2NhbHMgTG9jYWxzIHRvIHBhc3MgdG8gYGludm9rZWAuIERlZmF1bHRzIHRvIFxuICAgKiBgeyBwYXJhbXM6IHBhcmFtcyB9YC5cbiAgICogQHJldHVybiB7c3RyaW5nfFByb21pc2UuPHN0cmluZz59IFRoZSB0ZW1wbGF0ZSBodG1sIGFzIGEgc3RyaW5nLCBvciBhIHByb21pc2UgXG4gICAqIGZvciB0aGF0IHN0cmluZy5cbiAgICovXG4gIHRoaXMuZnJvbVByb3ZpZGVyID0gZnVuY3Rpb24gKHByb3ZpZGVyLCBwYXJhbXMsIGxvY2Fscykge1xuICAgIHJldHVybiAkaW5qZWN0b3IuaW52b2tlKHByb3ZpZGVyLCBudWxsLCBsb2NhbHMgfHwgeyBwYXJhbXM6IHBhcmFtcyB9KTtcbiAgfTtcbn1cblxuYW5ndWxhci5tb2R1bGUoJ3VpLnJvdXRlci51dGlsJykuc2VydmljZSgnJHRlbXBsYXRlRmFjdG9yeScsICRUZW1wbGF0ZUZhY3RvcnkpO1xuIl0sImZpbGUiOiJzY3JpcHRzL3ZlbmRvcnMvYW5ndWxhci11aS1yb3V0ZXIvc3JjL3RlbXBsYXRlRmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9