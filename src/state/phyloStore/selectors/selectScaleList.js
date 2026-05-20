import calculateScales from '../../../domain/tree/scaleUtils.js';
import { selectActiveTreeList } from './selectActiveTreeList.js';
import { selectInputFrameIndices } from './selectInputFrameIndices.js';

let cachedTreeList = null;
let cachedInputFrameIndices = null;
let cachedScaleList = [];

export const selectScaleList = (state) => {
  const treeList = selectActiveTreeList(state);
  const inputFrameIndices = selectInputFrameIndices(state);

  if (treeList === cachedTreeList && inputFrameIndices === cachedInputFrameIndices) {
    return cachedScaleList;
  }

  cachedTreeList = treeList;
  cachedInputFrameIndices = inputFrameIndices;
  cachedScaleList = treeList.length ? calculateScales(treeList, inputFrameIndices) : [];
  return cachedScaleList;
};
