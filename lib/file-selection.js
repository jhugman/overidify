"use strict";
var _ = require('underscore'),
    path = require('path');

function makeCache (nullValue) {
  var _cache = {};
  return function checkCache(propertyName, fillEmpty) {
    var cached = _cache[propertyName];
    if (cached === undefined) {
      cached = fillEmpty();
      _cache[propertyName] = cached || nullValue;
    }
    return cached;
  };
}

var modifierCache = makeCache([]),
    fileCache = makeCache([]),
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
var functions = {
  resolve: resolveFile,
  findBestFile: findBestFile,

  filterWithObjectSelector: filterWithObjectSelector,
  filterWithArraySelector: filterWithArraySelector,
  
  drainOneSpecific: drainOneSpecific,
  drainNonSelectingModifiers: drainNonSelectingModifiers,
  
  getAllModifiersFromObjectSelector: getAllModifiersFromObjectSelector,
  getAllModifiersFromArraySelector: getAllModifiersFromArraySelector,
  
  getDirListing: getDirListing,
  
  filterByStem: filterByStem,
  createModifierMap: createModifierMap,

  makeCache: makeCache,
  fileCache: fileCache
};

function resolveFile(srcFile, relativeFilePath, options, config) {
  // required file: this may or may not include a .js suffix
  // find the directory and file prefix. 
  // '$DIR/../Environment.js'
  
  // we need to get a directory
  var srcDirectory = path.dirname(srcFile),
      targetDirectory = path.resolve(srcDirectory, path.dirname(relativeFilePath));

  var stem = path.basename(relativeFilePath, '.js');
  var fullPath = path.join(targetDirectory, stem); 

  var targetFile = aliasCache(fullPath, function () {
    var dirListing = functions.getDirListing(targetDirectory, '.js');
    return findBestFile(stem, dirListing, options, config);
  });

  targetFile = path.join(path.dirname(relativeFilePath), targetFile)
  if (targetFile[0] !== '.') {
    targetFile = './' + targetFile;
  }
  return targetFile;
}

function findBestFile(stem, dirListing, options, config) {
  // find all the files that match that file prefix in that directory.
  // this may include looking at a file system.
  var includedFiles = filterByStem(dirListing, stem);

  // make an object of files to modifier lists
  var modifierMap = createModifierMap(includedFiles, stem);
  // modifierMap = {
  //   Environment: [],
  //   Environment-dev: [dev],
  //   Environment-production-ios: [production, ios]
  //}
  var filePaths = modifierMap;

  var counters = {};
  for (var propertyName in options) {
    var selector = config[propertyName],
        cmdLineOption = options[propertyName];
    
    if (!selector) {
      continue;
    } else if (_.isArray(selector)) {
      filePaths = filterWithArraySelector(filePaths, propertyName, cmdLineOption, selector, counters);
    } else if (_.isObject(selector)) {
      filePaths = filterWithObjectSelector(filePaths, propertyName, cmdLineOption, selector, counters);
    }

    if (_.isEmpty(filePaths)) {
      break;
    }
  }

  if (_.isEmpty(filePaths)) {
    throw new Error('No files for ' + stem);
  }

  if (_.size(filePaths) > 1) {
    // try and filter based on counters
    // if lucky, we should be able to get away with one file match
    // that was picked by most filters. i.e. higest specificity.
    var best, bestScore = -1, multipleValues = [];
    _.each(counters, function (i, key) {
        var score = counters[key];
        if (bestScore === score) {
          multipleValues.push(key);
        } else if (score > bestScore) {
          best = key;
          multipleValues = [key];
          bestScore = score;
        }
    });
    // we have only one now
    if (multipleValues.length === 1) {
      return multipleValues[0];
    }

    // now deal with the error cases.
    if (multipleValues.length === 0) {
      // This happens when counters is empty, i.e. none of the files have 
      // been positively selected.
      // All files are said to have matched the filters.
      
      multipleValues = _.keys(filePaths);

      if (filePaths[stem]) {
        // Ugly fallback for developer ergonomics.
        // if the default is available, then use it.
        return stem;
      }
    }

    throw new Error('Too many files for ' + stem + ': ' + JSON.stringify(multipleValues));
  }

  // there should only be one right now.
  return _.keys(filePaths)[0];



  // for each propertyName in options, 
  //   selector = config[propertyName]
  // 
  //     each filter looks at all the available suffixes in the selector.
  //     from all the files in filePaths, the filter should:

  //   if (selector is object)
  //      filePaths = filterWithObjectSelector with value = options[propertyName]
  //
  //   if (selector) is array)
  //      filePaths = filterWithArraySelector with value = options[propertyName]
  // 
  //

  // if filePaths is empty, then we probably have a problem.

  // if filePaths has more than one, then we should probably error.
  // .ios.js vs .dev.js
    // 
}

