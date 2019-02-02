'use strict';

const fs = require('fs');
const rimraf = require('rimraf');

module.exports.createTmpDir = function () {
    if (!fs.existsSync('./output/tmp')) {
        fs.mkdirSync('./output/tmp');
    }
};

module.exports.removeTmpDir = function () {
    rimraf.sync('./output/tmp');
};