import { selectActiveTreeList } from './selectActiveTreeList.js';
import { selectFullTreeIndices } from './selectFullTreeIndices.js';
import { selectTreeMetadataAtIndex } from './selectTreeMetadataAtIndex.js';

export const selectTreeContext = (state, index) => {
  const treeIndex = Number(index);
  if (!Number.isInteger(treeIndex) || treeIndex < 0) return null;

  const tree = selectActiveTreeList(state)[treeIndex] ?? null;
  if (!tree) return null;

  const metadata = selectTreeMetadataAtIndex(state, treeIndex);
  const pairKey = metadata?.tree_pair_key ?? null;

  return {
    treeIndex,
    tree,
    metadata,
    pairKey,
    isOriginal: pairKey === null,
    isFullTree: selectFullTreeIndices(state).includes(treeIndex),
  };
};
