Rush
===

LRU cache for busy apps in a hurry.

Rush is designed for apps fetching and accessing data with high asynchronous concurrency. It is useful if you want fast in-memory caching for data being fetched from an external resource.

When you want to fetch data from somewhere, using `rush.get` will fetch the data, and cache the result. If an error was passed to the fetcher's callback, then this is also cached. Subsequent calls will use cached data from the LRU until it expires.

# Install

    npm install node-rush

# Usage

```javascript

var Rush = require('node-rush');

// Create a new cache
var cache = Rush();

var fetchRow = function(id, cb) {
  var fetch = function(done) {
    /**
     * This is our function to fetch data from a resource.
     * The results of this function are cached by rush.
     *
     * It is wise to set a timeout on your fetch, so that
     * it calls `done` with an error if it takes too long
     * to complete. This is useful in case your external
     * resource is overloaded and being slow. If configured,
     * rush will cache this error and prevent overloading the
     * resource with more fetches.
     */
    // Example: querying a mysql db
    mysql.query({
      sql: 'SELECT thing FROM things WHERE id = ? LIMIT 1',
      timeout: 5000
    }, [id], done);
  };

  var key = 'appName:component:'+id;
  cache.get(key, fetch, cb);
};

// get a row
fetchRow(1, function(err, row) {
  // called async with cached or
  // freshly fetched data
});
```

# API

## Create

```javascript
var cache = Rush(opts);
```

### Options

```javascript
var opts = {
  max: 100000,    // max number of cached results
  maxAge: 600000, // max age of cached results
  errTTL: 5000,   // max age of cached error results
  timeout: 5000   // min time before callback queue reset
};
```

## cache.get(key, fetch, [cb])

Fetch an item by its `key` from the cache. If it doesn't exist, call `fetch` to retrieve it. The results of `fetch` are cached under `key`. If the results include an `err`, the ttl of `key` is decided by the `errTTL` option.

## cache.del(key)
## cache.ttl(key, ttl)

Add / update ttl on `key`

## cache.clearTTL(key)

Remove ttl from `key`. Persists until cache `maxAge`

## cache.reset()

Empty all cached results.
