var lockingCache = require('locking-cache');
var lruCache     = require('lru-cache');
var objectMerge  = require('object-merge');
var debug        = require('debug')('rush');

var createCache = function(opts){
  var conf = {
    lruCache: {
      max: 10000,
      maxAge: 600000
    },
    errCache: {
      max: 10000,
      maxAge: 5000
    },
    log: debug
  };

  conf = objectMerge(conf, opts || {});

  var log = conf.log;
  var cache = lruCache(conf.lruCache);
  var errCache = lruCache(conf.errCache);

  var lockedFetch = lockingCache(function(){
    return cache;
  }, conf.lockingCache);

  var rush = {};
  var expires = {};

  rush.expire = function(key, timeout){
    if (expires[key]){
      clearTimeout(expires[key]);
    }

    if (!timeout) return cache.del(key);

    expires[key] = setTimeout(cache.del.bind(cache, key), timeout);
  };

  rush.del = function(key) {
    cache.del(key);
  };

  rush.get = function(key) {
    cache.get(key);
  };

  rush.lru = cache;
  rush.errLru = errCache;

  /**
   * Generate core fetcher function.
   * rush.lockedFetch signature:
   *  function (key, fetchFn, cb)
   */
  rush.lockedFetch = lockedFetch(function(key, fetch, lock){
    var err;
    log('get');

    lock(key, function(unlock){
      log('lock');

      // First check the error cache for the key
      if ((err = errCache.get(key))){
        log('errCache:hit');
        // Immediately unlock with error
        return unlock(err);
      }

      log('fetch');
      // Invoke the fetching function
      fetch(function(err){
        // If err during fetching, cache it
        if (err) {
          errCache.set(key, err);
          log('errCache:set');
        }

        log('unlock');
        // Unlock with results of fetch
        unlock.apply(unlock, arguments);
      });
    });
  });

  return rush;
};

module.exports = createCache;
