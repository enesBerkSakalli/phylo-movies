import { MovieTimelineManager } from '../../../../timeline/core/MovieTimelineManager.js';

const EMPTY_PAIR_METRICS = Object.freeze({
  rows: Object.freeze([]),
  semantics: Object.freeze({}),
});

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
      timelineFrames: [],
      leafNamesByIndex: [],
      fileName: null,
      datasetVersion: (get().datasetVersion ?? 0) + 1,
      pairMetrics: EMPTY_PAIR_METRICS,
      pairs: [],
      pivotEdgeTracking: [],
      subtreeHighlightTracking: [],
      temporalEvents: [],
      movieTimelineManager: null,
      timelineCursor: null,
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
      frames,
      pairs,
      pivot_edge_tracking: pivotEdgeTracking,
      temporal_events: temporalEvents,
      pair_metrics: pairMetrics,
      subtree_highlight_tracking: subtreeHighlightTracking,
    } = movieData;
    const leafNamesByIndex = deriveLeafNamesByIndex(interpolatedTrees[0]);

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

    const movieTimelineManager = new MovieTimelineManager(movieData, interpolatedTrees);
    const timelineCursor = movieTimelineManager.getCursorForFrame(0);

    set({
      movieTimelineManager,
      timelineCursor,
      treeList: interpolatedTrees,
      timelineFrames: frames,
      leafNamesByIndex,
      fileName,
      datasetVersion,
      pairMetrics,
      pairs,
      pivotEdgeTracking,
      subtreeHighlightTracking,
      temporalEvents,
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
