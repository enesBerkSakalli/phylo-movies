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

  it('keeps angle input normalization at the state boundary', () => {
    const layoutBaseSource = fs.readFileSync(
      path.join(repoRoot, 'src/treeVisualisation/layout/LayoutBaseUtils.js'),
      'utf8'
    );
    const treeLayoutSliceSource = fs.readFileSync(
      path.join(repoRoot, 'src/state/phyloStore/slices/appearance/treeLayout.slice.js'),
      'utf8'
    );
    const treeLayoutControllerSource = fs.readFileSync(
      path.join(repoRoot, 'src/treeVisualisation/TreeLayoutController.js'),
      'utf8'
    );

    expect(treeLayoutSliceSource).toMatch(/setLayoutAngleDegrees:\s*\(degrees\)\s*=>\s*\{/);
    expect(treeLayoutSliceSource).toMatch(/Number\.isFinite\(degrees\)\s*\?\s*degrees\s*:\s*360/);
    expect(treeLayoutSliceSource).toMatch(/Number\.isFinite\(degrees\)\s*\?\s*degrees\s*:\s*0/);
    expect(treeLayoutControllerSource).not.toMatch(/layoutAngleDegrees\s*\|\|\s*360/);
    expect(treeLayoutControllerSource).not.toMatch(/layoutRotationDegrees\s*\|\|\s*0/);
    expect(layoutBaseSource).not.toMatch(/function\s+finiteNumber\s*\(/);
    expect(layoutBaseSource).not.toMatch(/finiteNumber\(/);
  });
});
