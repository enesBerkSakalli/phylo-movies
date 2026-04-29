import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/state/phyloStore/store.js';

class MockWorker {
  constructor() {
    this.onmessage = null;
    this.messages = [];
    this.terminated = false;
  }

  postMessage(message) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }
}

describe('DeckGLTreeAnimationController worker cache ordering', () => {
  let ControllerClass;
  let controller;

  beforeEach(async () => {
    vi.stubGlobal('Worker', MockWorker);
    vi.stubGlobal('requestAnimationFrame', (callback) => {
      callback();
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const module = await import('../src/treeVisualisation/DeckGLTreeAnimationController.js');
    ControllerClass = module.DeckGLTreeAnimationController;

    useAppStore.setState({
      treeList: [
        { id: 'tree-0', split_indices: [0], children: [] },
        { id: 'tree-1', split_indices: [1], children: [] }
      ],
      movieData: null,
      branchTransformation: 'linear',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
      styleConfig: { labelOffsets: { DEFAULT: 20, EXTENSION: 5 } },
      animationProgress: 0,
      currentTreeIndex: 0
    });
  });

  afterEach(() => {
    controller?.destroy();
    controller = null;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('ignores stale worker success responses after interpolation caches reset', () => {
    controller = new ControllerClass(null);
    const setPrecomputedData = vi.spyOn(controller.interpolationCache, 'setPrecomputedData');

    controller._prefetchFrame(1);
    const staleMessage = controller.layoutWorker.messages[0];
    expect(staleMessage.jobId).toBe('1');

    controller.resetInterpolationCaches();

    controller.layoutWorker.onmessage({
      data: {
        jobId: staleMessage.jobId,
        requestToken: staleMessage.requestToken,
        status: 'SUCCESS',
        result: { layerData: { stale: true } }
      }
    });

    expect(setPrecomputedData).not.toHaveBeenCalled();
  });
});
