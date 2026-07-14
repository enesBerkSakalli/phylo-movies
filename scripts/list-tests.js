#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const checkMode = process.argv.includes('--check');

function walk(relativeDir, predicate, out = []) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  if (!fs.existsSync(absoluteDir)) return out;

  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      walk(relativePath, predicate, out);
    } else if (predicate(relativePath)) {
      out.push(relativePath.split(path.sep).join('/'));
    }
  }
  return out;
}

function getAllTestFiles() {
  return walk('test', (file) => /\.test\.(js|ts)$/.test(file)).sort();
}

const mochaSpecs = walk('test/mocha/default', (file) => /\.test\.js$/.test(file)).sort();
const vitestSpecs = walk('test/vitest', (file) => /\.test\.(js|ts)$/.test(file)).sort();
const defaultSpecs = new Set([...mochaSpecs, ...vitestSpecs]);
const supplementalSpecs = walk('test/mocha/supplemental', (file) =>
  /\.test\.js$/.test(file)
).sort();
const supplementalSet = new Set(supplementalSpecs);
const allSpecs = getAllTestFiles();
const orphanSpecs = allSpecs.filter(
  (file) => !defaultSpecs.has(file) && !supplementalSet.has(file)
);

function printGroup(label, files) {
  console.log(`\n${label} (${files.length})`);
  for (const file of files) console.log(`  ${file}`);
}

printGroup('Default Mocha specs', mochaSpecs);
printGroup('Default Vitest specs', vitestSpecs);
printGroup('Supplemental Mocha specs', supplementalSpecs);

if (orphanSpecs.length > 0) {
  printGroup('Orphan specs', orphanSpecs);
  if (checkMode) {
    console.error(
      '\nFound test files that are neither default nor supplemental. Move them or add them to a suite.'
    );
    process.exit(1);
  }
} else {
  console.log('\nOrphan specs (0)');
}
