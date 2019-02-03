'use strict';

const fs = require('fs');
const _ = require('lodash');
const fetch = require('node-fetch');
const tar = require('tar');
const getNativesByVersionInfo = require('./getNativesByVersionInfo');
const getLibrariesByVersionInfo = require('./getLibrariesByVersionInfo');
const unpackNatives = require('./unpackNatives');
const download = require('../util/download');
const { createTmpDir, removeTmpDir } = require('../util/tmp');
const constants = require('../constants');

module.exports = async function create(version, platform) {
    if (!['linux', 'windows', 'osx'].includes(platform)) {
        console.log('Invalid platform.');
        process.exit(1);
    }

    console.log('Load version data...');
    let response = await fetch(constants.api.versionsInfo);
    let versions = await response.json();
    let versionData = Object.values(versions.versions).filter(item => item.id === version)[0];

    if (_.isEmpty(versionData)) {
        console.log('Version not found.');
        process.exit(1);
    }

    response = await fetch(versionData.url);
    versionData = await response.json();

    createTmpDir();

    fs.writeFileSync(
        `${constants.package.tmpPath}/${version}.json`,
        JSON.stringify(versionData, null, '    '),
    );

    console.log('Download client...');
    await download(
        versionData.downloads.client.url,
        `${constants.package.tmpPath}`,
        versionData.downloads.client.size,
        `${version}.jar`,
    );
    fs.renameSync(
        `${constants.package.tmpPath}/${_.last(versionData.downloads.client.url.split('/'))}`,
        `${constants.package.tmpPath}/${version}.jar`,
    );

    if (!fs.existsSync(`${constants.package.tmpPath}/${constants.package.librariesDir}`)) {
        fs.mkdirSync(`${constants.package.tmpPath}/${constants.package.librariesDir}`);
    }

    console.log('Download libraries...');
    await new Promise(async resolve => {
        const libs = getLibrariesByVersionInfo(versionData.libraries, platform);

        for (const lib of libs) {
            await download(lib.url, `${constants.package.tmpPath}/${constants.package.librariesDir}`, lib.size);
        }

        resolve();
    });

    console.log('Download and unpack natives...');
    await new Promise(async resolve => {
        const libs = getNativesByVersionInfo(versionData.libraries, platform);

        for (const lib of libs) {
            await download(lib.url, `${constants.package.tmpPath}/${constants.package.librariesDir}`, lib.size);
        }

        if (!fs.existsSync(`${constants.package.tmpPath}/${constants.package.nativesDir}`)) {
            fs.mkdirSync(`${constants.package.tmpPath}/${constants.package.nativesDir}`);
        }

        await unpackNatives(libs);

        resolve();
    });

    if (!fs.existsSync(`${constants.package.tmpPath}/${constants.package.assetsDir}`)) {
        fs.mkdirSync(`${constants.package.tmpPath}/${constants.package.assetsDir}`);
        fs.mkdirSync(`${constants.package.tmpPath}/${constants.package.assetsDir}/indexes`);
        fs.mkdirSync(`${constants.package.tmpPath}/${constants.package.assetsDir}/objects`);
    }

    console.log('Download assets...');
    await new Promise(async resolve => {
        response = await fetch(versionData.assetIndex.url);
        response = await response.json();

        fs.writeFileSync(
            `${constants.package.tmpPath}/${constants.package.assetsDir}/indexes/${versionData.assetIndex.id}.json`,
            JSON.stringify(response, null, '    '),
        );

        const assets = Object.entries(response.objects);

        for (const asset of assets) {
            let assetDir = asset[1].hash.substring(0, 2);
            let destDir = `${constants.package.tmpPath}/${constants.package.assetsDir}/objects/${assetDir}`;
            let downloadUrl = `${constants.api.assetsDownloadBaseUrl}/${assetDir}/${asset[1].hash}`;

            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir);
            }

            await download(downloadUrl, destDir, asset[1].size, _.last(asset[0].split('/')));
        }

        resolve();
    });

    // todo: Построение команды для запуска игры для целевой ОС.

    console.log(`Packaging ${version}...`);
    tar.c({
        gzip: true,
        sync: true,
        file: `${constants.package.outputPath}/${version}-${platform}.tar.gz`,
        cwd: constants.package.tmpPath,
    }, [
        `${version}.jar`,
        `${version}.json`,
        constants.package.librariesDir,
        constants.package.assetsDir,
        constants.package.nativesDir,
    ]);

    removeTmpDir();
};