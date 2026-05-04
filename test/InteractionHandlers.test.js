import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/state/phyloStore/store.js';
import { handleContainerResize } from '../src/treeVisualisation/interaction/InteractionHandlers.js';

describe('InteractionHandlers', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('falls back to a timeout when requestAnimationFrame is unavailable', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', undefined);
    useAppStore.setState({ playing: false });

    const controller = {
      _resizeRenderScheduled: false,
      layerManager: {
        comparisonRenderer: {
          resetAutoFit: vi.fn()
        }
      },
      renderAllElements: vi.fn(() => Promise.resolve())
    };

    handleContainerResize(controller);

    expect(controller._resizeRenderScheduled).toBe(true);

    await vi.advanceTimersByTimeAsync(16);

    expect(controller._resizeRenderScheduled).toBe(false);
    expect(controller.layerManager.comparisonRenderer.resetAutoFit).toHaveBeenCalledOnce();
    expect(controller.renderAllElements).toHaveBeenCalledOnce();
  });
});
