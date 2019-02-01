#!/usr/bin/env node

'use strict';

const app = require('commander');
const createPackage = require('./createPackage');

app.version('0.0.1');

app
    .command('package <version> <dest>')
    .action((version, dest) => createPackage(version, dest))
    .description('Создает архив с выбранной версией.');

app.parse(process.argv);