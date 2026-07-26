import { selectInputFrameIndicesFromRows } from '../../../timeline/data/timelineFrameIndex.js';

let cachedFrames = null;
/** @type {number[]} */
let cachedIndices = Object.freeze([]);

/**
 * @param {import('../../../types/store').AppStoreState} state
 * @returns {number[]}
 */
export const selectInputFrameIndices = (state) => {
  const frames = state.timelineFrames;
  if (frames === cachedFrames) return cachedIndices;
  cachedFrames = frames;
  cachedIndices = selectInputFrameIndicesFromRows(frames);
  return cachedIndices;
};
