import { useAppStore } from '../../../core/store.js';
import memoizeOne from 'memoize-one';

export class InterpolationCache {
  constructor({
    calculateLayout,
    getConsistentRadii,
    convertTreeToLayerData,
    getDimensions,
    getBranchTransformation
  }) {
    this.calculateLayout = calculateLayout;
    this.getConsistentRadii = getConsistentRadii;
    this.convertTreeToLayerData = convertTreeToLayerData;
    this.getDimensions = getDimensions;
    this.getBranchTransformation = getBranchTransformation;

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
      (fromTreeData, toTreeData, fromTreeIndex, toTreeIndex, width, height, branchTransformation) => {
        // width, height, and branchTransformation are passed to invalidate cache on change.
        const { dataFrom, dataTo } = this.buildInterpolationInputs(
          fromTreeData,
          toTreeData,
          fromTreeIndex,
          toTreeIndex
        );

        if (!dataFrom || !dataTo) {
          return { dataFrom: null, dataTo: null };
        }

        return { dataFrom, dataTo };
      }
    );
  }

  getOrCacheInterpolationData(fromTreeData, toTreeData, fromTreeIndex, toTreeIndex) {
    const branchTransformation = this.getBranchTransformation?.();
    const { width, height } = this.getDimensions?.() || {};

    return this._memoizedGet(
      fromTreeData,
      toTreeData,
      fromTreeIndex,
      toTreeIndex,
      width,
      height,
      branchTransformation
    );
  }

  buildInterpolationInputs(fromTreeData, toTreeData, fromTreeIndex, toTreeIndex) {
    const preFrom = this._precomputedCache.get(fromTreeIndex);
    const preTo = this._precomputedCache.get(toTreeIndex);

    // Helper to get radii from dimensions (mirroring _getConsistentRadii logic)
    const getRadiiFromDims = () => {
      const { width, height } = this.getDimensions?.() || { width: 800, height: 600 };
      // Mock layout for getConsistentRadii
      return this.getConsistentRadii({ width, height, margin: 60 });
    };

    let dataFrom, dataTo;

    // 1. Get Data From (Cache or Calc)
    if (preFrom) {
      dataFrom = preFrom.layerData;
    } else {
      const layoutFrom = this._calculateLayout(fromTreeData, fromTreeIndex);
      if (layoutFrom) {
        const { extensionRadius, labelRadius } = this.getConsistentRadii(layoutFrom);
        dataFrom = this._convertLayoutToLayerData(layoutFrom, extensionRadius, labelRadius);
      }
    }

    // 2. Get Data To (Cache or Calc)
    if (preTo) {
      dataTo = preTo.layerData;
    } else {
      const layoutTo = this._calculateLayout(toTreeData, toTreeIndex);
      if (layoutTo) {
        // If we calculated layoutFrom, we use its radii. If not, we estimate from dims.
        // In practice, radii are constant for a given container size.
        const { extensionRadius, labelRadius } = getRadiiFromDims();
        dataTo = this._convertLayoutToLayerData(layoutTo, extensionRadius, labelRadius);
      }
    }

    if (!dataFrom || !dataTo) {
      return { dataFrom: null, dataTo: null };
    }

    return { dataFrom, dataTo };
  }

  _calculateLayout(treeData, treeIndex) {
    const state = useAppStore.getState();

    let trackingIndex = treeIndex;
    if (state.transitionResolver?.getSourceTreeIndex) {
      const sourceIndex = state.transitionResolver.getSourceTreeIndex(treeIndex);
      if (!state.subtreeTracking?.[treeIndex] && state.subtreeTracking?.[sourceIndex]) {
        trackingIndex = sourceIndex;
      }
    }

    const movingTaxa = Array.isArray(state?.subtreeTracking?.[trackingIndex]) && state.subtreeTracking[trackingIndex]?.length
      ? state.subtreeTracking[trackingIndex].flat()
      : null;

    return this.calculateLayout(treeData, {
      treeIndex,
      updateController: false,
      rotationAlignmentExcludeTaxa: movingTaxa
    });
  }

  _convertLayoutToLayerData(layout, extensionRadius, labelRadius) {
    const layerData = this.convertTreeToLayerData(
      layout.tree,
      {
        extensionRadius,
        labelRadius,
        canvasWidth: layout.width,
        canvasHeight: layout.height
      }
    );
    // Attach metadata for adaptive scaling
    layerData.max_radius = layout.max_radius;
    return layerData;
  }
}
