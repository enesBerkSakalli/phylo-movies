import * as d3 from "d3";
import { useAppStore } from '../core/store.js';
import { transformBranchLengths } from "../utils/branchTransformUtils.js";
import { TidyTreeLayout } from "./layout/TidyTreeLayout.js";
import calculateScales, { getMaxScaleValue } from "../utils/scaleUtils.js";
// LABEL_OFFSETS moved to centralized store styleConfig

export class WebGLTreeAnimationController {
  /**
   * Creates a new WebGL tree animation controller.
   */
  constructor(container = "#webgl-container") {
    // Consolidated state tracking
    this._scalingState = {
      branchTransformation: undefined,
      calculationTransformation: 'none'
    };
    this._transformedCache = new Map();

    // Initialize WebGL container
    this.webglContainer = d3.select(container);

    // Start render loop
    this.startRenderLoop();
  }


  /**
   * Initializes the uniform scaling system using global maximum scale from scaleUtils.
   * Ensures consistent radii across Anchor and Transition trees.
   * @param {string} [branchTransformation='none'] - Branch transformation to apply during scale calculation
   * @private
   */
  initializeUniformScaling(branchTransformation = 'none') {
    const { treeList, transitionResolver } = useAppStore.getState();
    const datasetToken = `${branchTransformation}::${treeList?.length || 0}`;

    // Skip recompute if dataset and transformation are unchanged
    if (
      this.uniformScalingEnabled &&
      this.maxGlobalScale &&
      this._scalingState.calculationTransformation === branchTransformation &&
      this._scalingState.datasetToken === datasetToken &&
      this._scalingState.datasetRef === treeList
    ) {
      return;
    }

    const fullTreeIndices = transitionResolver?.fullTreeIndices || Array.from({ length: treeList.length }, (_, i) => i);

    // Apply transformation to all trees before calculating scales (cached per transformation)
    let transformedTreeList = this._transformedCache.get(branchTransformation);
    if (!transformedTreeList) {
      transformedTreeList = branchTransformation !== 'none'
        ? treeList.map(treeData => transformBranchLengths(treeData, branchTransformation))
        : treeList;
      this._transformedCache.set(branchTransformation, transformedTreeList);
    }

    // Calculate global scales using transformed tree data
    this.globalScaleList = calculateScales(transformedTreeList, fullTreeIndices);
    this.maxGlobalScale = getMaxScaleValue(this.globalScaleList);
    this.uniformScalingEnabled = true;

    // Store the transformation state this scaling was calculated for
    this._scalingState.calculationTransformation = branchTransformation;
    this._scalingState.datasetToken = datasetToken;
    this._scalingState.datasetRef = treeList;
  }

  /**
   * Recalculates uniform scaling when branch transformation changes.
   * This ensures that the maxGlobalScale reflects the actual tree sizes after transformation.
   * @param {string} newTransformation - New branch transformation type
   * @private
   */
  _recalculateUniformScalingForTransformation(newTransformation) {
    if (this._scalingState.calculationTransformation !== newTransformation) {
      console.log(`[WebGL Controller] Recalculating uniform scaling for transformation change: ${this._scalingState.calculationTransformation} → ${newTransformation}`);
      this.initializeUniformScaling(newTransformation);
    }
  }


  /**
   * Starts the continuous WebGL rendering loop.
   * Required for dynamic camera-agnostic scaling and smooth updates.
   * @private
   */
  startRenderLoop() {
    // Removed - not needed as renderScene is a no-op
  }


