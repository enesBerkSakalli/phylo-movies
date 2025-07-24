import { create } from 'zustand';
import TransitionIndexResolver from './TransitionIndexResolver.js';
import calculateScales, { getMaxScaleValue } from '../utils/scaleUtils.js'; // ADDED
import { getLinkKey, getNodeKey } from '../treeVisualisation/utils/KeyGenerator.js';
import { ColorManager } from '../treeVisualisation/systems/ColorManager.js';

// Tree color categories for phylogenetic visualization
export const TREE_COLOR_CATEGORIES = {
  defaultColor: "#000000",
  markedColor: "#ff5722",
  strokeColor: "#000000",
  changingColor: "#ffa500",
  defaultLabelColor: "#000000",
  extensionLinkColor: "#000000",
  userMarkedColor: "#ff00ff",
  // Highlighting colors for different types
  s_edgesColor: "#2196f3",
  atomCoversColor: "#9c27b0",
  combinedHighlightColor: "#9c27b0",
};


const DEFAULT_STYLE_CONFIG = {
  contourWidthOffset: 2, // Pixels for contour width beyond main stroke
  contourColor: "#333", // Dark gray for contour
  leafRadius: "0.4em",
  leafStrokeWidth: "0.1em",
  internalNodeRadius: "0.2em",
  extensionStrokeWidth: "0.06em",
  dashArray: "5,5",
  extensionOpacity: 0.7
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
  lattice_edge_tracking: [],

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
  playing: false,
  renderInProgress: false,
  updateInProgress: false, // Enhanced render lock to prevent all updates during render
  subscriptionPaused: false, // Allow temporary subscription pausing
  syncMSAEnabled: true, // New state variable

  // UI / Appearance state
  animationSpeed: 1,
  fontSize: "1.8em",
  strokeWidth: 3,
  branchTransformation: 'none',
  monophyleticColoringEnabled: true,
  webglEnabled: true, // Default to WebGL enabled
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
      movieData.s_edge_metadata,
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
      lattice_edge_tracking: movieData.lattice_edge_tracking,
      transitionResolver: resolver,
      colorManager: colorManager, // Single ColorManager instance
      currentTreeIndex: 0,
      previousTreeIndex: -1,
      playing: false,
    });
  },

  // --- Playback Actions ---
  /**
   * Starts timeline playback
   */
  play: () => set({ playing: true }),
  
  /**
   * Stops timeline playback
   */
  stop: () => set({ playing: false }),
  
  /**
   * Sets the animation playback speed multiplier
   * @param {number} animationSpeed - Speed multiplier (1.0 = normal speed)
   */
  setAnimationSpeed: (animationSpeed) => set({ animationSpeed }),

  // --- Navigation Actions ---
  /**
   * Navigates to a specific tree position in the timeline
   * @param {number} position - Target tree index (0-based)
   */
  goToPosition: (position) => {
    const { treeList, currentTreeIndex, renderInProgress, gui } = get();

    // Only skip if actively rendering, not during general updates
    if (renderInProgress) return;

    const newIndex = Math.max(0, Math.min(treeList.length - 1, position));
    if (newIndex !== currentTreeIndex) {
      // CRITICAL FIX: Set navigation direction synchronously BEFORE state change
      // This prevents the race condition where rendering starts before direction is set
      if (gui && typeof gui._updateNavigationDirection === 'function') {
        gui._updateNavigationDirection(newIndex, currentTreeIndex);
      }

      set({
        previousTreeIndex: currentTreeIndex,
        currentTreeIndex: newIndex,
      });
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
  setMonophyleticColoring: (enabled) => set({ monophyleticColoringEnabled: enabled }),
  
  /**
   * Enables or disables WebGL rendering
   * @param {boolean} enabled - Whether WebGL rendering is enabled
   */
  setWebglEnabled: (enabled) => set({ webglEnabled: enabled }),
  
  /**
   * Sets the branch transformation mode
   * @param {string} transform - Transformation type ('none', 'log', etc.)
   */
  setBranchTransformation: (transform) => set({ branchTransformation: transform }),
  
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
    // Don't automatically set updateInProgress - let actions decide when to block
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
      console.log('[Store] Cleaning up previous tree controller');
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
      console.log('[Store] Cleaning up previous GUI instance');
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
    if (colorManager) {
      // Convert highlight data to the format ColorManager expects (array of Sets)
      let convertedMarked;

      if (Array.isArray(markedComponents)) {
        if (markedComponents.length > 0 && Array.isArray(markedComponents[0])) {
          // Array of arrays - convert each inner array to a Set
          convertedMarked = markedComponents.map((innerArray) => {
            return new Set(innerArray);
          });
        }
      } else {
        // Empty or invalid data
        convertedMarked = [];
      }

      colorManager.updateMarkedComponents(convertedMarked);
    }
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

  // --- Chart Data Getters ---
  /**
   * Gets properties needed for line chart rendering
   * @returns {Object} Chart properties including distances, scales, and current position
   */
  getLineChartProps: () => {
    const state = get();

    // For all chart types, use the distance index (full tree index)
    // - scaleList has one entry per full tree (created by calculateScales with fullTreeIndices)
    // - rfd_list has one entry per transition between full trees
    // - wrfd_list has one entry per transition between full trees
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
    const { currentTreeIndex, transitionResolver, highlightData, lattice_edge_tracking } = get();

    const highlightIndex = transitionResolver.getHighlightingIndex(currentTreeIndex);

    // If the current tree is not in a highlightable transition segment, return empty.
    if (highlightIndex === -1) {
      return [];
    }

    const fullTreeIndices = transitionResolver.fullTreeIndices;
    // The segment starts at the full tree that defines this transition.
    const segmentStartIndex = fullTreeIndices[highlightIndex];

    const uniqueSolutions = new Map();

    // Iterate from the beginning of the segment up to the current tree.
    for (let i = segmentStartIndex; i <= currentTreeIndex; i++) {
      // We only care about consensus trees within this range.
      if (transitionResolver.isConsensusTree(i)) {
        const s_edge = lattice_edge_tracking?.[i];
        if (!s_edge) continue;

        const treePairSolution = highlightData[highlightIndex];
        if (!treePairSolution?.lattice_edge_solutions) {
          continue;
        }

        const edgeKey = `[${s_edge.join(', ')}]`;
        const latticeEdgeData = treePairSolution.lattice_edge_solutions[edgeKey];

        if (Array.isArray(latticeEdgeData)) {
          for (const solution of latticeEdgeData.flat()) {
            uniqueSolutions.set(JSON.stringify(solution), solution);
          }
        }
      }
    }
    return Array.from(uniqueSolutions.values());
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
}));
