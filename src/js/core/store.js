import { create } from 'zustand';
import TransitionIndexResolver from './TransitionIndexResolver.js';
import calculateScales, { getMaxScaleValue } from '../utils/scaleUtils.js'; // ADDED
import { getIndexMappings } from './IndexMapping.js';
import { ColorManager } from '../treeVisualisation/systems/ColorManager.js';
import { clamp, easeInOutCubic } from '../utils/MathUtils.js';

// Tree color categories for phylogenetic visualization
export const TREE_COLOR_CATEGORIES = {
  defaultColor: "#000000",
  markedColor: "#ff5722",
  strokeColor: "#000000",
  changingColor: "#ffa500",
    // Highlighting colors for different types
  activeChangeEdgeColor: "#2196f3", // Color for edges where active changes are happening
  atomCoversColor: "#9c27b0",
  // Dimming colors for inactive elements
  dimmedColor: "#cccccc",
};


const DEFAULT_STYLE_CONFIG = {
  contourWidthOffset: 2, // Pixels for contour width beyond main stroke
  // Centralized label/extension offsets used by DeckGL layout
  labelOffsets: {
    DEFAULT: 20,
    WITH_EXTENSIONS: 40,
    EXTENSION: 5
  }
};

export const useAppStore = create((set, get) => ({
  // ===================================
  // STATE
  // ===================================
  // Raw data, initialized once
  movieData: null,
  treeList: [],
  treeMetadata: [],
  highlightData: [], // From to_be_highlighted in JSON
  activeChangeEdgeTracking: [], // From split_change_tracking in JSON


  // The TransitionIndexResolver will now live in the store
  transitionResolver: null,
  colorManager: null, // Single ColorManager instance - source of truth for colors
  gui: null, // ADD THIS LINE: Reference to the Gui instance
  treeController: null, // This was already added in the previous thought process, keep it.

  // Dynamic application state
  currentTreeIndex: 0,
  previousTreeIndex: -1,
  navigationDirection: 'forward', // 'forward', 'backward', or 'jump'
  segmentProgress: 0, // 0-1 progress within the current segment (for interpolation)

  // Timeline-specific state for grouped segments
  currentSegmentIndex: 0, // Current segment index (0-based)
  totalSegments: 0, // Total number of segments
  treeInSegment: 1, // Position within current segment (1-based)
  treesInSegment: 1, // Total trees in current segment
  timelineProgress: 0, // 0-1 progress through entire timeline

  playing: false,
  renderInProgress: false,
  subscriptionPaused: false, // Allow temporary subscription pausing
  syncMSAEnabled: true, // New state variable

  // Animation state management
  animationProgress: 0, // 0-1 progress through entire movie
  animationStartTime: null, // Performance timestamp when animation started

  // UI / Appearance state
  animationSpeed: 1,
  fontSize: "2.6em",
  strokeWidth: 3,
  branchTransformation: 'none',
  monophyleticColoringEnabled: true,
  activeChangeEdgesEnabled: true, // Toggle for active change edges highlighting
  markedComponentsEnabled: true, // Toggle for marked components highlighting
  dimmingEnabled: false, // For dimming non-descendants
  useDeckGL: true, // Feature flag for Deck.gl testing - SET TO TRUE for testing
  cameraMode: 'orthographic', // Camera mode for Deck.gl ('orthographic' or 'orbit')
  msaWindowSize: 1000, // Default value
  msaStepSize: 50,     // Default value
  msaColumnCount: 0,   // Derived from data.msa.sequences[first]
  styleConfig: { ...DEFAULT_STYLE_CONFIG }, // New state variable for centralized style config
  // Camera auto-fit policy
  autoFitOnTreeChange: true,
  // Motion trails configuration
  trailsEnabled: false,
  trailLength: 12,
  trailOpacity: 0.5,
  trailThickness: 0.5,

  // Taxa grouping (from TaxaColoring modal) for UI/tooltip use
  taxaGrouping: null, // { mode: 'taxa'|'groups'|'csv', separator?, strategyType?, csvTaxaMap? }

  // Chart-specific state
  barOptionValue: 'rfd',
  stickyChartPosition: undefined,

  // ===================================
  // ACTIONS
  // ===================================

  /**
   * Initializes the entire application state from the raw movieData object.
   * This is the single entry point for setting up the application's state.
   */
  initialize: (movieData) => {
    console.log('[Store] Initializing with movieData - window_size:', movieData?.window_size, 'window_step_size:', movieData?.window_step_size);
    console.log('[Store] MSA data - window_size:', movieData?.msa?.window_size, 'step_size:', movieData?.msa?.step_size);

    const resolver = new TransitionIndexResolver(
      movieData.tree_metadata,
      movieData.to_be_highlighted,
      movieData.distances?.robinson_foulds,
      movieData.lattice_edge_tracking,
      movieData.tree_pair_solutions || {},
      true // debug
    );

    const fullTreeIndices = resolver.fullTreeIndices; // ADDED
    const scaleList = calculateScales(movieData.interpolated_trees, fullTreeIndices); // ADDED
    const maxScale = getMaxScaleValue(scaleList); // ADDED
    const numberOfFullTrees = fullTreeIndices.length; // ADDED

    // Create single ColorManager instance - single source of truth
    // Initialize with empty array (ColorManager expects array of Sets)
    const colorManager = new ColorManager([]);

    // Sync ColorManager with store's monophyletic setting
    const initialMonophyleticColoring = get().monophyleticColoringEnabled !== undefined ? get().monophyleticColoringEnabled : true;
    colorManager.setMonophyleticColoring(initialMonophyleticColoring);

    console.log(movieData)

    // Derive MSA column count if available (dictionary: taxa -> sequence)
    let msaColumnCount = 0;
    try {
      const seqDict = movieData?.msa?.sequences;
      console.log('[Store] MSA sequences:', seqDict ? Object.keys(seqDict) : 'none');
      if (seqDict && typeof seqDict === 'object') {
        const firstSeq = Object.values(seqDict)[0];
        if (typeof firstSeq === 'string') {
          msaColumnCount = firstSeq.length;
          console.log('[Store] MSA column count:', msaColumnCount);
        }
      }
    } catch (e) {
      console.error('[Store] Error getting MSA column count:', e);
    }

    // Get window parameters from movieData
    const windowSize = movieData.window_size || movieData.msa?.window_size || 1000;
    const stepSize = movieData.window_step_size || movieData.msa?.step_size || 50;
    
    console.log('[Store] Setting MSA params - windowSize:', windowSize, 'stepSize:', stepSize, 'columnCount:', msaColumnCount);

    set({
      movieData: {
        ...movieData, // Keep existing movieData properties
        scaleList, // Add scaleList
        maxScale, // Add maxScale
        fullTreeIndices, // Add fullTreeIndices
        numberOfFullTrees // Add numberOfFullTrees
      },
      treeList: movieData.interpolated_trees,
      treeMetadata: movieData.tree_metadata,
      highlightData: movieData.to_be_highlighted || [],
      // Use split_change_tracking as the single source of truth for active change edges
      activeChangeEdgeTracking: movieData.split_change_tracking || [],
      transitionResolver: resolver,
      colorManager: colorManager, // Single ColorManager instance
      currentTreeIndex: 0,
      previousTreeIndex: -1,
      playing: false,
      msaColumnCount,
      msaWindowSize: windowSize,
      msaStepSize: stepSize,
    });

    // Initialize ColorManager with marked components for the initial tree position (index 0)
    const { getActualHighlightData, updateColorManagerMarkedComponents,  updateColorManagerActiveChangeEdge, getCurrentActiveChangeEdge } = get();
    const initialMarkedComponents = getActualHighlightData();
    const initialActiveChangeEdge = getCurrentActiveChangeEdge();

    updateColorManagerMarkedComponents(initialMarkedComponents);
    updateColorManagerActiveChangeEdge(initialActiveChangeEdge);
  },

  play: () => {
    const { animationProgress, treeList, animationSpeed } = get();
    const totalTrees = treeList.length;

    // If playback is at the end (progress >= 1), restart from the beginning.
    // Otherwise, resume from the last known progress.
    const initialProgress = animationProgress >= 1.0 ? 0 : animationProgress;

    // Adjust start time to account for the initial progress.
    // This pretends the animation started earlier, so the elapsed time calculation is correct.
    const timeOffset = (initialProgress * (totalTrees - 1) / animationSpeed) * 1000;
    const adjustedStartTime = performance.now() - timeOffset;

    set({
      playing: true,
      animationStartTime: adjustedStartTime,
      animationProgress: initialProgress
    });
  },

  /**
   * Stops timeline playback and preserves animation state
   */
  stop: () => {
    set({
      playing: false,
      animationStartTime: null
    });
  },

  /**
   * Sets the animation playback speed multiplier
   * @param {number} animationSpeed - Speed multiplier (1.0 = normal speed)
   */
  setAnimationSpeed: (animationSpeed) => set({ animationSpeed }),

  /**
   * Updates animation progress and automatically updates currentTreeIndex
   * @param {number} timestamp - Current animation timestamp
   * @returns {boolean} True if animation should stop (progress >= 1.0)
   */
  updateAnimationProgress: (timestamp) => {
    const { animationStartTime, animationSpeed, treeList, playing } = get();

    if (!playing || !animationStartTime || !treeList.length) {
      return false;
    }

    const elapsed = (timestamp - animationStartTime) / 1000; // Convert to seconds
    const totalTrees = treeList.length;
    const progress = (elapsed * animationSpeed) / (totalTrees - 1);
    const clampedProgress = Math.min(progress, 1.0);

    // Calculate current tree index from animation progress
    const exactTreeIndex = clampedProgress * (totalTrees - 1);
    const discreteTreeIndex = Math.round(exactTreeIndex);

    // Update both animation progress and current tree index
    // This will trigger the ColorManager subscription automatically
    set({
      animationProgress: clampedProgress,
      currentTreeIndex: clamp(discreteTreeIndex, 0, totalTrees - 1)
    });

    return progress >= 1.0;
  },

  /**
   * Gets current animation interpolation data
   * @returns {Object|null} Animation data with fromTreeIndex, toTreeIndex, exactTreeIndex, easedProgress
   */
  getAnimationInterpolationData: () => {
    const { animationProgress, treeList, playing } = get();

    if (!playing || !treeList.length) {
      return null;
    }

    // Map animation progress to actual tree indices accounting for grouped segments
    const totalTrees = treeList.length;
    const exactTreeIndex = animationProgress * (totalTrees - 1);
    const fromTreeIndex = Math.floor(exactTreeIndex);
    const toTreeIndex = Math.min(fromTreeIndex + 1, totalTrees - 1);
    const segmentProgress = exactTreeIndex - fromTreeIndex;
    const easedProgress = easeInOutCubic(segmentProgress);

    return {
      exactTreeIndex,
      fromTreeIndex,
      toTreeIndex,
      segmentProgress,
      easedProgress,
      progress: animationProgress
    };
  },

  // --- Navigation Actions ---
  /**
   * Sets navigation direction for interpolation handling
   * @param {string} direction - Navigation direction ('forward', 'backward', 'jump')
   */
  setNavigationDirection: (direction) => set({ navigationDirection: direction }),

  /**
   * Sets segment progress for interpolation (0-1 within current segment)
   * @param {number} progress - Segment progress (0-1)
   */
  setSegmentProgress: (progress) => set({ segmentProgress: clamp(progress, 0, 1) }),

  /**
   * Updates timeline-specific state for grouped segments
   * @param {Object} timelineState - Timeline state object
   * @param {number} timelineState.currentSegmentIndex - Current segment index (0-based)
   * @param {number} timelineState.totalSegments - Total number of segments
   * @param {number} timelineState.treeInSegment - Position within current segment (1-based)
   * @param {number} timelineState.treesInSegment - Total trees in current segment
   * @param {number} timelineState.timelineProgress - Timeline progress (0-1)
   */
  updateTimelineState: (timelineState) => set({
    currentSegmentIndex: timelineState.currentSegmentIndex || 0,
    totalSegments: timelineState.totalSegments || 0,
    treeInSegment: timelineState.treeInSegment || 1,
    treesInSegment: timelineState.treesInSegment || 1,
    timelineProgress: clamp(timelineState.timelineProgress || 0, 0, 1)
  }),

  /**
   * Navigates to a specific tree position in the timeline
   * @param {number} position - Target tree index (0-based)
   * @param {string} [direction] - Optional navigation direction override
   */
  goToPosition: (position, direction) => {
    const { treeList, currentTreeIndex, renderInProgress } = get();

    // Only skip if actively rendering, not during general updates
    if (renderInProgress) return;

    const newIndex = clamp(position, 0, treeList.length - 1);
    if (newIndex !== currentTreeIndex) {
      let navDirection = direction;
      if (!navDirection) {
        // Auto-detect direction based on position change
        navDirection = newIndex > currentTreeIndex ? 'forward' : 'backward';
      }

      // **THE FIX**: Calculate and set animationProgress along with the tree index.
      const totalTrees = treeList.length;
      const newAnimationProgress = totalTrees > 1 ? newIndex / (totalTrees - 1) : 0;

      set({
        previousTreeIndex: currentTreeIndex,
        currentTreeIndex: newIndex,
        navigationDirection: navDirection,
        segmentProgress: 0, // Reset segment progress on discrete navigation
        animationProgress: newAnimationProgress // Sync animation progress
      });

      // Automatically update ColorManager with marked components for new position
    // Initialize ColorManager with marked components for the initial tree position (index 0)
      const { getActualHighlightData, updateColorManagerMarkedComponents,  updateColorManagerActiveChangeEdge, getCurrentActiveChangeEdge } = get();
      const markedComponents = getActualHighlightData();
      updateColorManagerMarkedComponents(markedComponents);
      const activeChangeEdge = getCurrentActiveChangeEdge();
      updateColorManagerActiveChangeEdge(activeChangeEdge);
    }
  },

  /**
   * Advances to the next tree in the timeline
   */
  forward: () => {
    const { currentTreeIndex, treeList, goToPosition, renderInProgress } = get();

    // Only skip if actively rendering, not during general updates
    if (renderInProgress) return;

    const nextIndex = currentTreeIndex + 1;
    if (nextIndex < treeList.length) {
      goToPosition(nextIndex);
    } else {
      set({ playing: false }); // Stop at the end
    }
  },

  /**
   * Goes back to the previous tree in the timeline
   */
  backward: () => {
    const { currentTreeIndex, goToPosition, renderInProgress } = get();

    // Only skip if actively rendering, not during general updates
    if (renderInProgress) return;

    goToPosition(currentTreeIndex - 1);
  },

  // --- Appearance Actions ---
  /**
   * Sets the font size for tree labels
   * @param {string|number} size - Font size (auto-converts to em units)
   */
  setFontSize: (size) => {
    let fontSize = size;
    if (typeof fontSize === 'number') {
      fontSize = `${fontSize}em`;
    } else if (typeof fontSize === 'string' && !fontSize.match(/(em|px|pt|rem)$/)) {
      fontSize = `${fontSize}em`;
    }
    set({ fontSize });
  },

  /**
   * Sets the stroke width for tree branches
   * @param {string|number} width - Stroke width in pixels
   */
  setStrokeWidth: (width) => {
    const numericWidth = Number(width);
    set({ strokeWidth: numericWidth });
  },

  /**
   * Enables or disables monophyletic coloring mode
   * @param {boolean} enabled - Whether monophyletic coloring is enabled
   */
  setMonophyleticColoring: (enabled) => {
    set({ monophyleticColoringEnabled: enabled });

    // Automatically update the ColorManager to keep it in sync
    const { colorManager } = get();
    if (colorManager) {
      colorManager.setMonophyleticColoring(enabled);
    }
  },

  /**
   * Set whether active change edges highlighting is enabled.
   * @param {boolean} enabled - Whether active change edges highlighting is enabled.
   */
  setActiveChangeEdgesEnabled: (enabled) => {
    set({ activeChangeEdgesEnabled: enabled });

    // Update ColorManager - clear or restore based on enabled state
    const { updateColorManagerActiveChangeEdge, getCurrentActiveChangeEdge } = get();
    if (!enabled) {
      // Clear active change edges when disabled
      updateColorManagerActiveChangeEdge([]);
    } else {
      // Restore current active change edges when enabled
      const activeChangeEdge = getCurrentActiveChangeEdge();
      updateColorManagerActiveChangeEdge(activeChangeEdge);
    }
  },

  /**
   * Set whether marked components highlighting is enabled.
   * @param {boolean} enabled - Whether marked components highlighting is enabled.
   */
  setMarkedComponentsEnabled: (enabled) => {
    set({ markedComponentsEnabled: enabled });

    // Update ColorManager - clear or restore based on enabled state
    const { updateColorManagerMarkedComponents, getActualHighlightData } = get();
    if (!enabled) {
      // Clear marked components when disabled
      updateColorManagerMarkedComponents([]);
    } else {
      // Restore marked components when enabled
      const markedComponents = getActualHighlightData();
      updateColorManagerMarkedComponents(markedComponents);
    }
  },

  /**
   * Enables or disables dimming of non-descendant elements.
   * @param {boolean} enabled - Whether dimming is enabled.
   */
  setDimmingEnabled: (enabled) => set({ dimmingEnabled: enabled }),



  /**
   * Toggle function for Deck.gl testing
   */
  toggleDeckGL: () => set(state => ({
    useDeckGL: !state.useDeckGL
  })),

  /**
   * Motion trails toggles and parameters
   */
  setTrailsEnabled: (enabled) => set({ trailsEnabled: !!enabled }),
  setTrailLength: (length) => set({ trailLength: Math.max(2, Math.min(50, Math.round(Number(length) || 12))) }),
  setTrailOpacity: (opacity) => set({ trailOpacity: Math.max(0, Math.min(1, Number(opacity) || 0.5)) }),
  setTrailThickness: (thickness) => set({ trailThickness: Math.max(0.1, Math.min(5, Number(thickness) || 0.5)) }),

  /**
   * Toggle auto-fit on tree change policy
   */
  toggleAutoFitOnTreeChange: () => set(state => ({
    autoFitOnTreeChange: !state.autoFitOnTreeChange
  })),

  /**
   * Explicitly set auto-fit on tree change policy
   * @param {boolean} enabled
   */
  setAutoFitOnTreeChange: (enabled) => set({ autoFitOnTreeChange: !!enabled }),

  /**
   * Apply theme-aware default colors for branches and strokes.
   * @param {'system'|'light'|'dark'} themePref
   */
  applyThemeColors: (themePref = 'system') => {
    try {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = themePref === 'dark' || (themePref === 'system' && prefersDark);

      const next = {
        // Slightly darker neutral grey for dark theme
        defaultColor: isDark ? '#9AA4AE' : '#000000',
        strokeColor: isDark ? '#9AA4AE' : '#000000',
        dimmedColor: isDark ? '#555555' : '#cccccc',
      };

      Object.assign(TREE_COLOR_CATEGORIES, next);

      // Notify ColorManager and trigger re-render
      const { colorManager, treeController } = get();
      if (colorManager && colorManager.refreshColorCategories) {
        colorManager.refreshColorCategories();
      }
      if (treeController && treeController.renderAllElements) {
        treeController.renderAllElements();
      }
    } catch (e) {
      console.warn('[store] applyThemeColors failed:', e);
    }
  },

  /**
   * Sets the branch transformation mode
   * @param {string} transform - Transformation type ('none', 'log', etc.)
   */
  setBranchTransformation: (transform) => set({ branchTransformation: transform }),

  

  /**
   * Sets the camera mode for Deck.gl rendering
   * @param {string} mode - Camera mode ('orthographic' or 'orbit')
   */
  setCameraMode: (mode) => {
    if (mode === 'orthographic' || mode === 'orbit') {
      set({ cameraMode: mode });
    }
  },

  /**
   * Toggles between orthographic and orbit camera modes
   */
  toggleCameraMode: () => {
    const { cameraMode } = get();
    const newMode = cameraMode === 'orthographic' ? 'orbit' : 'orthographic';
    set({ cameraMode: newMode });
    return newMode;
  },


  /**
   * Sets the MSA viewer window size
   * @param {number} size - Window size in base pairs
   */
  setMsaWindowSize: (size) => set({ msaWindowSize: size }),

  /**
   * Sets the MSA viewer step size
   * @param {number} step - Step size for MSA navigation
   */
  setMsaStepSize: (step) => set({ msaStepSize: step }),

  /**
   * Enables or disables MSA synchronization with tree position
   * @param {boolean} enabled - Whether MSA sync is enabled
   */
  setSyncMSAEnabled: (enabled) => set({ syncMSAEnabled: enabled }),

  /**
   * Updates the centralized style configuration
   * @param {Object} newConfig - Partial style config to merge with existing
   */
  setStyleConfig: (newConfig) => set((state) => ({
    styleConfig: { ...state.styleConfig, ...newConfig }
  })),

  // --- Chart Actions ---
  /**
   * Sets the chart display option (rfd, wrfd, etc.)
   * @param {string} option - Chart type option
   */
  setBarOption: (option) => set({ barOptionValue: option }),

  /**
   * Sets a sticky position for chart highlighting
   * @param {number} position - Position to highlight in chart
   */
  setStickyChartPosition: (position) => set({ stickyChartPosition: position }),

  /**
   * Clears any sticky chart position highlighting
   */
  clearStickyChartPosition: () => set({ stickyChartPosition: undefined }),

  // --- Anchor Helpers ---
  /**
   * Returns anchor context for the current position.
   * { pairKey, startAnchorSeqIndex, endAnchorSeqIndex, fullTreeIndex }
   * - If on an anchor: fullTreeIndex is >= 0, startAnchorSeqIndex is that anchor, endAnchorSeqIndex is the next anchor if available.
   * - If within a transition: fullTreeIndex is -1, pairKey defines the [k,k+1] anchors.
   */
  getCurrentAnchorPair: () => {
    const state = get();
    const seqIndex = state.currentTreeIndex ?? 0;
    const resolver = state.transitionResolver;
    const fti = resolver?.fullTreeIndices || [];
    const md = state.movieData?.tree_metadata?.[seqIndex];
    const onAnchor = resolver?.getFullTreeIndex ? resolver.getFullTreeIndex(seqIndex) : -1;

    if (onAnchor >= 0) {
      const startAnchorSeqIndex = fti[onAnchor] ?? -1;
      const endAnchorSeqIndex = fti[onAnchor + 1] ?? -1;
      return {
        pairKey: null,
        startAnchorSeqIndex,
        endAnchorSeqIndex,
        fullTreeIndex: onAnchor
      };
    }

    const pairKey = md?.tree_pair_key || null;
    if (typeof pairKey === 'string') {
      const m = pairKey.match(/pair_(\d+)_(\d+)/);
      if (m) {
        const k = parseInt(m[1], 10);
        return {
          pairKey,
          startAnchorSeqIndex: fti[k] ?? -1,
          endAnchorSeqIndex: fti[k + 1] ?? -1,
          fullTreeIndex: -1
        };
      }
    }
    // Fallback to nearest anchor if pairKey missing
    const { nearestFullTreeSeqIndex } = getIndexMappings(state);
    const nearestIdx = fti.findIndex(v => v === nearestFullTreeSeqIndex);
    return {
      pairKey: null,
      startAnchorSeqIndex: nearestFullTreeSeqIndex ?? -1,
      endAnchorSeqIndex: fti[nearestIdx + 1] ?? -1,
      fullTreeIndex: nearestIdx
    };
  },

  /**
   * Returns the nearest full-tree (anchor) sequence index for the current position.
   */
  getNearestAnchorSeqIndex: () => {
    const state = get();
    const { nearestFullTreeSeqIndex } = getIndexMappings(state);
    return nearestFullTreeSeqIndex ?? 0;
  },

  /**
   * Returns the nearest full-tree (anchor) chart index (0..N-1).
   */
  getNearestAnchorChartIndex: () => {
    const state = get();
    const { nearestFullTreeChartIndex } = getIndexMappings(state);
    return nearestFullTreeChartIndex ?? 0;
  },

  // --- Rendering Lock ---
  /**
   * Sets the rendering progress state to prevent concurrent operations
   * @param {boolean} inProgress - Whether rendering is currently in progress
   */
  setRenderInProgress: (inProgress) => set({
    renderInProgress: inProgress
  }),

  // --- Subscription Control ---
  /**
   * Pauses or resumes store subscriptions
   * @param {boolean} paused - Whether subscriptions should be paused
   */
  setSubscriptionPaused: (paused) => set({ subscriptionPaused: paused }),
  /**
   * Sets the tree controller instance with cleanup of previous instance
   * @param {Object} controller - Tree controller instance
   */
  setTreeController: (controller) => {
    const { treeController: currentController } = get();

    // Clean up previous controller if it exists and is being replaced
    if (currentController && currentController !== controller) {
      if (typeof currentController.destroy === 'function') {
        currentController.destroy();
      }
    }

    set({ treeController: controller });
  },
  /**
   * Sets the GUI instance reference with cleanup of previous instance
   * @param {Object} instance - GUI instance
   */
  setGui: (instance) => {
    const { gui: currentGui } = get();

    // Clean up previous GUI instance if it exists and is being replaced
    if (currentGui && currentGui !== instance) {
      if (typeof currentGui.destroy === 'function') {
        currentGui.destroy();
      }
    }

    set({ gui: instance });
  },

  // --- ColorManager Actions ---
  /**
   * Gets the current ColorManager instance
   * @returns {ColorManager} The color manager instance
   */
  getColorManager: () => {
    const { colorManager } = get();
    return colorManager;
  },

  /**
   * Updates the ColorManager with new marked components
   * @param {Array<Array>} markedComponents - Array of arrays containing marked component IDs
   */
  updateColorManagerMarkedComponents: (markedComponents) => {
    const { colorManager } = get();
      // Convert highlight data to the format ColorManager expects (array of Sets)
      let convertedMarked = [];

      console.log("Updating ColorManager with marked components:", markedComponents);

      // Array of arrays - convert each inner array to a Set
      convertedMarked = markedComponents.map((innerArray) => {
        return new Set(innerArray);
      });

      console.log("Converted marked components for ColorManager:", convertedMarked);

      colorManager.updateMarkedComponents(convertedMarked);
  },

  /**
   * Updates the ColorManager with new active change edge data
   * @param {Array} activeChangeEdge - Active change edge data for highlighting
   */
  updateColorManagerActiveChangeEdge: (activeChangeEdge) => {
    const { colorManager } = get();
    colorManager.updateActiveChangeEdge(activeChangeEdge); // Update current active change edges
  },

  /**
   * Sets monophyletic coloring mode in the ColorManager
   * @param {boolean} enabled - Whether monophyletic coloring is enabled
   */
  setColorManagerMonophyleticColoring: (enabled) => {
    const { colorManager } = get();
    if (colorManager) {
      colorManager.setMonophyleticColoring(enabled);
    }
  },

  /**
   * Updates highlighting colors in TREE_COLOR_CATEGORIES
   * @param {string} colorType - Type of color to update (activeChangeEdgeColor, markedColor, dimmedColor)
   * @param {string} newColor - New hex color value
   */
  updateHighlightingColor: (colorType, newColor) => {
    // Update the color in TREE_COLOR_CATEGORIES
    TREE_COLOR_CATEGORIES[colorType] = newColor;

    // Notify ColorManager of the update
    const { colorManager } = get();
    if (colorManager && colorManager.refreshColorCategories) {
      colorManager.refreshColorCategories();
    }

    // Trigger re-render
    const { treeController } = get();
    if (treeController) {
      treeController.renderAllElements();
    }
  },

  /**
   * Updates active change edge highlighting color
   * @param {string} newColor - New hex color value for active change edge highlighting
   */
  setActiveChangeEdgeColor: (newColor) => {
    const { updateHighlightingColor } = get();
    updateHighlightingColor('activeChangeEdgeColor', newColor);
  },

  /**
   * Updates marked components highlighting color
   * @param {string} newColor - New hex color value for marked component highlighting
   */
  setMarkedColor: (newColor) => {
    const { updateHighlightingColor } = get();
    updateHighlightingColor('markedColor', newColor);
  },

  /**
   * Updates dimmed elements color
   * @param {string} newColor - New hex color value for dimmed elements
   */
  setDimmedColor: (newColor) => {
    const { updateHighlightingColor } = get();
    updateHighlightingColor('dimmedColor', newColor);
  },

  /**
   * Updates taxa colors in TREE_COLOR_CATEGORIES
   * Called after TaxaColoring component applies new colors
   * @param {Object} newColorMap - Object mapping taxa names to hex colors
   */
  updateTaxaColors: (newColorMap) => {
    // Update the colors in TREE_COLOR_CATEGORIES
    Object.assign(TREE_COLOR_CATEGORIES, newColorMap);

    // Notify ColorManager of the update
    const { colorManager } = get();
    if (colorManager && colorManager.refreshColorCategories) {
      colorManager.refreshColorCategories();
    }

    // Trigger re-render
    const { treeController } = get();
    if (treeController) {
      treeController.renderAllElements();
    }
  },

  /**
   * Persist current taxa grouping settings for UI (tooltips, lists)
   * @param {Object|null} grouping - { mode, separator?, strategyType?, csvTaxaMap? }
   */
  setTaxaGrouping: (grouping) => set({ taxaGrouping: grouping }),

  // --- Chart Data Getters ---
  /**
   * Gets properties needed for line chart rendering
   * @returns {Object} Chart properties including distances, scales, and current position
   */
  getLineChartProps: () => {
    const state = get();
    const { distanceIndex } = getIndexMappings(state);

    // Use canonical schema from example.json
    const robinsonFouldsDistances = state.movieData?.distances?.robinson_foulds;
    const weightedRobinsonFouldsDistances = state.movieData?.distances?.weighted_robinson_foulds;
    const scaleList = state.movieData?.scaleList;

    return {
      barOptionValue: state.barOptionValue,
      currentTreeIndex: distanceIndex, // Always use distance index for all chart types
      robinsonFouldsDistances,
      weightedRobinsonFouldsDistances,
      scaleList,
      transitionResolver: state.transitionResolver,
    };
  },

  /**
   * Gets highlighting data for the current tree position
   * @returns {Array} Array of highlight solutions for current tree state
   */
  getActualHighlightData: () => {
    const { currentTreeIndex, transitionResolver, highlightData, activeChangeEdgeTracking } = get();

    const highlightIndex = transitionResolver.getHighlightingIndex(currentTreeIndex);

    const fullTreeIndices = transitionResolver.fullTreeIndices;
    // The segment starts at the full tree that defines this transition.
    const segmentStartIndex = fullTreeIndices[highlightIndex];

    const uniqueSolutions = new Map();

    // Iterate from the beginning of the segment up to the current tree.
    for (let i = segmentStartIndex; i <= currentTreeIndex; i++) {
      // We only care about consensus trees within this range.
      if (transitionResolver.isConsensusTree(i)) {
        const activeChangeEdge = activeChangeEdgeTracking?.[i];

        // Skip if no active change edge data for this tree
        if (!activeChangeEdge || !Array.isArray(activeChangeEdge)) {
          continue;
        }

        const treePairSolution = highlightData[highlightIndex];

        const edgeKey = `[${activeChangeEdge.join(', ')}]`;
        const latticeEdgeData = treePairSolution.lattice_edge_solutions[edgeKey];

        for (const solution of latticeEdgeData.flat()) {
            uniqueSolutions.set(JSON.stringify(solution), solution);
        }

      }
    }
    return Array.from(uniqueSolutions.values());
  },

  /**
   * Gets current active change edge data for automatic highlighting
   * @returns {Array} Current active change edge data for the current tree position, or empty array
   */
  getCurrentActiveChangeEdge: () => {
    const { currentTreeIndex, activeChangeEdgeTracking } = get();
    const activeChangeEdge = activeChangeEdgeTracking?.[currentTreeIndex];
    return activeChangeEdge || []; // Return empty array if undefined
  },




  // --- ColorManager Subscription Setup ---
  /**
   * Sets up automatic ColorManager updates when currentTreeIndex changes
   * This enables subscription-based updates during animation
   */
  setupColorManagerSubscription: () => {
    const store = useAppStore;
    let previousTreeIndex = store.getState().currentTreeIndex;

    // Subscribe to state changes and check for currentTreeIndex changes
    return store.subscribe((state) => {
      const currentTreeIndex = state.currentTreeIndex;

      // Only update if index actually changed
      if (currentTreeIndex !== previousTreeIndex) {
        const { getActualHighlightData, updateColorManagerMarkedComponents, updateColorManagerActiveChangeEdge, getCurrentActiveChangeEdge, markedComponentsEnabled, activeChangeEdgesEnabled } = state;

        // Only update marked components if they are enabled
        if (markedComponentsEnabled) {
          const markedComponents = getActualHighlightData();
          updateColorManagerMarkedComponents(markedComponents);
        }

        // Only update active change edges if they are enabled
        if (activeChangeEdgesEnabled) {
          const activeChangeEdge = getCurrentActiveChangeEdge();
          updateColorManagerActiveChangeEdge(activeChangeEdge);
        }

        previousTreeIndex = currentTreeIndex;
      }
    });
  },


}));

// Set up ColorManager subscription after store creation
useAppStore.getState().setupColorManagerSubscription();
