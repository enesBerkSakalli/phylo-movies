import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../src/state/phyloStore/store.js';

describe('taxonomy coloring store updates', () => {
  afterEach(() => {
    useAppStore.setState({
      treeControllers: [],
      colorManager: null,
      taxaGrouping: null,
      taxaColorVersion: 0,
      monophyleticColoringEnabled: true,
      playing: false,
    });
    vi.clearAllMocks();
  });

  it('commits taxa grouping before repainting tree controllers', () => {
    let groupingObservedDuringRender = null;
    let versionObservedDuringRender = null;
    const controller = {
      renderAllElements: vi.fn(() => {
        const state = useAppStore.getState();
        groupingObservedDuringRender = state.taxaGrouping;
        versionObservedDuringRender = state.taxaColorVersion;
      }),
    };

    useAppStore.setState({
      treeControllers: [controller],
      taxaGrouping: null,
      taxaColorVersion: 0,
      playing: false,
    });

    const nextGrouping = {
      mode: 'taxa',
      taxaColorMap: {
        'taxon-a': '#123456',
      },
    };

    useAppStore.getState().setTaxaGrouping(nextGrouping);

    expect(useAppStore.getState().taxaGrouping).toEqual({
      ...nextGrouping,
      groupColorMap: {},
    });
    expect(useAppStore.getState().taxaColorVersion).toBe(1);
    expect(controller.renderAllElements).toHaveBeenCalledTimes(1);
    expect(groupingObservedDuringRender).toEqual({
      ...nextGrouping,
      groupColorMap: {},
    });
    expect(versionObservedDuringRender).toBe(1);
  });

  it('normalizes Map-backed taxa and CSV color assignments for plain object lookup', () => {
    useAppStore.setState({
      treeControllers: [],
      taxaGrouping: null,
      taxaColorVersion: 0,
      playing: false,
    });

    useAppStore.getState().setTaxaGrouping({
      mode: 'csv',
      taxaColorMap: new Map([['taxon-a', '#123456']]),
      groupColorMap: new Map([['GroupA', '#abcdef']]),
      csvTaxaMap: new Map([['taxon-a', 'GroupA']]),
    });

    expect(useAppStore.getState().taxaGrouping).toEqual({
      mode: 'csv',
      taxaColorMap: {
        'taxon-a': '#123456',
      },
      groupColorMap: {
        GroupA: '#abcdef',
      },
      csvTaxaMap: {
        'taxon-a': 'GroupA',
      },
    });
  });

  it('updates monophyletic color manager state before repainting controllers', () => {
    let managerEnabled = true;
    let observedDuringRender = null;
    const colorManager = {
      setMonophyleticColoring: vi.fn((enabled) => {
        managerEnabled = enabled;
      }),
    };
    const controller = {
      renderAllElements: vi.fn(() => {
        observedDuringRender = managerEnabled;
      }),
    };

    useAppStore.setState({
      treeControllers: [controller],
      colorManager,
      monophyleticColoringEnabled: true,
      taxaColorVersion: 0,
      playing: false,
    });

    useAppStore.getState().setMonophyleticColoring(false);

    expect(colorManager.setMonophyleticColoring).toHaveBeenCalledWith(false);
    expect(controller.renderAllElements).toHaveBeenCalledTimes(1);
    expect(observedDuringRender).toBe(false);
  });
});
