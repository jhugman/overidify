overidify
=========

A browerify transform to auto-alias files based on filename modifiers and simple rules.

Once in use, you can use build-time parameters to control how files are `require()`d.

By default, the rules are quite mobile focused.

This is particularly useful if you want to use browserify with packaged apps or hybrid apps.

Using overidify
---------------

You can add `overidify` to your browserify object in `package.json`.

```json
{
  // …
  "browserify": {
    "transform": [ "overidify" ]
  },
  // …
}
```

For example, using the default configuration, on a contrived file directory: 

```
lib/
 - renderer-android.js
 - renderer-webview.js
 - rendering.js
 - logic.js
 - environment-dev.js
 - environment-production.js
```

Somewhere in the code, we may have:

```javascript
var renderer = require('./renderer'),
    environment = require('./environment');
```

By changing environment variables when we invoke browserify:
```
PLATFORM=android FLAVOR=dev browserify -o bundle.js lib/app.js
```

the requires are rewritten as:
```javascript
var renderer = require('./renderer-android'),
    environment = require('./environment-dev');
```

i.e. the files with the `android` and `dev` filename modifiers have been selected over the others.

In the case of:
```
PLATFORM=ios FLAVOR=dev browserify -o bundle.js lib/app.js
```

the requires are written:
```javascript
var renderer = require('./renderer-webview'),
    environment = require('./environment-dev');
```

The configuration specifies that `ios` is a `webview`, i.e. a webview running in a hybrid iOS app.

Configuration rules
-------------------

This is a module pointed to from the package.json, or can be specified inline:

```json
{
  // …
  "browserify": {
    "transform": [ "overidify" ]
  },
  overidify: {
    "flavor": [
      "dev", "test", "stage", "production"
    ]
  }
  // …
}
```

In our example, setting `FLAVOR=dev` controls which `environment-*.js` file is used.

The value of `PLATFORM` is used to find a file with one of a list of suitable modifiers.

```json
{
  // …
  "browserify": {
    "transform": [ "overidify" ]
  },
  overidify: {
    "platform": {
      "ios": ["ios", "webview"],
      "android": ["android", "webview"]
    },
    // …
  }
  // …
}
```
The modifiers are used in succession as fallbacks. In this case, `renderer-ios.js` would've been preferred, 
but it was missing, and `renderer-webview.js` was used instead.

A default file is said to be a file that is the same as the argument passed to `require`.

In the case of `environment.js`, no such default file exists. Thus, we can only build for `dev` and `production`.

If no alternatives match the build's selection criteria, and there is no default file, then an error is thrown.

### Specificity
Overidify does what you'd expect when using multiple file modifiers to increase the specificity of selection.

Within the same rule, any of the modifiers can match. The file:
```
environment-dev-test.js
```
would be matched if `FLAVOR=dev` or `FLAVOR=test`.

Between different rules, the more rules matched wins: 

```
environment-ios-production.js
```
is only selected in the case of:
```
PLATFORM=ios FLAVOR=production browserify -o bundle.js lib/app.js
```

### Adding new rules
Adding a rule to the existing rules exposes a new way of slicing the filesystem.
```json
{
  // …
    "js_env": {
      "android_pre42": ["android_pre42"],
      "ie" : [ "ie" ]
      "modern": ["modern", "gecko", "chrome", "opera"],
      "nightly": ["nightly", "canary"],
      "canary": ["canary", "nightly"],
      "headless": ["node", "meteor"]
    },
    // …
}
```
Now, for example, we can select how we store things, based on the file system:

```
lib/
 - storage-canary.js
 - storage-modern.js
 - storage.js
```

The command
```
JS_ENV=modern browserify -o bundle.js lib/app.js
```
would be use the `storage-modern.js` variant of `storage.js`.

Note that running the files in situ with node will always select the `storage.js` variant.

Of course, new rules can apply to different implementations of a single feature.

```json
{
  // …
    "marketplace": [
      ["playstore", "amazon", "yandex", "nomarket"],
    },
    // …
}
```

may select files: 

```
lib/
 - music-sync-playstore.js
 - music-sync-amazon.js
 - credentials-playstore.js
 - credentials-amazon.js
```

Down in the weeds
-----------------
How environment variable names are named can be changed with `OVERIDIFY_PREFIX`.
```
OVERIDIFY_PREFIX=my myPLATFORM=android myFLAVOR=dev 
```
