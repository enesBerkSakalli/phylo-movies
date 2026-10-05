import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  attachDockApi,
  closePanel,
  isPanelOpen,
  openPanel,
  subscribeDock,
  togglePanel,
} from '../../../../src/components/dock/dockRuntime.js';

function fakeDockApi() {
  const listeners = { add: [], remove: [] };
  const panels = [];
  const api = {
    width: 1200,
    height: 700,
    panels,
    getPanel: (id) => panels.find((panel) => panel.id === id),
    addPanel: vi.fn((options) => {
      const panel = {
        id: options.id,
        group: { api: { location: { type: options.floating ? 'floating' : 'grid' } } },
        api: { setActive: vi.fn(), close: vi.fn(() => api.remove(panel)) },
      };
      panels.push(panel);
      listeners.add.forEach((listener) => listener(panel));
      return panel;
    }),
    remove(panel) {
      panels.splice(panels.indexOf(panel), 1);
      listeners.remove.forEach((listener) => listener(panel));
    },
    onDidAddPanel: (listener) => {
      listeners.add.push(listener);
      return { dispose: () => {} };
    },
    onDidRemovePanel: (listener) => {
      listeners.remove.push(listener);
      return { dispose: () => {} };
    },
  };
  return api;
}

let detach = () => {};
afterEach(() => detach());

describe('dock runtime', () => {
  it('opens a panel at its registry placement with its title, and focuses it if open', () => {
    const api = fakeDockApi();
    detach = attachDockApi(api, { isNarrow: () => false });
    openPanel('settings');
    expect(api.addPanel).toHaveBeenCalledWith({
      id: 'settings',
      component: 'settings',
      title: 'Settings',
      renderer: 'always',
      position: { referencePanel: 'tree', direction: 'left' },
      initialWidth: 280,
    });
    openPanel('settings');
    expect(api.addPanel).toHaveBeenCalledTimes(1);
    expect(api.getPanel('settings').api.setActive).toHaveBeenCalledTimes(1);
  });

  it('closes closeable panels but never the permanent tree', () => {
    const api = fakeDockApi();
    detach = attachDockApi(api, { isNarrow: () => false });
    api.addPanel({ id: 'tree' });
    openPanel('alignment');
    closePanel('alignment');
    closePanel('tree');
    expect(isPanelOpen('alignment')).toBe(false);
    expect(isPanelOpen('tree')).toBe(true);
  });

  it('toggles a panel and notifies subscribers when panels come and go', () => {
    const api = fakeDockApi();
    detach = attachDockApi(api, { isNarrow: () => false });
    const listener = vi.fn();
    const unsubscribe = subscribeDock(listener);
    togglePanel('settings');
    expect(isPanelOpen('settings')).toBe(true);
    togglePanel('settings');
    expect(isPanelOpen('settings')).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('ignores calls before the dock exists and unknown panel ids', () => {
    expect(() => openPanel('settings')).not.toThrow();
    const api = fakeDockApi();
    detach = attachDockApi(api, { isNarrow: () => false });
    openPanel('not-a-panel');
    expect(api.addPanel).not.toHaveBeenCalled();
  });
});
