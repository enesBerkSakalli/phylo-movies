import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');

describe('dock panel bodies', () => {
  it('drops floating-window chrome from every view', () => {
    for (const file of [
      ['src', 'components', 'msa', 'MsaPanel.jsx'],
      ['src', 'components', 'taxa-coloring', 'TaxaColoringPanel.jsx'],
      ['src', 'components', 'TreeStatsPanel', 'AnalyticsDashboard.tsx'],
    ]) {
      const source = read(...file);
      expect(source).not.toContain('react-rnd');
      expect(source).not.toContain('createPortal');
      expect(source).not.toContain('floatingWindowGeometry');
    }
    expect(existsSync(join(root, 'src', 'components', 'msa', 'MsaRndWindow.jsx'))).toBe(false);
    expect(
      existsSync(join(root, 'src', 'components', 'taxa-coloring', 'TaxaColoringRndWindow.jsx'))
    ).toBe(false);
  });

  it('registers every registry panel with a dock component', () => {
    const components = read('src', 'components', 'dock', 'panelComponents.jsx');
    for (const id of [
      'tree',
      'settings',
      'inspector',
      'moved-subtrees',
      'alignment',
      'taxa-coloring',
    ]) {
      expect(components).toMatch(new RegExp(`(^|\\s)'?${id}'?:`, 'm'));
    }
  });

  it('gives the inspector an empty state instead of rendering nothing', () => {
    const inspector = read('src', 'components', 'TransitionInspectorPanel.jsx');
    expect(inspector).toContain('Select a timeline segment');
    expect(inspector).toMatch(/if \(!segment\) \{\s+return \(/);
  });
});
