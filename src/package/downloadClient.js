'use strict';

const fs = require('fs');
const request = require('request');
const ProgressBar = require('progress');

module.exports = function downloadClient(data, version) {
    return new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(`./output/tmp/${version}.jar`);
        const progressBar = new ProgressBar(`${version}.jar [:bar] :percent`, {
            total: data.size,
        });

        request.get(data.url)
            .on('data', chunk => {
                progressBar.tick(chunk.length);
            })
            .on('error', e => reject())
            .on('end', () => resolve())
            .pipe(stream);
    });
};