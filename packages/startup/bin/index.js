#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('hi');
if (
    fs.existsSync(path.join(__dirname, '../dist/cli/index.js')) &&
    !fs.existsSync(path.join(__dirname, '../tsconfig.tsbuildinfo'))
) {
    require('../dist/cli/index.js');
} else {
    require('ts-node').register({
        project: require.resolve('../tsconfig.json'),
        transpileOnly: true,
    });
    require('../src/cli/index.ts');
}
