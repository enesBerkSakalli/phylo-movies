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

  it('includes comparison connectors when fitting the current tree data', () => {
    const controller = Object.create(ControllerClass.prototype);
    const node = { id: 'node-1', position: [0, 0, 0] };
    const label = { id: 'label-1', position: [1, 1, 0] };
    const link = { id: 'link-1', path: new Float32Array([0, 0, 0, 1, 1, 0]) };
    const connector = { id: 'connector-1', path: new Float32Array([1, 1, 0, 10, 10, 0]) };
    controller._lastLayerData = {
      nodes: [node],
      labels: [label],
      links: [link],
      connectors: [connector],
    };
    controller.viewportManager = {
      focusOnTree: vi.fn(),
    };

    controller.fitTreeToViewport();

    expect(controller.viewportManager.focusOnTree).toHaveBeenCalledWith([node], [label], {
      includeLabels: false,
      duration: 350,
      padding: undefined,
      links: [link, connector],
    });
  });

  it('clears prefetch bookkeeping when style changes reset interpolation data', () => {
    controller = new ControllerClass(null);
    controller.renderAllElements = vi.fn();
    controller.prefetchedFrameIndices.add(1);
    controller._prefetchRequestTokens.set(1, 'stale-token');
    const generation = controller._layoutRequestGeneration;

    controller._handleStyleChange();

    expect(controller.prefetchedFrameIndices.size).toBe(0);
    expect(controller._prefetchRequestTokens.size).toBe(0);
    expect(controller._layoutRequestGeneration).toBe(generation + 1);
    expect(controller.renderAllElements).toHaveBeenCalledOnce();
  });

  it('includes dataset identity in worker layout request tokens', () => {
    controller = new ControllerClass(null);
    const firstToken = controller._createLayoutRequestToken(1, useAppStore.getState());

    useAppStore.setState({
      treeList: [
        { id: 'replacement-tree-0', split_indices: [0], children: [] },
        { id: 'replacement-tree-1', split_indices: [1], children: [] }
      ]
    });

    const secondToken = controller._createLayoutRequestToken(1, useAppStore.getState());

    expect(secondToken).not.toBe(firstToken);
  });
});
