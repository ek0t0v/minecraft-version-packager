'use strict';

const fs = require('fs');
const unzipper = require('unzipper');
const _ = require('lodash');
const constants = require('../constants');

module.exports = function unpackNatives(libs) {
    return new Promise(async (resolve, reject) => {
        libs = libs.filter(lib => /^org\/lwjgl/.test(lib.path));
        libs = libs.map(lib => {
            return {
                path: `${constants.package.tmpPath}/${constants.package.librariesDir}/${_.last(lib.path.split('/'))}`,
                isMainLib: /^org\/lwjgl\/lwjgl\//.test(lib.path),
            };
        });

        for (const lib of libs) {
            await new Promise((resolve, reject) => {
                fs.createReadStream(lib.path)
                    .pipe(unzipper.Parse())
                    .on('entry', entry => {
                        if (!lib.isMainLib && /^META-INF/.test(entry.path)) {
                            return;
                        }

                        const fullPath = `${constants.package.tmpPath}/${constants.package.nativesDir}/${entry.path}`;

                        if (entry.type === 'Directory') {
                            if (!fs.existsSync(fullPath)) {
                                fs.mkdirSync(fullPath);
                            }
                        } else {
                            entry
                                .pipe(fs.createWriteStream(fullPath))
                                .on('close', () => {
                                    entry.autodrain();
                                })
                            ;
                        }
                    })
                    .on('close', () => resolve())
                    .on('error', () => reject());
            });
        }

        resolve();
    });
};