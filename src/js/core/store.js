import { create } from 'zustand';
import { createDataSlice } from './slices/dataSlice.js';
import { createPlaybackSlice } from './slices/playbackSlice.js';
import { createUiSlice } from './slices/uiSlice.js';
import { createHighlightSlice } from './slices/highlightSlice.js';
export const useAppStore = create((set, get) => ({
  ...createDataSlice(set, get),
  ...createPlaybackSlice(set, get),
  ...createUiSlice(set, get),
  ...createHighlightSlice(set, get),
  // ===================================
  // STATE
  // ===================================
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
