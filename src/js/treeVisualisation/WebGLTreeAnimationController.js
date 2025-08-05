import * as d3 from "d3";
import { useAppStore } from '../core/store.js';
import { transformBranchLengths } from "../utils/branchTransformUtils.js";
import { WebGLLabelRenderer } from "./webglRenderers/WebGLLabelRenderer.js";
import { WebGLExtensionRenderer } from "./webglRenderers/WebGLExtensionRenderer.js";
import { WebGLNodeRenderer } from "./webglRenderers/WebGLNodeRenderer.js";
import { WebGLLinkRenderer } from "./webglRenderers/WebGLLinkRenderer.js";
import { WebGLScrubRenderer } from "./rendering/WebGLScrubRenderer.js";
import { WebGLSceneManager } from "./systems/WebGLSceneManager.js";
import { RadialTreeLayout } from "./RadialTreeLayout.js";
import { createStoreIntegratedUpdatePattern } from "./utils/IndependentUpdatePattern.js";
import { LABEL_OFFSETS } from "./utils/LabelPositioning.js";
import { resolveRenderingOptions } from "./utils/StoreStateResolver.js";
import { InterpolationEngine } from "./animation/InterpolationEngine.js";
import calculateScales, { getMaxScaleValue } from "../utils/scaleUtils.js";
import TWEEN from 'three/addons/libs/tween.module.js';

export class WebGLTreeAnimationController {
  /**
   * Creates a new WebGL tree animation controller.
   */
  constructor() {
    // Initialize navigation direction tracking
    this.navigationDirection = 'forward';

    // Single reference value for label radius consistency
    this.initialMaxLeafRadius = null;

    // Initialize transformation change tracking for radius updates
    this._lastBranchTransformation = undefined;
    this._lastUniformScalingEnabled = undefined;
    this._lastMaxGlobalScale = undefined;

    // Track which transformation the current scaling was calculated for
    this._scaleCalculationTransformation = 'none';

    this.activeChangeEdges = [];
    this.transitionResolver = null;

    // Initialize WebGL container
    this.webglContainer = d3.select("#webgl-container");

    // Initialize scene manager (handles all WebGL setup)
    this.sceneManager = new WebGLSceneManager(
      this.webglContainer.node(),
      {
        backgroundColor: 0xf8f9fa
      }
    );

    // Initialize scene manager with camera options
    this.sceneManager.initialize({
      cameraMode: 'orthographic'
    });

    // Initialize components that depend on scene manager
    this.initializeComponents();

    // Initialize interpolation engine for staging logic
    this.interpolationEngine = new InterpolationEngine(this);

    // Initialize WebGL renderers
    this.initializeRenderers();

    // Initialize specialized scrub renderer
    this.scrubRenderer = new WebGLScrubRenderer(this);

    // Store controller reference in scene for renderer access
    this.sceneManager.scene.userData.controller = this;

    // Animation state for smooth playback - managed by store
    this.lastFrameTime = 0;

    // Subscribe to store changes for reactive updates
    this.storeUnsubscribe = useAppStore.subscribe(
      (state) => ({
        currentTreeIndex: state.currentTreeIndex,
        treeList: state.treeList,
        branchTransformation: state.branchTransformation,
        monophyleticColoringEnabled: state.monophyleticColoringEnabled
      }),
      (newState, oldState) => {
        // Only update if relevant state has changed
        if (newState.currentTreeIndex !== oldState.currentTreeIndex ||
            newState.branchTransformation !== oldState.branchTransformation ||
            newState.monophyleticColoringEnabled !== oldState.monophyleticColoringEnabled) {
          this._handleStoreTreeIndexChange(newState);
        }
      }
    );

    // Note: Animation control is handled by GUI.js which delegates to this controller
    // Timeline scrubbing is handled by MovieTimelineManager via renderScrubFrame

    // Start render loop
    this.startRenderLoop();
  }

  /**
   * Clears all rendered elements from the WebGL scene.
   * Called before every render to ensure clean state and prevent artifacts.
   */
  clearScene() {
    // Clear all renderers
    if (this.linkRenderer) {
      this.linkRenderer.clear();
    }
    if (this.nodeRenderer) {
      this.nodeRenderer.clear();
    }
    if (this.extensionRenderer) {
      this.extensionRenderer.clear();
    }
    if (this.labelRenderer) {
      this.labelRenderer.clear();
    }

    // Reset any cached state that might cause issues
    this._clearRendererCaches();

    // Render empty scene
    this.renderScene();
  }

  /**
   * Initializes components that depend on the scene manager being ready.
   * Sets up update patterns and color management.
   * @private
   */
  initializeComponents() {
    // Centralized update pattern - single source of truth for all diffing
    this.updatePattern = createStoreIntegratedUpdatePattern();

    // Get ColorManager from store - single source of truth for colors
    this.colorManager = useAppStore.getState().getColorManager();

    // Initialize uniform scaling system with current transformation
    const state = useAppStore.getState();
    const branchTransformation = state.branchTransformation || 'none';
    this.initializeUniformScaling(branchTransformation);
  }

