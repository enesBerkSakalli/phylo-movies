import { selectInputFrameIndicesFromRows } from '../../../timeline/data/timelineFrameIndex.js';

let cachedFrames = null;
let cachedIndices = Object.freeze([]);

export const selectInputFrameIndices = (state) => {
  const frames = state.timelineFrames;
  if (frames === cachedFrames) return cachedIndices;
  cachedFrames = frames;
  cachedIndices = selectInputFrameIndicesFromRows(frames);
  return cachedIndices;
};
