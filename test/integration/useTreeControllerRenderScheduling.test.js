// @vitest-environment jsdom

import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let storeState;
let subscribers;
let rafQueue;
let controllerInstance;

class MockDeckGLTreeAnimationController {
  constructor() {
    this.ready = true;
    this.readyPromise = Promise.resolve();
    this.renderTimelineProgress = vi.fn(() => Promise.resolve());
    this.renderProgress = vi.fn(() => Promise.resolve());
    this.renderAllElements = vi.fn(() => Promise.resolve());
    this.resetInterpolationCaches = vi.fn();
    this.initializeUniformScaling = vi.fn();
    this.destroy = vi.fn();
    this.layerManager = {
      comparisonRenderer: {
        resetAutoFit: vi.fn(),
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    controllerInstance = this;
  }
}

vi.mock('../../src/treeVisualisation/DeckGLTreeAnimationController.js', () => ({
  DeckGLTreeAnimationController: MockDeckGLTreeAnimationController,
}));

vi.mock('../../src/domain/msa/msaWindowCalculator.js', () => ({
  calculateWindow: vi.fn(() => ({ startPosition: 1, endPosition: 10 })),
}));

vi.mock('../../src/state/phyloStore/store.js', () => ({
  useAppStore: {
    getState: () => storeState,
    subscribe: (listener) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
  },
}));

function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function updateStore(patch) {
  const prevState = storeState;
  storeState = {
    ...storeState,
    ...patch,
  };
  for (const subscriber of subscribers) {
    subscriber(storeState, prevState);
  }
}

async function renderHookHarness() {
  const { useTreeController } = await import('../../src/hooks/useTreeController.js');
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  function Harness() {
    useTreeController();
    return null;
  }

  await act(async () => {
    root.render(React.createElement(Harness));
  });

  return { root };
}

async function flushNextRaf() {
  const callback = rafQueue.shift();
  if (!callback) return;
  await act(async () => {
    callback(performance.now());
    await Promise.resolve();
  });
}

describe('useTreeController static render scheduling', () => {
  beforeEach(() => {
    subscribers = new Set();
    rafQueue = [];
    controllerInstance = null;
    storeState = {
      treeList: [{ id: 'tree-0' }],
      treeControllers: [],
      setTreeControllers: (controllers) => {
        storeState = { ...storeState, treeControllers: controllers };
      },
      movieTimelineManager: null,
      playing: false,
      comparisonMode: false,
      frameIndex: 0,
      timelineCursor: {
        frameIndex: 0,
        inputTreeIndex: 0,
        sourceFrameIndex: 0,
        msaWindowIndex: 0,
        movieTimeMs: 0,
        timelineProgress: 0.1,
      },
      playhead: { timelineProgress: 0.1, animationProgress: 0.1 },
      setRenderInProgress: vi.fn(),
      syncMSAEnabled: false,
      clearMsaRegion: vi.fn(),
      clearMsaPreviousRegion: vi.fn(),
      updateColorManagerForCurrentIndex: vi.fn(),
      prefetchTreeHydrationWindow: vi.fn(),
    };

    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback) => {
        rafQueue.push(callback);
        return rafQueue.length;
      })
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not start a newer static render until the in-flight render completes', async () => {
    const firstRender = deferred();
    const { root } = await renderHookHarness();

    controllerInstance.renderTimelineProgress.mockImplementationOnce(() => firstRender.promise);

    await flushNextRaf();
    expect(controllerInstance.renderTimelineProgress).toHaveBeenCalledWith(0.1);

    updateStore({
      playhead: { timelineProgress: 0.9, animationProgress: 0.9 },
    });
    await flushNextRaf();

    expect(controllerInstance.renderTimelineProgress).toHaveBeenCalledTimes(1);

    await act(async () => {
      firstRender.resolve();
      await firstRender.promise;
      await Promise.resolve();
    });

    await flushNextRaf();

    expect(controllerInstance.renderTimelineProgress).toHaveBeenCalledTimes(2);
    expect(controllerInstance.renderTimelineProgress).toHaveBeenLastCalledWith(0.9);

    await act(async () => {
      root.unmount();
    });
  });

  it('marks rendering in progress while waiting for the tree controller to become ready', async () => {
    const controllerReady = deferred();
    const { root } = await renderHookHarness();
    controllerInstance.ready = false;
    controllerInstance.readyPromise = controllerReady.promise;

    await flushNextRaf();

    expect(storeState.setRenderInProgress).toHaveBeenCalledWith(true);
    expect(controllerInstance.renderTimelineProgress).not.toHaveBeenCalled();

    await act(async () => {
      controllerReady.resolve();
      await controllerReady.promise;
      await Promise.resolve();
    });

    expect(controllerInstance.renderTimelineProgress).toHaveBeenCalledWith(0.1);
    expect(storeState.setRenderInProgress).toHaveBeenLastCalledWith(false);

    await act(async () => {
      root.unmount();
    });
  });

  it('leaves frame-index color sync to the store subscriber', async () => {
    const { root } = await renderHookHarness();

    updateStore({ frameIndex: 1 });

    expect(storeState.updateColorManagerForCurrentIndex).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it('clears the single-tree auto-fit sentinel when comparison mode changes', async () => {
    const { root } = await renderHookHarness();
    controllerInstance._lastFocusedTreeIndex = 0;
    controllerInstance.layerManager.comparisonRenderer.resetAutoFit.mockClear();

    updateStore({ comparisonMode: true });

    expect(controllerInstance._lastFocusedTreeIndex).toBeNull();
    expect(controllerInstance.layerManager.comparisonRenderer.resetAutoFit).toHaveBeenCalledOnce();

    await act(async () => {
      root.unmount();
    });
  });

  it('prefetches the current tree hydration window before rendering', async () => {
    const { root } = await renderHookHarness();

    await flushNextRaf();

    expect(storeState.prefetchTreeHydrationWindow).toHaveBeenCalledWith(0, 1);
    expect(controllerInstance.renderTimelineProgress).toHaveBeenCalledWith(0.1);

    await act(async () => {
      root.unmount();
    });
  });

  it('syncs MSA region while timeline scrubbing', async () => {
    storeState = {
      ...storeState,
      movieTimelineManager: {
        scrubController: { isScrubbing: true },
      },
      syncMSAEnabled: true,
      msaSequences: {
        taxonA: 'ACGTACGTACGT',
      },
      msaStepSize: 50,
      msaWindowSize: 100,
      msaRegion: null,
      setMsaRegion: vi.fn(),
      setMsaPreviousRegion: vi.fn(),
    };
    const { root } = await renderHookHarness();
    storeState.setMsaRegion.mockClear();

    updateStore({
      timelineCursor: {
        ...storeState.timelineCursor,
        frameIndex: 1,
        msaWindowIndex: 1,
      },
    });

    expect(storeState.setMsaRegion).toHaveBeenCalledWith(1, 10);

    await act(async () => {
      root.unmount();
    });
  });

  it('does not sync MSA region to fractional transition positions', async () => {
    storeState = {
      ...storeState,
      movieTimelineManager: {
        scrubController: { isScrubbing: true },
      },
      syncMSAEnabled: true,
      msaSequences: {
        taxonA: 'ACGTACGTACGT',
      },
      msaStepSize: 50,
      msaWindowSize: 100,
      msaRegion: null,
      setMsaRegion: vi.fn(),
      setMsaPreviousRegion: vi.fn(),
    };
    const { root } = await renderHookHarness();
    storeState.setMsaRegion.mockClear();

    updateStore({
      timelineCursor: {
        ...storeState.timelineCursor,
        frameIndex: 1,
        msaWindowIndex: 0.5,
      },
    });

    expect(storeState.setMsaRegion).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it('does not schedule a second hook render when navigation changes frame index and playhead together', async () => {
    const { root } = await renderHookHarness();

    await flushNextRaf();
    expect(controllerInstance.renderTimelineProgress).toHaveBeenCalledTimes(1);

    updateStore({
      frameIndex: 1,
      playhead: { timelineProgress: 0.5, animationProgress: 0.5 },
    });
    await flushNextRaf();

    expect(controllerInstance.renderTimelineProgress).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
  });
});
