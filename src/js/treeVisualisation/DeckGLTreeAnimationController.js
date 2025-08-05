import { DeckGLDataAdapter } from './deckgl/DeckGLDataAdapter.js';
import { DeckManager } from './deckgl/core/DeckManager.js';
import { LayerManager } from './deckgl/layers/LayerManager.js';
import { TreeInterpolator } from './deckgl/interpolation/TreeInterpolator.js';
import { WebGLTreeAnimationController } from './WebGLTreeAnimationController.js';
import { useAppStore } from '../core/store.js';
import { easeInOut, animate } from 'popmotion';

export class DeckGLTreeAnimationController extends WebGLTreeAnimationController {
  constructor() {
    super();
    this.dataConverter = new DeckGLDataAdapter();
    this.layerManager = new LayerManager();
    this.treeInterpolator = new TreeInterpolator();

    // Remove layer caching - deck.gl handles this internally
    // this._cachedLayers = null;
    // this._layerRefs = new Map();

    // Initialize DeckManager immediately
    this.deckManager = new DeckManager(this.webglContainer);
    this.deckManager.onWebGLInitialized((gl) => {
      this.gl = gl;
      console.log('[DeckGL Controller] WebGL context initialized');
    });
    this.deckManager.onError((error) => {
      console.error('[DeckGL Controller] Deck.gl error:', error);
    });
    this.deckManager.initialize();

    // Set up style change callback to update layers when strokeWidth/fontSize changes
    this.layerManager.layerStyles.setStyleChangeCallback(() => {
      this._handleStyleChange();
    });
  }

  /**
   * Handle style changes (strokeWidth, fontSize) by updating existing layers
   * @private
   */
  _handleStyleChange() {
    // With deck.gl native management, just trigger a re-render
    // The LayerManager will create new layers with updated styles
    if (this.deckManager) {
      this.renderAllElements();
    }
  }

  /**
   * Switches the camera mode.
   * @param {string} mode - The camera mode to switch to ('orthographic' or 'orbit').
   */
  setCameraMode(mode) {
    this.deckManager.setCameraMode(mode, { preserveTarget: true });
    // Re-focus on the tree with the new camera settings
    const storeState = useAppStore.getState();
    const { currentTreeIndex, treeList } = storeState;
    if (treeList[currentTreeIndex]) {
      this.renderAllElements();
    }
  }

  /**
   * Override parent's renderAllElements with Deck.gl implementation
   * Uses the same geometry pipeline as WebGLLinkRenderer + PolylineGeometryFactory
   */
  async renderAllElements(options = {}) {
    console.log('[DeckGL Controller] renderAllElements called with options:', options);

    const storeState = useAppStore.getState();
    const { currentTreeIndex, treeList } = storeState;

    const currentTreeData = treeList[currentTreeIndex];

    // Use parent layout calculation
    const currentLayout = this.calculateLayout(currentTreeData, {
      treeIndex: currentTreeIndex,
      updateController: true
    });

    // Consistent radii
    const treeLeaves = currentLayout.tree.leaves();
    const { extensionRadius, labelRadius } = this._getConsistentRadii(currentLayout, null, null, treeLeaves);

    // Convert to Deck.gl format
    const layerData = this.dataConverter.convertTreeToLayerData(
      currentLayout.tree,
      {
        extensionRadius,
      }
    );

    // Update layers efficiently
    this._updateLayersEfficiently(layerData);

    // Focus camera on content
    this.focusOnTree(layerData.nodes, layerData.labels);
  }

  /**
   * Calculates the bounding box of the tree and labels, and updates the view state.
   * Uses correct transition prop names so animation actually runs.
   */
  focusOnTree(nodes, labels) {
    if (!this.deckManager || !nodes || nodes.length === 0) {
      console.warn('[DeckGL Controller] No nodes or deck manager to focus on');
      return;
    }

    const allElements = [...nodes, ...(labels || [])];
    const bounds = allElements.reduce((acc, el) => {
      const [x, y] = el.position;
      acc.minX = Math.min(acc.minX, x);
      acc.maxX = Math.max(acc.maxX, x);
      acc.minY = Math.min(acc.minY, y);
      acc.maxY = Math.max(acc.maxY, y);
      return acc;
    }, {
      minX: Infinity, maxX: -Infinity,
      minY: Infinity, maxY: -Infinity,
    });

    // Let DeckManager compute zoom+center and apply a proper transition
    this.deckManager.fitToBounds(bounds, {
      padding: 1.2,
      duration: 500
      // You can also pass interpolator: new FlyToInterpolator({ speed: 1.5 })
    });
  }

