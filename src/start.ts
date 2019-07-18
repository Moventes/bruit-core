import { BrtCoreConfig } from '@bruit/types';
import { Bruit } from './bruit';

if (document && document.getElementsByTagName) {
    // Find all script tags
    const scripts = document.getElementsByTagName('script');

    // Find our script
    const reg = /https:\/\/unpkg\.com\/@bruit\/core@.*\/lib\/core\.js\?/;
    let scriptUnpkg = null;
    for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].src && scripts[i].src.search(reg) === 0) {
            scriptUnpkg = scripts[i].src;
        }
    }

    if (scriptUnpkg) {


        // split our script
        var paramsStr = scriptUnpkg.split('?').pop();

        // Look through them trying to find unpkg.com/@bruit/component script
        var params: BrtCoreConfig = {};
        // Get an array of key=value strings of params
        if (paramsStr && paramsStr.length > 1) {
            var paramsSplitAND = paramsStr.split('&');

            // Split each key=value into array, the construct object
            for (var j = 0; j < paramsSplitAND.length; j++) {
                var kv = paramsSplitAND[j].split('=');
                switch (kv[0]) {
                    case 'apiKey':
                        params.apiKey = kv[1];
                        break;
                    case 'apiUrl':
                        params.apiUrl = decodeURI(kv[1]);
                        break;
                    case 'log.logCacheLength':
                        if (!params.log) {
                            params.log = {};
                        }
                        params.log.logCacheLength = JSON.parse(kv[1]);
                        break;
                    case 'log.addQueryParamsToLog':
                        if (!params.log) {
                            params.log = {};
                        }
                        if (kv[1] === 'false' || kv[1] === false) {
                            params.log.addQueryParamsToLog = false;
                        } else {
                            params.log.addQueryParamsToLog = true;
                        }
                        break;
                }
            }
        }


        Bruit.init(params);
    }
}