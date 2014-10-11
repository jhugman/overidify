var test = require('tap').test;

var facets = require('../lib/facet-map'),
    Map = facets.Ctor,
    rules = require('../lib/facet-rules'); 

var config = rules.create({
    platform: {
      android: ['android', 'webview'],
      ios: ['ios', 'webview'],
      web: ['web']
    },

    buildType: ['dev', 'test', 'stage']
  });


test('Filtering a directory listing using a compound set of rules', function (t) {
  // function findBestFile(stem, dirListing, options, config)



  var dirListing = [
     'a', 'a.android', 'a.webview',
     'b', 'b.stage', 'b.test', 
     'c', 'c.android.stage', 'c.web', 'c.stage'
  ];
  var file;

  file = facets.resolve('a', dirListing, {
    platform: 'android',
    buildType: 'dev'
  }, config);
  t.equal(file, 'a.android');

  file = facets.resolve('a', dirListing, {
    platform: 'android',
    buildType: 'test'
  }, config);
  t.equal(file, 'a.android');

  file = facets.resolve('a', dirListing, {
    platform: 'ios',
    buildType: 'test'
  }, config);
  t.equal(file, 'a.webview');

  file = facets.resolve('a', dirListing, {
    platform: 'web',
    buildType: 'test'
  }, config);
  t.equal(file, 'a');

  ////////////////////////////////////////////
  // 'b', 'b.stage', 'b.test', 

  file = facets.resolve('b', dirListing, {
    platform: 'android',
    buildType: 'dev'
  }, config);
  t.equal(file, 'b');

  file = facets.resolve('b', dirListing, {
    platform: 'android',
    buildType: 'stage'
  }, config);
  t.equal(file, 'b.stage');

  file = facets.resolve('b', dirListing, {
    platform: 'ios',
    buildType: 'test'
  }, config);
  t.equal(file, 'b.test');

  file = facets.resolve('b', dirListing, {
    platform: 'web',
    buildType: 'dev'
  }, config);
  t.equal(file, 'b');

  ////////////////////////////////////////////
  // 'c', 'c.android.stage', 'c.web', 'c.stage'

  file = facets.resolve('c', dirListing, {
    platform: 'ios',
    buildType: 'test'
  }, config);
  t.equal(file, 'c');

  file = facets.resolve('c', dirListing, {
    platform: 'ios',
    buildType: 'stage'
  }, config);
  t.equal(file, 'c.stage');

  file = facets.resolve('c', dirListing, {
    platform: 'android',
    buildType: 'stage'
  }, config);
  t.equal(file, 'c.android.stage');

  t.end();
});

test('Filtering a directory listing using a compound set of rules, error conditions', function (t) {
  // function findBestFile(stem, dirListing, options, config)

  var dirListing = [
     'a', 'a.android', 'a.webview',
     'b', 'b.stage', 'b.test', 
     'c', 'c.android.stage', 'c.web', 'c.stage',
     'd.stage', 'd.dev', 'd.test'
  ];
  var file;


  t.throws(function () {
    // legitimately unresolved  
    file = facets.resolve('c', dirListing, {
      platform: 'web',
      buildType: 'stage'
    }, config);
    // this could be c.web or c.stage
    // Note that matching both .android.stage is more selective than .stage
  });

  t.throws(function () {
    // legitimately unresolved - there are no files
    file = facets.resolve('missing', dirListing, {
      platform: 'web',
      buildType: 'stage'
    }, config);  
  });


  // should pick the default one. This is contentious.
  // We have options here: 
  // Take the default if available.
  //  * log what we have done when we detect we're making a change
  //    and silently pick the default
  //  * log that we've picked the default out of other options.
  // Or fail loudly even if the default is available.
  file = facets.resolve('b', dirListing, {
      platform: 'android',
  }, config);
  t.equal(file, 'b');

  t.throws(function () {
    // legitimately unresolved - there too many files, we should add another option to the target.
    file = facets.resolve('d', dirListing, {
        platform: 'android',
    }, config);   
    // it is thus impossible to deploy something random by mistake if you miss out the builtType.
  });


  t.end();
});


test('Filtering a directory listing using a compound set of rules, with modifiers in the stem', function (t) {
  // function findBestFile(stem, dirListing, options, config)

  // this is a corner case, but allows one platform specific file to reference another one of 
  // the same substem (in this case a and c).


  var dirListing = [
     'a', 'a.android', 'a.webview',
     'b', 'b.stage', 'b.test', 
     'c', 'c.android.stage', 'c.web', 'c.stage',
     'f.js', 'f-generated.js',
  ];
  var file;

  

  file = facets.resolve('a.webview', dirListing, {
    platform: 'android',
    buildType: 'dev'
  }, config);
  t.equal(file, 'a.webview');

  file = facets.resolve('c.android', dirListing, {
    platform: 'ios',
    buildType: 'stage'
  }, config);
  t.equal(file, 'c.android.stage');

  t.throws(function () {
    file = facets.resolve('c.android', dirListing, {
      platform: 'ios',
      buildType: 'dev'
    }, config);
  });

  file = facets.resolve('f-generated.js', dirListing, {
    platform: 'ios',
    buildType: 'stage'
  }, config);
  t.equal(file, 'f-generated.js');

  t.throws(function () {
    // we can't do this at this level.
    file = facets.resolve('f', dirListing, {
      platform: 'ios',
      buildType: 'stage'
    }, config);
    t.equal(file, 'f.js');
  });

  t.end();
});

test('Filtering a directory listing using a compound set of rules', function (t) {
  // function findBestFile(stem, dirListing, options, config)


  var dirListing = [
     'a', 'a-android', 'a-webview',
     'b', 'b-stage', 'b-test', 
     'c', 'c-android-stage', 'c-web', 'c-stage'
  ];
  var file;

  file = facets.resolve('a', dirListing, {
    platform: 'android',
    buildType: 'dev'
  }, config);
  t.equal(file, 'a-android');

  file = facets.resolve('a', dirListing, {
    platform: 'web',
    buildType: 'test'
  }, config);
  t.equal(file, 'a');

  ////////////////////////////////////////////
  // 'b', 'b.stage', 'b.test', 

  file = facets.resolve('b', dirListing, {
    platform: 'android',
    buildType: 'dev'
  }, config);
  t.equal(file, 'b');

  file = facets.resolve('b', dirListing, {
    platform: 'android',
    buildType: 'stage'
  }, config);
  t.equal(file, 'b-stage');

  ////////////////////////////////////////////
  // 'c', 'c.android.stage', 'c.web', 'c.stage'

  file = facets.resolve('c', dirListing, {
    platform: 'android',
    buildType: 'stage'
  }, config);
  t.equal(file, 'c-android-stage');

  t.end();
});