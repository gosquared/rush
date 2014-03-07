var should = require('should');

describe('Rush', function(){
  it('responds with error when callback limit reached', function(done){
    var rush = require('../lib/rush')({
      lockingCache: {
        maxCallbacks: 1
      }
    });
    rush.lockedFetch('test', function(){}, function(){});
    rush.lockedFetch('test', function(){}, function(err){
      should.exist(err);
      done();
    });
  })
});
