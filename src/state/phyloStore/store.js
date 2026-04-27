import { create } from 'zustand';
import { createTreeDatasetSlice } from './slices/dataset/treeDataset.slice.js';
import { createDatasetLifecycleSlice } from './slices/dataset/datasetLifecycle.slice.js';
import { createPlaybackSlice } from '../../core/slices/playbackSlice.js';
import { createTreeControllersRuntimeSlice } from './slices/runtime/treeControllersRuntime.slice.js';
import { createTimelineRuntimeSlice } from './slices/runtime/timelineRuntime.slice.js';
import { createTimelineSlice } from './slices/playback/treeTimeline.slice.js';
import { createTreeAppearanceSlice } from './slices/appearance/treeAppearance.slice.js';
import { createTreeLayoutSlice } from './slices/appearance/treeLayout.slice.js';
import { createTreeViewportSlice } from './slices/appearance/treeViewport.slice.js';
import { createTaxonomyColoringPanelSlice } from './slices/coloring/taxonomyColoringPanel.slice.js';
import { createTaxonomyColoringSlice } from './slices/coloring/taxonomyColoring.slice.js';
import { createTreeHighlightOpacitySlice } from './slices/appearance/treeHighlightOpacity.slice.js';
import { createMsaViewerSlice } from './slices/msa/msaSync.slice.js';
import { createComparisonViewSlice } from './slices/comparison/treeComparison.slice.js';
import { createSubtreeSelectionSlice } from './slices/treeChange/subtreeSelection.slice.js';
import { createTreeHighlightStateSlice } from './slices/treeChange/treeHighlightState.slice.js';
import { createTreeRuntimeSyncSlice } from './slices/treeChange/treeRuntimeSync.slice.js';
import { createClipboardSlice } from './slices/interaction/treeClipboard.slice.js';
import { createContextMenuSlice } from './slices/interaction/treeInteraction.slice.js';

/**
 * @typedef {import('../../../types/store.ts').AppStoreState} AppStoreState
 */

/**
 * @type {import('zustand').UseBoundStore<import('zustand').StoreApi<AppStoreState>>}
 */
export const useAppStore = create((set, get) => ({
  ...createTreeDatasetSlice(set, get),
  ...createDatasetLifecycleSlice(set, get),
  ...createPlaybackSlice(set, get),
  ...createTreeControllersRuntimeSlice(set, get),
  ...createTimelineRuntimeSlice(set, get),
  ...createTimelineSlice(set, get),
  ...createTreeAppearanceSlice(set, get),
  ...createTreeLayoutSlice(set, get),
  ...createTreeViewportSlice(set, get),
  ...createTaxonomyColoringPanelSlice(set, get),
  ...createTaxonomyColoringSlice(set, get),
  ...createTreeHighlightOpacitySlice(set, get),
  ...createMsaViewerSlice(set, get),
  ...createComparisonViewSlice(set, get),
  ...createSubtreeSelectionSlice(set, get),
  ...createTreeHighlightStateSlice(set, get),
  ...createTreeRuntimeSyncSlice(set, get),
  ...createClipboardSlice(set, get),
  ...createContextMenuSlice(set, get),
}));

// Set up ColorManager subscription after store creation
useAppStore.subscribe((state, prevState) => {
  if (state.currentTreeIndex !== prevState.currentTreeIndex) {
    if (state.movieTimelineManager?.scrubController?.isScrubbing) {
      return;
    }
    state.updateColorManagerForCurrentIndex?.();
  }
});

// Lightweight selector to access the current tree consistently
export const selectCurrentTree = (state = useAppStore.getState()) => {
  const { treeList, currentTreeIndex } = state || {};
  if (!Array.isArray(treeList) || typeof currentTreeIndex !== 'number') {
    return null;
  }
  return treeList[currentTreeIndex] ?? null;
};
