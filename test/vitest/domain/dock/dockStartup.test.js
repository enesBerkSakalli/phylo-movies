import { describe, expect, it, vi } from 'vitest';
import { restoreDockLayout } from '../../../../src/components/dock/dockStartup.js';

function fakeApi({ fromJSONThrows = false } = {}) {
  const panels = [];
  return {
    panels,
    width: 1200,
    height: 700,
    getPanel: (id) => panels.find((panel) => panel.id === id),
    fromJSON: vi.fn((layout) => {
      if (fromJSONThrows) throw new Error('unknown panel');
      for (const id of Object.keys(layout.panels)) {
        panels.push({
          id,
          title: `old ${id}`,
          api: { setTitle: vi.fn(), setRenderer: vi.fn(), setActive: vi.fn() },
        });
      }
    }),
    clear: vi.fn(() => panels.splice(0)),
    addPanel: vi.fn((options) => {
      panels.push({
        id: options.id,
        title: options.title,
        api: { setTitle: vi.fn(), setRenderer: vi.fn(), setActive: vi.fn() },
      });
    }),
  };
}

describe('dock startup', () => {
  it('opens tree and settings on a first visit', () => {
    const api = fakeApi();
    restoreDockLayout(api, undefined);
    expect(api.panels.map((panel) => panel.id)).toEqual(['tree', 'settings']);
  });

  it('makes the tree the active tab on a first visit', () => {
    const api = fakeApi();
    restoreDockLayout(api, undefined);
    expect(api.getPanel('tree').api.setActive).toHaveBeenCalled();
  });

  it('leaves the active tab alone when a saved layout restores', () => {
    const api = fakeApi();
    restoreDockLayout(api, { grid: {}, panels: { tree: {}, settings: {} } });
    expect(api.getPanel('tree').api.setActive).not.toHaveBeenCalled();
  });

  it('keeps settings closed when the saved layout closed it, but always re-adds the tree', () => {
    const api = fakeApi();
    restoreDockLayout(api, { grid: {}, panels: { alignment: {} } });
    expect(api.panels.map((panel) => panel.id).sort()).toEqual(['alignment', 'tree']);
  });

  it('falls back to the default layout when the saved one cannot be restored', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const api = fakeApi({ fromJSONThrows: true });
    restoreDockLayout(api, { grid: {}, panels: { removed: {} } });
    expect(api.clear).toHaveBeenCalled();
    expect(api.panels.map((panel) => panel.id)).toEqual(['tree', 'settings']);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('shows current registry titles on restored tabs', () => {
    const api = fakeApi();
    restoreDockLayout(api, { grid: {}, panels: { tree: {}, inspector: {} } });
    expect(api.getPanel('inspector').api.setTitle).toHaveBeenCalledWith('Transition Inspector');
    expect(api.getPanel('tree').api.setRenderer).toHaveBeenCalledWith('always');
  });
});
