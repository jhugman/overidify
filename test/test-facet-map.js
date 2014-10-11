var test = require('tap').test;

var facets = require('../lib/facet-map'),
    Map = facets.Ctor,
    rules = require('../lib/facet-rules'); 

var config = rules.create({
  platform: {
    'android': ['android', 'webview'],
    'ios': ['ios', 'webview']
  },
  flavor: ['dev', 'prod'],
});

test('Parses and runs', function (t) {

  var options = {
    platform: 'android',
    flavor: 'dev'
  };

  var map = new Map(options, config, {
    'o1.android': 1,
    'o1.ios': 2,
    'o2.dev': 3,
    'o2.prod': 4,
    'o3.ios.dev': 5,
    'o3.android': 6,
    'o3.android.dev': 7,
    'o3.android.prod': 8,
  });

  t.equal(map.get('o1'), 1);
  t.equal(map.get('o2'), 3);

  t.equal(map.get('o3'), 7);

  t.end();
});


test('Collapsing objects', function (t) {

  var options = {
    platform: 'android',
    flavor: 'prod'
  };

  var map = new Map(options, config, {
    android: {
      dev: {
        o1: 1,
        o2: 2,
        o3: 3
      },
      prod: {
        o1: 4,
        o2: 5,
        o3: 6
      },
    },
    ios: {
      o1: 7,
      o2: 8,
      o3: 9
    }
  });

  t.equal(map.get('o1'), 4);
  t.equal(map.get('o2'), 5);

  t.equal(map.get('o3'), 6);

  t.end();
});