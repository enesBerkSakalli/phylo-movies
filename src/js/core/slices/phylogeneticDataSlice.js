import TransitionIndexResolver from '../../domain/indexing/TransitionIndexResolver.js';
import { extractMsaColumnCount, extractMsaWindowParameters, hasMsaData } from '../../domain/msa/msaDataExtractor.js';
import { calculateTreeScales } from '../../domain/tree/scaleCalculator.js';
import { MovieTimelineManager } from '../../timeline/core/MovieTimelineManager.js';

/**
 * Phylogenetic data slice: manages immutable phylogenetic tree data and initialization.
 */
export const createPhylogeneticDataSlice = (set, get) => ({
  // ==========================================================================
  // STATE: Core Data
  // ==========================================================================
  movieData: null,
  treeList: [],
  fileName: null,
  transitionResolver: null,

  // ==========================================================================
  // STATE: Distances & Scales
  // ==========================================================================
  distanceRfd: [],
  distanceWeightedRfd: [],
  scaleValues: [],

  // ==========================================================================
  // STATE: Change Tracking
  // ==========================================================================
  pairSolutions: {},
  pivotEdgeTracking: [],
  subtreeTracking: [],

  // ==========================================================================
  // ACTIONS: Reset
  // ==========================================================================
  reset: () => {
    const { resetMsaData, resetColors, resetPlayback, resetControllers, resetComparison } = get();

    // Reset each slice via its own reset action
    resetControllers?.();
    resetPlayback?.();
    resetMsaData?.();
    resetColors?.();
    resetComparison?.();

    // Reset this slice's own state
    set({
      movieData: null,
      treeList: [],
      fileName: null,
      distanceRfd: [],
      distanceWeightedRfd: [],
      scaleValues: [],
      pairSolutions: {},
      pivotEdgeTracking: [],
      subtreeTracking: [],
      transitionResolver: null,
    });
  },

  // ==========================================================================
  // ACTIONS: Initialize
  // ==========================================================================
  initialize: (movieData) => {
    if (!movieData || typeof movieData !== 'object') {
      console.error('[Store] initialize called without valid movieData');
      return;
    }

    const { resetInterpolationCaches } = get();
    resetInterpolationCaches?.();

    const interpolatedTrees = Array.isArray(movieData.interpolated_trees)
      ? movieData.interpolated_trees
      : [];
    const treeMetadata = Array.isArray(movieData.tree_metadata)
      ? movieData.tree_metadata
      : movieData.tree_metadata || [];

    const resolver = createTransitionResolver(movieData, treeMetadata);
    const fullTreeIndices = Array.isArray(resolver.fullTreeIndices) ? resolver.fullTreeIndices : [];
    const { scaleList, maxScale, scaleValues } = calculateTreeScales(interpolatedTrees, fullTreeIndices);
    const numberOfFullTrees = fullTreeIndices.length;

    const sortedLeaves = movieData.sorted_leaves || [];

    // Extract MSA data and set via MSA slice
    const msaColumnCount = extractMsaColumnCount(movieData);
    const { windowSize, stepSize } = extractMsaWindowParameters(movieData);
    const hasMsaContent = hasMsaData(movieData);

    const { setMsaData, initializeColors } = get();
    setMsaData?.({
      hasMsa: hasMsaContent,
      windowSize,
      stepSize,
      columnCount: msaColumnCount
    });

    const fileName = movieData.file_name || 'Unknown File';
    const distanceRfd = extractDistanceArray(movieData?.distances?.robinson_foulds);
    const distanceWeightedRfd = extractDistanceArray(movieData?.distances?.weighted_robinson_foulds);

    // Destroy existing timeline manager before creating new one
    const existingManager = get().movieTimelineManager;
    existingManager?.destroy();

    const movieTimelineManager = new MovieTimelineManager(movieData, resolver);

    set({
      movieData: {
        ...movieData,
        sorted_leaves: sortedLeaves,
        distances: undefined,
        scaleList,
        maxScale,
        fullTreeIndices,
        numberOfFullTrees
      },
      movieTimelineManager,
      treeList: interpolatedTrees,
      fileName,
      distanceRfd,
      distanceWeightedRfd,
      scaleValues,
      pairSolutions: movieData.tree_pair_solutions || {},
      pivotEdgeTracking: movieData.pivot_edge_tracking || movieData.split_change_tracking || [],
      subtreeTracking: movieData.subtree_tracking || [],
      transitionResolver: resolver,
      currentTreeIndex: 0,
      playing: false,
    });

    // Initialize colors via visualisation slice (after data is set)
    initializeColors?.();
  },
});

// ==========================================================================
// Private Helper Functions
// ==========================================================================

function createTransitionResolver(movieData, treeMetadata) {
  return new TransitionIndexResolver(
    treeMetadata,
    movieData.distances?.robinson_foulds,
    movieData.tree_pair_solutions || {},
    movieData.pair_interpolation_ranges || []
  );
}

function extractDistanceArray(value) {
  return Array.isArray(value) ? [...value] : [];
}
