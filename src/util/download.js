'use strict';

const _ = require('lodash');
const fs = require('fs');
const request = require('request');
const ProgressBar = require('progress');

module.exports = function download(url, dest, size, visibleName) {
    return new Promise((resolve, reject) => {
        const originalFilename = _.last(url.split('/'));
        const filename = visibleName ? visibleName : originalFilename;
        const stream = fs.createWriteStream(`${dest}/${originalFilename}`);
        const progressBar = new ProgressBar(`${filename} [:bar] :percent`, {
            total: size,
        });

        request
            .get(url)
            .on('data', chunk => {
                progressBar.tick(chunk.length, []);
            })
            .on('error', () => reject())
            .on('end', () => resolve())
            .pipe(stream);
    });
};