  /**
   * Initializes the uniform scaling system using global maximum scale from scaleUtils.
   * This ensures all trees, especially consensus trees, use consistent radius scaling.
   * @param {string} [branchTransformation='none'] - Branch transformation to apply during scale calculation
   * @private
   */
  initializeUniformScaling(branchTransformation = 'none') {
    try {
      const { treeList, transitionResolver } = useAppStore.getState();

      if (treeList && Array.isArray(treeList) && treeList.length > 0) {
        // Get full tree indices for scale calculation
        const fullTreeIndices = transitionResolver?.fullTreeIndices ||
                               Array.from({ length: treeList.length }, (_, i) => i);

        // Apply transformation to all trees before calculating scales
        let transformedTreeList = treeList;
        if (branchTransformation && branchTransformation !== 'none') {
          transformedTreeList = treeList.map(treeData =>
            transformBranchLengths(treeData, branchTransformation)
          );
        }

        // Calculate global scales using transformed tree data
        this.globalScaleList = calculateScales(transformedTreeList, fullTreeIndices);
        this.maxGlobalScale = getMaxScaleValue(this.globalScaleList);
        this.uniformScalingEnabled = true;

        // Store the transformation state this scaling was calculated for
        this._scaleCalculationTransformation = branchTransformation;

        console.log(`[WebGL Controller] Uniform scaling initialized for transformation '${branchTransformation}' with`,
                   this.globalScaleList.length, 'scale entries, max scale:', this.maxGlobalScale);
      } else {
        console.warn('[WebGL Controller] Cannot initialize uniform scaling: no treeList available');
        this.uniformScalingEnabled = false;
      }
    } catch (error) {
      console.error('[WebGL Controller] Error initializing uniform scaling:', error);
      this.uniformScalingEnabled = false;
    }
  }

  /**
   * Recalculates uniform scaling when branch transformation changes.
   * This ensures that the maxGlobalScale reflects the actual tree sizes after transformation.
   * @param {string} newTransformation - New branch transformation type
   * @private
   */
  _recalculateUniformScalingForTransformation(newTransformation) {
    if (this._scaleCalculationTransformation !== newTransformation) {
      console.log(`[WebGL Controller] Recalculating uniform scaling for transformation change: ${this._scaleCalculationTransformation} → ${newTransformation}`);
      this.initializeUniformScaling(newTransformation);

      // Force radius recalculation since the base scale has changed
      this.initialMaxLeafRadius = null;
    }
  }

  /**
   * Initializes all WebGL renderers (Link, Node, Extension, Label).
   * Each renderer is passed the controller reference for coordination.
   * @private
   */
  initializeRenderers() {
    const scene = this.sceneManager.scene;

    this.labelRenderer = new WebGLLabelRenderer(scene, this.colorManager, this, { debug: true });
    this.extensionRenderer = new WebGLExtensionRenderer(scene, this.colorManager, this);
    this.nodeRenderer = new WebGLNodeRenderer(scene, this.colorManager, this);
    this.linkRenderer = new WebGLLinkRenderer(scene, this.colorManager, this);
  }
  /**
   * Renders all tree elements instantly (non-interpolated).
   * Optimized for performance and proper async coordination.
   * @param {Object} [options={}] - Rendering options and configuration
   * @param {boolean} [options.showExtensions=true] - Whether to show leaf extensions
   * @param {boolean} [options.showLabels=true] - Whether to show labels
   */
  async renderAllElements(options = {}) {
    // OPTIMIZED: Single store access with all needed data
    const storeState = useAppStore.getState();
    const {
      currentTreeIndex,
      treeList,
      cacheTreePositions,
      monophyleticColoringEnabled,
      setColorManagerMonophyleticColoring
    } = storeState;

    // Get current tree data from store
    const currentTreeData = treeList[currentTreeIndex];
    if (!currentTreeData) {
      console.warn('[WebGLTreeAnimationController] No tree data available to render');
      return;
    }

    // Always clear scene first for a fresh render
    // This ensures no artifacts from previous renders
    this.clearScene();

    // Sync monophyletic coloring setting from store
    setColorManagerMonophyleticColoring(monophyleticColoringEnabled);

    // Refresh colors after monophyletic coloring change (no extra render)
    this.refreshAllColors(false);

    // Resolve rendering options
    const {
      markedComponents,
      updateColorManagerAction
    } = resolveRenderingOptions(options);

    // Update color manager if action provided
    if (updateColorManagerAction) {
      updateColorManagerAction(markedComponents);
      // Refresh all renderer colors after ColorManager update (no extra render)
      this.refreshAllColors(false);
    }

    // OPTIMIZED: Single layout calculation for consistency
    const currentLayout = this.calculateLayout(currentTreeData, {
      treeIndex: currentTreeIndex,
      cacheFunction: cacheTreePositions,
      updateController: true
    });

    // Extract tree elements once for efficiency
    const leaves = currentLayout.tree.leaves();
    const allNodes = currentLayout.tree.descendants();
    const links = currentLayout.tree.links();

    // Ensure initialMaxLeafRadius is set exactly once for consistent positioning
    this._ensureInitialRadius(currentLayout.tree, 'in renderAllElements');

    // SINGLE SOURCE OF TRUTH: Get consistent radii with dynamic positioning based on leaf data
    const treeLeaves = currentLayout.tree.leaves();
    const { extensionRadius, labelRadius } = this._getConsistentRadii(null, null, null, treeLeaves);

    // OPTIMIZED: Synchronous rendering for instant elements (links, nodes)
    this.linkRenderer.renderLinksInstant(links);
    this.nodeRenderer.renderAllNodesInstant(allNodes);

    // OPTIMIZED: Proper async coordination for label creation
    const renderPromises = [];

    renderPromises.push(this.extensionRenderer.renderExtensions(leaves, extensionRadius));
    renderPromises.push(this.labelRenderer.renderLabels(leaves, labelRadius));

    // Wait for all async rendering to complete
    if (renderPromises.length > 0) {
      await Promise.all(renderPromises);
    }

    // Focus camera on the tree for optimal viewing after all elements are rendered
    this.sceneManager.focusCameraOnTree(labelRadius);

    // OPTIMIZED: Single render call after all elements are ready
    // No need for timeout-based workarounds
    this.renderScene();
  }

