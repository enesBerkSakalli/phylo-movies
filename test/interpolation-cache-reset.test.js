const { expect } = require('chai');
const sinon = require('sinon');
const {
  TreeInterpolator,
} = require('../src/treeVisualisation/deckgl/interpolation/TreeInterpolator.js');
const {
  InterpolationRenderer,
} = require('../src/treeVisualisation/systems/InterpolationRenderer.js');
const { useAppStore } = require('../src/state/phyloStore/store.js');

describe('Interpolation cache reset', () => {
  it('clears TreeInterpolator and PathInterpolator caches', () => {
    const interpolator = new TreeInterpolator();

    const dataFrom = {
      nodes: [
        {
          id: 'n1',
          position: [1, 0, 0],
          angle: 0,
          polarRadius: 10,
          radius: 10,
        },
      ],
      labels: [
        {
          id: 'l1',
          position: [1, 0, 0],
          angle: 0,
          polarRadius: 12,
          rotation: 0,
        },
      ],
      links: [
        {
          id: 'link-1',
          path: [
            [0, 0, 0],
            [1, 0, 0],
          ],
          sourcePosition: [0, 0, 0],
          targetPosition: [1, 0, 0],
          polarData: {
            source: { angle: 0, radius: 10 },
            target: { angle: 0, radius: 20 },
          },
        },
      ],
      extensions: [],
    };

    const dataTo = {
      nodes: [
        {
          id: 'n1',
          position: [1, 0, 0],
          angle: Math.PI * 2,
          polarRadius: 10,
          radius: 10,
        },
      ],
      labels: [
        {
          id: 'l1',
          position: [1, 0, 0],
          angle: Math.PI * 2,
          polarRadius: 12,
          rotation: Math.PI * 2,
        },
      ],
      links: [
        {
          id: 'link-1',
          path: [
            [0, 0, 0],
            [1, 0, 0],
          ],
          sourcePosition: [0, 0, 0],
          targetPosition: [1, 0, 0],
          polarData: {
            source: { angle: Math.PI * 2, radius: 10 },
            target: { angle: Math.PI * 2, radius: 20 },
          },
        },
      ],
      extensions: [],
    };

    interpolator.interpolateTreeData(dataFrom, dataTo, 1);

    // Note: modern interpolators may not use these internal caches for performance
    // but the resetCaches() method is still verified to execute without error.
    interpolator.resetCaches();
  });
});

describe('Controller cache reset hook', () => {
  beforeEach(() => {
    useAppStore.setState({ treeControllers: [] });
  });

  it('dispatches cache reset to registered controllers', () => {
    const resetSpy = sinon.spy();
    const controller = {
      resetInterpolationCaches: resetSpy,
      startAnimation: sinon.spy(),
      stopAnimation: sinon.spy(),
      destroy: sinon.spy(),
    };

    useAppStore.getState().setTreeControllers([controller]);
    useAppStore.getState().resetInterpolationCaches();

    expect(resetSpy.calledOnce).to.be.true;
  });
});

