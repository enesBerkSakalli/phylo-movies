import { selectActiveTreeList } from './selectActiveTreeList.js';
import { selectTimelineFrameAtIndex } from './selectTimelineFrameAtIndex.js';

// Cache keyed on the two mutable references this selector actually reads, so
// repeated calls with an unchanged tree/frame return the same object
// reference instead of a fresh one — matching selectPairById's pattern and
// keeping this usable directly with useAppStore() without breaking
// zustand's Object.is re-render check.
let cachedTree = null;
let cachedFrame = null;
let cachedTreeIndex = null;
let cachedContext = null;

export const selectTreeContext = (state, index) => {
  const treeIndex = Number(index);
  if (!Number.isInteger(treeIndex) || treeIndex < 0) return null;

  const tree = selectActiveTreeList(state)[treeIndex] ?? null;
  if (!tree) return null;

  const frame = selectTimelineFrameAtIndex(state, treeIndex);

  if (tree === cachedTree && frame === cachedFrame && treeIndex === cachedTreeIndex) {
    return cachedContext;
  }

  const pairId = frame?.pair_id ?? null;
  const isInputTree = frame?.frame_type === 'input_tree' || frame?.is_observed_input === true;

  cachedTree = tree;
  cachedFrame = frame;
  cachedTreeIndex = treeIndex;
  cachedContext = {
    treeIndex,
    tree,
    frame,
    pairId,
    isOriginal: pairId === null,
    isInputTree,
  };
  return cachedContext;
};