  /**
   * Renders the WebGL scene using the scene manager.
   * Triggers all onBeforeRender callbacks for dynamic updates.
   * @private
   */
  renderScene() {
    this.sceneManager.render();
  }

  /**
   * Update label font sizes reactively without full re-render
   * Called when fontSize changes in the UI for optimized updates
   */
  async updateLabelStyles() {
    if (!this.labelRenderer) {
      return Promise.resolve();
    }

    // Call the label renderer's updateLabelStyles method
    await this.labelRenderer.updateLabelStyles();

    // Render the scene to reflect changes
    this.renderScene();
  }

  /**
   * Starts the continuous WebGL rendering loop.
   * Required for dynamic camera-agnostic scaling and smooth updates.
   * @private
   */
  startRenderLoop() {
    if (this.renderLoopId) return;

    const renderLoop = () => {
      // Render the scene - onBeforeRender callbacks handle dynamic updates
      this.renderScene();
      this.renderLoopId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
  }

  /**
   * Stops the continuous rendering loop and cleans up animation frame.
   * @private
   */
  stopRenderLoop() {
    if (this.renderLoopId) {
      cancelAnimationFrame(this.renderLoopId);
      this.renderLoopId = null;
    }
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

    // Check if transformation has changed and force radius update if needed
    const transformationChanged = this._lastBranchTransformation !== undefined &&
                                 this._lastBranchTransformation !== branchTransformation;
    const uniformScalingChanged = this._lastUniformScalingEnabled !== this.uniformScalingEnabled ||
                                 this._lastMaxGlobalScale !== this.maxGlobalScale;

    // Recalculate uniform scaling if transformation changed
    if (transformationChanged && this.uniformScalingEnabled) {
      this._recalculateUniformScalingForTransformation(branchTransformation);
    }

    // Track transformation state for change detection
    this._lastBranchTransformation = branchTransformation;
    this._lastUniformScalingEnabled = this.uniformScalingEnabled;
    this._lastMaxGlobalScale = this.maxGlobalScale;

    // Get canvas dimensions with proper device pixel ratio consideration
    const canvas = this.sceneManager.renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    const width = rect.width;
    const height = rect.height;
    let layout;
    // Use uniform scaling if available for consistent consensus tree radii
    if (this.uniformScalingEnabled && this.globalScaleList && this.maxGlobalScale) {
      layout = this._createUniformRadialTreeLayout(
        treeData,
        branchTransformation,
        {
          width: width,
          height: height,
          margin: 40
        },
        this.maxGlobalScale
      );
    } else {
      // Fallback to individual scaling - use consistent RadialTreeLayout approach
      const transformedTreeData = transformBranchLengths(treeData, branchTransformation);
      const layoutCalculator = new RadialTreeLayout(transformedTreeData);
      layoutCalculator.setDimension(width, height);
      layoutCalculator.setMargin(40);

      // Use the same construction method as uniform scaling for consistency
      const layoutResult = layoutCalculator.constructRadialTree();

      layout = {
        tree: layoutResult,
        max_radius: layoutCalculator.getMaxRadius(layoutResult),
        width: width,
        height: height,
        margin: layoutCalculator.margin,
        scale: layoutCalculator.scale
      };
    }

    // Update controller state if requested (replaces updateLayout functionality)
    if (updateController) {
      // Force radius update if transformation or scaling has changed
      if (transformationChanged || uniformScalingChanged) {
        this._updateRadiusForTransformationChange(layout,
          `${transformationChanged ? 'transformation' : ''}${transformationChanged && uniformScalingChanged ? '+' : ''}${uniformScalingChanged ? 'uniform scaling' : ''} changed`);
      } else {
        // Set initialMaxLeafRadius if not already set (preserves existing behavior)
        this._ensureInitialRadius(layout.tree, 'in calculateLayout');
      }

      // Cache tree positions if caching function provided
      if (cacheFunction && treeIndex !== undefined) {
        cacheFunction(treeIndex, layout);
      }
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
      monophyleticColoringEnabled,
      activeChangeEdgeTracking,
      transitionResolver
    } = useAppStore.getState();

    // Reinitialize uniform scaling if tree list has changed
    if (treeList && (!this.globalScaleList || this.globalScaleList.length !== treeList.length)) {
      this.initializeUniformScaling(branchTransformation);
    }

    const currentTreeData = treeList[currentTreeIndex];

    // Update layout with current tree data from store
    if (currentTreeData) {
      // Apply branch transformation
      const transformedTreeData = branchTransformation !== 'none'
        ? transformBranchLengths(currentTreeData, branchTransformation)
        : currentTreeData;
      this.updateLayout(transformedTreeData, currentTreeIndex);
    }

    setColorManagerMonophyleticColoring(monophyleticColoringEnabled);
    this.transitionResolver = transitionResolver;
  }

  /**
   * Handles store state changes - updates controller when store tree index changes
   * @param {Object} newState - New store state
   * @private
   */
  _handleStoreTreeIndexChange(newState) {
    // Don't update during animation or scrubbing
    const { playing, renderInProgress } = useAppStore.getState();
    if (playing || renderInProgress) return;

    // Update from store with new state
    this.updateFromStore();

    // Trigger a re-render with current state
    this.renderAllElements().catch(error => {
      console.error('[WebGLTreeAnimationController] Error during store update render:', error);
    });
  }

  /**
   * Starts smooth animation playback using store-managed state
   */
  startAnimation() {
    // Get comprehensive state from store for validation
    const {
      movieData,
      treeList,
      playing,
      play
    } = useAppStore.getState();

    console.log('[WebGL Controller] startAnimation called - playing:', playing);

    // Validate that we're not already animating
    if (playing) {
      console.warn('[WebGL Controller] Animation already in progress - playing:', playing);
      return;
    }

    // Validate required data for animation
    if (!movieData) {
      console.error('[WebGL Controller] Cannot start animation: No movieData available');
      return;
    }

    if (!treeList || !Array.isArray(treeList) || treeList.length === 0) {
      console.error('[WebGL Controller] Cannot start animation: No valid treeList available');
      return;
    }

    if (treeList.length < 2) {
      console.warn('[WebGL Controller] Cannot start animation: Need at least 2 trees for interpolation');
      return;
    }

    // Validate that interpolated_trees exist and match treeList
    if (!movieData.interpolated_trees || movieData.interpolated_trees.length !== treeList.length) {
      console.error('[WebGL Controller] Cannot start animation: interpolated_trees mismatch');
      return;
    }

    // Initialize animation timing
    this.lastFrameTime = performance.now();

    console.log('[WebGL Controller] Starting animation');

    // Let store handle the animation state management (playing, animationStartTime, etc.)
    play();

    console.log('[WebGL Controller] Store play() called, starting animation loop');

    // Start the animation loop
    this._animationLoop();
  }

  /**
   * Stops animation playback
   */
  stopAnimation() {
    console.log('[WebGL Controller] stopAnimation called');

    // Cancel any pending animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Clear debounce timeout
    if (this.animationDebounce) {
      clearTimeout(this.animationDebounce);
      this.animationDebounce = null;
    }
  }

  /**
   * Animation loop for smooth playback - now store-managed
   * @private
   */
  async _animationLoop() {
    // Check store playing state instead of this.isAnimating
    const { playing } = useAppStore.getState();

    console.log('[WebGL Controller] _animationLoop called, playing:', playing);

    if (!playing) {
      console.log('[WebGL Controller] Animation loop stopped - playing is false');
      return;
    }

    const timestamp = performance.now();

    // Use consistent timing for smooth animation
    const now = timestamp;

    // Update animation frame using store-managed progress
    await this._updateSmoothAnimation(now);
    this.lastFrameTime = now;

    // Always schedule next frame for consistent timing, but check playing state again
    const { playing: stillPlaying } = useAppStore.getState();
    if (stillPlaying) {
      this.animationFrameId = requestAnimationFrame(() => this._animationLoop());
    } else {
      console.log('[WebGL Controller] Not scheduling next frame - playing is false');
    }
  }

  /**
   * Update smooth animation using store-managed progress
   * Optimized for single store access per frame to reduce overhead
   * @param {number} timestamp - Current timestamp
   * @private
   */
  async _updateSmoothAnimation(timestamp) {
    // CRITICAL: Single store access per frame - get all needed state at once
    const storeState = useAppStore.getState();
    const {
      movieData,
      currentTreeIndex,
      updateAnimationProgress,
      getAnimationInterpolationData,
      goToPosition,
      stop,
    } = storeState;

    // Check for movieData and update animation progress - stop if no data or animation complete
    if (!movieData || updateAnimationProgress(timestamp)) {
      if (!movieData) {
        console.warn('[WebGL Controller] _updateSmoothAnimation: No movieData available, stopping animation');
      }
      stop();
      return;
    }

    // Get interpolation data from store
    const interpolationData = getAnimationInterpolationData();
    const { fromTreeIndex, toTreeIndex, exactTreeIndex, easedProgress } = interpolationData;

    // Get tree data for interpolation
    const fromTree = movieData.interpolated_trees[fromTreeIndex];
    const toTree = movieData.interpolated_trees[toTreeIndex];

    if (!fromTree || !toTree) {
      return;
    }

    // Update store position using proper method - maintains navigation direction logic
    const discreteTreeIndex = Math.round(exactTreeIndex);
    if (currentTreeIndex !== discreteTreeIndex) {
      // Use store's goToPosition for proper state management instead of direct mutation
      goToPosition(discreteTreeIndex);
    }

    // ColorManager will automatically update itself via store subscription

    // Render interpolated frame with eased progress
    try {
      await this.renderInterpolatedFrame(
        fromTree,
        toTree,
        easedProgress,
        {
          fromTreeIndex: fromTreeIndex,
          toTreeIndex: toTreeIndex
        }
      );
    } catch (error) {
      console.error('[WebGL Controller] Error rendering interpolated frame:', error);
    }

    // Update TWEEN.js animations
    TWEEN.update();
  }

  /**
   * Renders an interpolated frame between two tree states.
   * Optimized for cache efficiency and reduced redundant calculations.
   * @param {Object} fromTreeData - Source tree data (t=0)
   * @param {Object} toTreeData - Target tree data (t=1)
   * @param {number} timeFactor - Interpolation factor between 0 and 1
   * @param {Object} [options={}] - Rendering options
   * @param {number} [options.fromTreeIndex] - Index of source tree for cache lookup
   * @param {number} [options.toTreeIndex] - Index of target tree for cache lookup
   */
  async renderInterpolatedFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
    const { fromTreeIndex, toTreeIndex } = options;
    let t = Math.max(0, Math.min(1, timeFactor));
    if (fromTreeData === toTreeData) t = 0;

    // OPTIMIZED: Single store access with all needed state
    const storeState = useAppStore.getState();
    const {
      navigationDirection,
      getLayoutCache,
      cacheTreePositions
    } = storeState;

    // Optimized layout cache lookup with fallback calculation
    let layoutFrom, layoutTo;

    // Use cache if available, otherwise calculate efficiently
    if (fromTreeIndex !== undefined) {
      layoutFrom = getLayoutCache(fromTreeIndex);
      if (!layoutFrom) {
        layoutFrom = this.calculateLayout(fromTreeData, {
          treeIndex: fromTreeIndex,
          cacheFunction: cacheTreePositions
        });
      }
    } else {
      layoutFrom = this.calculateLayout(fromTreeData);
    }

    if (toTreeIndex !== undefined) {
      layoutTo = getLayoutCache(toTreeIndex);
      if (!layoutTo) {
        layoutTo = this.calculateLayout(toTreeData, {
          treeIndex: toTreeIndex,
          cacheFunction: cacheTreePositions
        });
      }
    } else {
      layoutTo = this.calculateLayout(toTreeData);
    }

    // CRITICAL: Ensure initialMaxLeafRadius is set if not already
    // This can happen during animation playback before updateLayout is called
    this._ensureInitialRadius(layoutTo.tree, 'during interpolation');

    // Direction-aware element diffing - use cached navigationDirection
    const isBackwardNavigation = navigationDirection === 'backward';

    const allUpdates = isBackwardNavigation
      ? this.updatePattern.diffAllElements(layoutFrom.tree, layoutTo.tree)
      : this.updatePattern.diffAllElements(layoutTo.tree, layoutFrom.tree);
    const filteredData = this.updatePattern.extractFilteredData(allUpdates);

    // Extract tree elements once
    const currentLeaves = layoutTo.tree.leaves();
    const currentNodes = layoutTo.tree.descendants();

    // Use unified radius calculation system with dynamic positioning based on leaf data
    const { extensionRadius, labelRadius } = this._getConsistentRadii(layoutFrom, layoutTo, null, currentLeaves);

    // Create interpolation animation context
    const interpolationContext = {
      leaves: currentLeaves,
      allNodes: currentNodes,
      extensionRadius,
      labelRadius,
      // Interpolation-specific data
      fromTreeData: layoutFrom.tree,
      toTreeData: layoutTo.tree,
      fromTreeIndex: fromTreeIndex,
      toTreeIndex: toTreeIndex,
      timeFactor: t,
      filteredData: filteredData,
      isBackwardNavigation: isBackwardNavigation
    };

    // Execute staged interpolation sequence using engine
    await this.interpolationEngine.executeInterpolationStaging(filteredData, interpolationContext);

    // CRITICAL: Render the scene to display the updated mesh positions
    this.renderScene();

    // Optimize validation - only run occasionally to avoid throttling
    const shouldValidate = (Math.random() < 0.1) || (timeFactor > 0.95); // 10% of frames or near completion
    if (shouldValidate) {
      // Validate renderer state consistency and clean up orphaned elements
      const currentLinks = layoutTo.tree.links();
      this._validateAndCleanupRendererState(filteredData, currentLinks, currentNodes, currentLeaves);

      // Cache clearing validation only at transition completion
      if (timeFactor > 0.95) {
        this._validateEndStateAndClearCaches(layoutTo, timeFactor, isBackwardNavigation);
      }
    }
  }

