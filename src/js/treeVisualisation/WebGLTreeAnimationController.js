import * as d3 from "d3";
import { useAppStore } from '../core/store.js';
import { transformBranchLengths } from "../utils/branchTransformUtils.js";
import { RadialTreeLayout } from "./RadialTreeLayout.js";
import calculateScales, { getMaxScaleValue } from "../utils/scaleUtils.js";
import { LABEL_OFFSETS } from "./utils/LabelPositioning.js";

export class WebGLTreeAnimationController {
  /**
   * Creates a new WebGL tree animation controller.
   */
  constructor() {
    // Consolidated state tracking
    this._scalingState = {
      branchTransformation: undefined,
      calculationTransformation: 'none'
    };

    // Initialize WebGL container
    this.webglContainer = d3.select("#webgl-container");

    // Start render loop
    this.startRenderLoop();
  }


  /**
   * Initializes the uniform scaling system using global maximum scale from scaleUtils.
   * This ensures all trees, especially consensus trees, use consistent radius scaling.
   * @param {string} [branchTransformation='none'] - Branch transformation to apply during scale calculation
   * @private
   */
  initializeUniformScaling(branchTransformation = 'none') {
    const { treeList, transitionResolver } = useAppStore.getState();

    const fullTreeIndices = transitionResolver?.fullTreeIndices || Array.from({ length: treeList.length }, (_, i) => i);

    // Apply transformation to all trees before calculating scales
    const transformedTreeList = branchTransformation !== 'none'
      ? treeList.map(treeData => transformBranchLengths(treeData, branchTransformation))
      : treeList;

    // Calculate global scales using transformed tree data
    this.globalScaleList = calculateScales(transformedTreeList, fullTreeIndices);
    this.maxGlobalScale = getMaxScaleValue(this.globalScaleList);
    this.uniformScalingEnabled = true;

    // Store the transformation state this scaling was calculated for
    this._scalingState.calculationTransformation = branchTransformation;
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
   * Renders the WebGL scene using the scene manager.
   * Triggers all onBeforeRender callbacks for dynamic updates.
   * @private
   */
  renderScene() {
    // No-op in base class - overridden by DeckGLTreeAnimationController
  }

  /**
   * Starts the continuous WebGL rendering loop.
   * Required for dynamic camera-agnostic scaling and smooth updates.
   * @private
   */
  startRenderLoop() {
    const renderLoop = () => {
      this.renderScene();
      this.renderLoopId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
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
    const { branchTransformation } = useAppStore.getState();

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
    const transformedTreeData = transformBranchLengths(treeData, branchTransformation);
    const layoutCalculator = new RadialTreeLayout(transformedTreeData);
    layoutCalculator.setDimension(width, height);
    layoutCalculator.setMargin(40);

    let layout;
    let layoutResult;

    // Use uniform scaling if available for consistent consensus tree radii
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
   * Update controller from store data - single source of truth approach
   * Gets all required data directly from the store instead of requiring parameters
   */
  updateFromStore() {
    const {
      currentTreeIndex,
      treeList,
      branchTransformation,
      monophyleticColoringEnabled
    } = useAppStore.getState();

    // Reinitialize uniform scaling if tree list has changed
    if (!this.globalScaleList || this.globalScaleList.length !== treeList.length) {
      this.initializeUniformScaling(branchTransformation);
    }

    const currentTreeData = treeList[currentTreeIndex];

    // Apply branch transformation
    const transformedTreeData = branchTransformation !== 'none'
      ? transformBranchLengths(currentTreeData, branchTransformation)
      : currentTreeData;
    this.updateLayout(transformedTreeData, currentTreeIndex);

    setColorManagerMonophyleticColoring(monophyleticColoringEnabled);
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

    const extensionRadius = maxLeafRadius + LABEL_OFFSETS.EXTENSION;
    const labelRadius = extensionRadius + LABEL_OFFSETS.LABEL;

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
    cancelAnimationFrame(this.renderLoopId);
    this.storeUnsubscribe?.();
  }
}
