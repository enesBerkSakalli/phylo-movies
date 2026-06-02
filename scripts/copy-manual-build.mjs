#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manualBuildDir = path.join(projectRoot, 'manual', 'build');
const manualDistDir = path.join(projectRoot, 'dist', 'manual');

if (!fs.existsSync(manualBuildDir)) {
  throw new Error(`Docusaurus build output is missing: ${manualBuildDir}`);
}

fs.rmSync(manualDistDir, { recursive: true, force: true });
fs.mkdirSync(manualDistDir, { recursive: true });
fs.cpSync(manualBuildDir, manualDistDir, { recursive: true });

console.log(`Copied Docusaurus manual to ${manualDistDir}`);
