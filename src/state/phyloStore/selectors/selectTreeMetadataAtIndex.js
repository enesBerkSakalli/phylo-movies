import { selectTreeMetadata } from './selectTreeMetadata.js';

export const selectTreeMetadataAtIndex = (state = {}, index) => {
  const treeIndex = Number(index);
  if (!Number.isInteger(treeIndex) || treeIndex < 0) return null;
  return selectTreeMetadata(state)[treeIndex] ?? null;
};
