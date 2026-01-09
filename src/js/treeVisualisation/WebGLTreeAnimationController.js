import * as d3 from "d3";
import { useAppStore } from '../core/store.js';
import { transformBranchLengths } from "../domain/tree/branchTransform.js";
import { TidyTreeLayout } from "./layout/TidyTreeLayout.js";
import calculateScales, { getMaxScaleValue } from "../domain/tree/scaleUtils.js";

export class WebGLTreeAnimationController {

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  constructor(container = "#webgl-container") {
    this._scalingState = {
      branchTransformation: undefined,
      calculationTransformation: 'none'
    };
    this._transformedCache = new Map();
    this._onResize = null;
    this._resizeRaf = null;

    this.webglContainer = d3.select(container);

    const node = this.webglContainer.node();
    const rect = node ? node.getBoundingClientRect() : { width: 800, height: 600 };
    this.width = rect.width;
    this.height = rect.height;

    this._initializeResizeObserver(node);
  }

  _initializeResizeObserver(node) {
    if (!node || typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const nextWidth = Number.isFinite(width) ? width : this.width;
        const nextHeight = Number.isFinite(height) ? height : this.height;
        const changed = nextWidth !== this.width || nextHeight !== this.height;
        this.width = nextWidth;
        this.height = nextHeight;

        if (changed && this._onResize) {
          if (this._resizeRaf != null) {
            if (typeof cancelAnimationFrame === 'function') {
              cancelAnimationFrame(this._resizeRaf);
            } else {
              clearTimeout(this._resizeRaf);
            }
          }
          const schedule = typeof requestAnimationFrame === 'function'
            ? requestAnimationFrame
            : (cb) => setTimeout(cb, 16);
          this._resizeRaf = schedule(() => {
            this._resizeRaf = null;
            this._onResize?.({ width: this.width, height: this.height });
          });
        }
      }
    });
    this.resizeObserver.observe(node);
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  updateLayout(treeData, treeIndex = 0, cacheFunction = null) {
    return this.calculateLayout(treeData, {
      treeIndex,
      cacheFunction,
      updateController: true
    });
  }

  setOnResize(callback) {
    this._onResize = typeof callback === 'function' ? callback : null;
  }

  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this._resizeRaf != null) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this._resizeRaf);
      } else {
        clearTimeout(this._resizeRaf);
      }
      this._resizeRaf = null;
    }
    this._onResize = null;
  }

  // ==========================================================================
  // UNIFORM SCALING
  // ==========================================================================

  /**
   * Initializes the uniform scaling system using global maximum scale.
   * Ensures consistent radii across Anchor and Transition trees.
   */
  initializeUniformScaling(branchTransformation = 'none') {
    const { treeList, transitionResolver } = useAppStore.getState();
    const datasetToken = `${branchTransformation}::${treeList?.length || 0}`;

    if (this._isScalingCacheValid(branchTransformation, datasetToken, treeList)) {
      return;
    }

    const fullTreeIndices = transitionResolver?.fullTreeIndices || Array.from({ length: treeList.length }, (_, i) => i);
    const transformedTreeList = this._getOrCacheTransformedTrees(treeList, branchTransformation);

    this.globalScaleList = calculateScales(transformedTreeList, fullTreeIndices);
    this.maxGlobalScale = getMaxScaleValue(this.globalScaleList);
    this.uniformScalingEnabled = true;

    this._scalingState.calculationTransformation = branchTransformation;
    this._scalingState.datasetToken = datasetToken;
    this._scalingState.datasetRef = treeList;
  }

  _isScalingCacheValid(branchTransformation, datasetToken, treeList) {
    return (
      this.uniformScalingEnabled &&
      this.maxGlobalScale &&
      this._scalingState.calculationTransformation === branchTransformation &&
      this._scalingState.datasetToken === datasetToken &&
      this._scalingState.datasetRef === treeList
    );
  }

  _recalculateUniformScalingForTransformation(newTransformation) {
    if (this._scalingState.calculationTransformation !== newTransformation) {
      this.initializeUniformScaling(newTransformation);
    }
  }

  // ==========================================================================
  // LAYOUT CALCULATION
  // ==========================================================================

  /**
   * Calculates tree layout with branch transformations and caching.
   */
  calculateLayout(treeData, options = {}) {
    const { treeIndex, cacheFunction, updateController = false } = options;
    const { branchTransformation, layoutAngleDegrees, layoutRotationDegrees } = useAppStore.getState();

    this._handleTransformationChange(branchTransformation);

    const transformedTreeData = this._getTransformedTreeData(treeData, branchTransformation, treeIndex);
    if (!transformedTreeData) {
      console.warn('calculateLayout: No tree data available');
      return null;
    }

    const layout = this._computeLayout(transformedTreeData, layoutAngleDegrees, layoutRotationDegrees);

    if (updateController && cacheFunction && treeIndex !== undefined) {
      cacheFunction(treeIndex, layout);
    }

    return layout;
  }

  _handleTransformationChange(branchTransformation) {
    const transformationChanged = this._scalingState.branchTransformation !== undefined &&
      this._scalingState.branchTransformation !== branchTransformation;

    if (transformationChanged && this.uniformScalingEnabled) {
      this._recalculateUniformScalingForTransformation(branchTransformation);
    }

    this._scalingState.branchTransformation = branchTransformation;
  }

  _getTransformedTreeData(treeData, branchTransformation, treeIndex) {
    const cachedList = this._transformedCache.get(branchTransformation);
    if (cachedList && typeof treeIndex === 'number') {
      return cachedList[treeIndex];
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
    layoutCalculator.setAngleExtentDegrees(layoutAngleDegrees || 360);
    layoutCalculator.setAngleOffsetDegrees(layoutRotationDegrees || 0);

    const layoutResult = this.uniformScalingEnabled && this.globalScaleList && this.maxGlobalScale
      ? layoutCalculator.constructRadialTreeWithUniformScaling(this.maxGlobalScale)
      : layoutCalculator.constructRadialTree();

    return {
      tree: layoutResult,
      max_radius: layoutCalculator.getMaxRadius(layoutResult),
      width: this.width,
      height: this.height,
      margin: layoutCalculator.margin,
      scale: layoutCalculator.scale
    };
  }

  // ==========================================================================
  // RADII CALCULATION
  // ==========================================================================

  /**
   * Calculates label and extension radii with dynamic positioning.
   */
  _getConsistentRadii(layout, branchTransformation = null) {
    const containerWidth = layout.width - layout.margin * 2;
    const containerHeight = layout.height - layout.margin * 2;
    const maxLeafRadius = Math.min(containerWidth, containerHeight) / 2;

    const { styleConfig } = useAppStore.getState();
    const offsets = styleConfig?.labelOffsets || { DEFAULT: 20, EXTENSION: 5 };

    const extensionRadius = maxLeafRadius + (offsets.EXTENSION ?? 5);
    const labelRadius = extensionRadius + (offsets.DEFAULT ?? 20);

    return {
      extensionRadius,
      labelRadius,
      transformation: branchTransformation || useAppStore.getState().branchTransformation
    };
  }

  // ==========================================================================
  // TREE TRANSFORMATION CACHE
  // ==========================================================================

  _getOrCacheTransformedTrees(treeList, branchTransformation) {
    let transformedTreeList = this._transformedCache.get(branchTransformation);
    if (!transformedTreeList) {
      transformedTreeList = branchTransformation !== 'none'
        ? treeList.map(treeData => transformBranchLengths(treeData, branchTransformation))
        : treeList;
      this._transformedCache.set(branchTransformation, transformedTreeList);
    }
    return transformedTreeList;
  }
}
