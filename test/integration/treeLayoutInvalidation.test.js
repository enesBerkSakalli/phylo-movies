import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../src/state/phyloStore/store.js';

describe('tree layout store invalidation', () => {
  const initialState = useAppStore.getState();

  afterEach(() => {
    useAppStore.setState(initialState, true);
  });

  it('resets interpolation caches and renders controllers when branch transformation changes', () => {
    const controller = {
      _lastFocusedTreeIndex: 0,
      layerManager: { comparisonRenderer: { resetAutoFit: vi.fn() } },
      resetInterpolationCaches: vi.fn(),
      renderAllElements: vi.fn(),
    };
    useAppStore.setState({
      treeControllers: [controller],
      branchTransformation: 'none',
    });

    useAppStore.getState().setBranchTransformation('log');

    expect(controller.resetInterpolationCaches).toHaveBeenCalledOnce();
    expect(controller._lastFocusedTreeIndex).toBeNull();
    expect(controller.layerManager.comparisonRenderer.resetAutoFit).toHaveBeenCalledOnce();
    expect(controller.renderAllElements).toHaveBeenCalledOnce();
  });

  it('does not invalidate when the layout value is unchanged', () => {
    const controller = {
      resetInterpolationCaches: vi.fn(),
      renderAllElements: vi.fn(),
    };
    useAppStore.setState({
      treeControllers: [controller],
      layoutRotationDegrees: 0,
    });

    useAppStore.getState().setLayoutRotationDegrees(0);

    expect(controller.resetInterpolationCaches).not.toHaveBeenCalled();
    expect(controller.renderAllElements).not.toHaveBeenCalled();
  });
});
