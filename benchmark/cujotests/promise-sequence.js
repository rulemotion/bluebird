//
// Performance of large number of promises chained together
// to compute a final result.  Promises will resolve sequentially
// with no overlap.
//
// If a library supports a lighter weight notion of a promise, that
// will be used instead of a full deferred (which is typically more
// expensive)
//
// Note that jQuery.Deferred.then() is not fully Promises/A compliant
// and so will not compute the correct result.  This is known,
// and should not be a factor in the performance characteristics
// of this test.
//

var libs, Test, test, i, array, iterations, testCases;

libs = require('../cujodep/libs.js');
Test = require('../cujodep/test.js');

iterations = 10000;

array = [];
for(i = 1; i<iterations; i++) {
    array.push(i);
}

test = new Test('promise-sequence', iterations);

test.run(Object.keys(libs).map(function(name) {
    return function() {
        return runTest(name, libs[name]);
    };
}));

function runTest(name, lib) {
    var start;

    // Use reduce to chain <iteration> number of promises back
    // to back.  The final result will only be computed after
    // all promises have resolved

    return array.reduce(function outer(promise, nextVal) {
        return promise.then(function inner(currentVal) {
            // Uncomment if you want progress indication:
            //if(nextVal % 1000 === 0) console.log(name, nextVal);
            return lib.fulfilled(currentVal + nextVal);
        });
    }, lib.fulfilled(0)).then(function () {
        // Start timer
        start = Date.now();
        return array.reduce(function outer(promise, nextVal) {
            return promise.then(function inner(currentVal) {
                // Uncomment if you want progress indication:
                //if(nextVal % 1000 === 0) console.log(name, nextVal);
                return lib.fulfilled(currentVal + nextVal);
            });
        }, lib.fulfilled(0)).then(function () {
            test.addResult(name, Date.now() - start);
        });
    });


}