#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Read package.json
const packagePath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Extract current version
const currentVersion = packageJson.version;
console.log(`Current version: ${currentVersion}`);

// Parse version format: v.a199 -> { prefix: 'v.a', number: 199 }
const match = currentVersion.match(/^(v\.a)(\d+)$/);
if (!match) {
  console.error('Invalid version format. Expected format: v.a199');
  process.exit(1);
}

const [, prefix, numberStr] = match;
const number = parseInt(numberStr, 10);
const newNumber = number + 1;
const newVersion = `${prefix}${newNumber}`;

console.log(`New version: ${newVersion}`);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Version updated to ${newVersion}`);