// propertyName: platform
// preference: android
// selector: config[propertyName]
function filterWithObjectSelector (modifierMap, propertyName, myPreference, selector, counters) {

  // get all possible values from config[propertyName]
  
  var newMap = {},
      allModifiers = getAllModifiersFromObjectSelector(propertyName, selector),
      interestingFiles = drainNonSelectingModifiers(modifierMap, newMap, allModifiers);

  if (myPreference) {
    var expandedPreferences = selector[myPreference]; // a list
    for (var i in expandedPreferences) {
      // mod = 'webview'
      var modifier = expandedPreferences[i];
      var found = drainOneSpecific(modifierMap, newMap, interestingFiles, modifier, counters);

      if (found) {
        break;
      }
    }
  }
  return newMap;
  // we want to pick one of the expandedPreferences
  // we should include the one we pick based on platform (the more specific wins)

  // we should then filter out from modifierMap the files that have modifiers in allModifiers

  // we should then put back the one we picked if we've picked one, 
  // because this will have been removed.


}



function filterWithArraySelector (modifierMap, propertyName, myPreference, selector, counters) {
  var newMap = {},
      allModifiers = getAllModifiersFromArraySelector(propertyName, selector),
      interestingFiles = drainNonSelectingModifiers(modifierMap, newMap, allModifiers);
  if (myPreference) {
    drainOneSpecific(modifierMap, newMap, interestingFiles, myPreference, counters);
  }

  return newMap;
}

//////////

/* Iterates through the keys of srcMap.
 * 
 * File entries are copied from the srcMap to the destMap.
 *
 * Files entries are copied from the srcMap to the destMap iff at least one 
 * modifier is in the allModifiers array.
 *
 * Returns a list of filenames that have one or more modifiers in the 
 * allModifiers array.
 */
function drainNonSelectingModifiers (srcMap, destMap, allModifiers) {
  var interestingFiles = [];
  _.each(srcMap, function (i, filename) {
    var theFileModifiers = srcMap[filename];

    if (_.isEmpty(_.intersection(theFileModifiers, allModifiers))) {
      destMap[filename] = theFileModifiers;
    } else {
      interestingFiles.push(filename);
    }
  });
  return interestingFiles;
}

/* Iterates through the list interestingFiles.
 * 
 * File entries are copied from the srcMap to the destMap.
 *
 * Files entries are copied from the srcMap to the destMap iff the 
 * specified modifier is present.
 *
 * Returns true if any file entries are copied.
 */
function drainOneSpecific (srcMap, destMap, interestingFiles, specificModifier, counters) {
  var found = false;

  _.each(interestingFiles, function (filename) {
    var theFileModifiers = srcMap[filename];

    if (theFileModifiers.indexOf(specificModifier) >= 0) {
      destMap[filename] = theFileModifiers;
      if (counters) {
        counters[filename] = (counters[filename] || 0) + 1;
      }
      found = true;
    }
  });
  return found;
}

///////////////////////////

function getAllModifiersFromObjectSelector (propertyName, selector) {
  return modifierCache(propertyName, function () {  
    var modifiers = _.chain(selector).values().flatten().uniq().value();
    return modifiers;
  });
}

function getAllModifiersFromArraySelector (propertyName, selector) {
  return selector;
}

/////////////////////////////////////////////////////////////////////////////

function getDirListing (directory, ext) {
  return functions.fileCache(directory, function () {

    var fs = require('fs');

    var files = fs.readdirSync(directory);

    return _.map(files, function (file) {
      return path.basename(file, ext);
    });
  });
}

function filterByStem (dirListing, stem) {
  return _.filter(dirListing, function (f) {
    return f.indexOf(stem) == 0;
  });
}

function createModifierMap (includedFiles, stem) {
  var map = {};
  var stemLength = stem.length;
  for (var f in includedFiles) {
    var file = includedFiles[f];
    var modifiers = file.substring(stemLength).split(/[.-]/);
    map[file] = _.compact(modifiers);
  }
  return map;
}

resolveFile.functions = functions;

module.exports = resolveFile;


// EOF