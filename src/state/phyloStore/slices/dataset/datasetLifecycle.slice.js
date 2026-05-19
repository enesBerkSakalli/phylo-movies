import TransitionIndexResolver from '../../../../domain/indexing/TransitionIndexResolver.js';
import { MovieTimelineManager } from '../../../../timeline/core/MovieTimelineManager.js';

export const createDatasetLifecycleSlice = (set, get) => ({
  // ==========================================================================
  // ACTIONS: Reset
  // ==========================================================================
  reset: () => {
    const { resetMsaData, resetColors, resetPlayback, resetControllers, resetComparison } = get();
    const existingManager = get().movieTimelineManager;
    existingManager?.destroy();

    resetControllers();
    resetPlayback();
    resetMsaData();
    resetColors();
    resetComparison();

    set({
      treeList: [],
      treeMetadata: [],
      leafNamesByIndex: [],
      fileName: null,
      datasetVersion: (get().datasetVersion ?? 0) + 1,
      treeDistances: null,
      pairSolutions: {},
      pivotEdgeTracking: [],
      subtreeHighlightTracking: [],
      splitChangeTimeline: [],
      transitionResolver: null,
      movieTimelineManager: null,
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
      split_change_timeline: splitChangeTimeline,
      distances,
      subtree_highlight_tracking: subtreeHighlightTracking,
    } = movieData;
    const leafNamesByIndex = deriveLeafNamesByIndex(interpolatedTrees[0]);

    const resolver = createTransitionResolver(movieData, treeMetadata);

    const {
      sequences: msaSequences,
      window_size: windowSize,
      step_size: stepSize,
    } = movieData.msa;

    const { setMsaData, initializeColors } = get();
    setMsaData({
      windowSize,
      stepSize,
      sequences: msaSequences,
    });

    const fileName = movieData.file_name;
    const datasetVersion = (get().datasetVersion ?? 0) + 1;

    const existingManager = get().movieTimelineManager;
    existingManager?.destroy();

    const movieTimelineManager = new MovieTimelineManager(movieData, resolver, interpolatedTrees);

    set({
      movieTimelineManager,
      treeList: interpolatedTrees,
      treeMetadata,
      leafNamesByIndex,
      fileName,
      datasetVersion,
      treeDistances: distances,
      pairSolutions: treePairSolutions,
      pivotEdgeTracking,
      subtreeHighlightTracking,
      splitChangeTimeline,
      transitionResolver: resolver,
      selectedTimelineSegmentIndex: null,
      playhead: {
        animationProgress: 0,
        timelineProgress: null
      },
      frameIndex: 0,
      playing: false,
    });

    initializeColors();
  },
});

function createTransitionResolver(movieData, treeMetadata) {
  return new TransitionIndexResolver(
    treeMetadata,
    movieData.pair_interpolation_ranges
  );
}

function deriveLeafNamesByIndex(tree) {
  const namesByIndex = [];

  function visit(node) {
    if (!node || typeof node !== 'object') return;
    const children = Array.isArray(node.children) ? node.children : [];
    if (children.length === 0) {
      const splitIndices = Array.isArray(node.split_indices) ? node.split_indices : [];
      if (splitIndices.length === 1 && Number.isInteger(splitIndices[0]) && typeof node.name === 'string') {
        namesByIndex[splitIndices[0]] = node.name;
      }
      return;
    }
    children.forEach(visit);
  }

  visit(tree);
  return namesByIndex;
}