  /**
   * Calculates tree layout with branch transformations and caching.
   * Single authoritative method for all layout calculations.
   * @param {Object} treeData - Raw tree data structure
   * @param {Object} [options={}] - Layout calculation options
   * @param {number} [options.treeIndex] - Tree index for caching purposes
   * @param {Function} [options.cacheFunction] - Optional function to cache the layout
   * @param {boolean} [options.updateController=false] - Whether to update controller state
   * @returns {Object} Layout object containing tree, max_radius, width, height, margin, scale
   */
  calculateLayout(treeData, options = {}) {
    const { treeIndex, cacheFunction, updateController = false } = options;

    // Get branch transformation from store (single store access)
    const { branchTransformation, layoutAngleDegrees, layoutRotationDegrees } = useAppStore.getState();

    // Check if transformation has changed
    const transformationChanged = this._scalingState.branchTransformation !== undefined &&
                                 this._scalingState.branchTransformation !== branchTransformation;

    // Recalculate uniform scaling if transformation changed
    if (transformationChanged && this.uniformScalingEnabled) {
      this._recalculateUniformScalingForTransformation(branchTransformation);
    }

    // Track transformation state for change detection
    this._scalingState.branchTransformation = branchTransformation;

    // Get container dimensions
    const containerElement = this.webglContainer.node();
    const rect = containerElement.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Apply transformation and create layout
    // Reuse cached transformed tree to keep scaling consistent with uniform scale list
    let transformedTreeData;
    const cachedList = this._transformedCache.get(branchTransformation);
    if (cachedList && typeof options.treeIndex === 'number') {
      transformedTreeData = cachedList[options.treeIndex];
    } else {
      transformedTreeData = transformBranchLengths(treeData, branchTransformation);
    }
    const layoutCalculator = new TidyTreeLayout(transformedTreeData);
    layoutCalculator.setDimension(width, height);
    layoutCalculator.setMargin(40);
    layoutCalculator.setAngleExtentDegrees(layoutAngleDegrees || 360);
    layoutCalculator.setAngleOffsetDegrees(layoutRotationDegrees || 0);

    let layout;
    let layoutResult;

    // Use uniform scaling if available for consistent tree radii
    if (this.uniformScalingEnabled && this.globalScaleList && this.maxGlobalScale) {
      layoutResult = layoutCalculator.constructRadialTreeWithUniformScaling(this.maxGlobalScale);
    } else {
      // Fallback to individual scaling
      layoutResult = layoutCalculator.constructRadialTree();
    }

    layout = {
      tree: layoutResult,
      max_radius: layoutCalculator.getMaxRadius(layoutResult),
      width: width,
      height: height,
      margin: layoutCalculator.margin,
      scale: layoutCalculator.scale
    };

    // Update controller state if requested
    if (updateController && cacheFunction && treeIndex !== undefined) {
      cacheFunction(treeIndex, layout);
    }

    return layout;
  }

  /**
   * Updates controller layout with new tree data and caches result.
   * Wrapper method that calls calculateLayout with updateController=true.
   * @param {Object} treeData - Raw tree data structure
   * @param {number} [treeIndex=0] - Tree index for caching purposes
   * @param {Function} [cacheFunction=null] - Optional function to cache the layout
   * @returns {Object} Layout object with calculated tree structure and dimensions
   */
  updateLayout(treeData, treeIndex = 0, cacheFunction = null) {
    return this.calculateLayout(treeData, {
      treeIndex,
      cacheFunction,
      updateController: true
    });
  }



  /**
   * Starts animation playback - delegates to store
   */
  startAnimation() {
    const { play } = useAppStore.getState();
    play();
    // Start the animation loop
    this._animationLoop();
  }

  /**
   * Stops animation playback - delegates to store
   */
  stopAnimation() {
    const { stop } = useAppStore.getState();
    stop();
  }

  /**
   * Animation loop for smooth playback - overridden by subclasses
   * @private
   */
  async _animationLoop() {
    // Override in subclasses like DeckGLTreeAnimationController
  }

  /**
   * Calculates label and extension radii with dynamic positioning.
   * @param {Object} layout - Layout object with tree dimensions
   * @param {Object} [_layoutTo=null] - Unused parameter kept for API compatibility
   * @param {string} [branchTransformation=null] - Override branch transformation
   * @returns {Object} Object with extensionRadius and labelRadius
   * @private
   */
  _getConsistentRadii(layout, _layoutTo = null, branchTransformation = null) {
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

  /**
   * Cleans up all WebGL resources and stops rendering loops.
   * Must be called when controller is no longer needed to prevent memory leaks.
   */
  destroy() {
    // Clean up if needed by subclasses
  }
}
