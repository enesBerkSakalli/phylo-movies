import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../../src/state/phyloStore/store.js';

describe('tree layout store invalidation', () => {
  const initialState = useAppStore.getState();

  afterEach(() => {
    useAppStore.setState(initialState, true);
  });

  it('resets interpolation caches and renders when branch transformation changes', () => {
    const controller = {
      _lastFocusedTreeIndex: 0,
      resetComparisonAutoFit: vi.fn(),
      resetInterpolationCaches: vi.fn(),
      renderAllElements: vi.fn(),
    };
    useAppStore.setState({
      treeController: controller,
      branchTransformation: 'none',
    });

    useAppStore.getState().setBranchTransformation('log');

    expect(controller.resetInterpolationCaches).toHaveBeenCalledOnce();
    expect(controller._lastFocusedTreeIndex).toBeNull();
    expect(controller.resetComparisonAutoFit).toHaveBeenCalledOnce();
    expect(controller.renderAllElements).toHaveBeenCalledOnce();
  });

  it('does not invalidate when the layout value is unchanged', () => {
    const controller = {
      resetInterpolationCaches: vi.fn(),
      renderAllElements: vi.fn(),
    };
    useAppStore.setState({
      treeController: controller,
      layoutRotationDegrees: 0,
    });

    useAppStore.getState().setLayoutRotationDegrees(0);

    expect(controller.resetInterpolationCaches).not.toHaveBeenCalled();
    expect(controller.renderAllElements).not.toHaveBeenCalled();
  });

  it('resets comparison auto-fit once when linked comparison views change', () => {
    const controller = {
      resetComparisonAutoFit: vi.fn(),
      renderAllElements: vi.fn(),
    };
    useAppStore.setState({
      treeController: controller,
      comparisonMode: true,
      viewsConnected: false,
      playing: false,
    });

    useAppStore.getState().setViewsConnected(true);
    useAppStore.getState().setViewsConnected(true);

    expect(useAppStore.getState().viewsConnected).toBe(true);
    expect(controller.resetComparisonAutoFit).toHaveBeenCalledOnce();
    expect(controller.renderAllElements).toHaveBeenCalledOnce();
  });

  it('leaves the render after a link-opacity change to the slider handler', () => {
    const controller = { scheduleRenderAllElements: vi.fn(), renderAllElements: vi.fn() };
    useAppStore.setState({ treeController: controller, playing: false });
    const { colorVersion } = useAppStore.getState();

    useAppStore.getState().setLinkConnectionOpacity(2);

    expect(useAppStore.getState().linkConnectionOpacity).toBe(1);
    expect(useAppStore.getState().colorVersion).toBe(colorVersion + 1);
    expect(controller.scheduleRenderAllElements).not.toHaveBeenCalled();
    expect(controller.renderAllElements).not.toHaveBeenCalled();
  });

  it('resets every comparison setting', () => {
    useAppStore.setState({
      comparisonMode: true,
      leftTreeOffsetX: 5,
      rightTreeOffsetY: -7,
      viewsConnected: true,
      connectorStrokeWidth: 4,
      linkConnectionOpacity: 0.1,
    });

    useAppStore.getState().resetComparison();

    expect(useAppStore.getState()).toMatchObject({
      comparisonMode: false,
      leftTreeOffsetX: 0,
      rightTreeOffsetY: 0,
      viewsConnected: false,
      connectorStrokeWidth: 1,
      linkConnectionOpacity: 0.6,
    });
  });
});
