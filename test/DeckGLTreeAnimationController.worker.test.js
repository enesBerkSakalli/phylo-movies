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
      playhead: {
        animationProgress: 0,
        timelineProgress: null,
        currentTreeIndex: 0
      },
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
      includeLabels: true,
      duration: 350,
      padding: undefined,
      links: [link, connector],
    });
  });

  it('pans to the matching rendered node without changing zoom', () => {
    const controller = Object.create(ControllerClass.prototype);
    const transitionTo = vi.fn();
    controller.deckContext = { transitionTo };
    controller._lastLayerData = {
      nodes: [
        {
          id: 'node-other',
          splitKey: 'other',
          treeIndex: 1,
          treeSide: 'right',
          position: [10, 20, 0],
        },
        {
          id: 'node-target',
          splitKey: 'target',
          treeIndex: 1,
          treeSide: 'right',
          position: [100, 200, 0],
        },
      ],
    };

    const result = controller.focusOnNode({
      splitKey: 'target',
      treeIndex: 1,
      treeSide: 'right',
    });

    expect(result).toBe(true);
    expect(transitionTo).toHaveBeenCalledWith({
      target: [100, 200, 0],
      duration: 550,
    });
  });

  it('does not pan when the context node is not in the rendered layer data', () => {
    const controller = Object.create(ControllerClass.prototype);
    const transitionTo = vi.fn();
    controller.deckContext = { transitionTo };
    controller._lastLayerData = {
      nodes: [
        {
          splitKey: 'target',
          treeIndex: 0,
          treeSide: 'left',
          position: [100, 200, 0],
        },
      ],
    };

    const result = controller.focusOnNode({
      splitKey: 'target',
      treeIndex: 1,
      treeSide: 'right',
    });

    expect(result).toBe(false);
    expect(transitionTo).not.toHaveBeenCalled();
  });

  it('clears prefetch bookkeeping when style changes reset interpolation data', () => {
    controller = new ControllerClass(null);
    controller.renderAllElements = vi.fn();
    controller.prefetchedLayoutCacheKeys.set(1, 'stale-layout-key');
    controller._prefetchRequestTokens.set(1, 'stale-token');
    const generation = controller._layoutRequestGeneration;

    controller._handleStyleChange();

    expect(controller.prefetchedLayoutCacheKeys.size).toBe(0);
    expect(controller._prefetchRequestTokens.size).toBe(0);
    expect(controller._layoutRequestGeneration).toBe(generation + 1);
    expect(controller.renderAllElements).toHaveBeenCalledOnce();
  });

  it('resets interpolation caches when label layout offsets change', () => {
    useAppStore.setState({ styleConfig: { labelOffsets: { DEFAULT: 20, EXTENSION: 5 } } });
    controller = new ControllerClass(null);
    controller.renderAllElements = vi.fn();
    controller.prefetchedLayoutCacheKeys.set(1, 'stale-layout-key');
    controller._prefetchRequestTokens.set(1, 'stale-token');
    const generation = controller._layoutRequestGeneration;

    useAppStore.setState({ styleConfig: { labelOffsets: { DEFAULT: 30, EXTENSION: 5 } } });

    expect(controller.prefetchedLayoutCacheKeys.size).toBe(0);
    expect(controller._prefetchRequestTokens.size).toBe(0);
    expect(controller._layoutRequestGeneration).toBe(generation + 1);
    expect(controller.renderAllElements).toHaveBeenCalledOnce();
  });

  it('keeps interpolation caches when pulse phase only changes paint', () => {
    useAppStore.setState({ changePulsePhase: 0 });
    controller = new ControllerClass(null);
    controller.renderAllElements = vi.fn();
    const resetCaches = vi.spyOn(controller, 'resetInterpolationCaches');

    useAppStore.setState({ changePulsePhase: 0.25 });

    expect(resetCaches).not.toHaveBeenCalled();
    expect(controller.renderAllElements).toHaveBeenCalledOnce();
  });

  it('does not request redundant redraws for pulse paint while animation is running', () => {
    useAppStore.setState({ changePulsePhase: 0 });
    controller = new ControllerClass(null);
    controller.renderAllElements = vi.fn();
    controller.animationRunner.isRunning = true;
    controller.deckContext = { deck: { redraw: vi.fn() }, destroy: vi.fn() };
    const resetCaches = vi.spyOn(controller, 'resetInterpolationCaches');

    useAppStore.setState({ changePulsePhase: 0.25 });

    expect(resetCaches).not.toHaveBeenCalled();
    expect(controller.renderAllElements).not.toHaveBeenCalled();
    expect(controller.deckContext.deck.redraw).not.toHaveBeenCalled();
  });

  it('keeps interpolation caches when stroke width changes layer data only', () => {
    useAppStore.setState({ strokeWidth: 1 });
    controller = new ControllerClass(null);
    controller.renderAllElements = vi.fn();
    const resetCaches = vi.spyOn(controller, 'resetInterpolationCaches');

    useAppStore.setState({ strokeWidth: 2 });

    expect(resetCaches).not.toHaveBeenCalled();
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

  it('re-prefetches the same tree index when its layout cache key changes', () => {
    controller = new ControllerClass(null);

    controller._prefetchFrame(1);
    expect(controller.layoutWorker.messages).toHaveLength(1);
    const firstKey = controller.layoutWorker.messages[0].data.options.layoutCacheKey;

    useAppStore.setState({ layoutRotationDegrees: 90 });

    controller._prefetchFrame(1);
    expect(controller.layoutWorker.messages).toHaveLength(2);
    const secondKey = controller.layoutWorker.messages[1].data.options.layoutCacheKey;

    expect(secondKey).not.toBe(firstKey);
    expect(controller.prefetchedLayoutCacheKeys.get(1)).toBe(secondKey);
  });

  it('passes per-frame moving taxa exclusion to worker layout prefetch', () => {
    useAppStore.setState({
      subtreeTracking: [null, [[2, 3], [4]]]
    });
    controller = new ControllerClass(null);

    controller._prefetchFrame(1);

    expect(controller.layoutWorker.messages[0].data.options.rotationAlignmentExcludeTaxa).toEqual([2, 3, 4]);
    expect(controller.layoutWorker.messages[0].data.options.layoutCacheKey).toContain(
      'rotationAlignmentExcludeTaxa=2,3,4'
    );
  });

  it('skips layer rerendering on pan-only viewport changes', () => {
    const controller = Object.create(ControllerClass.prototype);
    controller.animationRunner = { isRunning: false };
    controller._lastZoom = 2;
    controller._scheduleRender = vi.fn();

    controller._handleViewStateChange({ zoom: 2.001 });

    expect(controller._scheduleRender).not.toHaveBeenCalled();
  });
});
