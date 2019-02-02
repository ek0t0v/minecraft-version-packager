'use strict';

const fs = require('fs');
const _ = require('lodash');
const fetch = require('node-fetch');
const request = require('request');
const tar = require('tar');
const ProgressBar = require('progress');
const { createTmpDir, removeTmpDir } = require('./util/tmp');
const VERSIONS_API_URL = 'https://launchermeta.mojang.com/mc/game/version_manifest.json';
const ASSETS_DOWNLOAD_URL = 'http://resources.download.minecraft.net';

function downloadClient(data, version) {
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
}

function getNativesByVersionInfo(libraries, platform) {
    let result = [];

    libraries.forEach(lib => {
        if (lib.hasOwnProperty('natives') && lib.natives.hasOwnProperty(platform)) {
            result.push(_.get(lib, `downloads.classifiers.${lib.natives[platform]}`));
        }
    });

    return result;
}

function getLibrariesByVersionInfo(libraries, platform) {
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
}

function download(url, dest, size) {
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
}

module.exports = async function createPackage(version, platform) {
    if (['linux', 'osx', 'windows'].indexOf(platform) === -1) {
        console.error('Invalid platform.');
        process.exit(1);
    }

    console.log('Load version data...');
    let response = await fetch(VERSIONS_API_URL);
    let versions = await response.json();
    let versionData = Object.values(versions.versions).filter(item => item.id === version)[0];

    if (_.isEmpty(versionData)) {
        console.log('Version not found.');
        process.exit(1);
    }

    response = await fetch(versionData.url);
    versionData = await response.json();

    createTmpDir();

    fs.writeFileSync(`./output/tmp/${version}.json`, JSON.stringify(versionData));

    console.log('Download client...');
    await downloadClient(versionData.downloads.client, version);

    if (!fs.existsSync('./output/tmp/libraries')) {
        fs.mkdirSync('./output/tmp/libraries');
    }

    console.log('Download libraries...');
    await new Promise(async resolve => {
        const libs = getLibrariesByVersionInfo(versionData.libraries, platform);

        for (const lib of libs) {
            await download(lib.url, './output/tmp/libraries', lib.size);
        }

        resolve();
    });

    console.log('Download natives...');
    await new Promise(async resolve => {
        const libs = getNativesByVersionInfo(versionData.libraries, platform);

        for (const lib of libs) {
            await download(lib.url, './output/tmp/libraries', lib.size);
        }

        resolve();
    });

    if (!fs.existsSync('./output/tmp/assets')) {
        fs.mkdirSync('./output/tmp/assets');
    }

    console.log('Download assets...');
    await new Promise(async resolve => {
        response = await fetch(versionData.assetIndex.url);
        let assets = await response.json();
        assets = Object.entries(assets.objects);

        for (const asset of assets) {
            let assetDir = asset[1].hash.substring(0, 2);
            let destDir = `./output/tmp/assets/${assetDir}`;
            let downloadUrl = `${ASSETS_DOWNLOAD_URL}/${assetDir}/${asset[1].hash}`;

            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir);
            }

            await download(downloadUrl, destDir, asset[1].size);
        }

        resolve();
    });

    console.log(`Packaging ${version}...`);
    tar.c({
        gzip: true,
        sync: true,
        file: `./output/${version}.tar.gz`,
        cwd: './output/tmp/',
    }, [
        `${version}.jar`,
        `${version}.json`,
        'libraries',
        'assets',
    ]);

    removeTmpDir();
};