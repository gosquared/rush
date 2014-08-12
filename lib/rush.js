var LRU = require('lru-cache');
var slice = Array.prototype.slice;

var dispose = function(k, q) {
  var err = new Error('timeout');
  err.key = k;
  runCallbacks.call(q, err);
};

var runCallbacks = function() {
  var q = this, f;
  while((f = q.pop())) f.apply(null, arguments);
};

var Rush = function constructor(opts){

  var o = this.opts = {
    // Result cache
    max: 100000,    // max number of cached results
    maxAge: 600000, // max age of cached results
    errTTL: 5000,   // max age of cached error results
    timeout: 5000   // min time before callback queue reset
  };

  for (var p in opts) {
    if (!opts.hasOwnProperty(p)) continue;

    o[p] = opts[p];
  }

  this.results = LRU({
    max: o.max,
    maxAge: o.maxAge,
    dispose: this.clearTTL.bind(this) // clear any pending ttl on disposed keys
  });

  this.locks = LRU({
    maxAge: o.timeout, // max ttl of callback queue during fetch
    dispose: dispose
  });

  // hold key deletion timeouts
  this._timeouts = {};
};

var p = Rush.prototype;

p.get = function get(key, fetch, cb) {
  var result, self = this;
  var locks = self.locks, results = self.results;

  // call cb with result immediately when cached
  if ((result = results.get(key))) {
    return setImmediate(function() {
      cb.apply(null, result);
    });
  }

  // check for callback queue
  var q;
  if ((q = locks.get(key))) { // disposes queue if pending too long
    q.push(cb); // add callback to the queue
    return;
  }

  // create new callback queue
  q = [cb];
  locks.set(key, q);

  function receiveResult(err) {
    if (!q.length) return; // only proceed if queue hasn't been disposed
    var args = slice.call(arguments);
    results.set(key, args); // save all result args, including err

    // different ttl on error results
    if (err) self.ttl(key, self.opts.errTTL);

    // iterate callback queue with results + empty
    runCallbacks.apply(q, args);
    // make queue falsy
    locks.del(key);
  }

  // run the fetch
  fetch.call(null, receiveResult);
};

p.del = function del(key) {
  this.results.del(key);
};

p.reset = function reset() {
  this.results.reset();
};

p.ttl = function ttl(key, ttl) {
  var self = this;

  this._timeouts[key] = setTimeout(function() {
    self.del(key);
  }, ttl);
};

p.clearTTL = function clearTTL(key) {
  clearTimeout(this._timeouts[key]);
  delete this._timeouts[key];
};

module.exports = function create(opts) {
  return new Rush(opts);
};
