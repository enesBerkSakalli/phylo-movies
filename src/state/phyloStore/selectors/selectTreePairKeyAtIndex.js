import { selectTreeMetadataAtIndex } from './selectTreeMetadataAtIndex.js';

export const selectTreePairKeyAtIndex = (state = {}, index) => {
  const pairKey = selectTreeMetadataAtIndex(state, index)?.tree_pair_key;
  return typeof pairKey === 'string' && pairKey.length > 0 ? pairKey : null;
};
