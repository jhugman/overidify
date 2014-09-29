module.exports = {
  platform: {
    'ios': ['ios', 'webview', 'webkit'],
    'android': ['android', 'webview', 'blink', 'webkit'],
    'fxos': ['fxos', 'nativejs', 'gecko'],
    'fennec': ['fxos', 'nativejs', 'gecko'],
    'blackberry': ['blackberry', 'webview'],
    'blackberry10': ['blackberry10', 'webview'],
    'wp8': ['wp8', 'windows', 'ie', 'webview'],
    'wp7': ['wp7', 'windows', 'ie', 'webview'],
    'tizen': ['tizen', 'webview']
  },  
  flavor: ['dev', 'debug', 'test', 'stage', 'production' ]
};
