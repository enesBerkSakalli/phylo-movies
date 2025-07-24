import * as d3 from "d3";
import { useAppStore } from '../core/store.js';
import { transformBranchLengths } from "../utils/branchTransformUtils.js";
import { WebGLLabelRenderer } from "./webglRenderers/WebGLLabelRenderer.js";
import { WebGLExtensionRenderer } from "./webglRenderers/WebGLExtensionRenderer.js";
import { WebGLNodeRenderer } from "./webglRenderers/WebGLNodeRenderer.js";
import { WebGLLinkRenderer } from "./webglRenderers/WebGLLinkRenderer.js";
import { WebGLSceneManager } from "./systems/WebGLSceneManager.js";
import { RadialTreeLayout } from "./RadialTreeLayout.js";
import { createStoreIntegratedUpdatePattern } from "./utils/IndependentUpdatePattern.js";
import { LABEL_OFFSETS } from "./utils/LabelPositioning.js";
import { resolveRenderingOptions } from "./utils/StoreStateResolver.js";
import { InterpolationEngine } from "./animation/InterpolationEngine.js";

/**
 * WebGL-enabled tree animation controller that orchestrates phylogenetic tree rendering
 * and smooth interpolation between tree states using Three.js.
 * 
 * CORE RESPONSIBILITIES:
 * - Manages WebGL scene setup and continuous render loop
 * - Coordinates all WebGL renderers (Links, Nodes, Extensions, Labels)
 * - Handles tree layout calculations with branch transformations
 * - Provides smooth interpolation between tree states during navigation
 * - Maintains consistent label positioning across all tree states
 * 
 * ARCHITECTURE:
 * - Uses modular renderer system for different tree components
 * - Integrates with store for single source of truth state management
 * - Supports both instant rendering and interpolated frame rendering
 * - Implements direction-aware navigation for proper backward scrubbing
 */
export class WebGLTreeAnimationController {
  /**
   * Creates a new WebGL tree animation controller.
   * @param {Object} _currentRoot - The root of the D3 hierarchy structure (can be null initially)
   * @param {Object} options - Configuration options
   * @param {string} [options.navigationDirection='forward'] - Initial navigation direction
   * @param {Object} [options.scene] - Scene manager options
   * @param {string} [options.cameraMode='orthographic'] - Camera mode
   * @param {Object} [options.camera] - Camera configuration options
   */
  constructor(_currentRoot, options = {}) {
    this.root = _currentRoot; // Can be null initially
    this.margin = 40; // Default margin, can be overridden

    // Initialize navigation direction tracking
    this.navigationDirection = options.navigationDirection || 'forward';

    // Track style state for change detection
    this.lastStrokeWidth = null;
    this.lastFontSize = null;

    // Single reference value for label radius consistency
    this.initialMaxLeafRadius = null;

    // Initialize WebGL container
    this.webglContainer = d3.select("#webgl-container");

    // Initialize scene manager (handles all WebGL setup)
    this.sceneManager = new WebGLSceneManager(
      this.webglContainer.node(),
      {
        backgroundColor: 0xf8f9fa,
        ...options.scene
      }
    );

    // Initialize scene manager with camera options
    this.sceneManager.initialize({
      cameraMode: options.cameraMode || 'orthographic',
      ...options.camera
    });

    // Setup scene manager callbacks
    this.setupSceneManagerCallbacks();

    // Initialize components that depend on scene manager
    this.initializeComponents();

    // Initialize interpolation engine for staging logic
    this.interpolationEngine = new InterpolationEngine(this);

    // Initialize WebGL renderers
    this.initializeRenderers();

    // Store controller reference in scene for renderer access
    this.sceneManager.scene.userData.controller = this;

    // Start render loop
    this.startRenderLoop();
  }

  /**
   * Sets navigation direction for proper interpolation handling.
   * Essential for backward scrubbing animations to display correctly.
   * @param {string} direction - Navigation direction ('forward', 'backward', 'jump')
   */
  setNavigationDirection(direction) {
    this.navigationDirection = direction;
  }


