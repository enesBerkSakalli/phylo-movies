import memoizeOne from 'memoize-one';
import { buildTransitionChangeModel } from './TransitionChangeModel.js';

export class InterpolationCache {
  constructor({
    calculateLayout,
    getConsistentRadii,
    convertTreeToLayerData,
    getLayoutCacheKey,
    getRotationAlignmentExcludeTaxa = () => [],
    getLinkGeometryMode = () => 'radial-elbow'
  }) {
    if (typeof getLayoutCacheKey !== 'function') {
      throw new Error('InterpolationCache requires getLayoutCacheKey');
    }

    this.calculateLayout = calculateLayout;
    this.getConsistentRadii = getConsistentRadii;
    this.convertTreeToLayerData = convertTreeToLayerData;
    this.getLayoutCacheKey = getLayoutCacheKey;
    this.getRotationAlignmentExcludeTaxa = getRotationAlignmentExcludeTaxa;
    this.getLinkGeometryMode = getLinkGeometryMode;

    this._precomputedCache = new Map();
    this._createMemoizedFunction();
  }

  setPrecomputedData(treeIndex, data) {
    this._precomputedCache.set(treeIndex, data);
  }

  reset() {
    this._precomputedCache.clear();
    this._createMemoizedFunction();
  }

  _createMemoizedFunction() {
    this._memoizedGet = memoizeOne(
      (fromTreeData, toTreeData, fromTreeIndex, toTreeIndex, fromLayoutCacheKey, toLayoutCacheKey) => {
        // Layout cache keys carry the render-affecting inputs that invalidate cached layer data.
        const { dataFrom, dataTo, transitionChangeModel } = this.buildInterpolationInputs(
          fromTreeData,
          toTreeData,
          fromTreeIndex,
          toTreeIndex,
          fromLayoutCacheKey,
          toLayoutCacheKey
        );

        if (!dataFrom || !dataTo) {
          return { dataFrom: null, dataTo: null };
        }

        const result = { dataFrom, dataTo };
        if (transitionChangeModel) result.transitionChangeModel = transitionChangeModel;
        return result;
      }
    );
  }

  getOrCacheInterpolationData(fromTreeData, toTreeData, fromTreeIndex, toTreeIndex) {
    const fromLayoutCacheKey = this._getLayoutCacheKey(fromTreeIndex);
    const toLayoutCacheKey = this._getLayoutCacheKey(toTreeIndex);

    return this._memoizedGet(
      fromTreeData,
      toTreeData,
      fromTreeIndex,
      toTreeIndex,
      fromLayoutCacheKey,
      toLayoutCacheKey
    );
  }

  _getLayoutCacheKey(treeIndex) {
    return this.getLayoutCacheKey(treeIndex);
  }

  buildInterpolationInputs(
    fromTreeData,
    toTreeData,
    fromTreeIndex,
    toTreeIndex,
    fromLayoutCacheKey = this._getLayoutCacheKey(fromTreeIndex),
    toLayoutCacheKey = this._getLayoutCacheKey(toTreeIndex)
  ) {
    const preFrom = this._precomputedCache.get(fromTreeIndex);
    const preTo = this._precomputedCache.get(toTreeIndex);

    let dataFrom, dataTo;

    // 1. Get Data From (Cache or Calc)
    if (this._hasMatchingLayoutCacheKey(preFrom, fromLayoutCacheKey)) {
      dataFrom = preFrom.layerData;
    } else {
      const layoutFrom = this._calculateLayout(fromTreeData, fromTreeIndex);
      if (layoutFrom) {
        const { extensionRadius, labelRadius } = this.getConsistentRadii(layoutFrom);
        dataFrom = this._convertLayoutToLayerData(layoutFrom, extensionRadius, labelRadius, fromTreeIndex);
      }
    }

    // 2. Get Data To (Cache or Calc)
    if (this._hasMatchingLayoutCacheKey(preTo, toLayoutCacheKey)) {
      dataTo = preTo.layerData;
    } else {
      const layoutTo = this._calculateLayout(toTreeData, toTreeIndex);
      if (layoutTo) {
        const { extensionRadius, labelRadius } = this.getConsistentRadii(layoutTo);
        dataTo = this._convertLayoutToLayerData(layoutTo, extensionRadius, labelRadius, toTreeIndex);
      }
    }

    if (!dataFrom || !dataTo) {
      return { dataFrom: null, dataTo: null };
    }

    const transitionChangeModel = buildTransitionChangeModel(dataFrom, dataTo);
    const result = { dataFrom, dataTo };
    if (transitionChangeModel.hasLifecycleChanges) {
      result.transitionChangeModel = transitionChangeModel;
    }
    return result;
  }

  _hasMatchingLayoutCacheKey(precomputed, expectedLayoutCacheKey) {
    return Boolean(
      precomputed?.layerData &&
      precomputed.layerData.layoutCacheKey === expectedLayoutCacheKey
    );
  }

  _calculateLayout(treeData, treeIndex) {
    const rotationAlignmentExcludeTaxa = this.getRotationAlignmentExcludeTaxa(treeIndex);
    return this.calculateLayout(treeData, {
      treeIndex,
      rotationAlignmentExcludeTaxa
    });
  }

  _convertLayoutToLayerData(layout, extensionRadius, labelRadius, treeIndex) {
    const layerData = this.convertTreeToLayerData(
      layout,
      {
        extensionRadius,
        labelRadius,
        canvasWidth: layout.width,
        canvasHeight: layout.height,
        treeIndex,
        treeSide: 'left',
        renderMode: 'animation',
        linkGeometryMode: this.getLinkGeometryMode()
      }
    );
    if (layerData && typeof layerData === 'object') {
      layerData.max_radius = layout.max_radius;
      layerData.layoutCacheKey = layout.layoutCacheKey;
    }
    return layerData;
  }
}
