import calculateScales from '../../../domain/tree/scaleUtils.js';
import { selectActiveTreeList } from './selectActiveTreeList.js';
import { selectInputFrameIndices } from './selectInputFrameIndices.js';

let cachedTreeList = null;
let cachedInputFrameIndices = null;
let cachedScaleList = [];

/** @param {import('../../../types/store').AppStoreState} state */
export const selectScaleList = (state) => {
  const treeList = selectActiveTreeList(state);
  const treeSource = state.treeSource;
  const inputFrameIndices = selectInputFrameIndices(state);
  const useSource = treeSource != null && treeSource.treeCount === treeList.length;
  const cacheKey = useSource ? treeSource : treeList;

  if (cacheKey === cachedTreeList && inputFrameIndices === cachedInputFrameIndices) {
    return cachedScaleList;
  }

  // Only the input frames are scaled, so read just those from the source rather
  // than materialising every tree. calculateScales indexes by frame, and reads
  // a compact tuple node, an expanded node, or a PMB1 tree block.
  let scaleTreeList = treeList;
  if (useSource) {
    scaleTreeList = [];
    for (const frameIndex of inputFrameIndices) {
      scaleTreeList[frameIndex] = treeSource.payloadAt(frameIndex) ?? treeList[frameIndex];
    }
  }

  cachedTreeList = cacheKey;
  cachedInputFrameIndices = inputFrameIndices;
  cachedScaleList = scaleTreeList.length ? calculateScales(scaleTreeList, inputFrameIndices) : [];
  return cachedScaleList;
};
