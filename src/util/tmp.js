'use strict';

const fs = require('fs');
const rimraf = require('rimraf');

module.exports.createTmpDir = function () {
    if (!fs.existsSync(global.package.tmpPath)) {
        fs.mkdirSync(global.package.tmpPath);
    }
};

module.exports.removeTmpDir = function () {
    rimraf.sync(global.package.tmpPath);
};