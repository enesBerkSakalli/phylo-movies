import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..');

const scannedDirs = [
  'src/treeVisualisation/comparison',
  'src/treeVisualisation/deckgl/context',
  'src/treeVisualisation/deckgl/data/transforms',
  'src/treeVisualisation/deckgl/interpolation',
  'src/treeVisualisation/deckgl/layers',
  'src/treeVisualisation/spatial',
  'src/treeVisualisation/systems',
  'src/treeVisualisation/utils',
];

const forbiddenPatterns = [
  { name: 'legacy leaf wrapper', pattern: /\.\s*leaf\b/ },
  { name: 'legacy originalNode wrapper', pattern: /\.\s*originalNode\b/ },
  { name: 'legacy target data split access', pattern: /target\??\.\s*data\??\.\s*split_indices\b/ },
  { name: 'raw data split access', pattern: /data\??\.\s*split_indices\b/ },
  { name: 'raw data name access', pattern: /data\??\.\s*name\b/ },
];

describe('render data contract static guard', () => {
  it('keeps render/style/interpolation code on normalized fields only', () => {
    const violations = [];

    for (const file of listSourceFiles(scannedDirs)) {
      const text = fs.readFileSync(path.join(repoRoot, file), 'utf8');
      for (const rule of forbiddenPatterns) {
        const lines = text.split('\n');
        lines.forEach((line, index) => {
          if (rule.pattern.test(line)) {
            violations.push(`${file}:${index + 1} ${rule.name}: ${line.trim()}`);
          }
        });
      }
    }

    expect(violations).toEqual([]);
  });
});

function listSourceFiles(dirs) {
  const files = [];
  for (const dir of dirs) {
    walk(path.join(repoRoot, dir), files);
  }
  return files.map((file) => path.relative(repoRoot, file).split(path.sep).join('/')).sort();
}

function walk(dir, files) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (/\.(js|ts)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
}
