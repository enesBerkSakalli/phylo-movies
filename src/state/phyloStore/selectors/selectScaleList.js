import calculateScales from '../../../domain/tree/scaleUtils.js';
import { selectActiveTreeList } from './selectActiveTreeList.js';
import { selectInputFrameIndices } from './selectInputFrameIndices.js';

let cachedTreeList = null;
let cachedInputFrameIndices = null;
let cachedScaleList = [];

/** @param {import('../../../types/store').AppStoreState} state */
export const selectScaleList = (state) => {
  const treeList = selectActiveTreeList(state);
  const treePayloadList = state.treePayloadList;
  const inputFrameIndices = selectInputFrameIndices(state);
  const scaleTreeList =
    Array.isArray(treePayloadList) && treePayloadList.length === treeList.length
      ? treePayloadList
      : treeList;

  if (scaleTreeList === cachedTreeList && inputFrameIndices === cachedInputFrameIndices) {
    return cachedScaleList;
  }

  cachedTreeList = scaleTreeList;
  cachedInputFrameIndices = inputFrameIndices;
  cachedScaleList = scaleTreeList.length ? calculateScales(scaleTreeList, inputFrameIndices) : [];
  return cachedScaleList;
};
