import { useAppStore } from '../core/store.js';
import { TaxaColoring } from "../treeColoring/index.js";
import { WebGLTreeAnimationController } from "../treeVisualisation/WebGLTreeAnimationController.js";
import { TREE_COLOR_CATEGORIES } from "../core/store.js";
import { applyColoringData } from "../treeColoring/index.js";
import { NavigationController } from "./NavigationController.js";
import { calculateWindow } from "../utils/windowUtils.js";
import { getMSAFrameIndex } from "../core/IndexMapping.js";
import { MovieTimelineManager } from "../timeline/MovieTimelineManager.js";
import { TIMELINE_CONSTANTS } from "../timeline/constants.js";

// ============================================================================
// GUI CLASS - Main controller for phylogenetic tree visualization application
//
// CORE RESPONSIBILITIES:
// - Orchestrates WebGL/SVG tree rendering via TreeAnimationController
// - Manages animation playback with smooth interpolation
// - Handles navigation direction tracking for backward scrubbing support
// - Coordinates UI controllers (Navigation, UI)
// - Synchronizes with MSA viewer when enabled
// - Provides centralized state management through store integration
//
// ANIMATION SYSTEM:
// - Uses TWEEN.js for smooth easing during playback
// - Supports forward/backward/jump navigation detection
// - Handles interpolated frame rendering for timeline scrubbing
// - Manages render-in-progress state to prevent overlapping renders
//
// STORE INTEGRATION:
// - Single source of truth pattern with useAppStore
// - Reactive updates via store subscriptions
// - Proper cleanup and resource management
// ============================================================================
export default class Gui {
  constructor(movieData, options = {}) {
    // Store options for later use
    this.options = options;
    this.movie_data = movieData;

    // Initialize the store first
    useAppStore.getState().initialize(movieData);


    // Initialize controllers, passing 'this' (the Gui instance) where needed
    this.navigationController = new NavigationController(this);
    // Scale bar is managed by React; no UI controller needed
    // React (Nivo) chart renders via components; no chart controller

    // Movie Timeline Manager for visual active change edge progress tracking
    this.movieTimelineManager = null;

    // Subscribe only to core tree navigation changes
    // Controllers handle their own specific subscriptions
    this.unsubscribeStore = useAppStore.subscribe(
      (state) => ({
        currentTreeIndex: state.currentTreeIndex,
        playing: state.playing,
        subscriptionPaused: state.subscriptionPaused
      }),
      (current, previous) => {
        // Keep subscription focused: animation drives renders; avoid redundant work.

        // Handle playing state changes to update the UI button
        if (current.playing !== previous?.playing) {
          this._updatePlayButtonState();
        }

        // Only update the main tree view when NOT playing and the index has changed.
        if (!current.playing && current.currentTreeIndex !== previous?.currentTreeIndex) {
          this.updateMain();
        }

        // Always sync MSA, throttled within the function itself.
        this.syncMSAIfOpen();
      }
    );
  }


  // ========================================
  // MOVIE PLAYBACK CONTROLS
  // ========================================
  initializeMovie() {
    const { gui } = useAppStore.getState();
    // No SVG zoom to initialize in WebGL mode
    gui.resize();
    gui.update();


    // Initialize Movie Timeline Manager after movie is initialized
    this._initializeMovieTimelineManager();
  }

  // ========================================
  // TIMELINE CONTROLS (invoked by React buttons)
  // ========================================
  zoomInTimeline() {
    try { this.movieTimelineManager?.timeline?.zoomIn?.(TIMELINE_CONSTANTS.ZOOM_PERCENTAGE_UI); } catch {}
  }
  zoomOutTimeline() {
    try { this.movieTimelineManager?.timeline?.zoomOut?.(TIMELINE_CONSTANTS.ZOOM_PERCENTAGE_UI); } catch {}
  }
  fitTimeline() {
    try { this.movieTimelineManager?.timeline?.fit?.(); } catch {}
  }
  scrollToStartTimeline() {
    try { this.movieTimelineManager?.timeline?.moveTo?.(TIMELINE_CONSTANTS.DEFAULT_PROGRESS); } catch {}
  }
  scrollToEndTimeline() {
    try {
      const t = this.movieTimelineManager?.timeline;
      if (!t) return;
      const total = t.getTotalDuration?.();
      const range = t.getVisibleTimeRange?.();
      if (typeof total === 'number' && range && typeof range.min === 'number' && typeof range.max === 'number') {
        const visible = Math.max(0, range.max - range.min);
        t.moveTo(Math.max(0, total - visible));
      }
    } catch {}
  }

