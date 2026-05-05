
import { expect } from 'chai';
import sinon from 'sinon';
import { InterpolationCache } from '../../src/treeVisualisation/deckgl/interpolation/InterpolationCache.js';

describe('InterpolationCache', () => {
  let cache;
  let dependencies;
  let sandbox;
  let dimensions;
  let branchTransformation;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    dimensions = { width: 800, height: 600 };
    branchTransformation = 'linear';

    dependencies = {
      calculateLayout: sandbox.stub(),
      getConsistentRadii: sandbox.stub().returns({ extensionRadius: 10, labelRadius: 20 }),
      convertTreeToLayerData: sandbox.stub().returns({ some: 'layerData' }),
      getLayoutCacheKey: sandbox.stub().callsFake((treeIndex) => (
        `layout-${treeIndex}-${dimensions.width}-${dimensions.height}-${branchTransformation}`
      ))
    };

    cache = new InterpolationCache(dependencies);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('requires a layout cache key provider', () => {
    const { getLayoutCacheKey, ...missingKeyDependencies } = dependencies;
    expect(() => new InterpolationCache(missingKeyDependencies)).to.throw('getLayoutCacheKey');
  });

  /* Wrapper for internal state check - removed in refactor
  it('should initialize with null cache', () => {
    expect(cache._cachedInterpolationData).to.be.null;
  });
  */

  it('should calculate data on first call', () => {
    const tree1 = { id: 1 };
    const tree2 = { id: 2 };
    const layout1 = { layoutTree: tree1, width: 800, height: 600 };
    const layout2 = { layoutTree: tree2, width: 800, height: 600 };

    dependencies.calculateLayout.withArgs(tree1).returns(layout1);
    dependencies.calculateLayout.withArgs(tree2).returns(layout2);
    dependencies.convertTreeToLayerData.withArgs(layout1).returns('layerData1');
    dependencies.convertTreeToLayerData.withArgs(layout2).returns('layerData2');

    const result = cache.getOrCacheInterpolationData(tree1, tree2, 0, 1);

    expect(dependencies.calculateLayout.calledTwice).to.be.true;
    expect(dependencies.convertTreeToLayerData.calledTwice).to.be.true;
    expect(result).to.deep.equal({ dataFrom: 'layerData1', dataTo: 'layerData2' });
  });

  it('should return cached data on subsequent identical calls', () => {
    const tree1 = { id: 1 };
    const tree2 = { id: 2 };
    const layout1 = { layoutTree: tree1, width: 800, height: 600 };
    const layout2 = { layoutTree: tree2, width: 800, height: 600 };

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
    dimensions = { width: 900, height: 600 };

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
    branchTransformation = 'sigmoid';

    cache.getOrCacheInterpolationData(tree1, tree2, 0, 1);

    expect(dependencies.calculateLayout.called).to.be.true;
  });

  it('should re-calculate if the shared layout cache key changes', () => {
    const tree1 = { id: 1 };
    const tree2 = { id: 2 };
    let layoutVersion = 'initial';
    dependencies.getLayoutCacheKey = sandbox.stub().callsFake((treeIndex) => `layout-${treeIndex}-${layoutVersion}`);
    cache = new InterpolationCache(dependencies);

    dependencies.calculateLayout.returns({});
    dependencies.convertTreeToLayerData.returns({});

    cache.getOrCacheInterpolationData(tree1, tree2, 0, 1);

    dependencies.calculateLayout.resetHistory();
    layoutVersion = 'next';

    cache.getOrCacheInterpolationData(tree1, tree2, 0, 1);

    expect(dependencies.calculateLayout.called).to.be.true;
  });

  it('ignores precomputed worker data with stale layout cache keys', () => {
    const tree1 = { id: 1 };
    const tree2 = { id: 2 };
    const layout1 = { layoutTree: tree1, width: 800, height: 600, layoutCacheKey: 'current-0', max_radius: 42 };
    dependencies.getLayoutCacheKey = sandbox.stub().callsFake((treeIndex) => `current-${treeIndex}`);
    cache = new InterpolationCache(dependencies);

    cache.setPrecomputedData(0, {
      layerData: { layoutCacheKey: 'stale-0', source: 'stale-from' }
    });
    cache.setPrecomputedData(1, {
      layerData: { layoutCacheKey: 'current-1', source: 'precomputed-to' }
    });
    dependencies.calculateLayout.withArgs(tree1).returns(layout1);
    dependencies.convertTreeToLayerData.withArgs(layout1).returns({
      layoutCacheKey: 'current-0',
      source: 'recalculated-from'
    });

    const result = cache.getOrCacheInterpolationData(tree1, tree2, 0, 1);

    expect(dependencies.calculateLayout.calledOnce).to.be.true;
    expect(dependencies.calculateLayout.firstCall.args[0]).to.equal(tree1);
    expect(result).to.deep.equal({
      dataFrom: { layoutCacheKey: 'current-0', source: 'recalculated-from', max_radius: 42 },
      dataTo: { layoutCacheKey: 'current-1', source: 'precomputed-to' }
    });
  });

  it('preserves layout cache keys on synchronously calculated layer data', () => {
    const tree1 = { id: 1 };
    const tree2 = { id: 2 };
    const layout1 = { layoutTree: tree1, width: 800, height: 600, layoutCacheKey: 'current-0', max_radius: 42 };
    const layout2 = { layoutTree: tree2, width: 800, height: 600, layoutCacheKey: 'current-1', max_radius: 84 };
    dependencies.getLayoutCacheKey = sandbox.stub().callsFake((treeIndex) => `current-${treeIndex}`);
    cache = new InterpolationCache(dependencies);

    dependencies.calculateLayout.withArgs(tree1).returns(layout1);
    dependencies.calculateLayout.withArgs(tree2).returns(layout2);
    dependencies.convertTreeToLayerData.withArgs(layout1).returns({ source: 'from' });
    dependencies.convertTreeToLayerData.withArgs(layout2).returns({ source: 'to' });

    const result = cache.getOrCacheInterpolationData(tree1, tree2, 0, 1);

    expect(result).to.deep.equal({
      dataFrom: { source: 'from', max_radius: 42, layoutCacheKey: 'current-0' },
      dataTo: { source: 'to', max_radius: 84, layoutCacheKey: 'current-1' }
    });
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

});
