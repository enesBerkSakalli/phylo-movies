import TransitionIndexResolver from '../../../../domain/indexing/TransitionIndexResolver.js';
import { extractMsaColumnCount, extractMsaWindowParameters, hasMsaData } from '../../../../domain/msa/msaDataExtractor.js';
import { calculateTreeScales } from '../../../../domain/tree/scaleCalculator.js';
import { MovieTimelineManager } from '../../../../timeline/core/MovieTimelineManager.js';

export const createDatasetLifecycleSlice = (set, get) => ({
  // ==========================================================================
  // ACTIONS: Reset
  // ==========================================================================
  reset: () => {
    const { resetMsaData, resetColors, resetPlayback, resetControllers, resetComparison } = get();

    resetControllers?.();
    resetPlayback?.();
    resetMsaData?.();
    resetColors?.();
    resetComparison?.();

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
    const { resetInterpolationCaches } = get();
    resetInterpolationCaches?.();

    const interpolatedTrees = movieData.interpolated_trees;
    const treeMetadata = movieData.tree_metadata;

    const resolver = createTransitionResolver(movieData, treeMetadata);
    const fullTreeIndices = resolver.fullTreeIndices;
    const { scaleList, maxScale, scaleValues } = calculateTreeScales(interpolatedTrees, fullTreeIndices);
    const numberOfFullTrees = fullTreeIndices.length;

    const sortedLeaves = movieData.sorted_leaves;

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

    const fileName = movieData.file_name;
    const distanceRfd = [...movieData.distances.robinson_foulds];
    const distanceWeightedRfd = [...movieData.distances.weighted_robinson_foulds];

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
      pairSolutions: movieData.tree_pair_solutions,
      pivotEdgeTracking: movieData.pivot_edge_tracking,
      subtreeTracking: movieData.subtree_tracking,
      transitionResolver: resolver,
      currentTreeIndex: 0,
      playing: false,
    });

    initializeColors?.();
  },
});

function createTransitionResolver(movieData, treeMetadata) {
  return new TransitionIndexResolver(
    treeMetadata,
    movieData.distances.robinson_foulds,
    movieData.tree_pair_solutions,
    movieData.pair_interpolation_ranges
  );
}
