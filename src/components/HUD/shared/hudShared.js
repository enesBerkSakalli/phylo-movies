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

export function buildInterpolationText(sequenceIndex, totalSequenceLength, timelineProgress, animationProgress, playing) {
  if (playing && typeof animationProgress === 'number') {
    const clamped = clamp01(animationProgress);
    return {
      display: `${clamped.toFixed(4)}`,
      fullPrecision: clamped.toString()
    };
  }

  const explicitValue = typeof timelineProgress === 'number' ? timelineProgress : null;
  const derivedValue = totalSequenceLength > 1 ? (sequenceIndex / (totalSequenceLength - 1)) : 0;
  const interpolationValue = clamp01(explicitValue ?? derivedValue);
  return {
    display: `${interpolationValue.toFixed(4)}`,
    fullPrecision: interpolationValue.toString()
  };
}

export function buildSegmentText(sequenceIndex, transitionResolver) {
  const anchorIndices = transitionResolver?.fullTreeIndices || [];
  if (!anchorIndices.length) return 'Between source-target trees (interp)';

  const anchorAtPosition = anchorIndices.indexOf(sequenceIndex);
  if (anchorAtPosition === 0) return 'Start (Source-Target 1)';
  if (anchorAtPosition === anchorIndices.length - 1) return `End (Source-Target ${anchorAtPosition + 1})`;
  if (anchorAtPosition > 0) return `Source-Target ${anchorAtPosition + 1}`;

  let previousAnchorIdx = 0;
  for (let i = anchorIndices.length - 1; i >= 0; i--) {
    if (anchorIndices[i] <= sequenceIndex) {
      previousAnchorIdx = i;
      break;
    }
  }
  const nextAnchorIdx = previousAnchorIdx + 1;

  if (nextAnchorIdx < anchorIndices.length) {
    const from = anchorIndices[previousAnchorIdx];
    const to = anchorIndices[nextAnchorIdx];
    const span = Math.max(1, to - from);
    const pct = Math.round(((sequenceIndex - from) / span) * 100);
    return `Source-Target ${previousAnchorIdx + 1} → ${nextAnchorIdx + 1} (${pct}%)`;
  }

  return `End (Source-Target ${previousAnchorIdx + 1})`;
}

export function buildMsaWindow(hasMsa, indexState, msaStepSize, msaWindowSize, msaColumnCount) {
  if (!hasMsa) return null;
  const frame = getMSAFrameIndex(indexState);
  return calculateWindow(frame, msaStepSize, msaWindowSize, msaColumnCount || 0);
}
