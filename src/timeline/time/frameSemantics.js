import { isInputFrameRow } from '../data/timelineFrameIndex.js';

function getFrame(frames, frameIndex) {
  return frames[frameIndex] ?? null;
}

function isInputFrame(frames, frameIndex) {
  const frame = getFrame(frames, frameIndex);
  return frame ? isInputFrameRow(frame) : false;
}

export function getSourceFrameIndexForFrameIndex(frames, frameIndex) {
  if (isInputFrame(frames, frameIndex)) return frameIndex;

  const frame = getFrame(frames, frameIndex);
  const sourceFrameIndex = frame ? frame.source_frame_index : null;
  if (!Number.isInteger(sourceFrameIndex)) return null;
  return isInputFrame(frames, sourceFrameIndex) ? sourceFrameIndex : null;
}
