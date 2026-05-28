import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/state/phyloStore/store.js';
import { VIEWPORT_FIT_MODES } from '../src/treeVisualisation/viewport/viewportFit.js';

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
  const initialStoreState = useAppStore.getState();

  beforeEach(async () => {
    useAppStore.setState({ ...initialStoreState }, true);
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
        { id: 'tree-1', split_indices: [1], children: [] },
      ],
      branchTransformation: 'linear',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
      styleConfig: { labelOffsets: { DEFAULT: 20, EXTENSION: 5 } },
      playhead: {
        animationProgress: 0,
        timelineProgress: null,
      },
      frameIndex: 0,
    });
  });

  afterEach(() => {
    controller?.destroy();
    controller = null;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    useAppStore.setState({ ...initialStoreState }, true);
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
        result: { layerData: { stale: true } },
      },
    });

    expect(setPrecomputedData).not.toHaveBeenCalled();
  });

  it('clears transformed tree datasets when interpolation caches reset', () => {
    controller = new ControllerClass(null);
    controller._transformedCache.set('dataset-a', {
      transformedList: [{ id: 'old-tree' }],
    });

    controller.resetInterpolationCaches();

    expect(controller._transformedCache.size).toBe(0);
  });

  it('includes comparison connectors when fitting the current tree data', () => {
    const controller = Object.create(ControllerClass.prototype);
    const node = { id: 'node-1', position: [0, 0, 0] };
    const label = { id: 'label-1', position: [1, 1, 0] };
    const link = { id: 'link-1', path: new Float32Array([0, 0, 0, 1, 1, 0]) };
    const extension = { id: 'extension-1', path: new Float32Array([1, 1, 0, 5, 5, 0]) };
    const connector = { id: 'connector-1', path: new Float32Array([1, 1, 0, 10, 10, 0]) };
    controller._lastLayerData = {
      nodes: [node],
      labels: [label],
      links: [link],
      extensions: [extension],
      connectors: [connector],
    };
    controller.viewportManager = {
      focusOnTree: vi.fn(),
    };

    controller.fitTreeToViewport();

    expect(controller.viewportManager.focusOnTree).toHaveBeenCalledWith([node], [label], {
      fitMode: VIEWPORT_FIT_MODES.LABELS,
      duration: 350,
      padding: undefined,
      links: [link, extension, connector],
    });
  });

  it('excludes hidden label text from manual visible-content fit', () => {
    useAppStore.setState({ labelsVisible: false });
    const controller = Object.create(ControllerClass.prototype);
    const node = { id: 'node-1', position: [0, 0, 0] };
    const label = { id: 'label-1', position: [5000, 0, 0], text: 'hidden label text' };
    const extension = { id: 'extension-1', path: new Float32Array([0, 0, 0, 10, 0, 0]) };
    controller._lastLayerData = {
      nodes: [node],
      labels: [label],
      links: [],
      extensions: [extension],
      connectors: [],
    };
    controller.viewportManager = {
      focusOnTree: vi.fn(),
    };

    controller.fitTreeToViewport();

    expect(controller.viewportManager.focusOnTree).toHaveBeenCalledWith([node], [], {
      fitMode: VIEWPORT_FIT_MODES.BRANCH,
      duration: 350,
      padding: undefined,
      links: [extension],
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
    controller._layoutPrefetchTokens.set(1, 'stale-token');
    const generation = controller._layoutRequestGeneration;

    controller._handleStyleChange();

    expect(controller._layoutPrefetchTokens.size).toBe(0);
    expect(controller._layoutRequestGeneration).toBe(generation + 1);
    expect(controller.renderAllElements).toHaveBeenCalledOnce();
  });

  it('resets interpolation caches when label layout offsets change', () => {
    useAppStore.setState({ styleConfig: { labelOffsets: { DEFAULT: 20, EXTENSION: 5 } } });
    controller = new ControllerClass(null);
    controller.renderAllElements = vi.fn();
    controller._layoutPrefetchTokens.set(1, 'stale-token');
    const generation = controller._layoutRequestGeneration;

    useAppStore.setState({ styleConfig: { labelOffsets: { DEFAULT: 30, EXTENSION: 5 } } });

    expect(controller._layoutPrefetchTokens.size).toBe(0);
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

  it('stores the semantic timeline tree index supplied by the animation runner', () => {
    useAppStore.setState({
      treeList: [
        { id: 'tree-0', split_indices: [0], children: [] },
        { id: 'tree-1', split_indices: [1], children: [] },
        { id: 'tree-2', split_indices: [2], children: [] },
        { id: 'tree-3', split_indices: [3], children: [] },
      ],
    });
    controller = new ControllerClass(null);

    controller.animationRunner.updateProgress(0.1, {
      timelineProgress: 0.4,
      frameIndex: 2,
    });

    const state = useAppStore.getState();
    expect(state.playhead.animationProgress).toBe(0.1);
    expect(state.playhead.timelineProgress).toBe(0.4);
    expect(state.frameIndex).toBe(2);
  });

  it('uses runner-resolved interpolation inputs for comparison animation frames', async () => {
    controller = Object.create(ControllerClass.prototype);
    const dataFrom = { max_radius: 100, nodes: [], links: [], labels: [], extensions: [] };
    const dataTo = { max_radius: 120, nodes: [], links: [], labels: [], extensions: [] };
    const transitionChangeModel = { hasLifecycleChanges: true };
    const interpolatedData = { max_radius: 110, nodes: [], links: [], labels: [], extensions: [] };
    const buildInterpolationInputs = vi.fn();
    const renderComparisonAnimated = vi.fn(() => Promise.resolve());
    const interpolateTreeData = vi.fn(() => interpolatedData);

    controller.width = 800;
    controller.height = 600;
    controller.interpolationCache = { buildInterpolationInputs };
    controller.treeInterpolator = { interpolateTreeData };
    controller.layerManager = { renderComparisonAnimated, destroy: vi.fn() };
    controller.animationRunner = { stop: vi.fn() };
    controller._syncInterpolatorRootAngle = vi.fn();
    controller._getLinkGeometryMode = vi.fn(() => 'radial-elbow');

    await controller._renderComparisonFrameForRunner({ id: 'from-tree' }, { id: 'to-tree' }, 0.5, {
      fromTreeIndex: 0,
      toTreeIndex: 1,
      rawTimeFactor: 0.5,
      rightTree: { id: 'right-tree' },
      rightTreeIndex: 1,
      cachedInputs: { dataFrom, dataTo, transitionChangeModel },
    });

    expect(buildInterpolationInputs).not.toHaveBeenCalled();
    expect(interpolateTreeData).toHaveBeenCalledWith(
      dataFrom,
      dataTo,
      0.5,
      expect.objectContaining({
        transitionChangeModel,
        rawTimeFactor: 0.5,
      })
    );
    expect(renderComparisonAnimated).toHaveBeenCalledWith(
      expect.objectContaining({
        interpolatedData,
        rightIndex: 1,
      })
    );
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
        { id: 'replacement-tree-1', split_indices: [1], children: [] },
      ],
    });

    const secondToken = controller._createLayoutRequestToken(1, useAppStore.getState());

    expect(secondToken).not.toBe(firstToken);
  });

  it('reuses the prefetch layout cache key when creating request tokens', () => {
    controller = new ControllerClass(null);
    const createLayoutCacheKey = vi.spyOn(controller, '_createLayoutCacheKey');

    controller._prefetchFrame(1);

    const message = controller.layoutWorker.messages[0];
    expect(createLayoutCacheKey).toHaveBeenCalledTimes(1);
    expect(message.requestToken).toBe(
      `${controller._layoutRequestGeneration}|${message.data.options.layoutCacheKey}`
    );
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
    expect(controller._layoutPrefetchTokens.get(1)).toBe(
      controller.layoutWorker.messages[1].requestToken
    );
  });

  it('keeps moving taxa tracking out of worker layout prefetch payloads', () => {
    useAppStore.setState({
      subtreeHighlightTracking: [null, [[2, 3], [4]]],
    });
    controller = new ControllerClass(null);

    controller._prefetchFrame(1);

    expect(controller.layoutWorker.messages[0].data.options).not.toHaveProperty(
      'rotationAlignmentExcludeTaxa'
    );
    expect(controller.layoutWorker.messages[0].data.options.layoutCacheKey).not.toContain(
      'rotationAlignmentExcludeTaxa'
    );
  });

  it('syncs polar interpolation root angle from layout rotation before interpolation', () => {
    const controller = Object.create(ControllerClass.prototype);
    const interpolatedData = {};
    controller.width = 800;
    controller.height = 600;
    controller.interpolationCache = {
      buildInterpolationInputs: vi.fn(() => ({
        dataFrom: { max_radius: 100 },
        dataTo: { max_radius: 120 },
        transitionChangeModel: { changed: true },
      })),
    };
    controller.treeInterpolator = {
      setRootAngle: vi.fn(),
      interpolateTreeData: vi.fn(() => interpolatedData),
    };

    useAppStore.setState({ layoutRotationDegrees: 90 });

    const result = controller._buildInterpolatedData({ id: 'a' }, { id: 'b' }, 0.5, {
      fromTreeIndex: 0,
      toTreeIndex: 1,
      stage: 'COLLAPSE',
    });

    expect(controller.treeInterpolator.setRootAngle).toHaveBeenCalledWith(Math.PI / 2);
    expect(controller.treeInterpolator.interpolateTreeData).toHaveBeenCalledOnce();
    expect(controller.treeInterpolator.interpolateTreeData.mock.calls[0][3]).toMatchObject({
      stage: 'COLLAPSE',
    });
    expect(result).toBe(interpolatedData);
  });

  it('does not shrink node and link styles again for small rendered trees', () => {
    const controller = Object.create(ControllerClass.prototype);
    controller.width = 800;
    controller.height = 600;
    controller._syncInterpolatorRootAngle = vi.fn();
    controller._getLinkGeometryMode = () => 'radial-elbow';
    controller.treeInterpolator = {
      interpolateTreeData: vi.fn(() => ({
        nodes: [],
        links: [],
        labels: [],
        extensions: [],
        max_radius: 40,
      })),
    };

    const interpolatedData = controller._buildInterpolatedDataFromInputs(
      { max_radius: 40 },
      { max_radius: 40 },
      0
    );

    expect(interpolatedData.metricScale).toBe(1);
  });

  it('does not re-prefetch when only moving taxa tracking changes', () => {
    controller = new ControllerClass(null);

    controller._prefetchFrame(1);
    expect(controller.layoutWorker.messages).toHaveLength(1);

    useAppStore.setState({
      subtreeHighlightTracking: [null, [[2, 3], [4]]],
    });

    controller._prefetchFrame(1);

    expect(controller.layoutWorker.messages).toHaveLength(1);
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
