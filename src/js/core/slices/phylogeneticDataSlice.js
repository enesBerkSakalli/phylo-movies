import TransitionIndexResolver from '../../domain/indexing/TransitionIndexResolver.js';
import { TreeColorManager } from '../../treeVisualisation/systems/TreeColorManager.js';
import { TREE_COLOR_CATEGORIES } from '../../constants/TreeColors.js';
import { loadPersistedColorCategories } from '../../services/storage/colorPersistence.js';
import { extractMsaColumnCount, extractMsaWindowParameters, hasMsaData } from '../../services/domain/msaDataExtractor.js';
import { calculateTreeScales } from '../../services/domain/scaleCalculator.js';

/**
 * Phylogenetic data slice: manages immutable phylogenetic tree data and initialization
 */
export const createPhylogeneticDataSlice = (set, get) => ({
  movieData: null,
  treeList: [],
  fileName: null,
  distanceRfd: [],
  distanceWeightedRfd: [],
  scaleValues: [],
  pairSolutions: {},
  activeChangeEdgeTracking: [],
  transitionResolver: null,
  colorManager: null,
  msaWindowSize: 1000,
  msaStepSize: 50,
  msaColumnCount: 0,
  msaRegion: null,
  hasMsa: false,
  screenPositionsLeft: {},
  screenPositionsRight: {},
  viewLinkMapping: createEmptyViewLinkMapping(),

  /**
   * Initializes the entire application state from the raw movieData object.
   * This is the single entry point for setting up the application's state.
   */
  initialize: (movieData) => {
    if (!movieData || typeof movieData !== 'object') {
      console.error('[Store] initialize called without valid movieData');
      return;
    }

    const interpolatedTrees = Array.isArray(movieData.interpolated_trees)
      ? movieData.interpolated_trees
      : [];
    const treeMetadata = Array.isArray(movieData.tree_metadata)
      ? movieData.tree_metadata
      : movieData.tree_metadata || [];

    applyPersistedColorPreferences();

    const resolver = createTransitionResolver(movieData, treeMetadata);
    const fullTreeIndices = Array.isArray(resolver.fullTreeIndices) ? resolver.fullTreeIndices : [];
    const { scaleList, maxScale, scaleValues } = calculateTreeScales(interpolatedTrees, fullTreeIndices);
    const numberOfFullTrees = fullTreeIndices.length;

    const colorManager = createColorManager(get);
    const msaColumnCount = extractMsaColumnCount(movieData);
    const { windowSize, stepSize } = extractMsaWindowParameters(movieData);

    console.log('[Store] Setting MSA params - windowSize:', windowSize, 'stepSize:', stepSize, 'columnCount:', msaColumnCount);

    const fileName = movieData.file_name || 'Unknown File';
    const hasMsaContent = hasMsaData(movieData);
    const distanceRfd = extractDistanceArray(movieData?.distances?.robinson_foulds);
    const distanceWeightedRfd = extractDistanceArray(movieData?.distances?.weighted_robinson_foulds);

    set({
      movieData: {
        ...movieData,
        distances: undefined,
        scaleList,
        maxScale,
        fullTreeIndices,
        numberOfFullTrees
      },
      treeList: interpolatedTrees,
      fileName,
      hasMsa: hasMsaContent,
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

    initializeColorManagerForInitialState(get);
  },

  setDistanceRfd: (arr) => set({ distanceRfd: extractDistanceArray(arr) }),
  setDistanceWeightedRfd: (arr) => set({ distanceWeightedRfd: extractDistanceArray(arr) }),
  setScaleValues: (arr) => set({ scaleValues: extractDistanceArray(arr) }),

  /**
   * Store screen-space positions for overlay rendering.
   * @param {'left'|'right'|string} side - Side identifier (non-'right' treated as 'left')
   * @param {Object} positions - Map of splitIndex key -> {x,y,width,height,isLeaf}
   */
  setScreenPositions: (side, positions) => {
    const isRight = side === 'right';
    set(isRight
      ? { screenPositionsRight: positions || {} }
      : { screenPositionsLeft: positions || {} }
    );
  },

  /**
   * Store the view link mapping used by comparison overlays.
   * @param {Object} mapping - Mapping from buildViewLinkMapping; defaults to empty mapping when falsy.
   */
  setViewLinkMapping: (mapping) => {
    set({ viewLinkMapping: mapping || createEmptyViewLinkMapping() });
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

// ========== Private Helper Functions ==========

function createEmptyViewLinkMapping() {
  return {
    fromIndex: null,
    toIndex: null,
    anchors: [],
    movers: [],
    sourceToDest: {},
    destToSource: {},
    sourceSplits: {},
    destSplits: {}
  };
}

function applyPersistedColorPreferences() {
  try {
    const persisted = loadPersistedColorCategories();
    if (persisted) {
      Object.assign(TREE_COLOR_CATEGORIES, persisted);
    }
  } catch (_) {
    // Silently ignore errors
  }
}

function createTransitionResolver(movieData, treeMetadata) {
  return new TransitionIndexResolver(
    treeMetadata,
    movieData.distances?.robinson_foulds,
    movieData.tree_pair_solutions || {},
    movieData.pair_interpolation_ranges || [],
    true
  );
}

function createColorManager(getState) {
  const colorManager = new TreeColorManager();
  const initialMonophyleticColoring = getState().monophyleticColoringEnabled !== undefined
    ? getState().monophyleticColoringEnabled
    : true;
  colorManager.setMonophyleticColoring(initialMonophyleticColoring);
  return colorManager;
}

function extractDistanceArray(value) {
  return Array.isArray(value) ? [...value] : [];
}

function initializeColorManagerForInitialState(getState) {
  const {
    getActualHighlightData,
    updateColorManagerMarkedSubtrees,
    updateColorManagerActiveChangeEdge,
    getCurrentActiveChangeEdge
  } = getState();

  const initialMarkedComponents = getActualHighlightData();
  const initialActiveChangeEdge = getCurrentActiveChangeEdge();

  updateColorManagerMarkedSubtrees(initialMarkedComponents);
  updateColorManagerActiveChangeEdge(initialActiveChangeEdge);
}
