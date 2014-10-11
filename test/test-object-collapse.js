var test = require('tap').test,
    facetMap = require('../lib/facet-map'),
    rules = require('../lib/facet-rules'),
    collapse = facetMap.collapse;

var config = rules.create({
  platform: {
    'android': ['android', 'webview'],
    'ios': ['ios', 'webview']
  },

  flavor: ['dev', 'prod'],
});

test('Copy a shallow copy', function (t) {

  var options = {
    platform: 'android',
    flavor: 'dev'
  };

  var start, observed;

  start = {
    foo: 1,
    bar: 2,
    array: [3,4,5]
  };

  observed = collapse(start, config);

  t.deepEquals(observed, start);

  t.end();
});



test('Copy a deeper copy', function (t) {

  var options = {
    platform: 'android',
    flavor: 'dev'
  };

  var start, observed;

  start = {
    foo: 1,
    bar: 2,
    array: [3,4,5],
    opt: {
      android: 6,
      ios: 7
    },
    android: {
      path: 8
    },
    ios: {
      path: 9
    },
  };

  observed = collapse(start, config);

  t.deepEquals(observed, {
    foo: 1,
    bar: 2,
    array: [3,4,5],
    'opt.android': 6, 
    'opt.ios': 7,
    'path.android': 8,
    'path.ios': 9
  });

  t.end();
});

test('Real deep', function (t) {

  var options = {
    platform: 'android',
    flavor: 'dev'
  };

  var start, observed;

  start = {
    android: {
      dev: {
        path: 1,
        build: 2,
      },
      prod: {
        path: 3,
        build: 4,
      }
    },
    ios: {
      dev: {
        path: 5,
        build: 6,
      },
      prod: {
        path: 7,
        build: 8,
      }
    },
  };

  observed = collapse(start, config);

  t.deepEquals(observed, {
    'path.android.dev': 1,
    'build.android.dev': 2,
    'path.android.prod': 3,
    'build.android.prod': 4,
    'path.ios.dev': 5,
    'build.ios.dev': 6,
    'path.ios.prod': 7,
    'build.ios.prod': 8,
  });

  start = {
    command: {
      build: {
        android: 1,
        ios: 2
      },
      test: {
        android: 3,
        ios: 4
      }
    },
  };

  observed = collapse(start, config);

  t.deepEquals(observed, {
    'command.build.android': 1,
    'command.build.ios': 2,
    'command.test.android': 3,
    'command.test.ios': 4,
  });




  t.end();
});

