import { MovieTimelineManager } from '../../../../timeline/core/MovieTimelineManager.js';
import { createTreeSource } from '../../../../domain/backend/treeSource.js';
import { createTreeDatasetInitialState } from './treeDataset.slice.js';

const LARGE_DATASET_LABEL_TAXA_THRESHOLD = 300;

export const createDatasetLifecycleSlice = (set, get, store) => ({
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
      ...createTreeDatasetInitialState(),
      datasetVersion: (get().datasetVersion ?? 0) + 1,
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
      frames,
      pairs,
      temporal_events: temporalEvents,
      pair_metrics: pairMetrics,
      subtree_highlight_tracking: subtreeHighlightTracking,
    } = movieData;
    // A caller may hand in a source directly, which is how a PMB1 payload
    // arrives; otherwise the trees are a plain array on movieData.
    const treeSource = movieData.treeSource ?? createTreeSource(movieData);
    const treeList = createHydratedTreeCache(treeSource);
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

    const movieTimelineManager = new MovieTimelineManager(movieData, treeList, store);
    const timelineCursor = movieTimelineManager.getCursorForFrame(0);

    set({
      movieTimelineManager,
      timelineCursor,
      treeList,
      treeSource,
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
      labelsVisible: shouldShowLabelsByDefault(leafNamesByIndex),
      frameIndex: 0,
      playing: false,
    });

    initializeColors();
  },
});

/**
 * Sparse cache sized to the full tree list, with only the first tree hydrated up front.
 * The rest are hydrated on demand.
 */
function createHydratedTreeCache(treeSource) {
  const treeList = new Array(treeSource.treeCount);

  if (treeSource.treeCount > 0) {
    treeList[0] = treeSource.hydrateAt(0);
  }

  return treeList;
}

function shouldShowLabelsByDefault(leafNamesByIndex) {
  const leafCount = Array.isArray(leafNamesByIndex)
    ? leafNamesByIndex.reduce((count, name) => count + (typeof name === 'string' ? 1 : 0), 0)
    : 0;
  return leafCount <= LARGE_DATASET_LABEL_TAXA_THRESHOLD;
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
