import { describe, expect, it } from 'vitest';
import {
  LAYOUT_STORAGE_KEY,
  floatingWithin,
  placementFor,
  readSavedLayout,
  saveLayout,
  withoutFloatingPanels,
} from '../../../../src/components/dock/dockLayout.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    data,
  };
}

function gridPanel(id, group = { id: `g-${id}` }) {
  return { id, group: { ...group, api: { location: { type: 'grid' } } } };
}

describe('dock layout helpers', () => {
  it('drops floating groups and their panels from a saved layout', () => {
    const layout = {
      grid: { root: {} },
      panels: { tree: {}, 'taxa-coloring': {} },
      floatingGroups: [{ data: { views: ['taxa-coloring'] } }],
    };
    expect(withoutFloatingPanels(layout)).toEqual({ grid: { root: {} }, panels: { tree: {} } });
    const docked = { grid: {}, panels: { tree: {} } };
    expect(withoutFloatingPanels(docked)).toBe(docked);
  });

  it('round-trips a layout through storage', () => {
    const storage = memoryStorage();
    saveLayout(storage, { grid: { root: 1 }, panels: { tree: {} } });
    expect(JSON.parse(storage.data.get(LAYOUT_STORAGE_KEY))).toEqual({
      grid: { root: 1 },
      panels: { tree: {} },
    });
    expect(readSavedLayout(storage)).toEqual({ grid: { root: 1 }, panels: { tree: {} } });
  });

  it('treats corrupt or missing saved layouts as none', () => {
    expect(readSavedLayout(memoryStorage({ [LAYOUT_STORAGE_KEY]: '{not json' }))).toBeUndefined();
    expect(readSavedLayout(memoryStorage())).toBeUndefined();
    expect(readSavedLayout(undefined)).toBeUndefined();
  });

  it('survives storage that throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readSavedLayout(throwing)).toBeUndefined();
    expect(() => saveLayout(throwing, { panels: {} })).not.toThrow();
  });

  it('keeps floating windows inside the dock and centred', () => {
    expect(floatingWithin({ width: 720, height: 560 }, { width: 1200, height: 700 })).toEqual({
      width: 720,
      height: 560,
      position: { left: 240, top: 70 },
    });
    expect(floatingWithin({ width: 720, height: 560 }, { width: 500, height: 400 })).toEqual({
      width: 468,
      height: 368,
      position: { left: 16, top: 16 },
    });
  });

  it('places settings left of the tree at its width', () => {
    const api = { width: 1200, height: 700, panels: [gridPanel('tree')] };
    expect(placementFor('settings', api, { narrow: false })).toEqual({
      position: { referencePanel: 'tree', direction: 'left' },
      initialWidth: 280,
    });
  });

  it('opens the first right-hand panel as a new column and joins later ones to it', () => {
    const api = { width: 1200, height: 700, panels: [gridPanel('tree')] };
    expect(placementFor('inspector', api, { narrow: false })).toEqual({
      position: { referencePanel: 'tree', direction: 'right' },
      initialWidth: 340,
    });
    const inspector = gridPanel('inspector', { id: 'right-column' });
    api.panels.push(inspector);
    expect(placementFor('moved-subtrees', api, { narrow: false })).toEqual({
      position: { referenceGroup: inspector.group },
    });
  });

  it('places the alignment below the tree at 40% of the dock height', () => {
    const api = { width: 1200, height: 700, panels: [gridPanel('tree')] };
    expect(placementFor('alignment', api, { narrow: false })).toEqual({
      position: { referencePanel: 'tree', direction: 'below' },
      initialHeight: 280,
    });
  });

  it('floats taxa colouring, and stacks docked panels as tabs on narrow screens', () => {
    const api = { width: 800, height: 600, panels: [gridPanel('tree')] };
    expect(placementFor('taxa-coloring', api, { narrow: true })).toEqual({
      floating: { width: 720, height: 560, position: { left: 40, top: 20 } },
    });
    expect(placementFor('alignment', api, { narrow: true })).toEqual({
      position: { referencePanel: 'tree' },
    });
  });
});
