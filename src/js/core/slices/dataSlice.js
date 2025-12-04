import TransitionIndexResolver from '../../domain/indexing/TransitionIndexResolver.js';
import calculateScales, { getMaxScaleValue } from '../../utils/scaleUtils.js';
import { TreeColorManager } from '../../treeVisualisation/systems/TreeColorManager.js';
import { TREE_COLOR_CATEGORIES } from '../../constants/TreeColors.js';

// Optional persistence of user color choices in localStorage
export const COLOR_STORAGE_KEY = 'phylo.colorCategories';

function loadPersistedColorCategories() {
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

// Data/initialization slice: handles immutable inputs and setup
export const createDataSlice = (set, get) => ({
  movieData: null,
  treeList: [],
  fileName: null,
  distanceRfd: [],
  distanceWeightedRfd: [],
  scaleValues: [],
  pairSolutions: {}, // From tree_pair_solutions in JSON (used for red/marked)
  activeChangeEdgeTracking: [], // From split_change_tracking in JSON
  transitionResolver: null,
  colorManager: null, // Single ColorManager instance - source of truth for colors
  msaWindowSize: 1000,
  msaStepSize: 50,
  msaColumnCount: 0, // Derived from data.msa.sequences[first]
  msaRegion: null,
  hasMsa: false,
  screenPositionsLeft: {},
  screenPositionsRight: {},
  viewLinkMapping: {
    fromIndex: null,
    toIndex: null,
    anchors: [],
    movers: [],
    sourceToDest: {},
    destToSource: {},
    sourceSplits: {},
    destSplits: {}
  },

  /**
   * Initializes the entire application state from the raw movieData object.
   * This is the single entry point for setting up the application's state.
   */
  initialize: (movieData) => {
    if (!movieData || typeof movieData !== 'object') {
      console.error('[Store] initialize called without valid movieData');
      return;
    }

    const interpolatedTrees = Array.isArray(movieData.interpolated_trees) ? movieData.interpolated_trees : [];
    const treeMetadata = Array.isArray(movieData.tree_metadata) ? movieData.tree_metadata : movieData.tree_metadata || [];

    // Merge any persisted user color choices before ColorManager is created
    try {
      const persisted = loadPersistedColorCategories();
      if (persisted) Object.assign(TREE_COLOR_CATEGORIES, persisted);
    } catch (_) {}

    const resolver = new TransitionIndexResolver(
      treeMetadata,
      movieData.distances?.robinson_foulds,
      movieData.tree_pair_solutions || {},
      movieData.pair_interpolation_ranges || [],
      true // debug
    );

    const fullTreeIndices = Array.isArray(resolver.fullTreeIndices) ? resolver.fullTreeIndices : [];
    const scaleList = interpolatedTrees.length ? calculateScales(interpolatedTrees, fullTreeIndices) : [];
    const maxScale = getMaxScaleValue(scaleList);
    const numberOfFullTrees = fullTreeIndices.length;

    // Create single ColorManager instance - single source of truth
    const colorManager = new TreeColorManager();

    // Sync ColorManager with store's monophyletic setting
    const initialMonophyleticColoring = get().monophyleticColoringEnabled !== undefined ? get().monophyleticColoringEnabled : true;
    colorManager.setMonophyleticColoring(initialMonophyleticColoring);

    // Derive MSA column count if available (dictionary: taxa -> sequence)
    let msaColumnCount = 0;
    const seqDict = movieData?.msa?.sequences;
    const firstSeq = seqDict ? Object.values(seqDict)[0] : null;
    if (typeof firstSeq === 'string') {
      msaColumnCount = firstSeq.length;
    }

    // Get window parameters from movieData
    const windowSize = movieData.window_size || movieData.msa?.window_size || 1000;
    const stepSize = movieData.window_step_size || movieData.msa?.step_size || 50;

    console.log('[Store] Setting MSA params - windowSize:', windowSize, 'stepSize:', stepSize, 'columnCount:', msaColumnCount);

    const fileName = movieData.file_name || 'Unknown File';

    const hasMsa = !!(movieData?.msa && movieData.msa.sequences && Object.keys(movieData.msa.sequences).length > 0);
    const distanceRfd = Array.isArray(movieData?.distances?.robinson_foulds)
      ? [...movieData.distances.robinson_foulds]
      : [];
    const distanceWeightedRfd = Array.isArray(movieData?.distances?.weighted_robinson_foulds)
      ? [...movieData.distances.weighted_robinson_foulds]
      : [];
    const scaleValues = scaleList.map((s) => (Number.isFinite(s?.value) ? s.value : 0));

    set({
      movieData: {
        ...movieData, // Keep existing movieData properties
        distances: undefined, // distances stored at top-level fields
        scaleList,
        maxScale,
        fullTreeIndices,
        numberOfFullTrees
      },
      treeList: interpolatedTrees,
      fileName,
      hasMsa,
      distanceRfd,
      distanceWeightedRfd,
      scaleValues,
      pairSolutions: movieData.tree_pair_solutions || {},
      activeChangeEdgeTracking: movieData.split_change_tracking || [],
      transitionResolver: resolver,
      colorManager,
      currentTreeIndex: 0,
      playing: false,
      msaColumnCount,
      msaWindowSize: windowSize,
      msaStepSize: stepSize,
      activeChangeEdgeColor: TREE_COLOR_CATEGORIES.activeChangeEdgeColor,
      markedColor: TREE_COLOR_CATEGORIES.markedColor,
    });

    // Initialize ColorManager with marked components for the initial tree position (index 0)
    const {
      getActualHighlightData,
      updateColorManagerMarkedSubtrees,
      updateColorManagerActiveChangeEdge,
      getCurrentActiveChangeEdge
    } = get();
    const initialMarkedComponents = getActualHighlightData();
    const initialActiveChangeEdge = getCurrentActiveChangeEdge();

    updateColorManagerMarkedSubtrees(initialMarkedComponents);
    updateColorManagerActiveChangeEdge(initialActiveChangeEdge);
  },

  setDistanceRfd: (arr) => set({ distanceRfd: Array.isArray(arr) ? [...arr] : [] }),
  setDistanceWeightedRfd: (arr) => set({ distanceWeightedRfd: Array.isArray(arr) ? [...arr] : [] }),
  setScaleValues: (arr) => set({ scaleValues: Array.isArray(arr) ? [...arr] : [] }),

  /**
   * Store screen-space positions for overlay rendering.
   * @param {'left'|'right'|string} side - Side identifier (non-'right' treated as 'left')
   * @param {Object} positions - Map of splitIndex key -> {x,y,width,height,isLeaf}
   */
  setScreenPositions: (side, positions) => {
    const isRight = side === 'right';
    set(isRight ? { screenPositionsRight: positions || {} } : { screenPositionsLeft: positions || {} });
  },

  /**
   * Store the view link mapping used by comparison overlays.
   * @param {Object} mapping - Mapping from buildViewLinkMapping; defaults to empty mapping when falsy.
   */
  setViewLinkMapping: (mapping) => {
    const empty = {
      fromIndex: null,
      toIndex: null,
      anchors: [],
      movers: [],
      sourceToDest: {},
      destToSource: {},
      sourceSplits: {},
      destSplits: {}
    };
    set({ viewLinkMapping: mapping || empty });
  },

  /**
   * Set the current MSA region (1-based, inclusive). Clamps to the known column count.
   */
  setMsaRegion: (start, end) => {
    const { msaColumnCount } = get();
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      set({ msaRegion: null });
      return;
    }
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    const limit = msaColumnCount || Number.MAX_SAFE_INTEGER;
    const clampedStart = Math.max(1, Math.min(limit, min));
    const clampedEnd = Math.max(1, Math.min(limit, max));
    set({ msaRegion: { start: clampedStart, end: clampedEnd } });
  },

  /**
   * Clear any stored MSA region.
   */
  clearMsaRegion: () => set({ msaRegion: null }),
});
