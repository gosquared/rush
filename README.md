Rush
===

LRU cache for busy apps in a hurry.

Rush is designed for apps fetching and accessing data with high asynchronous concurrency. It is useful if you want fast in-memory caching for data being fetched from an external resource.

When you want to fetch data from somewhere, using `rush.lockedFetch` will fetch the data, and cache the result. If an error was passed to the fetcher's callback, then this is also cached. Subsequent calls to `rush.lockedFetch` will use cached data from the LRU until it expires.

# Install

    npm install node-rush

# Usage

```javascript

// Most options listed here for reference but you can omit them
var opts = {
  lruCache: {
    max: 10000,
    maxAge: 600000
  },
  errCache: {
    max: 10000,
    maxAge: 5000
  },
  lockingCache: {
    maxCallbacks: 1000
  }
};

var rush = require('node-rush')(opts);

var fetcher = function(done) {
  // Your code to fetch data here.
  // Could be a db query, fs.readFile, anything async...
  process.setImmediate(function() {
    done(null, 'a fake result');
  })
};

var done = function(err, result) {
  if (err) {
    // Something went wrong fetching data.
    return;
  }

  // Do something with result
  console.log(result);

  // This next call will hit results cached from the previous call
  // Therefore fetcher will not be invoked
  // Instead, done is invoked with the cached result or error
  rush.lockedFetch('test', fetcher, function(err, results) {
    // Cached err, results
  });
};

rush.lockedFetch('test', fetcher, done);
```