  /**
   * Clears all rendered elements from the WebGL scene.
   * Called before every render to ensure clean state and prevent artifacts.
   */
  clearScene() {
    console.log('[WebGLTreeAnimationController] Clearing scene for fresh render');
    
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
   * Sets up callbacks for scene manager events like resize.
   * Currently minimal as scene manager handles most events internally.
   * @private
   */
  setupSceneManagerCallbacks() {
    // Handle resize events
    // Scene manager handles resize internally
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

  }

  /**
   * Initializes all WebGL renderers (Link, Node, Extension, Label).
   * Each renderer is passed the controller reference for coordination.
   * @private
   */
  initializeRenderers() {
    const scene = this.sceneManager.scene;

    this.labelRenderer = new WebGLLabelRenderer(scene, this.colorManager, this);
    this.extensionRenderer = new WebGLExtensionRenderer(scene, this.colorManager, this);
    this.nodeRenderer = new WebGLNodeRenderer(scene, this.colorManager, this);
    this.linkRenderer = new WebGLLinkRenderer(scene, this.colorManager, this);
  }
  /**
   * Renders all tree elements instantly (non-interpolated).
   * Always clears scene first to ensure clean state.
   * @param {Object} [options={}] - Rendering options and configuration
   * @param {Array} [options.highlightEdges] - Edges to highlight
   * @param {boolean} [options.showExtensions=true] - Whether to show leaf extensions
   * @param {boolean} [options.showLabels=true] - Whether to show labels
   */
  async renderAllElements(options = {}) {
    // Check if we have a valid tree to render
    if (!this.root) {
      console.warn('[WebGLTreeAnimationController] No root tree to render');
      return;
    }

    // Always clear scene first for a fresh render
    // This ensures no artifacts from previous renders
    this.clearScene();
    
    // Modularized state resolution - single source of truth
    const {
      markedComponents,
      updateColorManagerAction,
      storeState
    } = resolveRenderingOptions(options);

    // Update color manager if action provided
    if (updateColorManagerAction) {
      updateColorManagerAction(markedComponents);
    }

    // Cache current tree layout for future transitions
    const currentLayout = {
      tree: this.root,
      width: this.sceneManager.renderer.domElement.getBoundingClientRect().width,
      height: this.sceneManager.renderer.domElement.getBoundingClientRect().height
    };

    storeState.cacheTreePositions(storeState.currentTreeIndex, currentLayout);

    // Always use instant rendering (no animated transitions)
    {
      const leaves = this.root.leaves();
      const allNodes = this.root.descendants();
      const links = this.root.links();

      // Ensure initialMaxLeafRadius is set
      if (this.initialMaxLeafRadius === null) {
        this.initialMaxLeafRadius = leaves.length > 0
          ? Math.max(...leaves.map(d => d.radius))
          : 200; // Default fallback
        console.log('[WebGLTreeAnimationController] Set initial radius in renderAllElements:', this.initialMaxLeafRadius);
      }

      // Use FIXED initialMaxLeafRadius for consistent label positioning across all trees
      const extensionRadius = this.initialMaxLeafRadius + LABEL_OFFSETS.EXTENSION;
      const labelRadius = this.initialMaxLeafRadius + LABEL_OFFSETS.WITH_EXTENSIONS;
      
      // Render all elements
      this.linkRenderer.renderLinksInstant(links);
      this.nodeRenderer.renderAllNodesInstant(allNodes);
      await this.extensionRenderer.renderExtensions(leaves, extensionRadius);
      await this.labelRenderer.renderLabels(leaves, labelRadius);

      // Focus camera on the tree for optimal viewing
      // Re-enable camera focus to ensure labels are in view
      this.sceneManager.focusCameraOnTree(this.initialMaxLeafRadius + LABEL_OFFSETS.WITH_EXTENSIONS);

      console.log('[WebGLTreeAnimationController] Tree rendering complete:', {
        leaves: leaves.length,
        labelRadius,
        initialMaxLeafRadius: this.initialMaxLeafRadius,
        camera: this.sceneManager?.getCamera()?.position.toArray(),
        labelMeshCount: this.labelRenderer?.labelMeshes?.size || 0,
        labelGroupVisible: this.labelRenderer?.labelGroup?.visible,
        sceneChildCount: this.sceneManager?.scene?.children?.length
      });

      // Force a render to ensure labels are visible
      this.renderScene();
      
      // Additional render after a short delay to catch any async label creation
      setTimeout(() => {
        this.renderScene();
      }, 100);
    }
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
   * Calculates tree layout without modifying controller state.
   * Applies branch transformations and uses WebGL canvas dimensions.
   * @param {Object} treeData - Raw tree data structure
   * @returns {Object} Layout object containing tree, max_radius, width, height, margin, scale
   */
  calculateLayout(treeData) {
    // Get branch transformation from store
    const { branchTransformation } = useAppStore.getState();
    
    // Apply branch transformation before layout calculation
    const transformedTreeData = transformBranchLengths(treeData, branchTransformation);
    
    console.log('[WebGLTreeAnimationController] Applying branch transformation:', branchTransformation);

    const canvas = this.sceneManager.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const layoutCalculator = new RadialTreeLayout(transformedTreeData);
    layoutCalculator.setDimension(width, height);
    layoutCalculator.setMargin(this.margin || 40);

    const layoutResult = layoutCalculator.constructRadialTree();

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
   * Updates controller layout with new tree data and caches result.
   * Sets initialMaxLeafRadius on first call for consistent label positioning.
   * @param {Object} treeData - Raw tree data structure
   * @param {number} [treeIndex=0] - Tree index for caching purposes
   * @param {Function} [cacheFunction=null] - Optional function to cache the layout
   * @returns {Object} Layout object with calculated tree structure and dimensions
   */
  updateLayout(treeData, treeIndex = 0, cacheFunction = null) {

    const layout = this.calculateLayout(treeData);
    this.root = layout.tree;

    // Set initialMaxLeafRadius ONLY ONCE for consistent label positioning across all trees
    // This is the authoritative place to set it - used by both renderAllElements and renderInterpolatedFrame
    if (this.initialMaxLeafRadius === null) {
      const leaves = this.root.leaves();
      this.initialMaxLeafRadius = leaves.length > 0
        ? Math.max(...leaves.map(d => d.radius))
        : 200; // Default fallback radius for consistent positioning

      console.log('[WebGLTreeAnimationController] Set fixed label radius in updateLayout:', this.initialMaxLeafRadius);
    }

    // Cache tree positions if caching function provided
    if (cacheFunction) {
      cacheFunction(treeIndex, layout);
    }

    return layout;
  }


  /**
   * Updates controller from store data using single source of truth pattern.
   * Handles style change detection and cache invalidation when needed.
   * Called before rendering to ensure controller state matches store.
   */
  updateFromStore() {
    const {
      currentTreeIndex,
      treeList,
      monophyleticColoringEnabled,
      strokeWidth,
      fontSize,
      cacheTreePositions,
      setColorManagerMonophyleticColoring
    } = useAppStore.getState();

    const currentTreeData = treeList[currentTreeIndex];

    // Detect style changes that require renderer cache invalidation
    const strokeWidthChanged = this.lastStrokeWidth !== null && this.lastStrokeWidth !== strokeWidth;
    const fontSizeChanged = this.lastFontSize !== null && this.lastFontSize !== fontSize;

    if (strokeWidthChanged || fontSizeChanged) {

      // Invalidate label renderer styles to force recreation with new stroke width
      if (this.labelRenderer && strokeWidthChanged) {
        this.labelRenderer.invalidateStyles();
      }

      // Clear link renderer caches if stroke width changed
      if (this.linkRenderer && strokeWidthChanged) {
        // LinkRenderer should automatically pick up new stroke width from store
        // but we may need to clear any cached geometries
      }
    }

    // Update tracked values
    this.lastStrokeWidth = strokeWidth;
    this.lastFontSize = fontSize;

    // Update layout with current tree data from store
    if (currentTreeData) {
      this.updateLayout(
        currentTreeData,
        currentTreeIndex,
        cacheTreePositions
      );
    }

    // Update monophyletic coloring from store
    setColorManagerMonophyleticColoring(monophyleticColoringEnabled);
  }


  /**
   * Renders an interpolated frame between two tree states.
   * Used for smooth timeline scrubbing and animation playback.
   * @param {Object} fromTreeData - Source tree data (t=0)
   * @param {Object} toTreeData - Target tree data (t=1) 
   * @param {number} timeFactor - Interpolation factor between 0 and 1
   * @param {Object} [options={}] - Rendering options
   * @param {Array} [options.highlightEdges=[]] - Edges to highlight during interpolation
   * @param {boolean} [options.showExtensions=true] - Whether to show leaf extensions
   * @param {boolean} [options.showLabels=true] - Whether to show labels
   */
  async renderInterpolatedFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
    const { highlightEdges = []} = options;
    let t = Math.max(0, Math.min(1, timeFactor));
    if (fromTreeData === toTreeData) t = 0;

    // Layout calculation
    const layoutFrom = this.calculateLayout(fromTreeData);
    const layoutTo = this.calculateLayout(toTreeData);

    // CRITICAL: Ensure initialMaxLeafRadius is set if not already
    // This can happen during animation playback before updateLayout is called
    if (this.initialMaxLeafRadius === null) {
      // Use the target tree (where we're going) to establish the reference radius
      const targetLeaves = layoutTo.tree.leaves();
      this.initialMaxLeafRadius = targetLeaves.length > 0
        ? Math.max(...targetLeaves.map(d => d.radius))
        : 200; // Default fallback radius
      
      console.log('[WebGLTreeAnimationController] Set initial radius during interpolation:', this.initialMaxLeafRadius);
    }


    // Direction-aware element diffing
    const isBackwardNavigation = this.navigationDirection === 'backward';

    const allUpdates = isBackwardNavigation
      ? this.updatePattern.diffAllElements(layoutFrom.tree, layoutTo.tree)
      : this.updatePattern.diffAllElements(layoutTo.tree, layoutFrom.tree);
    const filteredData = this.updatePattern.extractFilteredData(allUpdates);

    const currentLeaves = layoutTo.tree.leaves();
    const currentNodes = layoutTo.tree.descendants();

    // Use FIXED initialMaxLeafRadius for consistent label positioning across all renders
    // This ensures labels stay at the same position regardless of tree size
    const extensionRadius = this.initialMaxLeafRadius + LABEL_OFFSETS.EXTENSION;
    const labelRadius = this.initialMaxLeafRadius + LABEL_OFFSETS.WITH_EXTENSIONS;


    // Create interpolation animation context
    const interpolationContext = {
      leaves: currentLeaves,
      allNodes: currentNodes,
      extensionRadius,
      labelRadius,
      // Interpolation-specific data
      fromTreeData: layoutFrom.tree,
      toTreeData: layoutTo.tree,
      timeFactor: t,
      highlightEdges,
      filteredData: filteredData,
      isBackwardNavigation: isBackwardNavigation
    };

    // Execute staged interpolation sequence using engine
    await this.interpolationEngine.executeInterpolationStaging(filteredData, interpolationContext);

    // Only validate at discrete tree states (t=0 or t=1) when transition is complete
    // During interpolation (0 < t < 1), meshes may be in transition states
    if (t <= 0.05 || t >= 0.95) {
      const currentLinks = layoutTo.tree.links();
      this._validateRendererState(filteredData, currentLinks, currentNodes, currentLeaves);
    }

    // CRITICAL FIX: Clear caches if end state validation fails
    this._validateEndStateAndClearCaches(layoutTo, timeFactor, isBackwardNavigation);

  }

  /**
   * Validates renderer state consistency and cleans up orphaned elements.
   * Called during interpolation to ensure all renderers have correct element counts.
   * @private
   * @param {Object} filteredData - Filtered element data from diffing
   * @param {Array} currentLinks - Current link elements
   * @param {Array} currentNodes - Current node elements  
   * @param {Array} currentLeaves - Current leaf elements
   */
  _validateRendererState(filteredData, currentLinks, currentNodes, currentLeaves) {
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
   * Critical for backward navigation to prevent stale cache artifacts.
   * @private
   * @param {Object} layoutTo - Target layout structure
   * @param {number} timeFactor - Current interpolation time factor (0-1)
   * @param {boolean} isBackwardNavigation - Whether this is backward navigation
   */
  _validateEndStateAndClearCaches(layoutTo, timeFactor, isBackwardNavigation) {
    // Only validate at transition completion (t=1) or near completion (t>0.95)
    if (timeFactor < 0.95) return;

    const { currentTreeIndex, clearPositionCache, clearLayoutCache } = useAppStore.getState();

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
   * Clears renderer-level cached data and transformations.
   * Removes cached geometry data that might cause visual artifacts.
   * @private
   */
  _clearRendererCaches() {
    // Clear any cached transformation state in LinkRenderer
    if (this.linkRenderer && this.linkRenderer.linkMeshes) {
      this.linkRenderer.linkMeshes.forEach(mesh => {
        if (mesh.userData) {
          delete mesh.userData.fixedSegs; // Fixed segments cache for tube geometry
          delete mesh.userData.originalRotation;
          delete mesh.userData.originalCoordinates;
          delete mesh.userData.originalMatrix;
        }
      });
    }
  }

  /**
   * Cleans up all WebGL resources and stops rendering loops.
   * Must be called when controller is no longer needed to prevent memory leaks.
   */
  destroy() {
    // Stop render loop first
    this.stopRenderLoop();

    // Clean up renderers
    this.labelRenderer.destroy();
    this.labelRenderer = null;

    this.extensionRenderer.destroy();
    this.extensionRenderer = null;

    this.nodeRenderer.destroy();
    this.nodeRenderer = null;

    this.linkRenderer.destroy();
    this.linkRenderer = null;

    // Clean up scene manager (handles all WebGL resources)
    this.sceneManager.destroy();
    this.sceneManager = null;

    // Clean up references
    this.colorManager = null;
    this.updatePattern = null;
  }
}
