import { getMSAFrameIndexForTimelineIndex } from '../../../domain/indexing/IndexMapping';
import { calculateWindow } from '../../../domain/msa/msaWindowCalculator';
import {
  selectActiveTreeListLength,
  selectClearClipboard,
  selectClipboardTreeIndex,
  selectCurrentTreeIndex,
  selectGoToPosition,
  selectHasMsa,
  selectMsaColumnCount,
  selectMsaStepSize,
  selectMsaWindowSize,
  selectPlayhead,
  selectSetClipboardTreeIndex,
  selectTransitionResolver
} from '../../../state/phyloStore/store.js';

export {
  selectActiveTreeListLength,
  selectClearClipboard,
  selectClipboardTreeIndex,
  selectCurrentTreeIndex,
  selectGoToPosition,
  selectHasMsa,
  selectMsaColumnCount,
  selectMsaStepSize,
  selectMsaWindowSize,
  selectPlayhead,
  selectSetClipboardTreeIndex,
  selectTransitionResolver
};

const clamp01 = (value) => Math.max(0, Math.min(1, value || 0));

export function buildInterpolationText(sequenceIndex, totalSequenceLength, transitionResolver, playhead) {
  const coordinateValue = getCoordinateValue(sequenceIndex, totalSequenceLength, playhead);
  return {
    display: buildReadablePositionText(sequenceIndex, totalSequenceLength, transitionResolver),
    fullPrecision: coordinateValue.toString()
  };
}

function getCoordinateValue(sequenceIndex, totalSequenceLength, playhead) {
  const explicitValue = typeof playhead?.timelineProgress === 'number' ? playhead.timelineProgress : null;
  if (explicitValue != null) return clamp01(explicitValue);

  if (typeof playhead?.animationProgress === 'number') {
    return clamp01(playhead.animationProgress);
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
    return `Source ${anchorAtPosition + 1}/${anchorIndices.length}`;
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
  if (!anchorIndices.length) return 'Generated frame';

  const anchorAtPosition = anchorIndices.indexOf(sequenceIndex);
  if (anchorAtPosition >= 0) return 'Source tree';

  let previousAnchorIdx = 0;
  for (let i = anchorIndices.length - 1; i >= 0; i--) {
    if (anchorIndices[i] <= sequenceIndex) {
      previousAnchorIdx = i;
      break;
    }
  }
  const nextAnchorIdx = previousAnchorIdx + 1;

  if (nextAnchorIdx < anchorIndices.length) {
    return `Between ${previousAnchorIdx + 1} -> ${nextAnchorIdx + 1}`;
  }

  return 'Source tree';
}

export function buildMsaWindow(hasMsa, currentTreeIndex, transitionResolver, msaStepSize, msaWindowSize, msaColumnCount) {
  if (!hasMsa) return null;
  const frame = getMSAFrameIndexForTimelineIndex(currentTreeIndex, transitionResolver);
  return calculateWindow(frame, msaStepSize, msaWindowSize, msaColumnCount || 0);
}
