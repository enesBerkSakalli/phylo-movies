import { describe, expect, it } from 'vitest';
import {
  PANEL_REGISTRY,
  SETTINGS_PANEL_ID,
  TREE_PANEL_ID,
  getPanelEntry,
} from '../../../../src/components/dock/panelRegistry.js';

describe('dock panel registry', () => {
  it('registers the workbench panels under stable ids', () => {
    expect(Object.keys(PANEL_REGISTRY)).toEqual([
      'tree',
      'settings',
      'inspector',
      'moved-subtrees',
      'alignment',
      'taxa-coloring',
    ]);
    expect(TREE_PANEL_ID).toBe('tree');
    expect(SETTINGS_PANEL_ID).toBe('settings');
  });

  it('makes only the tree permanent, and keeps tree and settings mounted while hidden', () => {
    const permanent = Object.entries(PANEL_REGISTRY).filter(([, entry]) => entry.permanent);
    expect(permanent.map(([id]) => id)).toEqual(['tree']);
    expect(PANEL_REGISTRY.tree.alwaysRender).toBe(true);
    expect(PANEL_REGISTRY.settings.alwaysRender).toBe(true);
  });

  it('opens settings on first visit, on the left at 280px', () => {
    expect(PANEL_REGISTRY.settings.defaultOpen).toBe(true);
    expect(PANEL_REGISTRY.settings.place).toEqual({ direction: 'left', width: 280 });
  });

  it('docks inspector and moved subtrees right, alignment below, taxa colouring floating', () => {
    expect(PANEL_REGISTRY.inspector.place).toEqual({ direction: 'right', width: 340 });
    expect(PANEL_REGISTRY['moved-subtrees'].place).toEqual({ direction: 'right', width: 420 });
    expect(PANEL_REGISTRY.alignment.place).toEqual({ direction: 'below', heightShare: 0.4 });
    expect(PANEL_REGISTRY['taxa-coloring'].floating).toEqual({ width: 720, height: 560 });
  });

  it('gives every panel a title and an icon', () => {
    for (const entry of Object.values(PANEL_REGISTRY)) {
      expect(typeof entry.title).toBe('string');
      expect(entry.icon).toBeTruthy();
    }
    expect(getPanelEntry('missing')).toBeUndefined();
  });
});
