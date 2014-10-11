'use strict';
var _ = require('lodash');

///////////////////////////////////////////////////////////////
function findBestMatchingKey(stem, allKeys, options, config) {
  // find all the files that match that file prefix in that directory.
  // this may include looking at a file system.
  var includedFiles = filterByStem(allKeys, stem);

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
    var selector = config.getRule(propertyName),
        cmdLineOption = options[propertyName];
    
    if (!selector) {
      continue;
    } 

    var modifiers = config.getModifiersForRule(propertyName);
    if (_.isArray(selector)) {
      filePaths = filterWithArraySelector(filePaths, selector, cmdLineOption, modifiers, counters);
    } else if (_.isObject(selector)) {
      filePaths = filterWithObjectSelector(filePaths, selector, cmdLineOption, modifiers, counters);
    }

    if (_.isEmpty(filePaths)) {
      break;
    }
  }

  // Begin to return. Mostly error reporting.
  if (_.isEmpty(filePaths)) {
    throw new Error('No files for ' + stem);
  }

  // there should only be one right now.
  if (_.size(filePaths) === 1) {
    return _.keys(filePaths)[0];
  }

  
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

  // we have only one now. It has the highest specificity.
  if (multipleValues.length === 1) {
    return multipleValues[0];
  }

  // Now deal with the error cases.
  if (multipleValues.length === 0) {
    // This happens when counters is empty, i.e. none of the files have 
    // been positively selected.
    // All files are said to have matched the filters.
    multipleValues = _.keys(filePaths);

    // Check here if any significant modifiers have been used
    // but not filtered upon. 
    // Assumption that we may be able to suggest adding another thing into options.
    // or use exactly what was specified.
    var onDiskModifiers = config.getModifiersForRule(filePaths);
    var ofInterestModifiers = [],
        propertyNames = [];

    _.each(config, function (i, key) {
      var modifiers = config.getModifiersForRule(key),
          intersection =_.intersection(modifiers, onDiskModifiers);
      if (!_.isEmpty(intersection)) {
        ofInterestModifiers.push(intersection);
        propertyNames.push(key);
      }
    });

    // we should pick the one with the least number of modifiers.
    

    // Ugly fallback for developer ergonomics.
    // if the default is available, then use it.
    var exactMatch = stem;
    if (filePaths[exactMatch]) {
      if (propertyNames.length) {
        // We should probably warn the user that unused modifiers are significant.
        console.warn("Settings for '" + propertyNames.join("', '") + 
          "' would change which of '" + multipleValues.join("', '") + 
          "' are selected");
      }
      return exactMatch;
    }
    
    if (propertyNames.length) {
      throw new Error("Too many files for '" + stem +
        "': '" + multipleValues.join("', '") + 
        "'. Set one or more of '" + propertyNames.join("', '") + 
        "'");
    }

  }

  throw new Error("Too many files for '" + stem + "': '" + multipleValues.join("', '") + "'");


}

// propertyName: platform
// preference: android
// selector: config[propertyName]
function filterWithObjectSelector (modifierMap, selector, myPreference, allModifiers, counters) {

  // get all possible values from config[propertyName]
  
  var newMap = {},
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

// filterWithArraySelector(filePaths, selector, cmdLineOption, modifiers, counters);

function filterWithArraySelector (modifierMap, selector, myPreference, allModifiers, counters) {
  var newMap = {},
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
///////////////////////////////////////////////////////////////


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


///////////////////////////////////////////////////////////////
var collapseObjectKeys = (function () {
  
  function crawlObject (prefix, suffix, object, ret, config) {
    var modifiers = config.modifiers;
    _.each(object, function (i, key) {

      var value = object[key];

      if (_.isObject(value) && !_.isArray(value)) {
        // if (key is one of the config keywords) {
        if (modifiers.indexOf(key) >= 0) {
          crawlObject(prefix, suffix + '.' + key, value, ret, config);
        } else {
          crawlObject(prefix + key + '.', suffix, value, ret, config);
        }
      } else {
        ret[prefix + key + suffix] = value;
      }
    });
    return ret;
  }

  return function collapseObjectKeys (src, config, dest) {
    return crawlObject('', '', src, dest || {}, config);
  };
})();


var makeCache = require('teeny-cache')

var Map = function (options, config, initial) {
  this._chooser = createChooser(options, config);
  this._map = collapseObjectKeys(initial, config);
  this._keyCache = makeCache();
  this._initialKeys = _.keys(this._map);
};

_.extend(Map.prototype, {
  get: function (stem) {
    var key = this.resolveKey(stem);    
    return this._map[key];
  },

  resolveKey: function (stem) {
    var self = this;
    return self._keyCache(
      stem, 
      function (stem) {
        return self._chooser(stem, self._initialKeys);
      }
    );
  }
});

function createChooser(options, config) {
  return function (stem, strings) {
    return findBestMatchingKey(stem, strings, options, config);
  };
}

module.exports = {
  collapse: collapseObjectKeys,
  resolve: findBestMatchingKey,

  createRules: require('./facet-rules').create,

  Ctor: Map,

  functions: {
    filterWithObjectSelector: filterWithObjectSelector,
    filterWithArraySelector: filterWithArraySelector,
    
    drainOneSpecific: drainOneSpecific,
    drainNonSelectingModifiers: drainNonSelectingModifiers,
  }
};