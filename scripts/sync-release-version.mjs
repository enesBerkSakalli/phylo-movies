#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const versionArg = args.find((arg) => arg !== '--check');
const version = normalizeVersion(versionArg || process.env.GITHUB_REF_NAME);

const files = [
  'package.json',
  'package-lock.json',
  'electron-app/package.json',
  'electron-app/package-lock.json',
];

function normalizeVersion(rawVersion) {
  if (!rawVersion) {
    throw new Error('Usage: npm run version:sync -- <version-or-vtag>');
  }

  const normalized = rawVersion
    .trim()
    .replace(/^refs\/tags\//, '')
    .replace(/^v/, '');
  const semverPattern =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

  if (!semverPattern.test(normalized)) {
    throw new Error(
      `Invalid release version "${rawVersion}". Expected semver like 1.2.3 or v1.2.3.`
    );
  }

  return normalized;
}

async function readJson(relativePath) {
  const absolutePath = path.join(root, relativePath);
  return JSON.parse(await fs.readFile(absolutePath, 'utf8'));
}

async function writeJson(relativePath, data) {
  const absolutePath = path.join(root, relativePath);
  await fs.writeFile(absolutePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function syncVersion(relativePath) {
  const data = await readJson(relativePath);

  if (checkOnly) {
    const rootVersion = data.version;
    const packageVersion = data.packages?.['']?.version;

    if (rootVersion !== version || (packageVersion && packageVersion !== version)) {
      throw new Error(`${relativePath} is ${rootVersion}, expected ${version}`);
    }

    console.log(`Verified ${relativePath} is ${version}`);
    return;
  }

  data.version = version;

  if (data.packages?.['']) {
    data.packages[''].version = version;
  }

  await writeJson(relativePath, data);
  console.log(`Updated ${relativePath} to ${version}`);
}

for (const file of files) {
  await syncVersion(file);
}
