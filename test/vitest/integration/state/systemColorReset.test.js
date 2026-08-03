import { afterEach, describe, expect, it } from 'vitest';
import { SYSTEM_COLOR_DEFAULTS, SYSTEM_TREE_COLORS } from '../../../../src/constants/TreeColors.js';
import { useAppStore } from '../../../../src/state/phyloStore/store.js';

/**
 * SYSTEM_TREE_COLORS is a mutable module singleton that render code reads directly, in parallel
 * with the store fields that mirror it. Nothing resets it, so it outlives any single store -
 * hence the explicit teardown below.
 */
afterEach(() => {
  Object.assign(SYSTEM_TREE_COLORS, SYSTEM_COLOR_DEFAULTS);
  useAppStore.getState().resetColors();
});

describe('system tree colors', () => {
  it('writes the module singleton and the store field together', () => {
    useAppStore.getState().updateChangeColor('pivotEdgeColor', '#ff00ff');

    expect(SYSTEM_TREE_COLORS.pivotEdgeColor).toBe('#ff00ff');
    expect(useAppStore.getState().pivotEdgeColor).toBe('#ff00ff');
  });

  it('bumps colorVersion so render code picks the change up', () => {
    const before = useAppStore.getState().colorVersion;
    useAppStore.getState().updateChangeColor('subtreeHighlightColor', '#123456');

    expect(useAppStore.getState().colorVersion).toBeGreaterThan(before);
  });
});

describe('resetColors', () => {
  it('clears the pulse controller', () => {
    useAppStore.getState().resetColors();
    expect(useAppStore.getState().pulseController).toBeNull();
  });
});
