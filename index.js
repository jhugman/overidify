"use strict";
var path = require('path'),
    _ = require('lodash'),
    transformTools = require('browserify-transform-tools'),
    fileFinder = require('./lib/file-selection'),
    defaultConfig = require('./overidify-rules'),
    options;

function findOptions (config) {
  if (options) {
    return options;
  }
  options = {};
  var prefix = process.env.OVERIDIFY_PREFIX || '';
  _.each(config, function (i, key) {
    var value = process.env[prefix + key.toUpperCase()];

    if (value) {
      options[key] = value;

    }
  });
  console.log('Using: ' + JSON.stringify(options));
  return options;
}


// 1. Look in package.json for overidify object. 
// 2. If it's a string, use it as a filename to a module.
// 3. If it's an object, use that.
// 4. If it's absent, use defaults.

var transform = transformTools.makeRequireTransform("overidify",
  { 
    evaluateArguments: true
  },
  function(args, opts, cb) {
    var requiredFile = args[0],
        config = opts.config || defaultConfig;
    if (requiredFile[0] === '.') {
        var file;
        try {
          file = fileFinder(opts.file, requiredFile, findOptions(config), config);
          if (file !== requiredFile) {
            console.log('Swapping ' + requiredFile + ' for ' + file);
          }
          cb(null, "require('" + file + "')");
        } catch (e) {
          cb(e.message);
        }
    } else {
        return cb();
    }
  });

module.exports = transform;