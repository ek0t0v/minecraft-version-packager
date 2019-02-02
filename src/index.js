#!/usr/bin/env node

'use strict';

const app = require('commander');
const createPackage = require('./createPackage');

global.api = {
    versionsInfo: 'https://launchermeta.mojang.com/mc/game/version_manifest.json',
    assetsDownloadBaseUrl: 'http://resources.download.minecraft.net',
};

global.package = {
    outputPath: './output',
    tmpPath: './output/tmp',
    librariesDir: 'libraries',
    assetsDir: 'assets',
};

app.version('0.0.1');

app
    .command('package <version> <platform>')
    .action((version, platform) => createPackage(version, platform))
;

app.parse(process.argv);