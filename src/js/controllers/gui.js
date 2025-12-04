import { useAppStore } from '../core/store.js';
import { calculateWindow } from "../domain/msa/msaWindowCalculator.js";
import { getMSAFrameIndex } from "../domain/indexing/IndexMapping.js";

// ============================================================================
// GUI CLASS - Main controller for phylogenetic tree visualization application
//
// CORE RESPONSIBILITIES:
// - Orchestrates WebGL tree rendering via TreeAnimationController
// - Manages tree rendering lifecycle and state
// - Synchronizes with MSA viewer when enabled
// - Provides centralized state management through store integration
//
// RENDER ORCHESTRATION:
// - Coordinates comparison mode vs single tree rendering
// - Handles render-in-progress state to prevent overlapping renders
// - Manages post-render component updates
//
// STORE INTEGRATION:
// - Single source of truth pattern with useAppStore
// - Reactive updates via store subscriptions
// - Proper cleanup and resource management
//
// NOTE: Animation and timeline controls now live directly in the store (uiSlice)
// React components call store methods directly instead of going through Gui
// ============================================================================
export default class Gui {
  constructor(movieData, options = {}) {
    // Store options for later use
    this.options = options;

    // Initialize the store first
    useAppStore.getState().initialize(movieData);


    // Scale bar is managed by React; no UI controller needed
    // React (Nivo) chart renders via components; no chart controller

    // Subscribe only to core tree navigation changes
    // Controllers handle their own specific subscriptions
    this.unsubscribeStore = useAppStore.subscribe(
      (state) => ({
        currentTreeIndex: state.currentTreeIndex,
        playing: state.playing
      }),
      (current, previous) => {
        // Keep subscription focused: animation drives renders; avoid redundant work.

        // Update the main tree view when the index has changed (even during playback)
        if (current.currentTreeIndex !== previous?.currentTreeIndex) {
          this.updateMain();
        }

        // Always sync MSA, throttled within the function itself.
        this.syncMSAIfOpen();
      }
    );
  }

  // ========================================
  // MSA VIEWER SYNCHRONIZATION
  // ========================================
  _syncMSAIfOpenThrottled() {
    // Simple throttling with 100ms delay
    if (!this._lastSyncTime) this._lastSyncTime = 0;
    const now = Date.now();
    if (now - this._lastSyncTime < 100) return;
    this._lastSyncTime = now;
    this.syncMSAIfOpen();
  }

  syncMSAIfOpen() {
    const { transitionResolver, msaWindowSize, msaStepSize, syncMSAEnabled, msaColumnCount, setMsaRegion } = useAppStore.getState();
    if (!syncMSAEnabled || !transitionResolver || !msaColumnCount) return;
    // Centralized frame index for MSA anchoring
    const frameIndex = getMSAFrameIndex();
    if (frameIndex < 0) return;
    const windowData = calculateWindow(frameIndex, msaStepSize, msaWindowSize, msaColumnCount);
    // Store-driven region; viewer will subscribe to this state
    setMsaRegion(windowData.startPosition, windowData.endPosition);
  }

  // ========================================
  // TREE NAVIGATION & STATE MANAGEMENT
  // ========================================

  /**
   * Validates that rendering can proceed
   * @returns {Object|null} Validation result with tree data, or null if invalid
   */
  _validateRenderState() {
    const { currentTreeIndex, movieData } = useAppStore.getState();

    const tree = movieData.interpolated_trees[currentTreeIndex];
    if (!tree) {
      return null;
    }

    return { currentTreeIndex, movieData, tree };
  }

