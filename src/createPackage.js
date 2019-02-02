'use strict';

const fs = require('fs');
const _ = require('lodash');
const fetch = require('node-fetch');
const tar = require('tar');
const downloadClient = require('./downloadClient');
const download = require('./download');
const getNativesByVersionInfo = require('./getNativesByVersionInfo');
const getLibrariesByVersionInfo = require('./getLibrariesByVersionInfo');
const { createTmpDir, removeTmpDir } = require('./util/tmp');

module.exports = async function createPackage(version, platform) {
    if (['linux', 'windows', 'osx'].indexOf(platform) === -1) {
        console.error('Invalid platform.');
        process.exit(1);
    }

    console.log('Load version data...');
    let response = await fetch(global.api.versionsInfo);
    let versions = await response.json();
    let versionData = Object.values(versions.versions).filter(item => item.id === version)[0];

    if (_.isEmpty(versionData)) {
        console.log('Version not found.');
        process.exit(1);
    }

    response = await fetch(versionData.url);
    versionData = await response.json();

    createTmpDir();

    fs.writeFileSync(`${global.package.tmpPath}/${version}.json`, JSON.stringify(versionData));

    console.log('Download client...');
    await downloadClient(versionData.downloads.client, version);

    if (!fs.existsSync(`${global.package.tmpPath}/${global.package.librariesDir}`)) {
        fs.mkdirSync(`${global.package.tmpPath}/${global.package.librariesDir}`);
    }

    console.log('Download libraries...');
    await new Promise(async resolve => {
        const libs = getLibrariesByVersionInfo(versionData.libraries, platform);

        for (const lib of libs) {
            await download(lib.url, `${global.package.tmpPath}/${global.package.librariesDir}`, lib.size);
        }

        resolve();
    });

    console.log('Download natives...');
    await new Promise(async resolve => {
        const libs = getNativesByVersionInfo(versionData.libraries, platform);

        for (const lib of libs) {
            await download(lib.url, `${global.package.tmpPath}/${global.package.librariesDir}`, lib.size);
        }

        resolve();
    });

    if (!fs.existsSync(`${global.package.tmpPath}/${global.package.assetsDir}`)) {
        fs.mkdirSync(`${global.package.tmpPath}/${global.package.assetsDir}`);
    }

    console.log('Download assets...');
    await new Promise(async resolve => {
        response = await fetch(versionData.assetIndex.url);
        let assets = await response.json();
        assets = Object.entries(assets.objects);

        for (const asset of assets) {
            let assetDir = asset[1].hash.substring(0, 2);
            let destDir = `${global.package.tmpPath}/${global.package.assetsDir}/${assetDir}`;
            let downloadUrl = `${global.api.assetsDownloadBaseUrl}/${assetDir}/${asset[1].hash}`;

            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir);
            }

            await download(downloadUrl, destDir, asset[1].size);
        }

        resolve();
    });

    // todo: Создание папки natives и распаковка нужных либ туда (lwjgl).

    // todo: Построение команды для запуска игры для целевой ОС.
    
    console.log(`Packaging ${version}...`);
    tar.c({
        gzip: true,
        sync: true,
        file: `${global.package.outputPath}/${version}-${platform}.tar.gz`,
        cwd: global.package.tmpPath,
    }, [
        `${version}.jar`,
        `${version}.json`,
        global.package.librariesDir,
        global.package.assetsDir,
    ]);

    removeTmpDir();
};