  /**
   * Override renderScene to use Deck.gl's render method
   */
  renderScene() {
    // Deck.gl automatically redraws on prop changes
  }

  /**
   * Apply optional easing to interpolation time factor
   * @param {number} t - Time factor (0-1)
   * @param {string} easingType - Type of easing ('linear', 'easeInOut')
   * @returns {number} Eased time factor
   */
  applyInterpolationEasing(t, easingType = 'linear') {
    if (easingType === 'easeInOut') {
      return easeInOut(t);
    }
    return t; // Default linear easing
  }

  /**
   * Get or calculate layout with caching
   * @param {Object} treeData - Tree data to calculate layout for
   * @param {number|undefined} treeIndex - Tree index for cache lookup
   * @param {Function} getLayoutCache - Cache retrieval function
   * @param {Function} cacheTreePositions - Cache storage function
   * @returns {Object} Layout object
   * @private
   */
  _getOrCalculateLayout(treeData, treeIndex, getLayoutCache, cacheTreePositions) {
    // Try to get from cache first
    let layout = treeIndex !== undefined ? getLayoutCache(treeIndex) : null;

    // If not cached, calculate and potentially cache
    if (!layout) {
      layout = this.calculateLayout(treeData, {
        treeIndex: treeIndex,
        cacheFunction: cacheTreePositions
      });
    }

    return layout;
  }

  /**
   * Override renderInterpolatedFrame for Deck.gl animation
   * Provides smooth interpolation between tree states using Deck.gl layers
   */
  async renderInterpolatedFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
    const { fromTreeIndex, toTreeIndex } = options;
    let t = Math.max(0, Math.min(1, timeFactor));
    if (fromTreeData === toTreeData) t = 0;

    // Apply optional easing for smoother animations
    t = this.applyInterpolationEasing(t, 'easeInOut');

    // Get store state for caching
    const storeState = useAppStore.getState();
    const { cacheTreePositions, getLayoutCache } = storeState;

    // Calculate layouts for both trees with caching
    const layoutFrom = this._getOrCalculateLayout(fromTreeData, fromTreeIndex, getLayoutCache, cacheTreePositions);
    const layoutTo = this._getOrCalculateLayout(toTreeData, toTreeIndex, getLayoutCache, cacheTreePositions);

    // Ensure initial radius is set
    this._ensureInitialRadius(layoutTo.tree, 'during interpolation');

    // Get consistent radii
    const currentLeaves = layoutTo.tree.leaves();
    const { extensionRadius } = this._getConsistentRadii(
      layoutFrom, layoutTo, null, currentLeaves
    );

    // Convert both trees to Deck.gl format
    const dataFrom = this.dataConverter.convertTreeToLayerData(
      layoutFrom.tree,
      { extensionRadius}
    );

    const dataTo = this.dataConverter.convertTreeToLayerData(
      layoutTo.tree,
      { extensionRadius}
    );

    // Interpolate
    const interpolatedData = this.treeInterpolator.interpolateTreeData(dataFrom, dataTo, t);

