var test = require('tap').test,
    resolver = require('../lib/file-selection').functions;

var dirStructure = {
  'lib': {},
  'lib/rendering': {},
  'lib/logic': {},
  'lib/storage': {}
}

// var functions = {
//   resolve: resolveFile,
//   findBestFile: findBestFile,

//   filterWithObjectSelector: filterWithObjectSelector,
//   filterWithArraySelector: filterWithArraySelector,
  
//   drainOneSpecific: drainOneSpecific,
//   drainNonSelectingModifiers: drainNonSelectingModifiers,
  
//   getAllModifiersFromObjectSelector: getAllModifiersFromObjectSelector,
//   getAllModifiersFromArraySelector: getAllModifiersFromArraySelector,
  
//   getDirListing: getDirListing,
  
//   filterByStem: filterByStem,
//   createModifierMap: createModifierMap,

//   makeCache: makeCache,
//   fileCache: fileCache
// };


resolver.getDirListing = function (directory, ext) {
  return dirStructure[directory] || [];
};



test('Creating new map from ones not involved in this selector', function (t) {
  
  var modifierMap = {
    'x.android': ['android'],
    'x.ios': ['ios'],
    'x.ios.stage': ['ios', 'stage'],
    'x.dev': ['dev'],
  };
  var newMap = {};
  var interestingFiles = resolver.drainNonSelectingModifiers(modifierMap, newMap, ['android', 'ios']);
  t.deepEqual({ 'x.dev': ['dev'] }, newMap);
  t.deepEqual(['x.android', 'x.ios', 'x.ios.stage'], interestingFiles);

  newMap = {};
  interestingFiles = resolver.drainNonSelectingModifiers(modifierMap, newMap, ['dev', 'stage']);

  t.deepEqual({
    'x.android': ['android'],
    'x.ios': ['ios']
  }, newMap);
  t.deepEqual(['x.ios.stage', 'x.dev'], interestingFiles);

  t.end();
});

test('Creating new map from ones with this specific value', function (t) {
  
  var modifierMap = {
    'x.android': ['android'],
    'x.ios': ['ios'],
    'x.ios.stage': ['ios', 'stage'],
    'x.dev': ['dev'],
  };

  var newMap = {};
  t.ok(resolver.drainOneSpecific(modifierMap, newMap, ['x.android', 'x.ios', 'x.ios.stage'], 'ios'));
  t.deepEqual({
    'x.ios': ['ios'],
    'x.ios.stage': ['ios', 'stage'],
  }, newMap);
  

  newMap = {};
  t.ok(resolver.drainOneSpecific(modifierMap, newMap, ['x.android', 'x.ios', 'x.ios.stage'], 'android'));
  t.deepEqual({
    'x.android': ['android'],
  }, newMap);
  
  t.end();
});

test('Filtering based a "zero or one of a list" rule', function (t) {
  // 
  // function filterWithArraySelector (modifierMap, propertyName, myPreference, selector)

  var modifierMap = {
    'x.android': ['android'],
    'x.ios': ['ios'],
    'x.ios.stage': ['ios', 'stage'],
    'x.dev': ['dev'],
  };

  var newMap = resolver.filterWithArraySelector(modifierMap, '', 'stage', ['stage', 'dev']);
  t.deepEqual({
    'x.android': ['android'],
    'x.ios': ['ios'], // unfiltered, because it has no stage or dev in it.
    'x.ios.stage': ['ios', 'stage'],
    // 'x.dev': ['dev'], // filtered, 
  }, newMap);

    
  newMap = resolver.filterWithArraySelector(modifierMap, '', 'dev', ['stage', 'dev']);
  t.deepEqual({
    'x.android': ['android'],
    'x.ios': ['ios'], // unfiltered, because it has no stage or dev in it.
    // 'x.ios.stage': ['ios', 'stage'],
    'x.dev': ['dev']
  }, newMap);

  t.end();
});

