var assert = require('assert');
var Rush = require('../lib/rush');

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

    var r = Rush();
    r.get('tea', fetch, testResult);
    r.get('tea', fetch, testResult);
    r.get('tea', fetch, done);
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

    var r = Rush({ errTTL: 1 });
    r.get('pug', fetch, testResult);
    r.get('pug', fetch, testResult);
    setTimeout(function() {
      r.get('pug', setImmediate, done); // err cache should have expired
    }, 5);
  });

  it('disposes key ttl when key deleted', function(done) {
    var r = Rush();
    var fetch = function(cb){
      return setImmediate(function() {
        cb(new Error());
      });
    };

    // ttl is set on cached error
    r.get('foo', fetch);

    setImmediate(function() {
      assert(r._timeouts.foo);
      r.del('foo');
      assert(!r._timeouts.foo);
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

    var r = Rush({ timeout: 1 });
    var i = 0;
    r.get('crumpets', fetch, function(err) {
      // receives error when disposed
      assert.equal(err.message, 'timeout');
      // once disposed should not be called again
      assert.equal(++i, 1);
    });
    // next call after queue maxAge ms has passed
    setTimeout(function() {
      r.get('crumpets', fetch);
    }, 5);
  });
});
