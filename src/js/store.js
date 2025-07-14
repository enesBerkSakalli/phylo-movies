import { create } from 'zustand';
import TransitionIndexResolver from './TransitionIndexResolver.js';
import { transformBranchLengths } from './utils/branchTransformUtils.js';
import calculateScales, { getMaxScaleValue } from './utils/scaleUtils.js'; // ADDED

// Helper to calculate render duration, moved from Gui
const getRenderDuration = (factor) => {
  const interval = 1000 / (factor || 1);
  return Math.max(400, interval * 0.8);
};

const DEFAULT_STYLE_CONFIG = {
  strokeWidth: 1, // Number for consistent type handling
  fontSize: "1.7em",
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

  // The TransitionIndexResolver will now live in the store
  transitionResolver: null,
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
  windowStart: 0, // New state variable
  windowEnd: 0, // New state variable

  // UI / Appearance state
  factor: 1,
  fontSize: 1.8,
  strokeWidth: 3,
  ignoreBranchLengths: false,
  branchTransformation: 'none',
  monophyleticColoringEnabled: true,
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
      true // debug
    );

    const fullTreeIndices = resolver.fullTreeIndices; // ADDED
    const scaleList = calculateScales(movieData.interpolated_trees, fullTreeIndices); // ADDED
    const maxScale = getMaxScaleValue(scaleList); // ADDED
    const numberOfFullTrees = fullTreeIndices.length; // ADDED

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
      currentTreeIndex: 0,
      previousTreeIndex: -1,
      playing: false,
    });
  },

  // --- Playback Actions ---
  play: () => set({ playing: true }),
  stop: () => set({ playing: false }),
  setFactor: (factor) => set({ factor }),

  // --- Navigation Actions ---
  goToPosition: (position) => {
    const { treeList, currentTreeIndex, renderInProgress } = get();

    // Only skip if actively rendering, not during general updates
    if (renderInProgress) return;

    const newIndex = Math.max(0, Math.min(treeList.length - 1, position));
    if (newIndex !== currentTreeIndex) {
      set({
        previousTreeIndex: currentTreeIndex,
        currentTreeIndex: newIndex,
      });
    }
  },

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

  backward: () => {
    const { currentTreeIndex, goToPosition, renderInProgress } = get();

    // Only skip if actively rendering, not during general updates
    if (renderInProgress) return;

    goToPosition(currentTreeIndex - 1);
  },

  // --- Appearance Actions ---
  setFontSize: (size) => {
    console.log('[Store] setFontSize called with:', size);
    let fontSize = size;
    if (typeof fontSize === 'number') {
      fontSize = `${fontSize}em`;
    } else if (typeof fontSize === 'string' && !fontSize.match(/(em|px|pt|rem)$/)) {
      fontSize = `${fontSize}em`;
    }
    console.log('[Store] setFontSize setting fontSize to:', fontSize);
    set((state) => ({
      fontSize,
      styleConfig: { ...state.styleConfig, fontSize }
    }));
  },
  setStrokeWidth: (width) => {
    console.log('[Store] setStrokeWidth called with:', width);
    set({ strokeWidth: width });
  },
  setIgnoreBranchLengths: (ignore) => {
    console.log('[Store] setIgnoreBranchLengths called with:', ignore);
    set({ ignoreBranchLengths: ignore });
  },
  setMonophyleticColoring: (enabled) => set({ monophyleticColoringEnabled: enabled }),
  setBranchTransformation: (transform) => set({ branchTransformation: transform }),
  setMsaWindowSize: (size) => set({ msaWindowSize: size }),
  setMsaStepSize: (step) => set({ msaStepSize: step }),

  setSyncMSAEnabled: (enabled) => set({ syncMSAEnabled: enabled }),
  setWindowStart: (start) => set({ windowStart: start }),
  setWindowEnd: (end) => set({ windowEnd: end }),

  setHighlightStrokeMultiplier: (multiplier) => set({ highlightStrokeMultiplier: multiplier }),

  setStyleConfig: (newConfig) => set((state) => ({
    styleConfig: { ...state.styleConfig, ...newConfig }
  })),

  // --- Chart Actions ---
  setBarOption: (option) => set({ barOptionValue: option }),
  setStickyChartPosition: (position) => set({ stickyChartPosition: position }),
  clearStickyChartPosition: () => set({ stickyChartPosition: undefined }),

  // --- Rendering Lock ---
  setRenderInProgress: (inProgress) => set({
    renderInProgress: inProgress
    // Don't automatically set updateInProgress - let actions decide when to block
  }),

  // --- Subscription Control ---
  setSubscriptionPaused: (paused) => set({ subscriptionPaused: paused }),
  setTreeController: (controller) => {
    set({ treeController: controller });
  },
  setGui: (instance) => set({ gui: instance }), // ADD THIS LINE: Action to set the Gui instance

  // --- Chart Data Getters ---
  getLineChartProps: () => {
    const state = get();
    return {
      barOptionValue: state.barOptionValue,
      currentTreeIndex: state.currentTreeIndex,
      robinsonFouldsDistances: state.movieData?.rfd_list,
      weightedRobinsonFouldsDistances: state.movieData?.wrfd_list,
      scaleList: state.movieData?.scaleList, // Assuming scaleList is part of movieData
      transitionResolver: state.transitionResolver,
    };
  },

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
}));