  /**
   * Renders a scrubbing frame with optimized performance for timeline interactions.
   * Delegates to WebGLScrubRenderer for specialized scrubbing operations.
   * @param {Object} fromTreeData - Source tree data
   * @param {Object} toTreeData - Target tree data
   * @param {number} timeFactor - Interpolation factor (0-1)
   * @param {Object} [options={}] - Scrubbing-specific options
   */
  async renderScrubFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
    return await this.scrubRenderer.renderScrubFrame(fromTreeData, toTreeData, timeFactor, options);
  }

  /**
   * Validates renderer state consistency and cleans up orphaned elements.
   * Called every frame during interpolation to ensure all renderers maintain correct element counts.
   * This is NOT limited to discrete states - it runs continuously during smooth transitions.
   * @private
   * @param {Object} filteredData - Filtered element data from diffing
   * @param {Array} currentLinks - Current link elements
   * @param {Array} currentNodes - Current node elements
   * @param {Array} currentLeaves - Current leaf elements
   */
  _validateAndCleanupRendererState(filteredData, currentLinks, currentNodes, currentLeaves) {
    // Validate each renderer's state
    if (this.linkRenderer._validateCurrentState) {
      this.linkRenderer._validateCurrentState(
        currentLinks,
        filteredData.links.enter,
        filteredData.links.update,
        filteredData.links.exit
      );
    }

    if (this.nodeRenderer._validateCurrentState) {
      this.nodeRenderer._validateCurrentState(
        currentNodes,
        filteredData.nodes.enter,
        filteredData.nodes.update,
        filteredData.nodes.exit
      );
    }

    // Extensions and labels use leaves for validation
    if (this.extensionRenderer._validateCurrentState) {
      this.extensionRenderer._validateCurrentState(
        currentLeaves,
        filteredData.leaves.enter,
        filteredData.leaves.update,
        filteredData.leaves.exit
      );
    }

    if (this.labelRenderer._validateCurrentState) {
      this.labelRenderer._validateCurrentState(
        currentLeaves,
        filteredData.leaves.enter,
        filteredData.leaves.update,
        filteredData.leaves.exit
      );
    }
  }

  /**
   * Validates end state consistency and clears caches if mismatches detected.
   * Optimized to reduce redundant store access during cache operations.
   * @private
   * @param {Object} layoutTo - Target layout structure
   * @param {number} timeFactor - Current interpolation time factor (0-1)
   * @param {boolean} isBackwardNavigation - Whether this is backward navigation
   */
  _validateEndStateAndClearCaches(layoutTo, timeFactor, isBackwardNavigation) {
    // Only validate at transition completion (t=1) or near completion (t>0.95)
    if (timeFactor < 0.95) return;

    // OPTIMIZED: Single store access with cache management functions
    const storeState = useAppStore.getState();
    const { currentTreeIndex, clearPositionCache, clearLayoutCache } = storeState;

    // For backward navigation, check if we've reached the expected state
    if (isBackwardNavigation) {
      // Get expected renderer counts from target layout
      const expectedLinks = layoutTo.tree.links().length;
      const expectedNodes = layoutTo.tree.descendants().length;
      const expectedLeaves = layoutTo.tree.leaves().length;

      // Get actual renderer counts
      const actualLinks = this.linkRenderer.linkMeshes.size;
      const actualNodes = this.nodeRenderer.leafMeshes.size + this.nodeRenderer.internalMeshes.size;

      // Check for significant mismatches that indicate stale cache data
      const linkMismatch = Math.abs(actualLinks - expectedLinks) > 0;
      const nodeMismatch = Math.abs(actualNodes - expectedNodes) > 1; // Allow small tolerance

      if (linkMismatch || nodeMismatch) {
        console.warn(`[WebGL Controller] End state mismatch detected - clearing caches`, {
          expected: { links: expectedLinks, nodes: expectedNodes, leaves: expectedLeaves },
          actual: { links: actualLinks, nodes: actualNodes },
          treeIndex: currentTreeIndex,
          timeFactor: timeFactor.toFixed(3)
        });

        // Clear caches to prevent stale data persistence
        clearPositionCache();
        clearLayoutCache();

        // Clear renderer-level cached data
        this._clearRendererCaches();
      }
    }
  }

  /**
   * Updates the initial radius based on current tree and transformation state.
   * This ensures that radius calculations reflect current transformations and scaling.
   * @param {Object} treeWithLeaves - Tree object that has a leaves() method
   * @param {string} [context=''] - Context string for logging purposes
   * @param {boolean} [forceUpdate=false] - Force update even if radius is already set
   * @private
   */
  _ensureInitialRadius(treeWithLeaves, context = '', forceUpdate = false) {
    if (this.initialMaxLeafRadius === null || forceUpdate) {
      const leaves = treeWithLeaves.leaves();
      const newRadius = leaves.length > 0
        ? Math.max(...leaves.map(d => d.radius))
        : 200; // Default fallback radius

      if (this.initialMaxLeafRadius !== newRadius || forceUpdate) {
        this.initialMaxLeafRadius = newRadius;
        if (context && forceUpdate) {
          console.log(`[WebGLTreeAnimationController] Updated initialMaxLeafRadius to ${newRadius} (${context})`);
        }
      }
    }
    return this.initialMaxLeafRadius;
  }

  /**
   * Forces update of the initial radius when transformation or scaling changes.
   * This ensures that all subsequent radius calculations use the correct base values.
   * @param {Object} currentLayout - Current layout object with tree data
   * @param {string} reason - Reason for the update (for logging)
   * @private
   */
  _updateRadiusForTransformationChange(currentLayout, reason = 'transformation change') {
    if (currentLayout && currentLayout.tree) {
      this._ensureInitialRadius(currentLayout.tree, reason, true);

      // Invalidate any cached radius calculations
      this._invalidateRadiusCache();
    }
  }

  /**
   * Invalidates cached radius calculations to force recalculation with new base radius.
   * @private
   */
  _invalidateRadiusCache() {
    // Clear any cached values that depend on initialMaxLeafRadius
    if (this.labelRenderer && this.labelRenderer._lastLabelRadius !== undefined) {
      this.labelRenderer._lastLabelRadius = undefined;
    }
  }

  /**
   * Creates a uniform radial tree layout with consistent scaling across all trees.
   * This ensures visual consistency, especially for consensus trees.
   * @param {Object} treeData - Raw tree data structure
   * @param {string} branchTransformation - Branch transformation type
   * @param {Object} options - Layout options (width, height, margin)
   * @param {number} maxGlobalScale - Maximum scale value across all trees
   * @returns {Object} Layout object with uniform scaling applied
   * @private
   */
  _createUniformRadialTreeLayout(treeData, branchTransformation, options, maxGlobalScale) {
    const { width, height, margin } = options;

    // Apply branch length transformation
    const transformedTreeData = transformBranchLengths(treeData, branchTransformation);

    // Create radial tree layout
    const layoutCalculator = new RadialTreeLayout(transformedTreeData);
    layoutCalculator.setDimension(width, height);
    layoutCalculator.setMargin(margin);

    // Calculate radii and angles without auto-scaling
    layoutCalculator.calcRadius(layoutCalculator.root, 0);
    layoutCalculator.indexLeafNodes(layoutCalculator.root);
    layoutCalculator.calcAngle(layoutCalculator.root, Math.PI * 2, layoutCalculator.root.leaves().length);

    // Apply uniform scaling based on max global scale
    const minWindowSize = layoutCalculator.getMinContainerDimension(
      layoutCalculator.containerWidth,
      layoutCalculator.containerHeight
    );

    // Use uniform scale factor based on maximum global scale
    const uniformScale = minWindowSize / (2.0 * maxGlobalScale);
    layoutCalculator.scaleRadius(layoutCalculator.root, uniformScale);
    layoutCalculator.generateCoordinates(layoutCalculator.root);

    // Store the uniform scale for consistency
    layoutCalculator.scale = uniformScale;

    const layoutResult = layoutCalculator.root;

    return {
      tree: layoutResult,
      max_radius: layoutCalculator.getMaxRadius(layoutResult),
      width: width,
      height: height,
      margin: layoutCalculator.margin,
      scale: layoutCalculator.scale
    };
  }