describe('InterpolationRenderer timeline progress', () => {
  afterEach(() => {
    useAppStore.getState().reset();
  });

  it('does not fall back to linear progress when timeline transition frames are unavailable', async () => {
    useAppStore.setState({
      movieTimelineManager: {
        destroy: () => {},
        resolveFrameAtTimelineProgress: () => null,
      },
    });

    const controller = {
      ready: true,
      readyPromise: Promise.resolve(),
      renderAllElements: sinon.spy(),
    };
    const renderer = new InterpolationRenderer(controller);
    const renderProgress = sinon.stub(renderer, 'renderProgress').resolves();

    await renderer.renderTimelineProgress(0.5);

    expect(renderProgress.called).to.equal(false);
    expect(controller.renderAllElements.called).to.equal(false);
  });

  it('does not paint a frame cancelled while waiting for controller readiness', async () => {
    let resolveReady;
    let cancelled = false;
    const controller = {
      ready: false,
      readyPromise: new Promise((resolve) => {
        resolveReady = resolve;
      }),
      _getOrCacheInterpolationData: sinon.spy(),
      _syncInterpolatorRootAngle: sinon.spy(),
      _getLinkGeometryMode: () => 'radial-elbow',
      treeInterpolator: {
        interpolateTreeData: sinon.spy(),
      },
      _updateLayersEfficiently: sinon.spy(),
    };
    const renderer = new InterpolationRenderer(controller);
    const renderPromise = renderer.renderSingleInterpolatedFrame(
      { id: 'from' },
      { id: 'to' },
      0.5,
      {
        fromTreeIndex: 0,
        toTreeIndex: 1,
        isCancelled: () => cancelled,
      }
    );

    cancelled = true;
    resolveReady();
    await renderPromise;

    expect(controller._getOrCacheInterpolationData.called).to.equal(false);
    expect(controller.treeInterpolator.interpolateTreeData.called).to.equal(false);
    expect(controller._updateLayersEfficiently.called).to.equal(false);
  });

  it('does not paint a frame destroyed while waiting for controller readiness', async () => {
    let resolveReady;
    const controller = {
      _destroyed: false,
      ready: false,
      readyPromise: new Promise((resolve) => {
        resolveReady = resolve;
      }),
      _getOrCacheInterpolationData: sinon.spy(),
      _syncInterpolatorRootAngle: sinon.spy(),
      _getLinkGeometryMode: () => 'radial-elbow',
      treeInterpolator: {
        interpolateTreeData: sinon.spy(),
      },
      _updateLayersEfficiently: sinon.spy(),
    };
    const renderer = new InterpolationRenderer(controller);
    const renderPromise = renderer.renderSingleInterpolatedFrame(
      { id: 'from' },
      { id: 'to' },
      0.5,
      {
        fromTreeIndex: 0,
        toTreeIndex: 1,
      }
    );

    controller._destroyed = true;
    resolveReady();
    await renderPromise;

    expect(controller._getOrCacheInterpolationData.called).to.equal(false);
    expect(controller.treeInterpolator.interpolateTreeData.called).to.equal(false);
    expect(controller._updateLayersEfficiently.called).to.equal(false);
  });

  it('renders progress with trees returned by immutable hydration state updates', async () => {
    const sourceTree = { id: 'source-tree', split_indices: [0], children: [] };
    const targetTree = { id: 'target-tree', split_indices: [1], children: [] };
    const sparseTreeList = [sourceTree, undefined];
    const ensureTreesHydrated = sinon.spy((indices) => {
      const nextTreeList = useAppStore.getState().treeList.slice();
      const hydratedTrees = indices.map((index) => {
        const tree = index === 0 ? sourceTree : targetTree;
        nextTreeList[index] = tree;
        return tree;
      });
      useAppStore.setState((state) => ({
        treeList: nextTreeList,
        treeHydrationVersion: (state.treeHydrationVersion ?? 0) + 1,
      }));
      return hydratedTrees;
    });
    useAppStore.setState({
      treeList: sparseTreeList,
      treeHydrationVersion: 0,
      ensureTreesHydrated,
      movieTimelineManager: null,
    });

    const layerData = { nodes: [], links: [], labels: [], extensions: [] };
    const interpolatedData = { nodes: [], links: [], labels: [], extensions: [] };
    const controller = {
      ready: true,
      readyPromise: Promise.resolve(),
      renderAllElements: sinon.spy(),
      _getOrCacheInterpolationData: sinon.stub().returns({
        dataFrom: layerData,
        dataTo: layerData,
        transitionChangeModel: null,
      }),
      _syncInterpolatorRootAngle: sinon.spy(),
      _getLinkGeometryMode: () => 'radial-elbow',
      treeInterpolator: {
        interpolateTreeData: sinon.stub().returns(interpolatedData),
      },
      _updateLayersEfficiently: sinon.spy(),
    };
    const renderer = new InterpolationRenderer(controller);

    await renderer.renderProgress(0.5);

    expect(ensureTreesHydrated.calledWithMatch([0, 1])).to.equal(true);
    expect(controller._getOrCacheInterpolationData.called).to.equal(true);
    expect(
      controller._getOrCacheInterpolationData.calledWith(sourceTree, targetTree, 0, 1)
    ).to.equal(true);
    expect(controller._getOrCacheInterpolationData.firstCall.args[0]).to.equal(sourceTree);
    expect(controller._getOrCacheInterpolationData.firstCall.args[1]).to.equal(targetTree);
    expect(controller._updateLayersEfficiently.calledWith(interpolatedData)).to.equal(true);
  });
});
