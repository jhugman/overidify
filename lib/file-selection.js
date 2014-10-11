"use strict";
var _ = require('lodash'),
    path = require('path'),
    mime = require('mime'),
    facets = require('./facet-map'),
    makeCache = require('teeny-cache');


var fileCache = makeCache([]),
    aliasCache = makeCache('');

/*

requiredFile: the name coming out of browserify. 
  // We should be able to 
  // construct a directory and file prefix out of 
  // this.

options: {
    platform: 'ios',
    flavor: 'dev'
},

config: 
{
    // zero or more modifiers.
    // ORDERED_LIST of alternatives
    // In the event of multiple inconsistent modifiers, e.g. 
    // .ios.gecko.js we have at least one of them.
    // i.e. this file would apply to ios AND fxos
    // Where there is a choice between two files, the 
    // first one in the selection list is taken.
    // e.g. 
    // .ios.js is used before .webview.js or default.js
    // If there are platform modifiers we don't have, but there are none we do,
    // then we prefer the default.
    // e.g. .webview.js is not prefered over .js for fxos
  platform: {
    ios: [ios, webview, webkit],
    android: [android, webview, blink, webkit],
    fxos: [fxos, nativejs, gecko],
    desktop-fx: [],
    desktop-chrome: []
  },


    // zero or one modifier in this set
    
  flavor: ['dev', 'debug', 'test', 'stage', 'production' ]
}

*/

function isValidFileExtension (file) {
  return mime.lookup(file) !== 'application/octet-stream';
}

function resolveFile(srcFile, relativeFilePath, options, config) {
  // required file: this may or may not include a .js suffix
  // find the directory and file prefix. 
  // '$DIR/../Environment.js'
  
  // we need to get a directory
  var srcDirectory = path.dirname(srcFile),
      targetDirectory = path.resolve(srcDirectory, path.dirname(relativeFilePath));

  var fileExt = path.extname(relativeFilePath);
  if (!isValidFileExtension(fileExt)) {
    fileExt = undefined;
  }

  var stem = path.basename(relativeFilePath, fileExt);
  var fullPath = path.join(targetDirectory, stem); 

  var targetFile = aliasCache(fullPath, function () {
    var dirListing = getDirListing(targetDirectory, fileExt);
    var file = facets.resolve(stem, dirListing, options, config);
    if (stem !== file) {
      console.log(">> Substituting " + stem + " in favour of " + file);
    }
    return file;
  });

  targetFile = path.join(path.dirname(relativeFilePath), targetFile);
  if (targetFile[0] !== '.') {
    targetFile = ['.', targetFile].join(path.sep);
  }
  return targetFile;
}

/////////////////////////////////////////////////////////////////////////////

function getDirListing (directory, ext) {
  return fileCache(directory, function () {

    var fs = require('fs');

    var files = fs.readdirSync(directory);
    var stripChars = ext;
    
    if (ext) {
      files = _.filter(files, function (file) {
        return path.extname(file) === ext;
      });
    } else {
      // XXX Why just .js files? why not all the other js types e.g. .coffee
      stripChars = '.js';
    }

    return _.map(files, function (file) {
      return path.basename(file, stripChars);
    });
  });
}

var config = undefined;
function getRules (object) {
  if (!config) {
    config = facets.createRules(object); 
  }
  return config;

}

resolveFile.getRules = getRules;

module.exports = resolveFile;


// EOF