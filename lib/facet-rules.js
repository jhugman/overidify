var _ = require('lodash'),
    makeCache = require('teeny-cache');

/////////////////////////////////////////////////////
// Utility functions. May break them into separate file.
function getAllModifiersFromSelector(selector) {
  if (_.isArray(selector)) {
    return getAllModifiersFromArraySelector(selector);
  } else if (_.isObject(selector)) {
    return getAllModifiersFromObjectSelector(selector);
  }
}

function getAllModifiersFromObjectSelector (selector) {
  return _.chain(selector).values().flatten().uniq().value();
}

function getAllModifiersFromArraySelector (selector) {
  return selector;
}


/////////////////////////////////////////////////////


function Rules (config) {
  this._config = config;
  this._modifierCache = makeCache([]);
}

_.extend(Rules.prototype, {
  getModifiersForRule: function (name) {
    if (!_.isString(name)) {
      return getAllModifiersFromSelector(name);
    }
    var this_ = this;
    return this._modifierCache(name, function () {
      var selector = this_._config[name];
      return getAllModifiersFromSelector(selector);
    });
  },

  getRule: function (name) {
    return this._config[name];
  },

  getAllModifiersFromSelector: function (selector) {
    return getAllModifiersFromSelector(selector);
  },
});

Object.defineProperties(Rules.prototype, {
  modifiers: {
    get: function () {
      var config = this._config;
      return this._modifierCache("--all", function () {
        return _.chain(config)
          .values()
          .map(function (selector) {
            return getAllModifiersFromSelector(selector);
          })
          .flatten()
          .uniq()
          .value();
      });
    }
  }
});



function createConfig (config) {
  return new Rules(config);
}

module.exports = {
  create: createConfig
};