'use strict';

module.exports = function getLibrariesByVersionInfo(libraries, platform) {
    let result = [];

    libraries.forEach(lib => {
        if (lib.hasOwnProperty('natives')) {
            return;
        }

        if (!lib.hasOwnProperty('rules')) {
            result.push(lib.downloads.artifact);

            return;
        }

        lib.rules.forEach(rule => {
            if (rule.action === 'allow' && rule.os.name === platform) {
                result.push(lib.downloads.artifact);
            }
        });
    });

    return result;
};