#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const frontendDist = resolve(projectRoot, 'electron-app', 'frontend-dist');

const forbiddenPatterns = [
  { name: 'macOS home path', pattern: /\/Users\// },
  { name: 'Linux home path', pattern: /\/home\// },
  { name: 'Windows user path', pattern: /[A-Za-z]:\\Users\\/ },
  { name: 'JSON-escaped Windows user path', pattern: /[A-Za-z]:\\\\Users\\\\/ },
  { name: 'Conda environment path', pattern: /miniconda3\/envs|conda\/envs/ },
  { name: 'local project path', pattern: /Projects\/phylo-movies|Projects\/Is it rotation/ },
];

function walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}

function isLikelyText(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase();
  return new Set([
    'css',
    'csv',
    'fasta',
    'html',
    'js',
    'json',
    'map',
    'md',
    'newick',
    'nwk',
    'svg',
    'txt',
    'xml',
    'yaml',
    'yml',
  ]).has(ext ?? '');
}

if (!statSync(frontendDist, { throwIfNoEntry: false })?.isDirectory()) {
  console.error(`[electron-dist-check] Missing generated frontend: ${frontendDist}`);
  process.exit(1);
}

const failures = [];

for (const file of walk(frontendDist)) {
  if (!isLikelyText(file)) {
    continue;
  }

  const content = readFileSync(file, 'utf8');
  for (const { name, pattern } of forbiddenPatterns) {
    if (pattern.test(content)) {
      failures.push(`${relative(projectRoot, file)} contains ${name}`);
    }
  }
}

if (failures.length > 0) {
  console.error('[electron-dist-check] Generated Electron frontend is not portable:');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  console.error(
    '[electron-dist-check] Regenerate publication data and rerun the Electron build before packaging.'
  );
  process.exit(1);
}

console.log('[electron-dist-check] Generated Electron frontend is portable.');
