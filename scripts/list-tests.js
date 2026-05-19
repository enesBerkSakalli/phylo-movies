#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const checkMode = process.argv.includes('--check');

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

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

function getMochaSpecs() {
  const pkg = JSON.parse(readText('package.json'));
  const command = pkg.scripts['test:mocha'] || '';
  return [...command.matchAll(/'([^']+)'/g)].map(match => match[1]).sort();
}

function getVitestSpecs() {
  const config = readText('vitest.config.js');
  const includes = [...config.matchAll(/'([^']+)'/g)]
    .map(match => match[1])
    .filter(include => include.startsWith('test/'));
  const specs = new Set();

  for (const include of includes) {
    if (include === 'test/domain/**/*.test.{js,ts}') {
      walk('test/domain', file => /\.test\.(js|ts)$/.test(file), []).forEach(file => specs.add(file));
    } else if (include === 'test/integration/**/*.test.{js,ts}') {
      walk('test/integration', file => /\.test\.(js|ts)$/.test(file), []).forEach(file => specs.add(file));
    } else if (!include.includes('*')) {
      specs.add(include);
    }
  }

  return [...specs].sort();
}

function getAllTestFiles() {
  return walk('test', file => /\.test\.(js|ts)$/.test(file)).sort();
}

const mochaSpecs = getMochaSpecs();
const vitestSpecs = getVitestSpecs();
const defaultSpecs = new Set([...mochaSpecs, ...vitestSpecs]);
const optionalSpecs = walk('test/optional', file => /\.test\.(js|ts)$/.test(file)).sort();
const optionalSet = new Set(optionalSpecs);
const allSpecs = getAllTestFiles();
const orphanSpecs = allSpecs.filter(file => !defaultSpecs.has(file) && !optionalSet.has(file));

function printGroup(label, files) {
  console.log(`\n${label} (${files.length})`);
  for (const file of files) console.log(`  ${file}`);
}

printGroup('Default Mocha specs', mochaSpecs);
printGroup('Default Vitest specs', vitestSpecs);
printGroup('Supplemental Mocha specs', optionalSpecs);

if (orphanSpecs.length > 0) {
  printGroup('Orphan specs', orphanSpecs);
  if (checkMode) {
    console.error('\nFound test files that are neither default nor supplemental. Move them or add them to a suite.');
    process.exit(1);
  }
} else {
  console.log('\nOrphan specs (0)');
}