  /**
   * Calculate tree indices for comparison mode
   * @param {number} currentTreeIndex - Current position in sequence
   * @param {Object} transitionResolver - Transition index resolver
   * @returns {Object} Object with leftIndex and rightIndex
   */
  _getComparisonIndices(currentTreeIndex, transitionResolver) {
    const full = transitionResolver?.fullTreeIndices || [];

    // Left shows current tree (animated)
    const leftIndex = currentTreeIndex;

    // Right shows next anchor after the source anchor (static)
    const sourceAnchorIndex = transitionResolver.getSourceTreeIndex(currentTreeIndex);
    const rightIndex = full.find((i) => i > sourceAnchorIndex) ?? full[full.length - 1];

    return { leftIndex, rightIndex };
  }

  /**
   * Ensures we have the appropriate tree controller (WebGL or SVG)
   * @returns {Object} Tree controller ready for rendering
   */
  _ensureTreeController() {
    const { setTreeControllers, treeControllers: currentTreeControllers, comparisonMode } = useAppStore.getState();

    // Always use single controller - it will handle comparison mode internally
    if (currentTreeControllers.length === 1) {
      const controller = currentTreeControllers[0];
      // Update comparison mode state
      if (controller.setComparisonMode) {
        controller.setComparisonMode(comparisonMode);
      }
      return currentTreeControllers;
    }

    const newController = new this.options.TreeController('#webgl-container', {
      animations: true,
      comparisonMode
    });
    setTreeControllers([newController]);
    return [newController];
  }

  /**
   * Performs the actual tree rendering with proper error handling
   * @param {Object} treeController - The controller to use for rendering
   * @param {number|Object} treeIndexOrOptions - Tree index or options object with leftIndex, rightIndex, comparisonMode
   */
  async _performTreeRender(treeController, treeIndexOrOptions) {
    const { setRenderInProgress } = useAppStore.getState();

    setRenderInProgress(true);
    try {
      // Always do a fresh render - renderAllElements now clears automatically
      if (typeof treeIndexOrOptions === 'object' && treeIndexOrOptions !== null) {
        // Comparison mode with both trees
        await treeController.renderAllElements(treeIndexOrOptions);
      } else {
        // Single tree mode
        await treeController.renderAllElements({ treeIndex: treeIndexOrOptions });
      }
    } catch (error) {
      console.error('Error during tree rendering:', error);
      throw error; // Re-throw so caller can handle if needed
    } finally {
      setRenderInProgress(false);
    }
  }

  /**
   * Updates auxiliary UI components after successful render
   */
  _updatePostRenderComponents() {
    // Update S-Edge bars if available
    const { movieTimelineManager } = useAppStore.getState();
    if (movieTimelineManager) {
      movieTimelineManager.updateCurrentPosition();
    }
  }

  /**
   * Main tree update orchestrator - coordinates the rendering pipeline
   */
  async updateMain() {
    // 1. Validate that we can proceed with rendering
    const validationResult = this._validateRenderState();
    if (!validationResult) {
      return; // Early exit - either already rendering or no valid tree
    }

    const { comparisonMode, currentTreeIndex, treeList, transitionResolver } = useAppStore.getState();

    // 2. Ensure we have the right controller for current mode
    const treeControllers = this._ensureTreeController();

    // 3. Perform the actual rendering
    try {
      if (comparisonMode) {
        const { leftIndex, rightIndex } = this._getComparisonIndices(currentTreeIndex, transitionResolver);
        // Pass both tree indices to the controller for split-view rendering
        await this._performTreeRender(treeControllers[0], { leftIndex, rightIndex, comparisonMode: true });
      } else {
        await this._performTreeRender(treeControllers[0]);
      }
    } catch (error) {
      // Error already logged in _performTreeRender, just return
      return;
    }

    // 4. Update auxiliary components
    this._updatePostRenderComponents();
  }

  /**
   * Clean up resources when GUI is destroyed
   */
  destroy() {
    const { setTreeControllers, movieTimelineManager } = useAppStore.getState();
    setTreeControllers([]);

    // Clean up store subscription
    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }

    // React (Nivo) chart is component-driven; nothing to clean up here

    // MovieTimelineManager cleanup is handled by the store
  }
}
