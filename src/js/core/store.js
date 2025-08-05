import { create } from 'zustand';
import TransitionIndexResolver from './TransitionIndexResolver.js';
import calculateScales, { getMaxScaleValue } from '../utils/scaleUtils.js'; // ADDED
import { getLinkKey, getNodeKey } from '../treeVisualisation/utils/KeyGenerator.js';
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
};

export const useAppStore = create((set, get) => ({
  // ===================================
  // STATE
  // ===================================
  // Raw data, initialized once
  movieData: null,
  treeList: [],
  treeMetadata: [],
  highlightData: [],
  activeChangeEdgeTracking: [], // Renamed from lattice_edge_tracking

  // Position cache for efficient diffing
  treePositionCache: new Map(), // Map<treeIndex, { links: Map, nodes: Map, leaves: Map }>
  layoutCache: new Map(), // Map<treeIndex, layoutResult>

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
  webglEnabled: true, // Default to WebGL enabled
  useDeckGL: true, // Feature flag for Deck.gl testing - SET TO TRUE for testing
  cameraMode: 'orthographic', // Camera mode for Deck.gl ('orthographic' or 'orbit')
  msaWindowSize: 1000, // Default value
  msaStepSize: 50,     // Default value
  highlightStrokeMultiplier: 1.6, // New state variable for highlight stroke multiplier
  styleConfig: { ...DEFAULT_STYLE_CONFIG }, // New state variable for centralized style config

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
    const resolver = new TransitionIndexResolver(
      movieData.tree_metadata,
      movieData.highlighted_elements,
      movieData.rfd_list,
      movieData.s_edge_metadata || movieData.activeChangeEdge_metadata, // Support both old and new field names
      movieData.tree_pair_solutions || {}, // Pass treePairSolutions for lattice_edge_solutions
      true // debug
    );

    const fullTreeIndices = resolver.fullTreeIndices; // ADDED
    const scaleList = calculateScales(movieData.interpolated_trees, fullTreeIndices); // ADDED
    const maxScale = getMaxScaleValue(scaleList); // ADDED
    const numberOfFullTrees = fullTreeIndices.length; // ADDED

    // Create single ColorManager instance - single source of truth
    // Initialize with empty array (ColorManager expects array of Sets)
    const colorManager = new ColorManager([]);

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
      highlightData: movieData.highlighted_elements,
      activeChangeEdgeTracking: movieData.lattice_edge_tracking || movieData.activeChangeEdgeTracking || [], // Support both old and new field names
      transitionResolver: resolver,
      colorManager: colorManager, // Single ColorManager instance
      currentTreeIndex: 0,
      previousTreeIndex: -1,
      playing: false,
    });

    // Initialize ColorManager with marked components for the initial tree position (index 0)
    const { getActualHighlightData, updateColorManagerMarkedComponents,  updateColorManagerActiveChangeEdge, getCurrentActiveChangeEdge } = get();
    const initialMarkedComponents = getActualHighlightData();
    const initialActiveChangeEdge = getCurrentActiveChangeEdge();

    updateColorManagerMarkedComponents(initialMarkedComponents);
    updateColorManagerActiveChangeEdge(initialActiveChangeEdge);
  },

  // --- Playback Actions ---
  /**
   * Starts timeline playback and initializes animation state
   */
  play: () => {
    set({
      playing: true,
      animationStartTime: performance.now(),
      animationProgress: 0
    });
  },

  /**
   * Stops timeline playback and resets animation state
   */
  stop: () => {
    set({
      playing: false,
      animationStartTime: null,
      animationProgress: 0
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

      set({
        previousTreeIndex: currentTreeIndex,
        currentTreeIndex: newIndex,
        navigationDirection: navDirection,
        segmentProgress: 0 // Reset segment progress on discrete navigation
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
   * Enables or disables WebGL rendering
   * @param {boolean} enabled - Whether WebGL rendering is enabled
   */
  setWebglEnabled: (enabled) => set({ webglEnabled: enabled }),

  /**
   * Toggle function for Deck.gl testing
   */
  toggleDeckGL: () => set(state => ({
    useDeckGL: !state.useDeckGL
  })),

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
   * Sets the highlight stroke width multiplier
   * @param {number} multiplier - Multiplier for highlighted element stroke width
   */
  setHighlightStrokeMultiplier: (multiplier) => set({ highlightStrokeMultiplier: multiplier }),

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

    // Trigger re-render for both SVG and WebGL renderers
    const { treeController, webglEnabled, webglTreeController } = get();

    if (webglEnabled && webglTreeController) {
      // For WebGL: LayerStyles will pick up the new color via ColorManager
      webglTreeController.renderAllElements();
    } else if (treeController) {
      // For SVG: Force a re-render to pick up new colors
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

  // --- Chart Data Getters ---
  /**
   * Gets properties needed for line chart rendering
   * @returns {Object} Chart properties including distances, scales, and current position
   */
  getLineChartProps: () => {
    const state = get();
    const distanceIndex = state.transitionResolver ?
      state.transitionResolver.getDistanceIndex(state.currentTreeIndex) :
      0;

    return {
      barOptionValue: state.barOptionValue,
      currentTreeIndex: distanceIndex, // Always use distance index for all chart types
      robinsonFouldsDistances: state.movieData?.rfd_list,
      weightedRobinsonFouldsDistances: state.movieData?.wrfd_list,
      scaleList: state.movieData?.scaleList,
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

  // --- Position Cache Actions ---
  /**
   * Caches tree layout positions for efficient diffing during interpolation
   * @param {number} treeIndex - Index of the tree being cached
   * @param {Object} layoutResult - Layout result containing tree structure
   */
  cacheTreePositions: (treeIndex, layoutResult) => {
    const { treePositionCache, layoutCache } = get();

    if (!layoutResult || !layoutResult.tree) return;

    const tree = layoutResult.tree;
    const linksMap = new Map();
    const nodesMap = new Map();
    const leavesMap = new Map();

    // Cache link positions using KeyGenerator
    tree.links().forEach(link => {
      const key = getLinkKey(link);
      linksMap.set(key, {
        sourceAngle: link.source.angle,
        sourceRadius: link.source.radius,
        targetAngle: link.target.angle,
        targetRadius: link.target.radius
      });
    });

    // Cache node positions using KeyGenerator
    tree.descendants().forEach(node => {
      const key = getNodeKey(node);
      nodesMap.set(key, {
        angle: node.angle,
        radius: node.radius,
        x: node.x,
        y: node.y
      });
    });

    // Cache leaf positions using KeyGenerator
    tree.leaves().forEach(leaf => {
      const key = getNodeKey(leaf); // Use same function as nodes
      leavesMap.set(key, {
        angle: leaf.angle,
        radius: leaf.radius,
        x: leaf.x,
        y: leaf.y
      });
    });

    // Store in cache
    treePositionCache.set(treeIndex, { links: linksMap, nodes: nodesMap, leaves: leavesMap });
    layoutCache.set(treeIndex, layoutResult);
  },

  /**
   * Retrieves cached tree positions for a specific tree index
   * @param {number} treeIndex - Index of the tree to retrieve
   * @returns {Object|null} Cached position data or null if not found
   */
  getTreePositions: (treeIndex) => {
    const { treePositionCache } = get();
    return treePositionCache.get(treeIndex) || null;
  },

  /**
   * Retrieves cached layout result for a specific tree index
   * @param {number} treeIndex - Index of the tree layout to retrieve
   * @returns {Object|null} Cached layout result or null if not found
   */
  getLayoutCache: (treeIndex) => {
    const { layoutCache } = get();
    return layoutCache.get(treeIndex) || null;
  },

  // Cache clearing methods
  /**
   * Clears all cached tree positions
   */
  clearPositionCache: () => {
    const { treePositionCache } = get();
    treePositionCache.clear();
  },

  /**
   * Clears all cached layout results
   */
  clearLayoutCache: () => {
    const { layoutCache } = get();
    layoutCache.clear();
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
        const { getActualHighlightData, updateColorManagerMarkedComponents, updateColorManagerActiveChangeEdge, getCurrentActiveChangeEdge } = state;

        // Update ColorManager for the new tree index
        const markedComponents = getActualHighlightData();
        const activeChangeEdge = getCurrentActiveChangeEdge();

        updateColorManagerMarkedComponents(markedComponents);
        updateColorManagerActiveChangeEdge(activeChangeEdge);

        previousTreeIndex = currentTreeIndex;
      }
    });
  },

  /**
   * Updates currentTreeIndex during animation without triggering full navigation
   * Used by animation controllers for smooth scrubbing
   */
  updateTreeIndexForAnimation: (newIndex) => {
    const { treeList, currentTreeIndex } = get();
    const clampedIndex = clamp(newIndex, 0, treeList.length - 1);

    if (clampedIndex !== currentTreeIndex) {
      set({ currentTreeIndex: clampedIndex });
      // ColorManager will be updated automatically via subscription
    }
  },
}));

// Set up ColorManager subscription after store creation
const unsubscribe = useAppStore.getState().setupColorManagerSubscription();

// Optionally store the unsubscribe function if needed for cleanup
useAppStore.getState().colorManagerUnsubscribe = unsubscribe;