    // Update or create layers efficiently
    this._updateLayersEfficiently(interpolatedData);
  }

  /**
   * Update layers with new data, using deck.gl native management
   * @private
   */
  async _updateLayersEfficiently(newData) {
    try {
      // Simply delegate to LayerManager - it handles creation and deck.gl handles optimization
      const layers = this.layerManager.updateLayersWithData(newData);

      // Update the deck with new layers
      this.deckManager.setLayers(layers);

    } catch (error) {
      console.error('[DeckGL Controller] Error updating layers:', error);
      throw error;
    }
  }


  /**
   * Override _updateSmoothAnimation for Deck.gl
   * Handles the animation loop timing and frame updates
   */
  async _updateSmoothAnimation(timestamp) {
    // Get store state
    const storeState = useAppStore.getState();
    const {
      movieData,
      updateAnimationProgress,
      getAnimationInterpolationData,
      stop,
    } = storeState;

    // Check for movieData and update animation progress
    // This automatically updates currentTreeIndex and triggers ColorManager subscription
    if (!movieData || updateAnimationProgress(timestamp)) {
      stop();
      return;
    }

    // Get interpolation data from store
    const interpolationData = getAnimationInterpolationData();
    const { fromTreeIndex, toTreeIndex, easedProgress } = interpolationData;

    // Get tree data for interpolation
    const fromTree = movieData.interpolated_trees[fromTreeIndex];
    const toTree = movieData.interpolated_trees[toTreeIndex];

    // Render interpolated frame with eased progress
    try {
      await this.renderInterpolatedFrame(
        fromTree,
        toTree,
        easedProgress,
        {
          toTreeIndex: toTreeIndex,
          fromTreeIndex: fromTreeIndex
        }
      );
    } catch (error) {
      console.error('[DeckGL Controller] Error rendering interpolated frame:', error);
    }
  }

  /**
   * Clean up Deck.gl resources
   */
  destroy() {
    // Stop Popmotion animation loop
    if (this.animationFrameId && typeof this.animationFrameId.stop === 'function') {
      this.animationFrameId.stop();
      this.animationFrameId = null;
    }

    if (this.deckManager) {
      this.deckManager.destroy();
      this.deckManager = null;
    }
    if (this.layerManager) {
      this.layerManager.destroy();
      this.layerManager = null;
    }
  }

  async _animationLoop() {
    // Use Popmotion's animate for more sophisticated timing control
    const { playing } = useAppStore.getState();

    if (!playing) {
      console.log('[DeckGL Controller] Animation loop stopped - playing is false');
      return;
    }

    // Use Popmotion animate for frame-by-frame animation with better timing
    this.animationFrameId = animate({
      from: 0,
      to: 1,
      duration: 16.67, // ~60fps (16.67ms per frame)
      repeat: Infinity,
      onUpdate: async () => {
        const { playing: stillPlaying } = useAppStore.getState();
        if (stillPlaying) {
          const timestamp = performance.now();
          await this._updateSmoothAnimation(timestamp);
        } else {
          // Stop animation if no longer playing
          if (this.animationFrameId) {
            this.animationFrameId.stop();
            this.animationFrameId = null;
          }
        }
      },
      onComplete: () => {
        console.log('[DeckGL Controller] Popmotion animation loop completed');
      }
    });
  }

  /**
   * Override renderScrubFrame to use Deck.gl rendering pipeline
   * Deck.gl handles all the complexity - we just need to interpolate and update layers
   */
  async renderScrubFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
    // Simply delegate to renderInterpolatedFrame - it already has all the logic we need
    await this.renderInterpolatedFrame(fromTreeData, toTreeData, timeFactor, options);
  }

  /**
   * Override to prevent WebGL renderer initialization
   */
  initializeRenderers() {
    // Don't initialize WebGL renderers for Deck.gl
  }

  /**
   * Override to prevent WebGL scrub renderer initialization
   */
  initializeComponents() {
    // Only initialize what's essential, skip WebGL-specific components
  }

  /**
   * Override clearScene to prevent WebGL renderer calls
   */
  clearScene() {
    // Deck.gl doesn't need explicit scene clearing
  }

  /**
   * Override renderer state validation
   */
  _validateAndCleanupRendererState() {
    // Deck.gl handles this automatically
  }

  /**
   * Override renderer cache clearing
   */
  _clearRendererCaches() {
    // No WebGL renderer caches to clear
  }

  /**
   * Override color refresh
   */
  refreshAllColors(triggerRender = true) {
    // Update LayerStyles cache instead of WebGL materials
    if (this.layerManager && this.layerManager.layerStyles) {
      this.layerManager.layerStyles.invalidateCache();
    }

    if (triggerRender) {
      // Just trigger a re-render with current data
      this.renderAllElements();
    }
  }

  /**
   * Override WebGL-specific methods that don't apply to Deck.gl
   */
  _initializeWebGLComponents() {
    // Not needed for Deck.gl
  }

  _initializeScrubRenderer() {
    // Not needed for Deck.gl
  }

  _updateWebGLRenderers() {
    // Not needed for Deck.gl
  }
}
