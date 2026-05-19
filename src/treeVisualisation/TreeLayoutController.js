import { selectActiveTreeList, useAppStore } from '../state/phyloStore/store.js';
import { transformBranchLengths } from "../domain/tree/branchTransform.js";
import { TidyTreeLayout } from "./layout/TidyTreeLayout.js";
import calculateScales, { getMaxScaleValue } from "../domain/tree/scaleUtils.js";
import { createLayoutCacheKey, createTransformCacheKey, createUniformScalingCacheKey } from './utils/layoutCacheKey.js';
import { createLayoutResult } from './layout/LayoutResultAdapter.js';

export class TreeLayoutController {

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  constructor(container = null) {
    this._scalingState = {
      cacheKey: null
    };
    this._transformedCache = new Map();
    this._layoutResultCache = new Map();
    this._onResize = null;
    this.maxGlobalScale = null;

    const node = container || null;
    const rect = node ? node.getBoundingClientRect() : { width: 800, height: 600 };
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);

    // Resize handling is delegated to DeckGLContext or external driver
  }

  /*
   * Updates controller dimensions. Called by external driver (DeckGLContext).
   */
  resize({ width, height }) {
    const nextWidth = Number.isFinite(width) ? width : this.width;
    const nextHeight = Number.isFinite(height) ? height : this.height;

    if (nextWidth !== this.width || nextHeight !== this.height) {
      this.width = nextWidth;
      this.height = nextHeight;
      this._onResize?.({ width: this.width, height: this.height });
    }
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  setOnResize(callback) {
    this._onResize = typeof callback === 'function' ? callback : null;
  }

  destroy() {
    this._onResize = null;
    this.clearLayoutCache();
  }

  clearLayoutCache() {
    this._layoutResultCache?.clear();
  }

  // ==========================================================================
  // UNIFORM SCALING
  // ==========================================================================

  /**
   * Initializes the uniform scaling system using global maximum scale.
   * Ensures consistent radii across input and transition trees.
   */
  initializeUniformScaling(branchTransformation = 'none') {
    const state = useAppStore.getState();
    const treeList = selectActiveTreeList(state);
    const { transitionResolver } = state;
    const scalingCacheKey = createUniformScalingCacheKey({ state, treeList, branchTransformation });

    if (!Array.isArray(treeList) || treeList.length === 0) {
      this.maxGlobalScale = null;
      this._scalingState.cacheKey = scalingCacheKey;
      return;
    }

    if (this._isScalingCacheValid(scalingCacheKey)) {
      return;
    }

    const fullTreeIndices = transitionResolver?.fullTreeIndices || Array.from({ length: treeList.length }, (_, i) => i);
    const transformedTreeList = this._getOrCacheTransformedTrees(treeList, branchTransformation, state);
    const scaleList = calculateScales(transformedTreeList, fullTreeIndices);

    this.maxGlobalScale = getMaxScaleValue(scaleList);

    this._scalingState.cacheKey = scalingCacheKey;
  }

  _isScalingCacheValid(scalingCacheKey) {
    return (
      hasUniformScaleValue(this.maxGlobalScale) &&
      this._scalingState.cacheKey === scalingCacheKey
    );
  }

  // ==========================================================================
  // LAYOUT CALCULATION
  // ==========================================================================

  /**
   * Calculates tree layout with branch transformations and caching.
   */
  calculateLayout(treeData, options = {}) {
    const { treeIndex } = options;
    const state = useAppStore.getState();
    const {
      branchTransformation,
      layoutAngleDegrees,
      layoutRotationDegrees,
    } = state;
    const treeList = selectActiveTreeList(state);

    // initializeUniformScaling is cache-guarded and also catches dataset reference changes.
    this.initializeUniformScaling(branchTransformation);

    const transformCacheKey = createTransformCacheKey({ state, treeList, branchTransformation });
    const transformedTreeData = this._getTransformedTreeData(
      treeData,
      branchTransformation,
      treeIndex,
      transformCacheKey,
      treeList
    );
    if (!transformedTreeData) {
      console.warn('calculateLayout: No tree data available');
      return null;
    }

    const layoutCacheKey = this._getLayoutResultCacheKey({
      state,
      treeList,
      treeData,
      treeIndex
    });
    if (layoutCacheKey) {
      const cachedLayout = this._layoutResultCache.get(layoutCacheKey);
      if (cachedLayout) return cachedLayout;
    }

    const layout = this._computeLayout(transformedTreeData, layoutAngleDegrees, layoutRotationDegrees);
    if (layoutCacheKey && layout) {
      layout.layoutCacheKey = layoutCacheKey;
      this._layoutResultCache.set(layoutCacheKey, layout);
    }

    return layout;
  }

  _getLayoutResultCacheKey({ state, treeList, treeData, treeIndex }) {
    if (
      !Number.isInteger(treeIndex) ||
      !Array.isArray(treeList) ||
      treeList[treeIndex] !== treeData
    ) {
      return null;
    }

    return createLayoutCacheKey({
      state,
      treeList,
      treeIndex,
      width: this.width,
      height: this.height,
      maxGlobalScale: this.maxGlobalScale
    });
  }

  _getTransformedTreeData(treeData, branchTransformation, treeIndex, transformCacheKey, treeList = null) {
    const cached = this._transformedCache.get(transformCacheKey);
    const canUseIndexedCache = (
      typeof treeIndex === 'number' &&
      Array.isArray(treeList) &&
      treeList[treeIndex] === treeData
    );
    if (
      cached &&
      cached.transformedList &&
      canUseIndexedCache
    ) {
      return cached.transformedList[treeIndex];
    }
    if (treeData && branchTransformation === 'none') {
      return treeData;
    }
    if (treeData) {
      return transformBranchLengths(treeData, branchTransformation);
    }
    return null;
  }

  _computeLayout(transformedTreeData, layoutAngleDegrees, layoutRotationDegrees) {
    const layoutCalculator = new TidyTreeLayout(transformedTreeData);
    layoutCalculator.setDimension(this.width, this.height);
    layoutCalculator.setMargin(60);
    layoutCalculator.setAngleExtentDegrees(layoutAngleDegrees);
    layoutCalculator.setAngleOffsetDegrees(layoutRotationDegrees);

    const layoutResult = hasUniformScaleValue(this.maxGlobalScale)
      ? layoutCalculator.constructRadialTreeWithUniformScaling(this.maxGlobalScale)
      : layoutCalculator.constructRadialTree(false);

    return createLayoutResult(layoutResult, {
      max_radius: layoutCalculator.getMaxRadius(layoutResult),
      width: this.width,
      height: this.height,
      margin: layoutCalculator.margin,
      scale: layoutCalculator.scale
    });
  }

  // ==========================================================================
  // RADII CALCULATION
  // ==========================================================================

  /**
   * Calculates label and extension radii with dynamic positioning.
   */
  _getConsistentRadii(layout) {
    const { styleConfig } = useAppStore.getState();
    const offsets = styleConfig?.labelOffsets || { DEFAULT: 20, EXTENSION: 5 };
    const globalRenderedRadius = this._getStableGlobalRenderedRadius(layout);
    const layoutRadius = Number(layout?.max_radius);
    const baseRadius = Number.isFinite(globalRenderedRadius)
      ? globalRenderedRadius
      : Number.isFinite(layoutRadius)
      ? Math.max(0, layoutRadius)
      : Math.max(0, Math.min(layout.width - layout.margin * 2, layout.height - layout.margin * 2) / 2);

    const extensionRadius = baseRadius + (offsets.EXTENSION ?? 5);
    const labelRadius = extensionRadius + (offsets.DEFAULT ?? 20);

    return {
      extensionRadius,
      labelRadius,
    };
  }

  _getStableGlobalRenderedRadius(layout) {
    const maxScale = Number(this.maxGlobalScale);
    const layoutScale = Number(layout?.scale);
    if (!hasUniformScaleValue(this.maxGlobalScale) || !Number.isFinite(layoutScale)) return null;

    return Math.max(0, maxScale * layoutScale);
  }

  // ==========================================================================
  // TREE TRANSFORMATION CACHE
  // ==========================================================================

  _getOrCacheTransformedTrees(treeList, branchTransformation, state = useAppStore.getState()) {
    if (!Array.isArray(treeList)) {
      return [];
    }
    if (branchTransformation === 'none') {
      return treeList;
    }

    const transformCacheKey = createTransformCacheKey({ state, treeList, branchTransformation });
    const cached = this._transformedCache.get(transformCacheKey);
    if (cached) {
      return cached.transformedList;
    }

    const transformedList = treeList.map(treeData => transformBranchLengths(treeData, branchTransformation));

    this._transformedCache.set(transformCacheKey, {
      transformedList
    });

    return transformedList;
  }
}

function hasUniformScaleValue(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}
