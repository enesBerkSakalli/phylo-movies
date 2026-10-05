// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDockview } from 'dockview-react';
import { AdaptiveDock } from '../../../../src/components/dock/adaptiveDock.js';

const originalResizeObserver = globalThis.ResizeObserver;
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});
afterAll(() => {
  globalThis.ResizeObserver = originalResizeObserver;
});

function fixture() {
  const host = document.createElement('div');
  document.body.append(host);
  const elements = new Map();
  const disposed = [];
  const api = createDockview(host, {
    createComponent: ({ id }) => {
      const element = document.createElement('input');
      element.value = `draft:${id}`;
      elements.set(id, element);
      return {
        element,
        init() {},
        dispose() {
          disposed.push(id);
        },
      };
    },
  });
  api.layout(1200, 600);
  const add = (id, position) => api.addPanel({ id, component: id, renderer: 'always', position });
  add('tree');
  add('settings', { referencePanel: 'tree', direction: 'left' });
  add('inspector', { referencePanel: 'tree', direction: 'right' });
  add('moved-subtrees', { referencePanel: 'inspector' });
  api.getPanel('settings').group.api.setSize({ width: 280 });
  api.getPanel('inspector').group.api.setSize({ width: 340 });
  api.getPanel('tree').api.setActive();
  return {
    api,
    add,
    elements,
    disposed,
    close() {
      api.dispose();
      host.remove();
    },
  };
}

// dockview may wrap a restored grid in a one-child root of the other orientation; that is the
// same arrangement on screen, so compare with single-child branches collapsed.
function shape(node) {
  if (node.type === 'leaf') return node.data.views;
  return node.data.length === 1 ? shape(node.data[0]) : node.data.map(shape);
}

describe('AdaptiveDock', () => {
  it('gathers into one tab group and restores the wide grid without remounting panels', () => {
    const f = fixture();
    try {
      f.add('alignment', { referencePanel: 'tree', direction: 'below' });
      const before = f.api.toJSON();
      const drafts = new Map(f.elements);
      const adaptive = new AdaptiveDock(f.api);
      adaptive.setNarrow(true);
      expect(f.api.groups.length).toBe(1);
      expect(f.api.panels.length).toBe(5);
      expect(shape(adaptive.layout().grid.root)).toEqual(shape(before.grid.root));
      adaptive.setNarrow(false);
      expect(shape(f.api.toJSON().grid.root)).toEqual(shape(before.grid.root));
      expect(f.disposed).toEqual([]);
      adaptive.setNarrow(true);
      adaptive.setNarrow(false);
      expect(shape(f.api.toJSON().grid.root)).toEqual(shape(before.grid.root));
      for (const [id, input] of drafts) {
        expect(f.elements.get(id)).toBe(input);
        expect(input.value).toBe(`draft:${id}`);
      }
    } finally {
      f.close();
    }
  });

  it('keeps tabs opened or closed while narrow when restoring the wide layout', () => {
    const f = fixture();
    try {
      const adaptive = new AdaptiveDock(f.api);
      adaptive.setNarrow(true);
      f.api.getPanel('moved-subtrees').api.close();
      f.add('alignment', { referencePanel: 'tree' });
      adaptive.reconcile();
      expect(Object.keys(adaptive.layout().panels).sort()).toEqual([
        'alignment',
        'inspector',
        'settings',
        'tree',
      ]);
      adaptive.setNarrow(false);
      expect(f.api.getPanel('alignment').group).toBe(f.api.getPanel('inspector').group);
      expect(f.api.getPanel('settings').group).not.toBe(f.api.getPanel('tree').group);
      expect(f.api.getPanel('moved-subtrees')).toBeUndefined();
    } finally {
      f.close();
    }
  });

  it('restores a saved wide layout loaded on a narrow screen', () => {
    const f = fixture();
    try {
      const saved = f.api.toJSON();
      f.api.layout(390, 600);
      const adaptive = new AdaptiveDock(f.api, saved);
      adaptive.setNarrow(true);
      expect(f.api.groups.length).toBe(1);
      expect(adaptive.layout().grid.width).toBe(1200);
      f.api.layout(1200, 600);
      adaptive.setNarrow(false);
      expect(Math.abs(f.api.getPanel('settings').group.api.width - 280)).toBeLessThan(3);
      expect(shape(f.api.toJSON().grid.root)).toEqual(shape(saved.grid.root));
    } finally {
      f.close();
    }
  });
});
