#!/usr/bin/env node

'use strict';

const app = require('commander');
const createPackage = require('./package/create');

app.version('0.0.1');

app
    .command('package <version> <platform>')
    .action((version, platform) => createPackage(version, platform))
;

app.parse(process.argv);