test('Filtering based a "first in a named list of options" rule', function (t) {
  // 
  // function filterWithObjectSelector (modifierMap, propertyName, myPreference, selector)

  var modifierMap = {
    'x.android': ['android'],
    'x.webview': ['webview'],
    'x.stage': ['stage'],
    'x.dev': ['dev'],
  };

  var selector = {
    'android': ['android', 'webview'], // android is an android, is a webview
    'ios': ['ios', 'webview'] // ios is an ios, is a webview
  };

  var newMap = resolver.filterWithObjectSelector(modifierMap, '', 'android', selector);
  t.deepEqual({
    'x.android': ['android'],
    'x.stage': ['stage'], // passed through untouched
    'x.dev': ['dev'], // passed through untouched
  }, newMap);

  newMap = resolver.filterWithObjectSelector(modifierMap, '', 'ios', selector);
  t.deepEqual({
    'x.webview': ['webview'], // webview will do in the absence of ios specific.
    'x.stage': ['stage'], // passed through untouched
    'x.dev': ['dev'], // passed through untouched
  }, newMap);

  t.end();
});

test('Filtering a directory listing using a compound set of rules', function (t) {
  // function findBestFile(stem, dirListing, options, config)

  var config = {
    platform: {
      android: ['android', 'webview'],
      ios: ['ios', 'webview'],
      web: ['web']
    },

    buildType: ['dev', 'test', 'stage']
  };

  var dirListing = [
     'a', 'a.android', 'a.webview',
     'b', 'b.stage', 'b.test', 
     'c', 'c.android.stage', 'c.web', 'c.stage'
  ];
  var file;

  file = resolver.findBestFile('a', dirListing, {
    platform: 'android',
    buildType: 'dev'
  }, config);
  t.equal(file, 'a.android');

  file = resolver.findBestFile('a', dirListing, {
    platform: 'android',
    buildType: 'test'
  }, config);
  t.equal(file, 'a.android');

  file = resolver.findBestFile('a', dirListing, {
    platform: 'ios',
    buildType: 'test'
  }, config);
  t.equal(file, 'a.webview');

  file = resolver.findBestFile('a', dirListing, {
    platform: 'web',
    buildType: 'test'
  }, config);
  t.equal(file, 'a');

  ////////////////////////////////////////////
  // 'b', 'b.stage', 'b.test', 

  file = resolver.findBestFile('b', dirListing, {
    platform: 'android',
    buildType: 'dev'
  }, config);
  t.equal(file, 'b');

  file = resolver.findBestFile('b', dirListing, {
    platform: 'android',
    buildType: 'stage'
  }, config);
  t.equal(file, 'b.stage');

  file = resolver.findBestFile('b', dirListing, {
    platform: 'ios',
    buildType: 'test'
  }, config);
  t.equal(file, 'b.test');

  file = resolver.findBestFile('b', dirListing, {
    platform: 'web',
    buildType: 'dev'
  }, config);
  t.equal(file, 'b');

  ////////////////////////////////////////////
  // 'c', 'c.android.stage', 'c.web', 'c.stage'

  file = resolver.findBestFile('c', dirListing, {
    platform: 'ios',
    buildType: 'test'
  }, config);
  t.equal(file, 'c');

  file = resolver.findBestFile('c', dirListing, {
    platform: 'ios',
    buildType: 'stage'
  }, config);
  t.equal(file, 'c.stage');

  file = resolver.findBestFile('c', dirListing, {
    platform: 'android',
    buildType: 'stage'
  }, config);
  t.equal(file, 'c.android.stage');

  t.end();
});

