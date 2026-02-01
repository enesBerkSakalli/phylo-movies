
import { expect } from 'chai';
import sinon from 'sinon';
import { InterpolationCache } from '../src/js/treeVisualisation/deckgl/interpolation/InterpolationCache.js';
import { useAppStore } from '../src/js/core/store.js';

describe('InterpolationCache', () => {
  let cache;
  let dependencies;
  let sandbox;
  let mockState;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    // Mock store state
    mockState = {
      transitionResolver: {
        getSourceTreeIndex: sandbox.stub().returns(null)
      },
      subtreeTracking: {},
    };

    // Stub the singleton store's getState method
    // Note: If useAppStore is a function (hook) attached with getState, we verify that structure.
    // Based on previous files, useAppStore.getState() is standard vanilla zustand access.
    if (useAppStore.getState) {
      sandbox.stub(useAppStore, 'getState').returns(mockState);
    } else {
        // Fallback if structure is different
        console.warn('Warning: useAppStore.getState not found to stub');
    }


    dependencies = {
      calculateLayout: sandbox.stub(),
      getConsistentRadii: sandbox.stub().returns({ extensionRadius: 10, labelRadius: 20 }),
      convertTreeToLayerData: sandbox.stub().returns({ some: 'layerData' }),
      getDimensions: sandbox.stub().returns({ width: 800, height: 600 }),
      getBranchTransformation: sandbox.stub().returns('linear')
    };

    cache = new InterpolationCache(dependencies);
  });

  afterEach(() => {
    sandbox.restore();
  });

  /* Wrapper for internal state check - removed in refactor
  it('should initialize with null cache', () => {
    expect(cache._cachedInterpolationData).to.be.null;
  });
  */

  it('should calculate data on first call', () => {
    const tree1 = { id: 1 };
    const tree2 = { id: 2 };
    const layout1 = { tree: tree1, width: 800, height: 600 };
    const layout2 = { tree: tree2, width: 800, height: 600 };

    dependencies.calculateLayout.withArgs(tree1).returns(layout1);
    dependencies.calculateLayout.withArgs(tree2).returns(layout2);
    dependencies.convertTreeToLayerData.withArgs(tree1).returns('layerData1');
    dependencies.convertTreeToLayerData.withArgs(tree2).returns('layerData2');

    const result = cache.getOrCacheInterpolationData(tree1, tree2, 0, 1);

    expect(dependencies.calculateLayout.calledTwice).to.be.true;
    expect(dependencies.convertTreeToLayerData.calledTwice).to.be.true;
    expect(result).to.deep.equal({ dataFrom: 'layerData1', dataTo: 'layerData2' });
  });

  it('should return cached data on subsequent identical calls', () => {
    const tree1 = { id: 1 };
    const tree2 = { id: 2 };
    const layout1 = { tree: tree1, width: 800, height: 600 };
    const layout2 = { tree: tree2, width: 800, height: 600 };

    dependencies.calculateLayout.returns(layout1);
    dependencies.convertTreeToLayerData.returns('layerData');

    // First call
    cache.getOrCacheInterpolationData(tree1, tree2, 0, 1);

    // Reset stubs to ensure we don't count previous calls
    dependencies.calculateLayout.resetHistory();
    dependencies.convertTreeToLayerData.resetHistory();

    // Second call with same args
    const result = cache.getOrCacheInterpolationData(tree1, tree2, 0, 1);

    expect(dependencies.calculateLayout.called).to.be.false;
    expect(dependencies.convertTreeToLayerData.called).to.be.false;
    expect(result).to.deep.equal({ dataFrom: 'layerData', dataTo: 'layerData' });
  });

  it('should re-calculate if dimensions change', () => {
    const tree1 = { id: 1 };
    const tree2 = { id: 2 };

    // First call setup
    dependencies.calculateLayout.returns({});
    dependencies.convertTreeToLayerData.returns({});

    cache.getOrCacheInterpolationData(tree1, tree2, 0, 1);

    dependencies.calculateLayout.resetHistory();

    // Change dimensions
    dependencies.getDimensions.returns({ width: 900, height: 600 });

    cache.getOrCacheInterpolationData(tree1, tree2, 0, 1);

    expect(dependencies.calculateLayout.called).to.be.true;
  });

  it('should re-calculate if branch transformation changes', () => {
    const tree1 = { id: 1 };
    const tree2 = { id: 2 };

    dependencies.calculateLayout.returns({});
    dependencies.convertTreeToLayerData.returns({});

    cache.getOrCacheInterpolationData(tree1, tree2, 0, 1);

    dependencies.calculateLayout.resetHistory();

    // Change transformation
    dependencies.getBranchTransformation.returns('sigmoid');

    cache.getOrCacheInterpolationData(tree1, tree2, 0, 1);

    expect(dependencies.calculateLayout.called).to.be.true;
  });

  it('should reset cache via reset()', () => {
    const tree1 = { id: 1 };
    const tree2 = { id: 2 };

    dependencies.calculateLayout.returns({});
    dependencies.convertTreeToLayerData.returns({});

    cache.getOrCacheInterpolationData(tree1, tree2, 0, 1); // populate cache

    cache.reset();
    
    dependencies.calculateLayout.resetHistory();

    cache.getOrCacheInterpolationData(tree1, tree2, 0, 1); // should calc again
    expect(dependencies.calculateLayout.called).to.be.true;
  });

  it('should handle missing layout gracefully', () => {
     // simulate calculateLayout returning null
     dependencies.calculateLayout.returns(null);

     const result = cache.getOrCacheInterpolationData({}, {}, 0, 1);

     expect(result).to.deep.equal({ dataFrom: null, dataTo: null });
  });

  it('should use source tree index if transition resolver indicates mapping', () => {
      // Setup state to trigger the source tree logic:
      // if (state.transitionResolver?.getSourceTreeIndex) ...

      const treeIndex = 5;
      const sourceIndex = 2; // Different index

      mockState.transitionResolver.getSourceTreeIndex.returns(sourceIndex);
      // Ensure we hit the condition: !state.subtreeTracking?.[treeIndex] && state.subtreeTracking?.[sourceIndex]
      mockState.subtreeTracking = {
          [sourceIndex]: [[1, 2]] // some moving taxa at source
      };
      // No data at treeIndex (undefined)

      const treeData = { id: 'tree' };

      // We want to test _calculateLayout private logic calling calculateLayout with specific args

      // Override calculateLayout stub to verify arguments
      dependencies.calculateLayout.callsFake((data, options) => {
          return { tree: data, width: 100, height: 100 };
      });
      dependencies.convertTreeToLayerData.returns({});

      // Manually trigger calling internal logic via public method
      cache.getOrCacheInterpolationData(treeData, treeData, treeIndex, treeIndex);

      // Check that calculateLayout was called with rotationAlignmentExcludeTaxa from sourceIndex
      expect(dependencies.calculateLayout.called).to.be.true;
      const optionsArg = dependencies.calculateLayout.firstCall.args[1];

      // The moving taxa from [sourceIndex] should be passed
      expect(optionsArg.rotationAlignmentExcludeTaxa).to.deep.equal([1, 2]);
  });

});
