import { create } from 'zustand';
import TransitionIndexResolver from './TransitionIndexResolver.js';
import calculateScales, { getMaxScaleValue } from '../utils/scaleUtils.js'; // ADDED
import { ColorManager } from '../treeVisualisation/systems/ColorManager.js';
import { clamp } from '../utils/MathUtils.js';
import { TREE_COLOR_CATEGORIES } from '../constants/TreeColors.js';
export { TREE_COLOR_CATEGORIES };

// --- Optional persistence of user color choices in localStorage ---
const COLOR_STORAGE_KEY = 'phylo.colorCategories';

function _loadPersistedColorCategories() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(COLOR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : null;
  } catch (_) {
    return null;
  }
}

function _persistColorCategories() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    // Persist a simple snapshot (strings only) to avoid functions/refs
    window.localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(TREE_COLOR_CATEGORIES));
  } catch (_) {
    // ignore
  }
}


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
  // treeMetadata removed (TransitionIndexResolver manages its own copy)
  // highlightData removed: using tree_pair_solutions for marked groups
  pairSolutions: {}, // From tree_pair_solutions in JSON (used for red/marked)
  activeChangeEdgeTracking: [], // From split_change_tracking in JSON


  // The TransitionIndexResolver will now live in the store
  transitionResolver: null,
  colorManager: null, // Single ColorManager instance - source of truth for colors
  gui: null, // ADD THIS LINE: Reference to the Gui instance
  treeControllers: [], // This was already added in the previous thought process, keep it.

  // Dynamic application state
  currentTreeIndex: 0,
  // previousTreeIndex removed (tracked locally in subscription only)
  navigationDirection: 'forward', // 'forward', 'backward', or 'jump'
  segmentProgress: 0, // 0-1 progress within the current segment (for interpolation)

  // Timeline-specific state for grouped segments
  currentSegmentIndex: 0, // Current segment index (0-based)
  totalSegments: 0, // Total number of segments
  treeInSegment: 1, // Position within current segment (1-based)
  treesInSegment: 1, // Total trees in current segment
  timelineProgress: 0, // 0-1 progress through entire timeline

  playing: false,
  comparisonMode: false,
  renderInProgress: false,
  subscriptionPaused: false, // Allow temporary subscription pausing
  syncMSAEnabled: true, // New state variable

  // Animation state management
  animationProgress: 0, // 0-1 progress through entire movie
  animationStartTime: null, // Performance timestamp when animation started

  // UI / Appearance state
  animationSpeed: 1,
  fontSize: "2.6em",
  strokeWidth: 2,
  nodeSize: 1, // Multiplier for node sizes (default 1.0)
  branchTransformation: 'none',
  monophyleticColoringEnabled: true,
  activeChangeEdgesEnabled: true, // Toggle for active change edges highlighting
  markedComponentsEnabled: true, // Toggle for marked subtrees highlighting (naming only)
  activeChangeEdgeColor: TREE_COLOR_CATEGORIES.activeChangeEdgeColor,
  markedColor: TREE_COLOR_CATEGORIES.markedColor,
  dimmingEnabled: false, // For dimming non-descendants
  dimmingOpacity: 0.3, // Opacity level for dimmed elements (0-1)
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
  // Debug toggles removed

  // Taxa grouping (from TaxaColoring modal) for UI/tooltip use
  taxaGrouping: null, // { mode: 'taxa'|'groups'|'csv', separator?, strategyType?, csvTaxaMap? }

  // Color update tracking for deck.gl updateTriggers
  taxaColorVersion: 0, // Increment when TREE_COLOR_CATEGORIES changes

  // Chart-specific state
  barOptionValue: 'rfd',

  // ===================================
  // ACTIONS
  // ===================================
  toggleComparisonMode: () => set((state) => ({ comparisonMode: !state.comparisonMode })),

  /**
   * Initializes the entire application state from the raw movieData object.
   * This is the single entry point for setting up the application's state.
   */
  initialize: (movieData) => {
    console.log('[Store] Initializing with movieData - window_size:', movieData?.window_size, 'window_step_size:', movieData?.window_step_size);
    console.log('[Store] MSA data - window_size:', movieData?.msa?.window_size, 'step_size:', movieData?.msa?.step_size);

    console.log("Store: movieData.pair_interpolation_ranges:", movieData.pair_interpolation_ranges?.length, "items");

    // Merge any persisted user color choices before ColorManager is created
    try {
      const persisted = _loadPersistedColorCategories();
      if (persisted) Object.assign(TREE_COLOR_CATEGORIES, persisted);
    } catch (_) {}

    const resolver = new TransitionIndexResolver(
      movieData.tree_metadata,
      movieData.distances?.robinson_foulds,
      movieData.tree_pair_solutions || {},
      movieData.pair_interpolation_ranges || [],
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
      // treeMetadata omitted
      // highlightData omitted
      pairSolutions: movieData.tree_pair_solutions || {},
      // Use split_change_tracking as the single source of truth for active change edges
      activeChangeEdgeTracking: movieData.split_change_tracking || [],
      transitionResolver: resolver,
      colorManager: colorManager, // Single ColorManager instance
      currentTreeIndex: 0,
      playing: false,
      msaColumnCount,
      msaWindowSize: windowSize,
      msaStepSize: stepSize,
      activeChangeEdgeColor: TREE_COLOR_CATEGORIES.activeChangeEdgeColor,
      markedColor: TREE_COLOR_CATEGORIES.markedColor,
    });

    // Initialize ColorManager with marked components for the initial tree position (index 0)
    const { getActualHighlightData, updateColorManagerMarkedSubtrees,  updateColorManagerActiveChangeEdge, getCurrentActiveChangeEdge } = get();
    const initialMarkedComponents = getActualHighlightData();
    const initialActiveChangeEdge = getCurrentActiveChangeEdge();

    updateColorManagerMarkedSubtrees(initialMarkedComponents);
    updateColorManagerActiveChangeEdge(initialActiveChangeEdge);
  },

  play: () => {
    const { playing, animationProgress, treeList, animationSpeed } = get();
    if (playing) return;

    const totalTrees = treeList.length;
    const initialProgress = animationProgress >= 1.0 ? 0 : animationProgress;
    const timeOffset = (initialProgress * (totalTrees - 1) / animationSpeed) * 1000;
    const adjustedStartTime = performance.now() - timeOffset;

    set({
      playing: true,
      animationStartTime: adjustedStartTime,
      animationProgress: initialProgress
    });
    // NO animation loop here. The TreeAnimationController is responsible for driving the updates.
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

  // Use linear progress - easing is applied within the rendering controller when needed
    const easedProgress = segmentProgress;

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
    console.log('[Store] goToPosition called with position:', position, 'direction:', direction);
    const { treeList, currentTreeIndex, renderInProgress } = get();
    console.log('[Store] goToPosition - treeList:', treeList?.length, 'currentTreeIndex:', currentTreeIndex, 'renderInProgress:', renderInProgress);

    // Only skip if actively rendering, not during general updates
    if (renderInProgress) {
      console.log('[Store] goToPosition skipped - renderInProgress:', renderInProgress);
      return;
    }

    if (!treeList || treeList.length === 0) {
      console.log('[Store] goToPosition skipped - no treeList');
      return;
    }

    const newIndex = clamp(position, 0, treeList.length - 1);
    console.log('[Store] goToPosition - currentTreeIndex:', currentTreeIndex, 'newIndex:', newIndex, 'treeList.length:', treeList.length);

    if (newIndex !== currentTreeIndex) {
      let navDirection = direction;
      if (!navDirection) {
        // Auto-detect direction based on position change
        navDirection = newIndex > currentTreeIndex ? 'forward' : 'backward';
      }

      console.log('[Store] goToPosition - updating from', currentTreeIndex, 'to', newIndex, 'direction:', navDirection);

      // **THE FIX**: Calculate and set animationProgress along with the tree index.
      const totalTrees = treeList.length;
      const newAnimationProgress = totalTrees > 1 ? newIndex / (totalTrees - 1) : 0;

      set({
        currentTreeIndex: newIndex,
        navigationDirection: navDirection,
        segmentProgress: 0, // Reset segment progress on discrete navigation
        animationProgress: newAnimationProgress // Sync animation progress
      });

      // The subscription will automatically handle the color manager update.
      // No need for manual calls here.
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
   * Sets the node size multiplier
   * @param {number} size - Node size multiplier (1.0 = default)
   */
  setNodeSize: (size) => {
    const numericSize = Number(size);
    set({ nodeSize: Math.max(0.1, Math.min(10, numericSize)) });
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
   * Set whether marked subtrees highlighting is enabled (naming only).
   * @param {boolean} enabled - Whether marked subtrees highlighting is enabled.
   */
  setMarkedComponentsEnabled: (enabled) => {
    set({ markedComponentsEnabled: enabled });

    // Update ColorManager - clear or restore based on enabled state (naming only)
    const { updateColorManagerMarkedSubtrees, getActualHighlightData } = get();
    if (!enabled) {
      // Clear marked subtrees when disabled
      updateColorManagerMarkedSubtrees([]);
    } else {
      // Restore marked subtrees when enabled
      const markedComponents = getActualHighlightData();
      updateColorManagerMarkedSubtrees(markedComponents);
    }
  },

  /**
   * Enables or disables dimming of non-descendant elements.
   * @param {boolean} enabled - Whether dimming is enabled.
   */
  setDimmingEnabled: (enabled) => set({ dimmingEnabled: enabled }),

  /**
   * Sets the opacity level for dimmed elements.
   * @param {number} opacity - Opacity level (0-1) for dimmed elements.
   */
  setDimmingOpacity: (opacity) => set({ dimmingOpacity: Math.max(0, Math.min(1, opacity)) }),


  /**
   * Motion trails toggles and parameters
   */
  setTrailsEnabled: (enabled) => set({ trailsEnabled: !!enabled }),
  setTrailLength: (length) => set({ trailLength: Math.max(2, Math.min(50, Math.round(Number(length) || 12))) }),
  setTrailOpacity: (opacity) => set({ trailOpacity: Math.max(0, Math.min(1, Number(opacity) || 0.5)) }),
  setTrailThickness: (thickness) => set({ trailThickness: Math.max(0.1, Math.min(5, Number(thickness) || 0.5)) }),

  // Auto-fit toggles removed (unused): toggleAutoFitOnTreeChange, setAutoFitOnTreeChange

  /**
   * Apply theme-aware default colors for branches and strokes.
   * @param {'system'|'light'|'dark'} themePref
   */
  applyThemeColors: (themePref = 'light') => {
    try {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = themePref === 'dark' || (themePref === 'system' && prefersDark);

      const next = {
        // Slightly darker neutral grey for dark theme
        defaultColor: isDark ? '#9AA4AE' : '#000000',
        strokeColor: isDark ? '#9AA4AE' : '#000000',
      };

      Object.assign(TREE_COLOR_CATEGORIES, next);

      // Notify ColorManager and trigger re-render
      const { colorManager, treeControllers } = get();
      if (colorManager && colorManager.refreshColorCategories) {
        colorManager.refreshColorCategories();
      }
      if (treeControllers) {
        treeControllers.forEach(c => c.renderAllElements());
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



  // setCameraMode removed (unused; UI uses toggleCameraMode)

  /**
   * Toggles between orthographic and orbit camera modes
   */
  toggleCameraMode: () => {
    const { cameraMode } = get();
    const newMode = cameraMode === 'orthographic' ? 'orbit' : 'orthographic';
    set({ cameraMode: newMode });
    return newMode;
  },


  // setMsaWindowSize/setMsaStepSize removed (unused)

  // setSyncMSAEnabled kept (used by ButtonsMSA)

  // setStyleConfig removed (unused)

  // --- Chart Actions ---
  /**
   * Sets the chart display option (rfd, wrfd, etc.)
   * @param {string} option - Chart type option
   */
  setBarOption: (option) => set({ barOptionValue: option }),

  // Sticky chart position removed




  // --- Rendering Lock ---
  /**
   * Sets the rendering progress state to prevent concurrent operations
   * @param {boolean} inProgress - Whether rendering is currently in progress
   */
  setRenderInProgress: (inProgress) => set({
    renderInProgress: inProgress
  }),

  // setSubscriptionPaused removed (unused)
  /**
   * Sets the tree controller instance with cleanup of previous instance
   * @param {Object} controller - Tree controller instance
   */
  setTreeControllers: (controllers) => {
    const { treeControllers: currentControllers } = get();

    // Clean up previous controller if it exists and is being replaced
    currentControllers.forEach(c => c.destroy());

    set({ treeControllers: controllers });
  },
  // addTreeController removed (unused)

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
   * Updates the ColorManager with new marked subtrees
   * @param {Array<Array>} markedComponents - Array of arrays containing marked subtree IDs
   */
  updateColorManagerMarkedSubtrees: (markedComponents) => {
    const { colorManager } = get();
      // Convert highlight data to the format ColorManager expects (array of Sets)
      let convertedMarked = [];

      console.log("Updating ColorManager with marked subtrees:", markedComponents);

      // Array of arrays - convert each inner array to a Set
      convertedMarked = markedComponents.map((innerArray) => {
        return new Set(innerArray);
      });

      console.log("Converted marked subtrees for ColorManager:", convertedMarked);

      colorManager.updateMarkedSubtrees(convertedMarked);
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
   * DELETED: This function is redundant. `setMonophyleticColoring` already handles this.
   */

  /**
   * Updates highlighting colors in TREE_COLOR_CATEGORIES
   * @param {string} colorType - Type of color to update (activeChangeEdgeColor, markedColor)
   * @param {string} newColor - New hex color value
   */
  updateHighlightingColor: (colorType, newColor) => {
    // Create new object to avoid direct mutation and ensure reactivity
    const updatedCategories = { ...TREE_COLOR_CATEGORIES, [colorType]: newColor };

    // Update the module-level TREE_COLOR_CATEGORIES for external consumers
    Object.assign(TREE_COLOR_CATEGORIES, updatedCategories);

    if (colorType === 'activeChangeEdgeColor') {
      set({ activeChangeEdgeColor: newColor });
    } else if (colorType === 'markedColor') {
      set({ markedColor: newColor });
    }

    // Notify ColorManager of the update
    const { colorManager } = get();
    if (colorManager && colorManager.refreshColorCategories) {
      colorManager.refreshColorCategories();
    }

    // Trigger re-render
    const { treeControllers } = get();
    if (treeControllers) {
      treeControllers.forEach(c => c.renderAllElements());
    }

    // Persist user color choice
    _persistColorCategories();
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
   * Updates marked subtrees highlighting color (naming only)
   * @param {string} newColor - New hex color value for marked subtree highlighting
   */
  setMarkedColor: (newColor) => {
    const { updateHighlightingColor } = get();
    updateHighlightingColor('markedColor', newColor);
  },

  /**
   * Updates taxa colors in TREE_COLOR_CATEGORIES
   * Called after TaxaColoring component applies new colors
   * @param {Object} newColorMap - Object mapping taxa names to hex colors
   */
  updateTaxaColors: (newColorMap) => {
    // Create new object to avoid direct mutation and ensure reactivity
    const updatedCategories = { ...TREE_COLOR_CATEGORIES, ...newColorMap };

    // Update the module-level TREE_COLOR_CATEGORIES for external consumers
    Object.assign(TREE_COLOR_CATEGORIES, updatedCategories);

    // Increment version to trigger deck.gl updateTriggers
    set((state) => ({ taxaColorVersion: state.taxaColorVersion + 1 }));

    // Notify ColorManager of the update
    const { colorManager } = get();
    if (colorManager && colorManager.refreshColorCategories) {
      colorManager.refreshColorCategories();
    }

    // Trigger re-render
    const { treeControllers } = get();
    if (treeControllers) {
      treeControllers.forEach(c => c.renderAllElements());
    }

    // Persist user color choices (taxa map)
    _persistColorCategories();
  },  /**
   * Persist current taxa grouping settings for UI (tooltips, lists)
   * @param {Object|null} grouping - { mode, separator?, strategyType?, csvTaxaMap? }
   */
  setTaxaGrouping: (grouping) => set({ taxaGrouping: grouping }),

  // --- Chart Data Getters ---
  // Legacy getLineChartProps removed; React chart reads state directly

  /**
   * Gets highlighting data (subtrees) for the current tree position
   * @returns {Array} Array of highlight subtrees for current tree state
   */
  getActualHighlightData: (treeIndexOverride = null) => {
    const { currentTreeIndex, transitionResolver, pairSolutions, activeChangeEdgeTracking, movieData } = get();
    const index = typeof treeIndexOverride === 'number' ? treeIndexOverride : currentTreeIndex;

    // When at an ORIGINAL (full) tree, clear all red highlights
    // Use a robust check against known full-tree sequence indices
    const fullTreeSeq = (transitionResolver?.fullTreeIndices || movieData?.fullTreeIndices || []);
    const onAnchor = Array.isArray(fullTreeSeq) && fullTreeSeq.includes(index);
    if (onAnchor || transitionResolver?.isFullTree?.(index)) {
      return [];
    }

    // Only evaluate the current step (no accumulation)
    const i = index;
    const activeChangeEdge = activeChangeEdgeTracking?.[i];
    if (!Array.isArray(activeChangeEdge) || activeChangeEdge.length === 0) {
      return [];
    }

    const pairKey = movieData?.tree_metadata?.[i]?.tree_pair_key;
    const pairEntry = pairKey ? pairSolutions?.[pairKey] : null;
    const latticeSolutions = pairEntry?.jumping_subtree_solutions || {};
    if (!pairEntry) return [];

    const edgeKey = `[${activeChangeEdge.join(', ')}]`;
    const latticeEdgeData = latticeSolutions[edgeKey];
    return Array.from(latticeEdgeData.flat());
  },

  /**
   * Updates the ColorManager based on the current tree index and enabled features.
   * This is the canonical way to sync color highlighting.
   */
  updateColorManagerForCurrentIndex: () => {
    const {
      markedComponentsEnabled,
      activeChangeEdgesEnabled,
      getActualHighlightData,
      getCurrentActiveChangeEdge,
      updateColorManagerMarkedSubtrees,
      updateColorManagerActiveChangeEdge
    } = get();

    if (markedComponentsEnabled) {
      const markedComponents = getActualHighlightData();
      updateColorManagerMarkedSubtrees(markedComponents);
    } else {
      updateColorManagerMarkedSubtrees([]);
    }

    if (activeChangeEdgesEnabled) {
      const activeChangeEdge = getCurrentActiveChangeEdge();
      updateColorManagerActiveChangeEdge(activeChangeEdge);
    } else {
      updateColorManagerActiveChangeEdge([]);
    }
  },

  /**
   * Gets current active change edge data for automatic highlighting
   * @returns {Array} Current active change edge data for the current tree position, or empty array
   */
  getCurrentActiveChangeEdge: (treeIndexOverride = null) => {
    const { currentTreeIndex, activeChangeEdgeTracking } = get();
    const index = typeof treeIndexOverride === 'number' ? treeIndexOverride : currentTreeIndex;
    const activeChangeEdge = activeChangeEdgeTracking?.[index];
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
        // Use the centralized update action
        state.updateColorManagerForCurrentIndex();
        previousTreeIndex = currentTreeIndex;
      }
    });
  },


}));

// Set up ColorManager subscription after store creation
useAppStore.getState().setupColorManagerSubscription();