test('Filtering a directory listing using a compound set of rules, error conditions', function (t) {
  // function findBestFile(stem, dirListing, options, config)

  var config = {
    platform: {
      android: ['android', 'webview'],
      ios: ['ios', 'webview'],
      web: ['web']
    },

    buildType: ['dev', 'test', 'stage']
  };

  var dirListing = [
     'a', 'a.android', 'a.webview',
     'b', 'b.stage', 'b.test', 
     'c', 'c.android.stage', 'c.web', 'c.stage',
     'd.stage', 'd.dev', 'd.test'
  ];
  var file;


  t.throws(function () {
    // legitimately unresolved  
    file = resolver.findBestFile('c', dirListing, {
      platform: 'web',
      buildType: 'stage'
    }, config);
    // this could be c.web or c.stage
    // Note that matching both .android.stage is more selective than .stage
  });

  t.throws(function () {
    // legitimately unresolved - there are no files
    file = resolver.findBestFile('missing', dirListing, {
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
  file = resolver.findBestFile('b', dirListing, {
      platform: 'android',
  }, config);
  t.equal(file, 'b');

  t.throws(function () {
    // legitimately unresolved - there too many files, we should add another option to the target.
    file = resolver.findBestFile('d', dirListing, {
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

  var config = {
    platform: {
      android: ['android', 'webview'],
      ios: ['ios', 'webview'],
      web: ['web']
    },

    buildType: ['dev', 'test', 'stage']
  };

  var dirListing = [
     'a', 'a.android', 'a.webview',
     'b', 'b.stage', 'b.test', 
     'c', 'c.android.stage', 'c.web', 'c.stage',
     'f.js', 'f-generated.js',
  ];
  var file;

  

  file = resolver.findBestFile('a.webview', dirListing, {
    platform: 'android',
    buildType: 'dev'
  }, config);
  t.equal(file, 'a.webview');

  file = resolver.findBestFile('c.android', dirListing, {
    platform: 'ios',
    buildType: 'stage'
  }, config);
  t.equal(file, 'c.android.stage');

  t.throws(function () {
    file = resolver.findBestFile('c.android', dirListing, {
      platform: 'ios',
      buildType: 'dev'
    }, config);
  });

  file = resolver.findBestFile('f-generated.js', dirListing, {
    platform: 'ios',
    buildType: 'stage'
  }, config);
  t.equal(file, 'f-generated.js');

  t.throws(function () {
    // we can't do this at this level.
    file = resolver.findBestFile('f', dirListing, {
      platform: 'ios',
      buildType: 'stage'
    }, config);
    t.equal(file, 'f.js');
  });

  t.end();
});

test('Filtering a directory listing using a compound set of rules', function (t) {
  // function findBestFile(stem, dirListing, options, config)

  var config = {
    platform: {
      android: ['android', 'webview'],
      ios: ['ios', 'webview'],
      web: ['web']
    },

    buildType: ['dev', 'test', 'stage']
  };

  var dirListing = [
     'a', 'a-android', 'a-webview',
     'b', 'b-stage', 'b-test', 
     'c', 'c-android-stage', 'c-web', 'c-stage'
  ];
  var file;

  file = resolver.findBestFile('a', dirListing, {
    platform: 'android',
    buildType: 'dev'
  }, config);
  t.equal(file, 'a-android');

  file = resolver.findBestFile('a', dirListing, {
    platform: 'web',
    buildType: 'test'
  }, config);
  t.equal(file, 'a');

  ////////////////////////////////////////////
  // 'b', 'b.stage', 'b.test', 

  file = resolver.findBestFile('b', dirListing, {
    platform: 'android',
    buildType: 'dev'
  }, config);
  t.equal(file, 'b');

  file = resolver.findBestFile('b', dirListing, {
    platform: 'android',
    buildType: 'stage'
  }, config);
  t.equal(file, 'b-stage');

  ////////////////////////////////////////////
  // 'c', 'c.android.stage', 'c.web', 'c.stage'

  file = resolver.findBestFile('c', dirListing, {
    platform: 'android',
    buildType: 'stage'
  }, config);
  t.equal(file, 'c-android-stage');

  t.end();
});