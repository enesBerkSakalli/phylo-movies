import { selectTimelineFrames } from './selectTimelineFrames.js';

export const selectTimelineFrameAtIndex = (state, index) => {
  const frameIndex = Number(index);
  if (!Number.isInteger(frameIndex) || frameIndex < 0) return null;
  return selectTimelineFrames(state)[frameIndex] ?? null;
};
