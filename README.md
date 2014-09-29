overidify
=========

A browerify transform to auto-alias files to using rules to simplify the making of build variants.

Once in use, you can use build-time parameters to control how files are `require()`d.

By default, the rules are quite mobile focused.

This is particularly useful if you want to use browserify to make platform specific builds for packaged apps or hybrid apps.

Using overidify
---------------

You can install `overidify` to your project:

```
% npm install jhugman/overidify --save-dev
```

You can then add `overidify` to your browserify object in `package.json`.

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
 - app.js
```

In practice, overidify imposes no additional constraints on project structure.

In this example, let's pretend we have the following lines somewhere in the code of `app.js`:

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
  "overidify": {
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
  "overidify": {
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
environment-production.js
environment-ios.js
```
In the case of:
```
PLATFORM=ios FLAVOR=production browserify -o bundle.js lib/app.js
```
the file selected will have both `ios` and `production` modifiers.

### Adding new rules
Adding a rule to the existing rules exposes a new way of slicing the filesystem.
```json
{
  // …
    "js_env": {
      "android_pre42": ["android_pre42"],
      "ie" : [ "ie" ],
      "modern": ["modern", "gecko", "chrome", "opera"],
      "nightly": ["nightly", "gecko", "modern"],
      "canary": ["canary", "chrome", "modern"],
      "meteor": ["meteor"]
    },
    // …
}
```
Now, for example, we can select how we store things, based on the file system:

```
lib/
 - storage-ie.js
 - storage-canary.js
 - storage-modern.js
 - storage.js
 - app.js
```

The command
```
JS_ENV=modern browserify -o bundle.js lib/app.js
```
would be use the `storage-modern.js` variant of `storage.js`.

Note that running the files in situ with node will always select the `storage.js` variant.

#### Building with features turned on an off.
Of course, new rules can apply to different implementations of a single feature.

```json
{
  // …
    "marketplace": [
      "playstore", "amazon", "yandex", "nomarket",
    ],
    // …
}
```

may select files: 

```
lib/
 - music-sync-playstore.js
 - music-sync-amazon.js
 - music-sync-nomarket.js
 - credentials-playstore-dev.js
 - credentials-playstore-production.js
 - credentials-amazon-dev.js
 - credentials-amazon-production.js
```

Now you can configure a feature based upon `FLAVOR` and `MARKETPLACE`:

```
FLAVOR=production MARKETPLACE=playstore browserify -o bundle.js lib/app.js
```
filters the filesystem to use just: 
```
lib/
 - music-sync-playstore.js
 - marketplace-credentials-playstore-production.js
```

#### Themed builds
The same technique can be used to define themes and feature sets to divide up the files:

```json
{
  "overidify": {
    // …
    "tier": [ "paid", "iap", "ads", "free" ],
    "ad_server": [ "google", "facebook", "mozilla" ],
    "marketplace": [ "playstore", "amazon", "yandex", "mozilla", "nomarket" ]
    // …
  }
}
```

So you can now build a given variant with a suitable grunt file:

```
TIER=iap MARKETPLACE=playstore PLATFORM=android grunt watch:mobile
```

Down in the weeds
-----------------
#### Recursion
If you have multiple modules that need transforming, add overidify to each module in your build in the same way.

The rules file applied to each of the sub-modules is the same for the top level build.

This allows code re-use, though reuse of rules.js is only achieved by copy/paste.

#### Usage with grunt
Because the configuration is done using `browserify`'s own mechanisms in `package.json`, and the variant is specified using environment variables, grunt can be used transparently:

```
PLATFORM=android FLAVOR=production grunt browserify:dist
```

Though I haven't tested it, I expect this would be the same for `gulp`.

#### Environment variables
How environment variable names are named can be changed with `OVERIDIFY_PREFIX`.
```
OVERIDIFY_PREFIX=my myPLATFORM=android myFLAVOR=dev 
```

Similar Projects
----------------
 * `[browserify-swap](https://github.com/thlorenz/browserify-swap)` - allows single enviroment variable to change multiple build rules, based on regular expressions and filepaths specified in `package.json`.

Contributing
------------
 * Feedback especially on developer ergonomics
 * Pull requests welcome.

Licence
-------
Apache v2
