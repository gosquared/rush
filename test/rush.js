var assert = require('assert');
var rush = require('../lib/rush');

describe('rush', function (){
  it('queues callbacks and calls them with fetch results', function(done) {
    var testResult = function(err, result) {
      assert(!err);
      assert(result.success, true);
    };

    var n = 0;
    var fetch = function(cb) {
      assert.equal(++n, 1);
      setImmediate(function() {
        cb(null, { success: true });
      });
    };

    var get = rush()(fetch);
    get('tea', testResult);
    get('tea', testResult);
    get('tea', done);
  });

  it('caches errors with configurable ttl', function(done) {
    var testResult = function(err, result) {
      assert(err);
    };

    var n = 0;
    var fetch = function(cb) {
      assert.equal(++n, 1);
      setImmediate(function() {
        cb(new Error('ohno!'));
      });
    };

    var r = rush({ errTTL: 1 });
    var get = r(fetch);
    get('pug', testResult);
    get('pug', testResult);
    setTimeout(function() {
      var get = r(setImmediate);
      get('pug', done); // err cache should have expired
    }, 5);
  });

  it('disposes key ttl when key deleted', function(done) {
    var get = rush()(function(cb){
      return setImmediate(function() {
        cb(new Error());
      });
    });

    // ttl is set on cached error
    get('foo');

    setImmediate(function() {
      assert(get.cache._timeouts.foo);
      get.cache.del('foo');
      assert(!get.cache._timeouts.foo);
      done();
    });
  });

  it('disposes callback queue if fetch duration > queue maxAge', function(done) {
    var fetch = function(cb) {
      setTimeout(function() {
        cb(); // should be no-op as all callbacks disposed
        done();
      }, 10);
    };

    var get = rush({ timeout: 1 })(fetch);
    var i = 0;
    get('crumpets', function(err) {
      // receives error when disposed
      assert.equal(err.message, 'timeout');
      // once disposed should not be called again
      assert.equal(++i, 1);
    });
    // next call after queue maxAge ms has passed
    setTimeout(function() {
      get('crumpets');
    }, 5);
  });
});
