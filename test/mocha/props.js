var assert = require("assert");

var adapter = require("../../js/bluebird_debug.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

var Promise = fulfilled().constructor;

Promise.prototype.progress = Promise.prototype.progressed;


var Q = function(p) {
    if( p.then ) return p;
    return fulfilled(p);
};

Q.progress = function(p, cb) {
    return Q(p).then(null, null, cb);
};

Q.when = function() {
    return Q(arguments[0]).then(arguments[1], arguments[2], arguments[3]);
};
var freeMs;
function resolver( fulfill ) {
    setTimeout(fulfill, freeMs );
};

Q.delay = function(ms) {
    freeMs = ms;
    return new Promise(resolver);
};

Q.defer = function() {
    var ret = pending();
    return {
        reject: function(a){
            return ret.reject(a)
        },
        resolve: function(a) {
            return ret.fulfill(a);
        },

        notify: function(a) {
            return ret.progress(a);
        },

        promise: ret.promise
    };
};

Q.all = Promise.all;

describe("Promise.props", function () {

    specify("should resolve undefined to undefined", function(done) {
        adapter.props().then(function(v){
            assert( v === void 0 );
            done();
        });
    });

    specify("should resolve primitive to primitive", function(done) {
        adapter.props("str").then(function(v){
            assert( v === "str" );
            done();
        });
    });

    specify("should resolve to new object", function(done) {
        var o = {};
        adapter.props(o).then(function(v){
            assert( v !== o );
            assert.deepEqual(o, v);
            done();
        });
    });

    specify("should resolve value properties", function(done) {
        var o = {
            one: 1,
            two: 2,
            three: 3
        };
        adapter.props(o).then(function(v){
            assert.deepEqual({
                one: 1,
                two: 2,
                three: 3
            }, v);
            done();
        });
    });

    specify("should resolve immediate properties", function(done) {
        var o = {
            one: fulfilled(1),
            two: fulfilled(2),
            three: fulfilled(3)
        };
        adapter.props(o).then(function(v){
            assert.deepEqual({
                one: 1,
                two: 2,
                three: 3
            }, v);
            done();
        });
    });

    specify("should resolve eventual properties", function(done) {
        var d1 = pending(),
            d2 = pending(),
            d3 = pending();
        var o = {
            one: d1.promise,
            two: d2.promise,
            three: d3.promise
        };
        adapter.props(o).then(function(v){
            assert.deepEqual({
                one: 1,
                two: 2,
                three: 3
            }, v);
            done();
        });

        setTimeout(function(){
            d1.fulfill(1);
            d2.fulfill(2);
            d3.fulfill(3);
        }, 13);
    });

    specify("should reject if any input promise rejects", function(done) {
        var o = {
            one: fulfilled(1),
            two: rejected(2),
            three: fulfilled(3)
        };
        adapter.props(o).then(assert.fail, function(v){
            assert( v === 2 );
            done();
        });
    });

    specify("should accept a promise for an object", function(done) {
         var o = {
            one: fulfilled(1),
            two: fulfilled(2),
            three: fulfilled(3)
        };
        var d1 = pending();
        adapter.props(d1.promise).then(function(v){
            assert.deepEqual({
                one: 1,
                two: 2,
                three: 3
            }, v);
            done();
        });
        setTimeout(function(){
            d1.fulfill(o);
        }, 13);
    });

    specify("should accept a promise for a primitive", function(done) {
        var d1 = pending();
        adapter.props(d1.promise).then(function(v){
            assert(v === "text");
            done();
        });
        setTimeout(function(){
            d1.fulfill("text");
        }, 13);
    });

    specify("should accept thenables in properties", function(done) {
        var t1 = {then: function(cb){cb(1);}};
        var t2 = {then: function(cb){cb(2);}};
        var t3 = {then: function(cb){cb(3);}};
        var o = {
            one: t1,
            two: t2,
            three: t3
        };
        adapter.props(o).then(function(v){
            assert.deepEqual({
                one: 1,
                two: 2,
                three: 3
            }, v);
            done();
        });
    });

    specify("sends { key, value } progress updates", function(done) {
        var deferred1 = Q.defer();
        var deferred2 = Q.defer();

        var progressValues = [];

        Q.delay(50).then(function () {
            deferred1.notify("a");
        });
        Q.delay(100).then(function () {
            deferred2.notify("b");
            deferred2.resolve();
        });
        Q.delay(150).then(function () {
            deferred1.notify("c");
            deferred1.resolve();
        });

        adapter.props({
            one: deferred1.promise,
            two: deferred2.promise
        }).then(function () {
            assert.deepEqual(progressValues, [
                { key: "one", value: "a" },
                { key: "two", value: "b" },
                { key: "one", value: "c" }
            ]);
            done();
        },
        undefined,
        function (progressValue) {
            progressValues.push(progressValue);
        });
    });

    specify("treats arrays for their properties", function(done) {
        var o = [1,2,3];

        adapter.props(o).then(function(v){
            assert.deepEqual({
                0: 1,
                1: 2,
                2: 3
            }, v);
            done();
        });
    });

});
