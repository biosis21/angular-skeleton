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


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL3ZlbmRvcnMvYW5ndWxhci11aS1yb3V0ZXIvc3JjL3Jlc29sdmUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbmdkb2Mgb2JqZWN0XG4gKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC4kcmVzb2x2ZVxuICpcbiAqIEByZXF1aXJlcyAkcVxuICogQHJlcXVpcmVzICRpbmplY3RvclxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogTWFuYWdlcyByZXNvbHV0aW9uIG9mIChhY3ljbGljKSBncmFwaHMgb2YgcHJvbWlzZXMuXG4gKi9cbiRSZXNvbHZlLiRpbmplY3QgPSBbJyRxJywgJyRpbmplY3RvciddO1xuZnVuY3Rpb24gJFJlc29sdmUoICAkcSwgICAgJGluamVjdG9yKSB7XG4gIFxuICB2YXIgVklTSVRfSU5fUFJPR1JFU1MgPSAxLFxuICAgICAgVklTSVRfRE9ORSA9IDIsXG4gICAgICBOT1RISU5HID0ge30sXG4gICAgICBOT19ERVBFTkRFTkNJRVMgPSBbXSxcbiAgICAgIE5PX0xPQ0FMUyA9IE5PVEhJTkcsXG4gICAgICBOT19QQVJFTlQgPSBleHRlbmQoJHEud2hlbihOT1RISU5HKSwgeyAkJHByb21pc2VzOiBOT1RISU5HLCAkJHZhbHVlczogTk9USElORyB9KTtcbiAgXG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC4kcmVzb2x2ZSNzdHVkeVxuICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwuJHJlc29sdmVcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFN0dWRpZXMgYSBzZXQgb2YgaW52b2NhYmxlcyB0aGF0IGFyZSBsaWtlbHkgdG8gYmUgdXNlZCBtdWx0aXBsZSB0aW1lcy5cbiAgICogPHByZT5cbiAgICogJHJlc29sdmUuc3R1ZHkoaW52b2NhYmxlcykobG9jYWxzLCBwYXJlbnQsIHNlbGYpXG4gICAqIDwvcHJlPlxuICAgKiBpcyBlcXVpdmFsZW50IHRvXG4gICAqIDxwcmU+XG4gICAqICRyZXNvbHZlLnJlc29sdmUoaW52b2NhYmxlcywgbG9jYWxzLCBwYXJlbnQsIHNlbGYpXG4gICAqIDwvcHJlPlxuICAgKiBidXQgdGhlIGZvcm1lciBpcyBtb3JlIGVmZmljaWVudCAoaW4gZmFjdCBgcmVzb2x2ZWAganVzdCBjYWxscyBgc3R1ZHlgIFxuICAgKiBpbnRlcm5hbGx5KS5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGludm9jYWJsZXMgSW52b2NhYmxlIG9iamVjdHNcbiAgICogQHJldHVybiB7ZnVuY3Rpb259IGEgZnVuY3Rpb24gdG8gcGFzcyBpbiBsb2NhbHMsIHBhcmVudCBhbmQgc2VsZlxuICAgKi9cbiAgdGhpcy5zdHVkeSA9IGZ1bmN0aW9uIChpbnZvY2FibGVzKSB7XG4gICAgaWYgKCFpc09iamVjdChpbnZvY2FibGVzKSkgdGhyb3cgbmV3IEVycm9yKFwiJ2ludm9jYWJsZXMnIG11c3QgYmUgYW4gb2JqZWN0XCIpO1xuICAgIHZhciBpbnZvY2FibGVLZXlzID0gb2JqZWN0S2V5cyhpbnZvY2FibGVzIHx8IHt9KTtcbiAgICBcbiAgICAvLyBQZXJmb3JtIGEgdG9wb2xvZ2ljYWwgc29ydCBvZiBpbnZvY2FibGVzIHRvIGJ1aWxkIGFuIG9yZGVyZWQgcGxhblxuICAgIHZhciBwbGFuID0gW10sIGN5Y2xlID0gW10sIHZpc2l0ZWQgPSB7fTtcbiAgICBmdW5jdGlvbiB2aXNpdCh2YWx1ZSwga2V5KSB7XG4gICAgICBpZiAodmlzaXRlZFtrZXldID09PSBWSVNJVF9ET05FKSByZXR1cm47XG4gICAgICBcbiAgICAgIGN5Y2xlLnB1c2goa2V5KTtcbiAgICAgIGlmICh2aXNpdGVkW2tleV0gPT09IFZJU0lUX0lOX1BST0dSRVNTKSB7XG4gICAgICAgIGN5Y2xlLnNwbGljZSgwLCBpbmRleE9mKGN5Y2xlLCBrZXkpKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ3ljbGljIGRlcGVuZGVuY3k6IFwiICsgY3ljbGUuam9pbihcIiAtPiBcIikpO1xuICAgICAgfVxuICAgICAgdmlzaXRlZFtrZXldID0gVklTSVRfSU5fUFJPR1JFU1M7XG4gICAgICBcbiAgICAgIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICAgICAgcGxhbi5wdXNoKGtleSwgWyBmdW5jdGlvbigpIHsgcmV0dXJuICRpbmplY3Rvci5nZXQodmFsdWUpOyB9XSwgTk9fREVQRU5ERU5DSUVTKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwYXJhbXMgPSAkaW5qZWN0b3IuYW5ub3RhdGUodmFsdWUpO1xuICAgICAgICBmb3JFYWNoKHBhcmFtcywgZnVuY3Rpb24gKHBhcmFtKSB7XG4gICAgICAgICAgaWYgKHBhcmFtICE9PSBrZXkgJiYgaW52b2NhYmxlcy5oYXNPd25Qcm9wZXJ0eShwYXJhbSkpIHZpc2l0KGludm9jYWJsZXNbcGFyYW1dLCBwYXJhbSk7XG4gICAgICAgIH0pO1xuICAgICAgICBwbGFuLnB1c2goa2V5LCB2YWx1ZSwgcGFyYW1zKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgY3ljbGUucG9wKCk7XG4gICAgICB2aXNpdGVkW2tleV0gPSBWSVNJVF9ET05FO1xuICAgIH1cbiAgICBmb3JFYWNoKGludm9jYWJsZXMsIHZpc2l0KTtcbiAgICBpbnZvY2FibGVzID0gY3ljbGUgPSB2aXNpdGVkID0gbnVsbDsgLy8gcGxhbiBpcyBhbGwgdGhhdCdzIHJlcXVpcmVkXG4gICAgXG4gICAgZnVuY3Rpb24gaXNSZXNvbHZlKHZhbHVlKSB7XG4gICAgICByZXR1cm4gaXNPYmplY3QodmFsdWUpICYmIHZhbHVlLnRoZW4gJiYgdmFsdWUuJCRwcm9taXNlcztcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChsb2NhbHMsIHBhcmVudCwgc2VsZikge1xuICAgICAgaWYgKGlzUmVzb2x2ZShsb2NhbHMpICYmIHNlbGYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzZWxmID0gcGFyZW50OyBwYXJlbnQgPSBsb2NhbHM7IGxvY2FscyA9IG51bGw7XG4gICAgICB9XG4gICAgICBpZiAoIWxvY2FscykgbG9jYWxzID0gTk9fTE9DQUxTO1xuICAgICAgZWxzZSBpZiAoIWlzT2JqZWN0KGxvY2FscykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiJ2xvY2FscycgbXVzdCBiZSBhbiBvYmplY3RcIik7XG4gICAgICB9ICAgICAgIFxuICAgICAgaWYgKCFwYXJlbnQpIHBhcmVudCA9IE5PX1BBUkVOVDtcbiAgICAgIGVsc2UgaWYgKCFpc1Jlc29sdmUocGFyZW50KSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCIncGFyZW50JyBtdXN0IGJlIGEgcHJvbWlzZSByZXR1cm5lZCBieSAkcmVzb2x2ZS5yZXNvbHZlKClcIik7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIFRvIGNvbXBsZXRlIHRoZSBvdmVyYWxsIHJlc29sdXRpb24sIHdlIGhhdmUgdG8gd2FpdCBmb3IgdGhlIHBhcmVudFxuICAgICAgLy8gcHJvbWlzZSBhbmQgZm9yIHRoZSBwcm9taXNlIGZvciBlYWNoIGludm9rYWJsZSBpbiBvdXIgcGxhbi5cbiAgICAgIHZhciByZXNvbHV0aW9uID0gJHEuZGVmZXIoKSxcbiAgICAgICAgICByZXN1bHQgPSByZXNvbHV0aW9uLnByb21pc2UsXG4gICAgICAgICAgcHJvbWlzZXMgPSByZXN1bHQuJCRwcm9taXNlcyA9IHt9LFxuICAgICAgICAgIHZhbHVlcyA9IGV4dGVuZCh7fSwgbG9jYWxzKSxcbiAgICAgICAgICB3YWl0ID0gMSArIHBsYW4ubGVuZ3RoLzMsXG4gICAgICAgICAgbWVyZ2VkID0gZmFsc2U7XG4gICAgICAgICAgXG4gICAgICBmdW5jdGlvbiBkb25lKCkge1xuICAgICAgICAvLyBNZXJnZSBwYXJlbnQgdmFsdWVzIHdlIGhhdmVuJ3QgZ290IHlldCBhbmQgcHVibGlzaCBvdXIgb3duICQkdmFsdWVzXG4gICAgICAgIGlmICghLS13YWl0KSB7XG4gICAgICAgICAgaWYgKCFtZXJnZWQpIG1lcmdlKHZhbHVlcywgcGFyZW50LiQkdmFsdWVzKTsgXG4gICAgICAgICAgcmVzdWx0LiQkdmFsdWVzID0gdmFsdWVzO1xuICAgICAgICAgIHJlc3VsdC4kJHByb21pc2VzID0gcmVzdWx0LiQkcHJvbWlzZXMgfHwgdHJ1ZTsgLy8ga2VlcCBmb3IgaXNSZXNvbHZlKClcbiAgICAgICAgICBkZWxldGUgcmVzdWx0LiQkaW5oZXJpdGVkVmFsdWVzO1xuICAgICAgICAgIHJlc29sdXRpb24ucmVzb2x2ZSh2YWx1ZXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIGZhaWwocmVhc29uKSB7XG4gICAgICAgIHJlc3VsdC4kJGZhaWx1cmUgPSByZWFzb247XG4gICAgICAgIHJlc29sdXRpb24ucmVqZWN0KHJlYXNvbik7XG4gICAgICB9XG5cbiAgICAgIC8vIFNob3J0LWNpcmN1aXQgaWYgcGFyZW50IGhhcyBhbHJlYWR5IGZhaWxlZFxuICAgICAgaWYgKGlzRGVmaW5lZChwYXJlbnQuJCRmYWlsdXJlKSkge1xuICAgICAgICBmYWlsKHBhcmVudC4kJGZhaWx1cmUpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgICAgXG4gICAgICBpZiAocGFyZW50LiQkaW5oZXJpdGVkVmFsdWVzKSB7XG4gICAgICAgIG1lcmdlKHZhbHVlcywgb21pdChwYXJlbnQuJCRpbmhlcml0ZWRWYWx1ZXMsIGludm9jYWJsZUtleXMpKTtcbiAgICAgIH1cblxuICAgICAgLy8gTWVyZ2UgcGFyZW50IHZhbHVlcyBpZiB0aGUgcGFyZW50IGhhcyBhbHJlYWR5IHJlc29sdmVkLCBvciBtZXJnZVxuICAgICAgLy8gcGFyZW50IHByb21pc2VzIGFuZCB3YWl0IGlmIHRoZSBwYXJlbnQgcmVzb2x2ZSBpcyBzdGlsbCBpbiBwcm9ncmVzcy5cbiAgICAgIGV4dGVuZChwcm9taXNlcywgcGFyZW50LiQkcHJvbWlzZXMpO1xuICAgICAgaWYgKHBhcmVudC4kJHZhbHVlcykge1xuICAgICAgICBtZXJnZWQgPSBtZXJnZSh2YWx1ZXMsIG9taXQocGFyZW50LiQkdmFsdWVzLCBpbnZvY2FibGVLZXlzKSk7XG4gICAgICAgIHJlc3VsdC4kJGluaGVyaXRlZFZhbHVlcyA9IG9taXQocGFyZW50LiQkdmFsdWVzLCBpbnZvY2FibGVLZXlzKTtcbiAgICAgICAgZG9uZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHBhcmVudC4kJGluaGVyaXRlZFZhbHVlcykge1xuICAgICAgICAgIHJlc3VsdC4kJGluaGVyaXRlZFZhbHVlcyA9IG9taXQocGFyZW50LiQkaW5oZXJpdGVkVmFsdWVzLCBpbnZvY2FibGVLZXlzKTtcbiAgICAgICAgfSAgICAgICAgXG4gICAgICAgIHBhcmVudC50aGVuKGRvbmUsIGZhaWwpO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBQcm9jZXNzIGVhY2ggaW52b2NhYmxlIGluIHRoZSBwbGFuLCBidXQgaWdub3JlIGFueSB3aGVyZSBhIGxvY2FsIG9mIHRoZSBzYW1lIG5hbWUgZXhpc3RzLlxuICAgICAgZm9yICh2YXIgaT0wLCBpaT1wbGFuLmxlbmd0aDsgaTxpaTsgaSs9Mykge1xuICAgICAgICBpZiAobG9jYWxzLmhhc093blByb3BlcnR5KHBsYW5baV0pKSBkb25lKCk7XG4gICAgICAgIGVsc2UgaW52b2tlKHBsYW5baV0sIHBsYW5baSsxXSwgcGxhbltpKzJdKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gaW52b2tlKGtleSwgaW52b2NhYmxlLCBwYXJhbXMpIHtcbiAgICAgICAgLy8gQ3JlYXRlIGEgZGVmZXJyZWQgZm9yIHRoaXMgaW52b2NhdGlvbi4gRmFpbHVyZXMgd2lsbCBwcm9wYWdhdGUgdG8gdGhlIHJlc29sdXRpb24gYXMgd2VsbC5cbiAgICAgICAgdmFyIGludm9jYXRpb24gPSAkcS5kZWZlcigpLCB3YWl0UGFyYW1zID0gMDtcbiAgICAgICAgZnVuY3Rpb24gb25mYWlsdXJlKHJlYXNvbikge1xuICAgICAgICAgIGludm9jYXRpb24ucmVqZWN0KHJlYXNvbik7XG4gICAgICAgICAgZmFpbChyZWFzb24pO1xuICAgICAgICB9XG4gICAgICAgIC8vIFdhaXQgZm9yIGFueSBwYXJhbWV0ZXIgdGhhdCB3ZSBoYXZlIGEgcHJvbWlzZSBmb3IgKGVpdGhlciBmcm9tIHBhcmVudCBvciBmcm9tIHRoaXNcbiAgICAgICAgLy8gcmVzb2x2ZTsgaW4gdGhhdCBjYXNlIHN0dWR5KCkgd2lsbCBoYXZlIG1hZGUgc3VyZSBpdCdzIG9yZGVyZWQgYmVmb3JlIHVzIGluIHRoZSBwbGFuKS5cbiAgICAgICAgZm9yRWFjaChwYXJhbXMsIGZ1bmN0aW9uIChkZXApIHtcbiAgICAgICAgICBpZiAocHJvbWlzZXMuaGFzT3duUHJvcGVydHkoZGVwKSAmJiAhbG9jYWxzLmhhc093blByb3BlcnR5KGRlcCkpIHtcbiAgICAgICAgICAgIHdhaXRQYXJhbXMrKztcbiAgICAgICAgICAgIHByb21pc2VzW2RlcF0udGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgIHZhbHVlc1tkZXBdID0gcmVzdWx0O1xuICAgICAgICAgICAgICBpZiAoISgtLXdhaXRQYXJhbXMpKSBwcm9jZWVkKCk7XG4gICAgICAgICAgICB9LCBvbmZhaWx1cmUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghd2FpdFBhcmFtcykgcHJvY2VlZCgpO1xuICAgICAgICBmdW5jdGlvbiBwcm9jZWVkKCkge1xuICAgICAgICAgIGlmIChpc0RlZmluZWQocmVzdWx0LiQkZmFpbHVyZSkpIHJldHVybjtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgaW52b2NhdGlvbi5yZXNvbHZlKCRpbmplY3Rvci5pbnZva2UoaW52b2NhYmxlLCBzZWxmLCB2YWx1ZXMpKTtcbiAgICAgICAgICAgIGludm9jYXRpb24ucHJvbWlzZS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgdmFsdWVzW2tleV0gPSByZXN1bHQ7XG4gICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgIH0sIG9uZmFpbHVyZSk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgb25mYWlsdXJlKGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBQdWJsaXNoIHByb21pc2Ugc3luY2hyb25vdXNseTsgaW52b2NhdGlvbnMgZnVydGhlciBkb3duIGluIHRoZSBwbGFuIG1heSBkZXBlbmQgb24gaXQuXG4gICAgICAgIHByb21pc2VzW2tleV0gPSBpbnZvY2F0aW9uLnByb21pc2U7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcbiAgXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgdWkucm91dGVyLnV0aWwuJHJlc29sdmUjcmVzb2x2ZVxuICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwuJHJlc29sdmVcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFJlc29sdmVzIGEgc2V0IG9mIGludm9jYWJsZXMuIEFuIGludm9jYWJsZSBpcyBhIGZ1bmN0aW9uIHRvIGJlIGludm9rZWQgdmlhIFxuICAgKiBgJGluamVjdG9yLmludm9rZSgpYCwgYW5kIGNhbiBoYXZlIGFuIGFyYml0cmFyeSBudW1iZXIgb2YgZGVwZW5kZW5jaWVzLiBcbiAgICogQW4gaW52b2NhYmxlIGNhbiBlaXRoZXIgcmV0dXJuIGEgdmFsdWUgZGlyZWN0bHksXG4gICAqIG9yIGEgYCRxYCBwcm9taXNlLiBJZiBhIHByb21pc2UgaXMgcmV0dXJuZWQgaXQgd2lsbCBiZSByZXNvbHZlZCBhbmQgdGhlIFxuICAgKiByZXN1bHRpbmcgdmFsdWUgd2lsbCBiZSB1c2VkIGluc3RlYWQuIERlcGVuZGVuY2llcyBvZiBpbnZvY2FibGVzIGFyZSByZXNvbHZlZCBcbiAgICogKGluIHRoaXMgb3JkZXIgb2YgcHJlY2VkZW5jZSlcbiAgICpcbiAgICogLSBmcm9tIHRoZSBzcGVjaWZpZWQgYGxvY2Fsc2BcbiAgICogLSBmcm9tIGFub3RoZXIgaW52b2NhYmxlIHRoYXQgaXMgcGFydCBvZiB0aGlzIGAkcmVzb2x2ZWAgY2FsbFxuICAgKiAtIGZyb20gYW4gaW52b2NhYmxlIHRoYXQgaXMgaW5oZXJpdGVkIGZyb20gYSBgcGFyZW50YCBjYWxsIHRvIGAkcmVzb2x2ZWAgXG4gICAqICAgKG9yIHJlY3Vyc2l2ZWx5XG4gICAqIC0gZnJvbSBhbnkgYW5jZXN0b3IgYCRyZXNvbHZlYCBvZiB0aGF0IHBhcmVudCkuXG4gICAqXG4gICAqIFRoZSByZXR1cm4gdmFsdWUgb2YgYCRyZXNvbHZlYCBpcyBhIHByb21pc2UgZm9yIGFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIFxuICAgKiAoaW4gdGhpcyBvcmRlciBvZiBwcmVjZWRlbmNlKVxuICAgKlxuICAgKiAtIGFueSBgbG9jYWxzYCAoaWYgc3BlY2lmaWVkKVxuICAgKiAtIHRoZSByZXNvbHZlZCByZXR1cm4gdmFsdWVzIG9mIGFsbCBpbmplY3RhYmxlc1xuICAgKiAtIGFueSB2YWx1ZXMgaW5oZXJpdGVkIGZyb20gYSBgcGFyZW50YCBjYWxsIHRvIGAkcmVzb2x2ZWAgKGlmIHNwZWNpZmllZClcbiAgICpcbiAgICogVGhlIHByb21pc2Ugd2lsbCByZXNvbHZlIGFmdGVyIHRoZSBgcGFyZW50YCBwcm9taXNlIChpZiBhbnkpIGFuZCBhbGwgcHJvbWlzZXMgXG4gICAqIHJldHVybmVkIGJ5IGluamVjdGFibGVzIGhhdmUgYmVlbiByZXNvbHZlZC4gSWYgYW55IGludm9jYWJsZSBcbiAgICogKG9yIGAkaW5qZWN0b3IuaW52b2tlYCkgdGhyb3dzIGFuIGV4Y2VwdGlvbiwgb3IgaWYgYSBwcm9taXNlIHJldHVybmVkIGJ5IGFuIFxuICAgKiBpbnZvY2FibGUgaXMgcmVqZWN0ZWQsIHRoZSBgJHJlc29sdmVgIHByb21pc2UgaXMgaW1tZWRpYXRlbHkgcmVqZWN0ZWQgd2l0aCB0aGUgXG4gICAqIHNhbWUgZXJyb3IuIEEgcmVqZWN0aW9uIG9mIGEgYHBhcmVudGAgcHJvbWlzZSAoaWYgc3BlY2lmaWVkKSB3aWxsIGxpa2V3aXNlIGJlIFxuICAgKiBwcm9wYWdhdGVkIGltbWVkaWF0ZWx5LiBPbmNlIHRoZSBgJHJlc29sdmVgIHByb21pc2UgaGFzIGJlZW4gcmVqZWN0ZWQsIG5vIFxuICAgKiBmdXJ0aGVyIGludm9jYWJsZXMgd2lsbCBiZSBjYWxsZWQuXG4gICAqIFxuICAgKiBDeWNsaWMgZGVwZW5kZW5jaWVzIGJldHdlZW4gaW52b2NhYmxlcyBhcmUgbm90IHBlcm1pdHRlZCBhbmQgd2lsbCBjYXVlcyBgJHJlc29sdmVgXG4gICAqIHRvIHRocm93IGFuIGVycm9yLiBBcyBhIHNwZWNpYWwgY2FzZSwgYW4gaW5qZWN0YWJsZSBjYW4gZGVwZW5kIG9uIGEgcGFyYW1ldGVyIFxuICAgKiB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgdGhlIGluamVjdGFibGUsIHdoaWNoIHdpbGwgYmUgZnVsZmlsbGVkIGZyb20gdGhlIGBwYXJlbnRgIFxuICAgKiBpbmplY3RhYmxlIG9mIHRoZSBzYW1lIG5hbWUuIFRoaXMgYWxsb3dzIGluaGVyaXRlZCB2YWx1ZXMgdG8gYmUgZGVjb3JhdGVkLiBcbiAgICogTm90ZSB0aGF0IGluIHRoaXMgY2FzZSBhbnkgb3RoZXIgaW5qZWN0YWJsZSBpbiB0aGUgc2FtZSBgJHJlc29sdmVgIHdpdGggdGhlIHNhbWVcbiAgICogZGVwZW5kZW5jeSB3b3VsZCBzZWUgdGhlIGRlY29yYXRlZCB2YWx1ZSwgbm90IHRoZSBpbmhlcml0ZWQgdmFsdWUuXG4gICAqXG4gICAqIE5vdGUgdGhhdCBtaXNzaW5nIGRlcGVuZGVuY2llcyAtLSB1bmxpa2UgY3ljbGljIGRlcGVuZGVuY2llcyAtLSB3aWxsIGNhdXNlIGFuIFxuICAgKiAoYXN5bmNocm9ub3VzKSByZWplY3Rpb24gb2YgdGhlIGAkcmVzb2x2ZWAgcHJvbWlzZSByYXRoZXIgdGhhbiBhIChzeW5jaHJvbm91cykgXG4gICAqIGV4Y2VwdGlvbi5cbiAgICpcbiAgICogSW52b2NhYmxlcyBhcmUgaW52b2tlZCBlYWdlcmx5IGFzIHNvb24gYXMgYWxsIGRlcGVuZGVuY2llcyBhcmUgYXZhaWxhYmxlLiBcbiAgICogVGhpcyBpcyB0cnVlIGV2ZW4gZm9yIGRlcGVuZGVuY2llcyBpbmhlcml0ZWQgZnJvbSBhIGBwYXJlbnRgIGNhbGwgdG8gYCRyZXNvbHZlYC5cbiAgICpcbiAgICogQXMgYSBzcGVjaWFsIGNhc2UsIGFuIGludm9jYWJsZSBjYW4gYmUgYSBzdHJpbmcsIGluIHdoaWNoIGNhc2UgaXQgaXMgdGFrZW4gdG8gXG4gICAqIGJlIGEgc2VydmljZSBuYW1lIHRvIGJlIHBhc3NlZCB0byBgJGluamVjdG9yLmdldCgpYC4gVGhpcyBpcyBzdXBwb3J0ZWQgcHJpbWFyaWx5IFxuICAgKiBmb3IgYmFja3dhcmRzLWNvbXBhdGliaWxpdHkgd2l0aCB0aGUgYHJlc29sdmVgIHByb3BlcnR5IG9mIGAkcm91dGVQcm92aWRlcmAgXG4gICAqIHJvdXRlcy5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGludm9jYWJsZXMgZnVuY3Rpb25zIHRvIGludm9rZSBvciBcbiAgICogYCRpbmplY3RvcmAgc2VydmljZXMgdG8gZmV0Y2guXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBsb2NhbHMgIHZhbHVlcyB0byBtYWtlIGF2YWlsYWJsZSB0byB0aGUgaW5qZWN0YWJsZXNcbiAgICogQHBhcmFtIHtvYmplY3R9IHBhcmVudCAgYSBwcm9taXNlIHJldHVybmVkIGJ5IGFub3RoZXIgY2FsbCB0byBgJHJlc29sdmVgLlxuICAgKiBAcGFyYW0ge29iamVjdH0gc2VsZiAgdGhlIGB0aGlzYCBmb3IgdGhlIGludm9rZWQgbWV0aG9kc1xuICAgKiBAcmV0dXJuIHtvYmplY3R9IFByb21pc2UgZm9yIGFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIHRoZSByZXNvbHZlZCByZXR1cm4gdmFsdWVcbiAgICogb2YgYWxsIGludm9jYWJsZXMsIGFzIHdlbGwgYXMgYW55IGluaGVyaXRlZCBhbmQgbG9jYWwgdmFsdWVzLlxuICAgKi9cbiAgdGhpcy5yZXNvbHZlID0gZnVuY3Rpb24gKGludm9jYWJsZXMsIGxvY2FscywgcGFyZW50LCBzZWxmKSB7XG4gICAgcmV0dXJuIHRoaXMuc3R1ZHkoaW52b2NhYmxlcykobG9jYWxzLCBwYXJlbnQsIHNlbGYpO1xuICB9O1xufVxuXG5hbmd1bGFyLm1vZHVsZSgndWkucm91dGVyLnV0aWwnKS5zZXJ2aWNlKCckcmVzb2x2ZScsICRSZXNvbHZlKTtcblxuIl0sImZpbGUiOiJzY3JpcHRzL3ZlbmRvcnMvYW5ndWxhci11aS1yb3V0ZXIvc3JjL3Jlc29sdmUuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==