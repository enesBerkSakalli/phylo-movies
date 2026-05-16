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

    resetControllers();
    resetPlayback();
    resetMsaData();
    resetColors();
    resetComparison();

    set({
      treeList: [],
      treeMetadata: [],
      leafNamesByIndex: [],
      fullTreeIndices: [],
      pairInterpolationRanges: [],
      treeIndexByPair: {},
      fileName: null,
      datasetVersion: (get().datasetVersion ?? 0) + 1,
      distanceRfd: [],
      distanceWeightedRfd: [],
      scaleList: [],
      maxScale: 0,
      pairSolutions: {},
      pivotEdgeTracking: [],
      subtreeTracking: [],
      splitChangeTimeline: [],
      transitionResolver: null,
      selectedTimelineSegmentIndex: null,
    });
  },

  // ==========================================================================
  // ACTIONS: Initialize
  // ==========================================================================
  initialize: (movieData) => {
    const { resetInterpolationCaches } = get();
    resetInterpolationCaches();

    const {
      interpolated_trees: interpolatedTrees,
      tree_metadata: treeMetadata,
      tree_pair_solutions: treePairSolutions,
      pivot_edge_tracking: pivotEdgeTracking,
      pair_interpolation_ranges: pairInterpolationRanges,
      split_change_timeline: splitChangeTimeline,
      sorted_leaves: leafNamesByIndex,
      distances,
      subtree_tracking,
    } = movieData;

    const resolver = createTransitionResolver(movieData, treeMetadata);
    const fullTreeIndices = resolver.fullTreeIndices;
    const treeIndexByPair = buildTreeIndexByPair(treeMetadata);
    const { scaleList, maxScale } = calculateTreeScales(interpolatedTrees, fullTreeIndices);

    const msaColumnCount = extractMsaColumnCount(movieData);
    const { windowSize, stepSize } = extractMsaWindowParameters(movieData);
    const hasMsaContent = hasMsaData(movieData);

    const { setMsaData, initializeColors } = get();
    setMsaData({
      hasMsa: hasMsaContent,
      windowSize,
      stepSize,
      columnCount: msaColumnCount,
      sequences: movieData.msa?.sequences ?? null,
    });

    const fileName = movieData.file_name;
    const datasetVersion = (get().datasetVersion ?? 0) + 1;
    const distanceRfd = [...distances.robinson_foulds];
    const distanceWeightedRfd = [...distances.weighted_robinson_foulds];

    const existingManager = get().movieTimelineManager;
    existingManager?.destroy();

    const movieTimelineManager = new MovieTimelineManager(movieData, resolver, interpolatedTrees);

    set({
      movieTimelineManager,
      treeList: interpolatedTrees,
      treeMetadata,
      leafNamesByIndex,
      fullTreeIndices,
      pairInterpolationRanges,
      treeIndexByPair,
      fileName,
      datasetVersion,
      distanceRfd,
      distanceWeightedRfd,
      scaleList,
      maxScale,
      pairSolutions: treePairSolutions,
      pivotEdgeTracking,
      subtreeTracking: subtree_tracking,
      splitChangeTimeline,
      transitionResolver: resolver,
      selectedTimelineSegmentIndex: null,
      playhead: {
        animationProgress: 0,
        timelineProgress: null,
        currentTreeIndex: 0
      },
      currentTreeIndex: 0,
      playing: false,
    });

    initializeColors();
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

function buildTreeIndexByPair(treeMetadata = []) {
  return treeMetadata.reduce((indexByPair, metadata, treeIndex) => {
    const pairKey = metadata?.tree_pair_key;
    if (typeof pairKey === 'string' && pairKey.length > 0) {
      if (!indexByPair[pairKey]) {
        indexByPair[pairKey] = [];
      }
      indexByPair[pairKey].push(treeIndex);
    }
    return indexByPair;
  }, {});
}
