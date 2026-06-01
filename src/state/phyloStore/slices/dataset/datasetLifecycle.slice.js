import { MovieTimelineManager } from '../../../../timeline/core/MovieTimelineManager.js';
import { hydrateMovieTreeAtIndex } from '../../../../domain/backend/treeHydration.js';

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
      treePayloadList: [],
      treeHydrationSource: null,
      treeHydrationVersion: 0,
      timelineFrames: [],
      leafNamesByIndex: [],
      fileName: null,
      datasetProvenance: null,
      datasetVersion: (get().datasetVersion ?? 0) + 1,
      pairMetrics: EMPTY_PAIR_METRICS,
      pairs: [],
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
      temporal_events: temporalEvents,
      pair_metrics: pairMetrics,
      subtree_highlight_tracking: subtreeHighlightTracking,
    } = movieData;
    const treeList = createHydratedTreeCache(movieData, frames);
    const leafNamesByIndex = deriveLeafNamesByIndex(treeList[0]);

    const { sequences: msaSequences, window_size: windowSize, step_size: stepSize } = movieData.msa;

    const { setMsaData, initializeColors } = get();
    setMsaData({
      windowSize,
      stepSize,
      sequences: msaSequences,
    });

    const fileName = movieData.file_name;
    const datasetProvenance = movieData.dataset_provenance ?? null;
    const datasetVersion = (get().datasetVersion ?? 0) + 1;

    const existingManager = get().movieTimelineManager;
    existingManager?.destroy();

    const movieTimelineManager = new MovieTimelineManager(movieData, treeList);
    const timelineCursor = movieTimelineManager.getCursorForFrame(0);

    set({
      movieTimelineManager,
      timelineCursor,
      treeList,
      treePayloadList: interpolatedTrees,
      treeHydrationSource: movieData,
      treeHydrationVersion: 0,
      timelineFrames: frames,
      leafNamesByIndex,
      fileName,
      datasetProvenance,
      datasetVersion,
      pairMetrics,
      pairs,
      subtreeHighlightTracking,
      temporalEvents,
      selectedTimelineSegmentIndex: null,
      playhead: {
        animationProgress: 0,
        timelineProgress: null,
      },
      frameIndex: 0,
      playing: false,
    });

    initializeColors();
  },
});

function createHydratedTreeCache(movieData, frames) {
  const treePayloadList = movieData.interpolated_trees;
  const treeList = new Array(treePayloadList.length);
  const indicesToHydrate = new Set([0]);

  frames.forEach((frame) => {
    if (frame?.frame_type === 'input_tree' || frame?.is_observed_input === true) {
      indicesToHydrate.add(frame.frame_index);
    }
  });

  indicesToHydrate.forEach((treeIndex) => {
    if (treeIndex >= 0 && treeIndex < treePayloadList.length) {
      treeList[treeIndex] = hydrateMovieTreeAtIndex(movieData, treeIndex);
    }
  });

  return treeList;
}

function deriveLeafNamesByIndex(tree) {
  const namesByIndex = [];

  function visit(node) {
    if (!node || typeof node !== 'object') return;
    const children = Array.isArray(node.children) ? node.children : [];
    if (children.length === 0) {
      const splitIndices = Array.isArray(node.split_indices) ? node.split_indices : [];
      if (
        splitIndices.length === 1 &&
        Number.isInteger(splitIndices[0]) &&
        typeof node.name === 'string'
      ) {
        namesByIndex[splitIndices[0]] = node.name;
      }
      return;
    }
    children.forEach(visit);
  }

  visit(tree);
  return namesByIndex;
}
