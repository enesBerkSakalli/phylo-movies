import { selectActiveTreeList } from './selectActiveTreeList.js';
import { selectTimelineFrameAtIndex } from './selectTimelineFrameAtIndex.js';

export const selectTreeContext = (state, index) => {
  const treeIndex = Number(index);
  if (!Number.isInteger(treeIndex) || treeIndex < 0) return null;

  const tree = selectActiveTreeList(state)[treeIndex] ?? null;
  if (!tree) return null;

  const frame = selectTimelineFrameAtIndex(state, treeIndex);
  const pairId = frame?.pair_id ?? null;
  const isInputTree = frame?.frame_type === 'input_tree' || frame?.is_observed_input === true;

  return {
    treeIndex,
    tree,
    frame,
    pairId,
    isOriginal: pairId === null,
    isInputTree,
  };
};