/**
   * SINGLE SOURCE OF TRUTH: Calculates label and extension radii with dynamic positioning.
   * Uses actual text length to prevent overlap between extensions and labels.
   * @param {Object} [_layoutFrom=null] - Source layout for animation-aware calculations (unused, kept for API compatibility)
   * @param {Object} [_layoutTo=null] - Target layout for animation-aware calculations (unused, kept for API compatibility)
   * @param {string} [branchTransformation=null] - Override branch transformation (optional)
   * @param {Object} [leafData=null] - Leaf data with text content for dynamic positioning (optional)
   * @returns {Object} Object with extensionRadius and labelRadius
   * @private
   */
// ...existing code...
  /**
   * Calculates consistent radii for extension lines and labels based on the current layout.
   * This is the single source of truth for radius calculations for all renderers.
   * @param {Object} layout - The current tree layout object.
   * @returns {Object} Object with extensionRadius and labelRadius
   * @private
   */
  _getConsistentRadii(layout, _layoutTo = null, branchTransformation = null, leafData = null) {
    if (!layout || !layout.tree) {
      console.warn("Cannot calculate radii without a valid layout. Using default values.");
      return {
        extensionRadius: 220,
        labelRadius: 250,
        transformation: branchTransformation || useAppStore.getState().branchTransformation
      };
    }

    // 1. Get the maximum radius from the canvas dimensions to ensure a perfect circle.
    // This is more robust than using the tree's own max radius, which can be irregular.
    const containerWidth = layout.width - layout.margin * 2;
    const containerHeight = layout.height - layout.margin * 2;
    const maxLeafRadius = Math.min(containerWidth, containerHeight) / 2;

    // 2. Apply consistent, predictable offsets to the maximum radius.
    const extensionRadius = maxLeafRadius + LABEL_OFFSETS.EXTENSION;
    const labelRadius = extensionRadius + LABEL_OFFSETS.LABEL;

    return {
      extensionRadius,
      labelRadius,
      transformation: branchTransformation || useAppStore.getState().branchTransformation
    };
  }

  /**
   * Gets the current uniform scaling configuration.
// ...existing code...

  /**
   * Gets the current uniform scaling configuration.
   * Used by renderers to ensure consistent scaling across all operations.
   * @returns {Object} Uniform scaling configuration
   */
  getUniformScalingConfig() {
    return {
      enabled: this.uniformScalingEnabled,
      maxGlobalScale: this.maxGlobalScale,
      globalScaleList: this.globalScaleList
    };
  }

  /**
   * Clears renderer-level cached data and transformations.
   * Removes cached geometry data that might cause visual artifacts.
   * @private
   */
  _clearRendererCaches() {
    // Clear any cached transformation state in LinkRenderer
    if (this.linkRenderer && this.linkRenderer.linkMeshes) {
      this.linkRenderer.linkMeshes.forEach(mesh => {
        if (mesh.userData) {
          delete mesh.userData.fixedSegments; // Fixed segments cache for tube geometry
          delete mesh.userData.originalRotation;
          delete mesh.userData.originalCoordinates;
          delete mesh.userData.originalMatrix;
        }
      });
    }
  }

  /**
   * Refreshes all materials and colors across all WebGL renderers.
   * Call this when ColorManager state changes (e.g., marked components, monophyletic coloring).
   * @param {boolean} [triggerRender=true] - Whether to trigger a re-render after updating colors
   */
  refreshAllColors(triggerRender = true) {
    // Clear material factory caches to force recreation with new colors
    if (this.linkRenderer?.materialFactory) {
      this.linkRenderer.materialFactory.clearCache();
    }

    if (this.extensionRenderer?.materialFactory) {
      this.extensionRenderer.materialFactory.clearCache();
    }

    // NodeRenderer and LabelRenderer call colorManager directly, so they get updated colors automatically
    // But we need to force them to update existing materials/textures

    // Force node materials to update with new colors
    if (this.nodeRenderer) {
      this.nodeRenderer.refreshColors();
    }

    // Force label textures to be recreated with new colors
    if (this.labelRenderer) {
      this.labelRenderer.invalidateStyles();
    }

    // Trigger a re-render to show the new colors (optional)
    if (triggerRender) {
      this.renderScene();
    }
  }

  /**
   * Cleans up all WebGL resources and stops rendering loops.
   * Must be called when controller is no longer needed to prevent memory leaks.
   */
  destroy() {
    // Stop render loop first
    this.stopRenderLoop();

    // Clear debounce timeout
    if (this.animationDebounce) {
      clearTimeout(this.animationDebounce);
      this.animationDebounce = null;
    }

    // Cancel any pending animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Clean up store subscription
    if (this.storeUnsubscribe) {
      this.storeUnsubscribe();
      this.storeUnsubscribe = null;
    }

    // Clean up renderers
    this.labelRenderer.destroy();
    this.labelRenderer = null;

    this.extensionRenderer.destroy();
    this.extensionRenderer = null;

    this.nodeRenderer.destroy();
    this.nodeRenderer = null;

    this.linkRenderer.destroy();
    this.linkRenderer = null;

    // Clean up scrub renderer
    this.scrubRenderer = null;

    // Clean up scene manager (handles all WebGL resources)
    this.sceneManager.destroy();
    this.sceneManager = null;

    // Clean up ColorManager subscription
    if (this.colorManager) {
      this.colorManager.destroy();
      this.colorManager = null;
    }

    // Clean up references
    this.updatePattern = null;
  }
}
