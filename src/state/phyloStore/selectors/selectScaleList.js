import calculateScales from '../../../domain/tree/scaleUtils.js';
import { selectActiveTreeList } from './selectActiveTreeList.js';
import { selectFullTreeIndices } from './selectFullTreeIndices.js';

let cachedTreeList = null;
let cachedFullTreeIndices = null;
let cachedScaleList = [];

export const selectScaleList = (state) => {
  const treeList = selectActiveTreeList(state);
  const fullTreeIndices = selectFullTreeIndices(state);

  if (treeList === cachedTreeList && fullTreeIndices === cachedFullTreeIndices) {
    return cachedScaleList;
  }

  cachedTreeList = treeList;
  cachedFullTreeIndices = fullTreeIndices;
  cachedScaleList = treeList.length ? calculateScales(treeList, fullTreeIndices) : [];
  return cachedScaleList;
};