  // ========================================
  // PLAYBACK BUTTON STATE MANAGEMENT
  // ========================================
  _updatePlayButtonState() {
    // React TransportControls handles play/pause icon and labels.
    // No DOM updates needed here.
  }

  async play() {
    let { playing, treeController } = useAppStore.getState();
    if (playing) return;

    // Ensure we have a tree controller before starting animation
    if (!treeController) {
      await this.updateMain();
      // Re-fetch the controller that was just created
      treeController = useAppStore.getState().treeController;
    }

    // THE FIX: The controller's startAnimation method is the single source of truth for starting playback.
    // It will handle setting the store state and beginning the animation loop.
    if (treeController && typeof treeController.startAnimation === 'function') {
      treeController.startAnimation();
    } else {
      console.warn('[GUI] Cannot start animation - no valid tree controller');
    }
  }



  stop() {
    const { treeController, stop: stopStore } = useAppStore.getState();
    // Stop animation first if controller has the method
    if (treeController && typeof treeController.stopAnimation === 'function') {
      treeController.stopAnimation();
    }
    // Also ensure the store state is set to not playing.
    stopStore();
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

  isMSAViewerOpen() {
    // Legacy check no longer required; viewer API is safe to call if missing
    return true;
  }

  syncMSAIfOpen() {
    const { transitionResolver, msaWindowSize, msaStepSize, syncMSAEnabled, msaColumnCount } = useAppStore.getState();
    if (!syncMSAEnabled || !transitionResolver || !msaColumnCount) return;
    // Centralized frame index for MSA anchoring
    const frameIndex = getMSAFrameIndex();
    if (frameIndex < 0) return;
    const windowData = calculateWindow(frameIndex, msaStepSize, msaWindowSize, msaColumnCount);
    import('../msaViewer/index.js')
      .then(({ setMSARegion }) => {
        setMSARegion(windowData.startPosition, windowData.endPosition);
      })
      .catch(() => {});
  }

  // ========================================
  // MAIN UPDATE CYCLE
  // ========================================
  async update(skipAutoCenter = false) {
    // 1. Handle layout/sizing first
    this.resize(skipAutoCenter);

    // 2. Render tree content
    await this.updateMain();

    // 3. Chart updates are handled by React (Nivo) via store state

    // 4. UI elements update via React components

    // 5. Sync external viewers if needed
    this._syncMSAIfOpenThrottled();
  }

  // ========================================
  // UI EVENT HANDLERS
  // ========================================

  getCurrentWindow() {
    const { msaWindowSize, msaStepSize, msaColumnCount } = useAppStore.getState(); // Get state from store
    const frameIndex = getMSAFrameIndex();
    const window = calculateWindow(frameIndex, msaStepSize, msaWindowSize, msaColumnCount || 0);
    // Note: setWindowStart and setWindowEnd were removed as they don't exist in the store
    return window;
  }

  // ========================================
  // TREE NAVIGATION & STATE MANAGEMENT
  // ========================================

  /**
   * Validates that rendering can proceed
   * @returns {Object|null} Validation result with tree data, or null if invalid
   */
  _validateRenderState() {
    const {
      currentTreeIndex,
      movieData,
      renderInProgress
    } = useAppStore.getState();

    // Skip if render is already in progress to prevent overlapping renders
    if (renderInProgress) {
      return null;
    }

    const tree = movieData.interpolated_trees[currentTreeIndex];
    if (!tree) {
      return null;
    }

    return { currentTreeIndex, movieData, tree };
  }

  /**
   * Ensures we have the appropriate tree controller (WebGL or SVG)
   * @returns {Object} Tree controller ready for rendering
   */
  _ensureTreeController() {
    const {
      setTreeController,
      treeController: currentTreeController
    } = useAppStore.getState();

    if (currentTreeController) {
      return currentTreeController;
    }

    // Always create a WebGL-based controller unless an override is provided
    let newTreeController;
    if (this.options.TreeController) {
      newTreeController = new this.options.TreeController();
    } else {
      newTreeController = new WebGLTreeAnimationController();
    }
    // Store handles all controller lifecycle management
    setTreeController(newTreeController);
    return newTreeController;
  }

  /**
   * Performs the actual tree rendering with proper error handling
   * @param {Object} treeController - The controller to use for rendering
   */
  async _performTreeRender(treeController) {
    const { setRenderInProgress } = useAppStore.getState();

    setRenderInProgress(true);
    try {
      // Always do a fresh render - renderAllElements now clears automatically
      await treeController.renderAllElements();
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
    if (this.movieTimelineManager) {
      this.movieTimelineManager.updateCurrentPosition();
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

    // 2. Ensure we have the right controller for current mode
    const treeController = this._ensureTreeController();

    // 3. Perform the actual rendering
    try {
      await this._performTreeRender(treeController);
    } catch (error) {
      // Error already logged in _performTreeRender, just return
      return;
    }

    // 4. Update auxiliary components
    this._updatePostRenderComponents();
  }


  resize(_skipAutoCenter = false) {}


  async backward() {
    const { backward: storeBackward } = useAppStore.getState();
    storeBackward();
  }

  async forward() {
    const { forward: storeForward } = useAppStore.getState();
    storeForward();
  }

  async goToPosition(position) {
    const { goToPosition: storeGoToPosition } = useAppStore.getState();

    // Just navigate - renderAllElements will clear and refresh automatically
    storeGoToPosition(position);
  }

  // ========================================
  // EXPORT & SAVE FUNCTIONALITY
  // ========================================
  async saveImage() {
    let { treeController } = useAppStore.getState();

    // If no controller exists, create one by running the main update.
    if (!treeController) {
      await this.updateMain();
      // Re-fetch the controller from the store now that it has been created.
      treeController = useAppStore.getState().treeController;
    }

    const button = document.getElementById("save-button");

    if (button) {
      button.disabled = true;
    }

    try {
      // --- PNG Saving Logic ---
      if (!treeController || !treeController.deckManager || !treeController.deckManager.canvas) {
        console.error("Deck.gl canvas not available for saving PNG.");
        return;
      }

      const canvas = treeController.deckManager.canvas;
      const dataURL = canvas.toDataURL('image/png');

      const link = document.createElement('a');
      const fileName = `phylo-movie-export-${useAppStore.getState().currentTreeIndex + 1}.png`;
      link.href = dataURL;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error saving image:", error);
    } finally {
      if (button) {
        button.disabled = false;
      }
    }
  }

  // Chart modal removed

  getCurrentTreeLabel() {
    const store = useAppStore.getState();
    const { currentTreeIndex, movieData, transitionResolver } = store;
    const md = movieData.tree_metadata?.[currentTreeIndex];
    if (!md) return `Tree ${currentTreeIndex + 1}`;

    const phase = md.phase || 'UNKNOWN';
    const pairKey = md.tree_pair_key || null;
    const step = md.step_in_pair || null;

    // Anchor/full tree label
    if (!pairKey || phase === 'ORIGINAL') {
      // Check if current position is exactly on a full tree
      const fullTreeIndices = transitionResolver?.fullTreeIndices || [];
      const fullIdx = fullTreeIndices.indexOf(currentTreeIndex);
      return fullIdx >= 0 ? `Anchor Tree ${fullIdx + 1}` : `Anchor Tree`;
    }

    // Transition label using pair_key and step
    const m = typeof pairKey === 'string' ? pairKey.match(/pair_(\d+)_/) : null;
    const sEdgeLabel = m ? `S-edge ${parseInt(m[1], 10)}` : pairKey;
    const stepStr = step ? `, Step ${step}` : '';
    return `${sEdgeLabel}${stepStr} — Transition ${pairKey}`;
  }


  // ========================================
  // TAXA COLORING WINDOW
  // ========================================

  openTaxaColoringWindow() {
    const { movieData } = useAppStore.getState(); // Get from store
    if (!movieData.sorted_leaves?.length) { // Use movieData from store
      alert("No taxa names available for coloring.");
      return;
    }

    // Create a complete color map that includes both system colors and current taxa colors
    const completeColorMap = { ...TREE_COLOR_CATEGORIES };

    // Add current taxa colors to the map - this ensures persistence
    movieData.sorted_leaves.forEach(taxon => {
      if (TREE_COLOR_CATEGORIES[taxon]) {
        completeColorMap[taxon] = TREE_COLOR_CATEGORIES[taxon];
      } else {
        // If no color is set, use the default black color
        completeColorMap[taxon] = TREE_COLOR_CATEGORIES.defaultColor || "#000000";
      }
    });

    new TaxaColoring(
      movieData.sorted_leaves, // Use movieData from store
      completeColorMap, // Pass complete color map including current taxa assignments
      (colorData) => this._handleTaxaColoringComplete(colorData)
    );
  }

  async _handleTaxaColoringComplete(colorData) {
    const { movieData, updateTaxaColors, setTaxaGrouping } = useAppStore.getState(); // Get from store
    const newColorMap = applyColoringData(colorData, movieData.sorted_leaves, TREE_COLOR_CATEGORIES); // Use movieData from store

    // Use the store method to update colors and notify ColorManager
    updateTaxaColors(newColorMap);

    // Persist grouping info for UI (tooltips)
    try {
      const grouping = {
        mode: colorData?.mode || 'taxa',
        separator: colorData?.separator || null,
        strategyType: colorData?.strategyType || null,
        csvTaxaMap: colorData?.csvTaxaMap ? Object.fromEntries(colorData.csvTaxaMap) : null,
        // Persist group color map so legend and tooltips can show consistent colors
        groupColorMap: colorData?.groupColorMap ? Object.fromEntries(colorData.groupColorMap) : null,
      };
      setTaxaGrouping(grouping);
    } catch (_) { /* ignore */ }
  }

  // ========================================
  // MSA POSITION TRACKING
  // ========================================
  calculateMSAPosition() {
    const { currentTreeIndex, msaStepSize } = useAppStore.getState(); // Get from store
    const transitionStep = getMSAFrameIndex();
    return {
      position: currentTreeIndex + 1,
      stepSize: msaStepSize, // Get from store
      steps: transitionStep * msaStepSize, // Get from store
      treeIndex: currentTreeIndex
    };
  }

  // ========================================
  // MOVIE TIMELINE MANAGER INITIALIZATION
  // ========================================

  /**
   * Initialize Movie Timeline Manager for visual progress tracking
   * @private
   */
  _initializeMovieTimelineManager() {
    try {
      const { movieData, transitionResolver } = useAppStore.getState();
      this.movieTimelineManager = new MovieTimelineManager(movieData, transitionResolver);
    } catch (error) {
      console.error('[GUI] Failed to initialize MovieTimelineManager:', error);
      this.movieTimelineManager = null;
    }
  }



  /**
   * Clean up resources when GUI is destroyed
   */
  destroy() {
    const { treeController, setTreeController } = useAppStore.getState();
    if (treeController) {
      // Clear any ongoing animations
      this.stop();
      // Let store handle controller cleanup
      setTreeController(null);
    }

    // Clean up store subscription
    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }

    // Clean up controllers
    // No UI controller to clean up

    // React (Nivo) chart is component-driven; nothing to clean up here

    if (this.navigationController) {
      // NavigationController cleanup if it has a destroy method
      this.navigationController = null;
    }


    // Clean up Movie Timeline Manager
    if (this.movieTimelineManager) {
      this.movieTimelineManager.destroy();
      this.movieTimelineManager = null;
    }

  }
}
