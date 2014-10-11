var test = require('tap').test,
    resolver = require('../lib/facet-map').functions;

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

//  (modifierMap, selector, myPreference, allModifiers, counters)
  var newMap = resolver.filterWithArraySelector(modifierMap, ['stage', 'dev'], 'stage', ['stage', 'dev']);
  t.deepEqual({
    'x.android': ['android'],
    'x.ios': ['ios'], // unfiltered, because it has no stage or dev in it.
    'x.ios.stage': ['ios', 'stage'],
    // 'x.dev': ['dev'], // filtered, 
  }, newMap);

    
  newMap = resolver.filterWithArraySelector(modifierMap, ['stage', 'dev'], 'dev', ['stage', 'dev']);
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

  var allModifiers = ['android', 'ios', 'webview'];

//  (modifierMap, selector, myPreference, allModifiers, counters)
  var newMap = resolver.filterWithObjectSelector(modifierMap, selector, 'android', allModifiers);
  t.deepEqual({
    'x.android': ['android'],
    'x.stage': ['stage'], // passed through untouched
    'x.dev': ['dev'], // passed through untouched
  }, newMap);

  newMap = resolver.filterWithObjectSelector(modifierMap, selector, 'ios', allModifiers);
  t.deepEqual({
    'x.webview': ['webview'], // webview will do in the absence of ios specific.
    'x.stage': ['stage'], // passed through untouched
    'x.dev': ['dev'], // passed through untouched
  }, newMap);

  t.end();
});