import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/state/phyloStore/store.js';
import {
  handleContainerResize,
  handleDrag,
  handleDragStart,
} from '../src/treeVisualisation/interaction/InteractionHandlers.js';

describe('InteractionHandlers', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    useAppStore.setState({
      playing: false,
      rightTreeOffsetX: 0,
      rightTreeOffsetY: 0,
    });
  });

  it('falls back to a timeout when requestAnimationFrame is unavailable', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', undefined);
    useAppStore.setState({ playing: false });

    const controller = {
      _resizeRenderScheduled: false,
      layerManager: {
        comparisonRenderer: {
          resetAutoFit: vi.fn(),
        },
      },
      renderAllElements: vi.fn(() => Promise.resolve()),
    };

    handleContainerResize(controller);

    expect(controller._resizeRenderScheduled).toBe(true);

    await vi.advanceTimersByTimeAsync(16);

    expect(controller._resizeRenderScheduled).toBe(false);
    expect(controller.layerManager.comparisonRenderer.resetAutoFit).toHaveBeenCalledOnce();
    expect(controller.renderAllElements).toHaveBeenCalledOnce();
  });

  it('does not rearm comparison auto-fit after the user adjusted the viewport', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', undefined);
    useAppStore.setState({ playing: false });

    const resetAutoFit = vi.fn();
    const controller = {
      _resizeRenderScheduled: false,
      _lastFocusedTreeIndex: 3,
      _hasUserViewportInteraction: true,
      layerManager: {
        comparisonRenderer: {
          resetAutoFit,
        },
      },
      renderAllElements: vi.fn(() => Promise.resolve()),
    };

    handleContainerResize(controller);
    await vi.advanceTimersByTimeAsync(16);

    expect(controller._lastFocusedTreeIndex).toBe(3);
    expect(resetAutoFit).not.toHaveBeenCalled();
    expect(controller.renderAllElements).toHaveBeenCalledOnce();
  });

  it('updates explicit right-tree offsets during comparison drag', () => {
    useAppStore.setState({
      rightTreeOffsetX: 10,
      rightTreeOffsetY: 20,
    });

    const controller = {
      deckContext: {
        getControllerConfig: vi.fn(() => ({ dragPan: true })),
        setControllerConfig: vi.fn(),
        getViewState: vi.fn(() => ({ zoom: 0 })),
      },
      renderAllElements: vi.fn(),
    };

    const started = handleDragStart(controller, {
      object: { treeSide: 'right' },
      x: 100,
      y: 50,
    });
    handleDrag(controller, { x: 125, y: 40 });

    expect(started).toBe(true);
    expect(useAppStore.getState().rightTreeOffsetX).toBe(35);
    expect(useAppStore.getState().rightTreeOffsetY).toBe(10);
    expect(Object.prototype.hasOwnProperty.call(useAppStore.getState(), 'viewOffsetX')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(useAppStore.getState(), 'viewOffsetY')).toBe(false);
    expect(controller.renderAllElements).toHaveBeenCalledOnce();
  });
});
