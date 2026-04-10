import { create } from 'zustand';
import { createTreeDatasetSlice } from '@/store/slices/dataset/treeDataset.slice.js';
import { createDatasetLifecycleSlice } from '@/store/slices/dataset/datasetLifecycle.slice.js';
import { createPlaybackSlice } from '@/store/slices/playbackSlice.js';
import { createTreeControllersRuntimeSlice } from '@/store/slices/runtime/treeControllersRuntime.slice.js';
import { createTimelineRuntimeSlice } from '@/store/slices/runtime/timelineRuntime.slice.js';
import { createTimelineSlice } from '@/store/slices/playback/treeTimeline.slice.js';
import { createTreeAppearanceSlice } from '@/store/slices/appearance/treeAppearance.slice.js';
import { createTreeLayoutSlice } from '@/store/slices/appearance/treeLayout.slice.js';
import { createTreeViewportSlice } from '@/store/slices/appearance/treeViewport.slice.js';
import { createTaxonomyColoringPanelSlice } from '@/store/slices/coloring/taxonomyColoringPanel.slice.js';
import { createTaxonomyColoringSlice } from '@/store/slices/coloring/taxonomyColoring.slice.js';
import { createTreeHighlightOpacitySlice } from '@/store/slices/appearance/treeHighlightOpacity.slice.js';
import { createMsaViewerSlice } from '@/store/slices/msa/msaSync.slice.js';
import { createComparisonViewSlice } from '@/store/slices/comparison/treeComparison.slice.js';
import { createCladeSelectionSlice } from '@/store/slices/treeChange/cladeSelection.slice.js';
import { createTreeHighlightStateSlice } from '@/store/slices/treeChange/treeHighlightState.slice.js';
import { createTreeRuntimeSyncSlice } from '@/store/slices/treeChange/treeRuntimeSync.slice.js';
import { createClipboardSlice } from '@/store/slices/interaction/treeClipboard.slice.js';
import { createContextMenuSlice } from '@/store/slices/interaction/treeInteraction.slice.js';

/**
 * @typedef {import('../../types/store.ts').AppStoreState} AppStoreState
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
  ...createCladeSelectionSlice(set, get),
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
