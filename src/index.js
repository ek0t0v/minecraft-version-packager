#!/usr/bin/env node

'use strict';

const app = require('commander');
const createPackage = require('./createPackage');

app.version('0.0.1');

app
    .command('package <version>')
    .action(version => createPackage(version))

app.parse(process.argv);