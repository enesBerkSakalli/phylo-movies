import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../src/state/phyloStore/store.js';

describe('taxonomy coloring store updates', () => {
  afterEach(() => {
    useAppStore.setState({
      treeControllers: [],
      taxaGrouping: null,
      taxaColorVersion: 0,
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
});
