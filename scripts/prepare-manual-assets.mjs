#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canonicalIconPath = path.join(projectRoot, 'src', 'public', 'icons', 'phylo-tree-icon.svg');
const manualIconDir = path.join(projectRoot, 'manual', 'static', 'icons');
const manualIconPath = path.join(manualIconDir, 'phylo-tree-icon.svg');

if (!fs.existsSync(canonicalIconPath)) {
  throw new Error(`Canonical app icon is missing: ${canonicalIconPath}`);
}

fs.mkdirSync(manualIconDir, { recursive: true });
fs.copyFileSync(canonicalIconPath, manualIconPath);

console.log(`Copied manual icon from ${canonicalIconPath} to ${manualIconPath}`);
