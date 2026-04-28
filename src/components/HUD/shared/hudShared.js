import { getMSAFrameIndex } from '@/domain/indexing/IndexMapping';
import { calculateWindow } from '@/domain/msa/msaWindowCalculator';

export const selectHasMsa = (s) => s.hasMsa;
export const selectCurrentTreeIndex = (s) => s.currentTreeIndex;
export const selectTimelineProgress = (s) => s.timelineProgress;
export const selectAnimationProgress = (s) => s.animationProgress;
export const selectPlaying = (s) => s.playing;
export const selectTransitionResolver = (s) => s.transitionResolver;
export const selectTreeListLength = (s) => s.treeList?.length || 0;
export const selectMsaWindowSize = (s) => s.msaWindowSize;
export const selectMsaStepSize = (s) => s.msaStepSize;
export const selectMsaColumnCount = (s) => s.msaColumnCount;
export const selectGoToPosition = (s) => s.goToPosition;
export const selectClipboardTreeIndex = (s) => s.clipboardTreeIndex;
export const selectSetClipboardTreeIndex = (s) => s.setClipboardTreeIndex;
export const selectClearClipboard = (s) => s.clearClipboard;

const clamp01 = (value) => Math.max(0, Math.min(1, value || 0));

export function buildInterpolationText(sequenceIndex, totalSequenceLength, transitionResolver, timelineProgress, animationProgress, playing) {
  const coordinateValue = getCoordinateValue(sequenceIndex, totalSequenceLength, timelineProgress, animationProgress, playing);
  return {
    display: buildReadablePositionText(sequenceIndex, totalSequenceLength, transitionResolver),
    fullPrecision: coordinateValue.toString()
  };
}

function getCoordinateValue(sequenceIndex, totalSequenceLength, timelineProgress, animationProgress, playing) {
  const explicitValue = typeof timelineProgress === 'number' ? timelineProgress : null;
  if (explicitValue != null) return clamp01(explicitValue);

  if (playing && typeof animationProgress === 'number') {
    return clamp01(animationProgress);
  }

  const derivedValue = totalSequenceLength > 1 ? (sequenceIndex / (totalSequenceLength - 1)) : 0;
  return clamp01(derivedValue);
}

function buildReadablePositionText(sequenceIndex, totalSequenceLength, transitionResolver) {
  const anchorIndices = transitionResolver?.fullTreeIndices || [];
  const safeSequenceIndex = Number.isFinite(sequenceIndex) ? sequenceIndex : 0;

  if (!anchorIndices.length) {
    return `Frame ${safeSequenceIndex + 1} of ${Math.max(1, totalSequenceLength)}`;
  }

  const anchorAtPosition = anchorIndices.indexOf(safeSequenceIndex);
  if (anchorAtPosition >= 0) {
    return `Window ${anchorAtPosition + 1}/${anchorIndices.length}`;
  }

  let previousAnchorIdx = -1;
  for (let i = anchorIndices.length - 1; i >= 0; i--) {
    if (anchorIndices[i] < safeSequenceIndex) {
      previousAnchorIdx = i;
      break;
    }
  }

  const nextAnchorIdx = previousAnchorIdx + 1;
  if (previousAnchorIdx >= 0 && nextAnchorIdx < anchorIndices.length) {
    const from = anchorIndices[previousAnchorIdx];
    const to = anchorIndices[nextAnchorIdx];
    const frameCount = Math.max(1, to - from - 1);
    const frameNumber = Math.max(1, Math.min(frameCount, safeSequenceIndex - from));
    return `${previousAnchorIdx + 1}->${nextAnchorIdx + 1} frame ${frameNumber}/${frameCount}`;
  }

  return `Frame ${safeSequenceIndex + 1} of ${Math.max(1, totalSequenceLength)}`;
}

export function buildSegmentText(sequenceIndex, transitionResolver) {
  const anchorIndices = transitionResolver?.fullTreeIndices || [];
  if (!anchorIndices.length) return 'Timeline frame';

  const anchorAtPosition = anchorIndices.indexOf(sequenceIndex);
  if (anchorAtPosition >= 0) return 'Tree window';

  let previousAnchorIdx = 0;
  for (let i = anchorIndices.length - 1; i >= 0; i--) {
    if (anchorIndices[i] <= sequenceIndex) {
      previousAnchorIdx = i;
      break;
    }
  }
  const nextAnchorIdx = previousAnchorIdx + 1;

  if (nextAnchorIdx < anchorIndices.length) {
    return `Transition ${previousAnchorIdx + 1} -> ${nextAnchorIdx + 1}`;
  }

  return 'Tree window';
}

export function buildMsaWindow(hasMsa, indexState, msaStepSize, msaWindowSize, msaColumnCount) {
  if (!hasMsa) return null;
  const frame = getMSAFrameIndex(indexState);
  return calculateWindow(frame, msaStepSize, msaWindowSize, msaColumnCount || 0);
}
