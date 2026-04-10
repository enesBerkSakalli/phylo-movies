import { create } from 'zustand';
import { createTreeDatasetSlice } from '@/state/phyloStore/slices/dataset/treeDataset.slice.js';
import { createDatasetLifecycleSlice } from '@/state/phyloStore/slices/dataset/datasetLifecycle.slice.js';
import { createPlaybackSlice } from '@/store/slices/playbackSlice.js';
import { createTreeControllersRuntimeSlice } from '@/state/phyloStore/slices/runtime/treeControllersRuntime.slice.js';
import { createTimelineRuntimeSlice } from '@/state/phyloStore/slices/runtime/timelineRuntime.slice.js';
import { createTimelineSlice } from '@/state/phyloStore/slices/playback/treeTimeline.slice.js';
import { createTreeAppearanceSlice } from '@/state/phyloStore/slices/appearance/treeAppearance.slice.js';
import { createTreeLayoutSlice } from '@/state/phyloStore/slices/appearance/treeLayout.slice.js';
import { createTreeViewportSlice } from '@/state/phyloStore/slices/appearance/treeViewport.slice.js';
import { createTaxonomyColoringPanelSlice } from '@/state/phyloStore/slices/coloring/taxonomyColoringPanel.slice.js';
import { createTaxonomyColoringSlice } from '@/state/phyloStore/slices/coloring/taxonomyColoring.slice.js';
import { createTreeHighlightOpacitySlice } from '@/state/phyloStore/slices/appearance/treeHighlightOpacity.slice.js';
import { createMsaViewerSlice } from '@/state/phyloStore/slices/msa/msaSync.slice.js';
import { createComparisonViewSlice } from '@/state/phyloStore/slices/comparison/treeComparison.slice.js';
import { createCladeSelectionSlice } from '@/state/phyloStore/slices/treeChange/cladeSelection.slice.js';
import { createTreeHighlightStateSlice } from '@/state/phyloStore/slices/treeChange/treeHighlightState.slice.js';
import { createTreeRuntimeSyncSlice } from '@/state/phyloStore/slices/treeChange/treeRuntimeSync.slice.js';
import { createClipboardSlice } from '@/state/phyloStore/slices/interaction/treeClipboard.slice.js';
import { createContextMenuSlice } from '@/state/phyloStore/slices/interaction/treeInteraction.slice.js';

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
