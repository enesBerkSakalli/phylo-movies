/**
 * Clipboard slice: manages the tree clipboard state for displaying anchor trees.
 */
export const createClipboardSlice = (set, get) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  clipboardTreeIndex: null, // Index of tree shown in clipboard (null = hidden)
  clipboardOffsetX: 0,
  clipboardOffsetY: 0,

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  setClipboardTreeIndex: (index) => {
    const { treeList } = get();
    if (index === null) {
      set({ clipboardTreeIndex: null, clipboardOffsetX: 0, clipboardOffsetY: 0 });
      return;
    }
    // Clamp to valid range
    const maxIndex = Math.max(0, (treeList?.length || 1) - 1);
    const clampedIndex = Math.max(0, Math.min(index, maxIndex));
    set({ clipboardTreeIndex: clampedIndex });
  },

  setClipboardOffsetX: (offset) => set({ clipboardOffsetX: Number(offset) }),
  setClipboardOffsetY: (offset) => set({ clipboardOffsetY: Number(offset) }),

  clearClipboard: () => set({ clipboardTreeIndex: null, clipboardOffsetX: 0, clipboardOffsetY: 0 }),

  // ==========================================================================
  // RESET
  // ==========================================================================
  resetClipboard: () => set({ clipboardTreeIndex: null, clipboardOffsetX: 0, clipboardOffsetY: 0 }),
});
