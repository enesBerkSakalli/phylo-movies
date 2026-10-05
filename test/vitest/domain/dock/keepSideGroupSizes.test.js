// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDockview } from 'dockview-react';
import { keepSideGroupSizes } from '../../../../src/components/dock/dockLayout.js';

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

const settle = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

function workbench() {
  const host = document.createElement('div');
  document.body.append(host);
  const api = createDockview(host, {
    createComponent: () => ({ element: document.createElement('div'), init() {} }),
  });
  api.layout(1440, 774);
  const add = (id, position, size) => api.addPanel({ id, component: id, position, ...size });
  add('tree');
  add('settings', { referencePanel: 'tree', direction: 'left' }, { initialWidth: 280 });
  return { api, add, width: (id) => api.getPanel(id).group.api.width };
}

describe('keepSideGroupSizes', () => {
  it('gives the width of a closed side column to the tree, not to the other sidebars', async () => {
    const { api, add, width } = workbench();
    const kept = keepSideGroupSizes(api);
    add('inspector', { referencePanel: 'tree', direction: 'right' }, { initialWidth: 340 });
    await settle();

    api.getPanel('inspector').api.close();
    await settle();

    expect(width('settings')).toBe(280);
    expect(width('tree')).toBe(1160);
    kept.dispose();
  });

  it('does not shrink the tree column back when a panel is stacked below the tree', async () => {
    const { api, add, width } = workbench();
    const kept = keepSideGroupSizes(api);
    add('inspector', { referencePanel: 'tree', direction: 'right' }, { initialWidth: 340 });
    add('alignment', { referencePanel: 'tree', direction: 'below' }, { initialHeight: 310 });
    await settle();

    api.getPanel('inspector').api.close();
    await settle();

    expect(width('settings')).toBe(280);
    expect(width('tree')).toBe(1160);
    expect(api.getPanel('alignment').group.api.height).toBe(310);
    kept.dispose();
  });

  it('leaves sizes alone while paused (narrow gathering moves groups on purpose)', async () => {
    const { api, add, width } = workbench();
    const kept = keepSideGroupSizes(api, { paused: () => true });
    add('inspector', { referencePanel: 'tree', direction: 'right' }, { initialWidth: 340 });
    await settle();

    api.getPanel('inspector').api.close();
    await settle();

    expect(width('settings')).not.toBe(280);
    kept.dispose();
  });
});
