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
        resetAutoFit: vi.fn()
      }
    };
    controllerInstance = this;
  }
}

vi.mock('../../src/treeVisualisation/DeckGLTreeAnimationController.js', () => ({
  DeckGLTreeAnimationController: MockDeckGLTreeAnimationController
}));

vi.mock('../../src/domain/msa/msaWindowCalculator.js', () => ({
  calculateWindow: vi.fn(() => ({ startPosition: 1, endPosition: 10 }))
}));

vi.mock('../../src/domain/indexing/IndexMapping.js', () => ({
  getMSAFrameIndex: vi.fn(() => -1)
}));

vi.mock('../../src/state/phyloStore/store.js', () => ({
  useAppStore: {
    getState: () => storeState,
    subscribe: (listener) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    }
  }
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
    ...patch
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
      transitionResolver: null,
      currentTreeIndex: 0,
      playhead: { timelineProgress: 0.1, animationProgress: 0.1, currentTreeIndex: 0 },
      setRenderInProgress: vi.fn(),
      syncMSAEnabled: false,
      clearMsaRegion: vi.fn(),
      clearMsaPreviousRegion: vi.fn(),
      updateColorManagerForCurrentIndex: vi.fn()
    };

    vi.stubGlobal('requestAnimationFrame', vi.fn((callback) => {
      rafQueue.push(callback);
      return rafQueue.length;
    }));
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
      playhead: { timelineProgress: 0.9, animationProgress: 0.9, currentTreeIndex: 0 }
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
});
