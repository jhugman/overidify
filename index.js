"use strict";
var _ = require('underscore'),
    transformTools = require('browserify-transform-tools'),
    fileFinder = require('./lib/file-selection'),
    defaultConfig = require('./lib/defaults'),
    options = {
      platform: 'android',
      flavor: 'dev'
    };

var transform = transformTools.makeRequireTransform("overidify",
  {
    jsFilesOnly: true, 
    evaluateArguments: true
  },
  function(args, opts, cb) {
    var requiredFile = args[0];
    if (requiredFile[0] === '.') {
        var file;
        try {
          file = fileFinder(opts.file, requiredFile, options, defaultConfig);
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