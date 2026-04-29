import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..');

describe('layout factory contract', () => {
  it('uses explicit dimensions instead of DOM container lookup compatibility', () => {
    const layoutFiles = [
      'src/treeVisualisation/layout/RadialTreeLayout.js',
      'src/treeVisualisation/layout/TidyTreeLayout.js',
    ];

    const violations = [];
    for (const file of layoutFiles) {
      const text = fs.readFileSync(path.join(repoRoot, file), 'utf8');
      if (text.includes('containerId')) {
        violations.push(`${file}: containerId`);
      }
      if (text.includes('document.getElementById')) {
        violations.push(`${file}: document.getElementById`);
      }
    }

    expect(violations).toEqual([]);
  });
});
