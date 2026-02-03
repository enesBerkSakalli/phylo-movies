import { create } from 'zustand';
import { createPhylogeneticDataSlice } from './slices/phylogeneticDataSlice.js';
import { createPlaybackSlice } from './slices/playbackSlice.js';
import { createControllersSlice } from './slices/controllersSlice.js';
import { createTimelineSlice } from './slices/timelineSlice.js';
import { createTreeAppearanceSlice } from './slices/treeAppearanceSlice.js';
import { createMsaViewerSlice } from './slices/msaViewerSlice.js';
import { createComparisonViewSlice } from './slices/comparisonViewSlice.js';
import { createVisualisationChangeStateSlice } from './slices/visualisationChangeStateSlice.js';
import { createVisualEffectsSlice } from './slices/visualEffectsSlice.js';
import { createClipboardSlice } from './slices/clipboardSlice.js';
import { createContextMenuSlice } from './slices/contextMenuSlice.js';

/**
 * @typedef {import('../../types/store.ts').AppStoreState} AppStoreState
 */

/**
 * @type {import('zustand').UseBoundStore<import('zustand').StoreApi<AppStoreState>>}
 */
export const useAppStore = create((set, get) => ({
  ...createPhylogeneticDataSlice(set, get),
  ...createPlaybackSlice(set, get),
  ...createControllersSlice(set, get),
  ...createTimelineSlice(set, get),
  ...createTreeAppearanceSlice(set, get),
  ...createMsaViewerSlice(set, get),
  ...createComparisonViewSlice(set, get),
  ...createVisualisationChangeStateSlice(set, get),
  ...createVisualEffectsSlice(set, get),
  ...createClipboardSlice(set, get),
  ...createContextMenuSlice(set, get),
}));

// Set up ColorManager subscription after store creation
useAppStore.subscribe((state, prevState) => {
  if (state.currentTreeIndex !== prevState.currentTreeIndex) {
    state.updateColorManagerForCurrentIndex();
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
