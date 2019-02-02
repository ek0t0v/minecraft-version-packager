'use strict';

const fs = require('fs');
const request = require('request');
const ProgressBar = require('progress');

module.exports = function download(url, dest, size) {
    return new Promise((resolve, reject) => {
        const filename = url.split('/').pop();
        const stream = fs.createWriteStream(`${dest}/${filename}`);
        const progressBar = new ProgressBar(`${filename} [:bar] :percent`, {
            total: size,
        });

        request
            .get(url)
            .on('data', chunk => {
                progressBar.tick(chunk.length);
            })
            .on('error', () => reject())
            .on('end', () => resolve())
            .pipe(stream);
    });
};