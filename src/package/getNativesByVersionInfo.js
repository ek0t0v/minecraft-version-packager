'use strict';

const _ = require('lodash');

module.exports = function getNativesByVersionInfo(libraries, platform) {
    let result = [];

    libraries.forEach(lib => {
        if (lib.hasOwnProperty('natives') && lib.natives.hasOwnProperty(platform)) {
            result.push(_.get(lib, `downloads.classifiers.${lib.natives[platform]}`));
        }
    });

    return result;
};