
import { expect } from 'chai';
import sinon from 'sinon';
import { InterpolationCache } from '../src/treeVisualisation/deckgl/interpolation/InterpolationCache.js';

describe('InterpolationCache', () => {
  let cache;
  let dependencies;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

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

});
