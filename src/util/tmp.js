'use strict';

const fs = require('fs');
const rimraf = require('rimraf');
const constants = require('../constants');

module.exports.createTmpDir = function () {
    if (!fs.existsSync(constants.package.tmpPath)) {
        fs.mkdirSync(constants.package.tmpPath);
    }
};

module.exports.removeTmpDir = function () {
    rimraf.sync(constants.package.tmpPath);
};