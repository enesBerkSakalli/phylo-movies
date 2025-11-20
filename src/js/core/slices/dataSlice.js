import TransitionIndexResolver from '../TransitionIndexResolver.js';
import calculateScales, { getMaxScaleValue } from '../../utils/scaleUtils.js';
import { ColorManager } from '../../treeVisualisation/systems/ColorManager.js';
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
  pairSolutions: {}, // From tree_pair_solutions in JSON (used for red/marked)
  activeChangeEdgeTracking: [], // From split_change_tracking in JSON
  transitionResolver: null,
  colorManager: null, // Single ColorManager instance - source of truth for colors
  msaWindowSize: 1000,
  msaStepSize: 50,
  msaColumnCount: 0, // Derived from data.msa.sequences[first]
  hasMsa: false,

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
    // Initialize with empty array (ColorManager expects array of Sets)
    const colorManager = new ColorManager([]);

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

    set({
      movieData: {
        ...movieData, // Keep existing movieData properties
        scaleList,
        maxScale,
        fullTreeIndices,
        numberOfFullTrees
      },
      treeList: interpolatedTrees,
      fileName,
      hasMsa,
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
});
