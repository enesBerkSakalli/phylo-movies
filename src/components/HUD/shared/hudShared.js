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
  const inputTreeIndices = transitionResolver?.fullTreeIndices || [];
  const safeSequenceIndex = Number.isFinite(sequenceIndex) ? sequenceIndex : 0;

  if (!inputTreeIndices.length) {
    return `Frame ${safeSequenceIndex + 1} of ${Math.max(1, totalSequenceLength)}`;
  }

  const inputTreeAtPosition = inputTreeIndices.indexOf(safeSequenceIndex);
  if (inputTreeAtPosition >= 0) {
    return `Input tree ${inputTreeAtPosition + 1}/${inputTreeIndices.length}`;
  }

  let previousInputTreeOrdinal = -1;
  for (let i = inputTreeIndices.length - 1; i >= 0; i--) {
    if (inputTreeIndices[i] < safeSequenceIndex) {
      previousInputTreeOrdinal = i;
      break;
    }
  }

  const nextInputTreeOrdinal = previousInputTreeOrdinal + 1;
  if (previousInputTreeOrdinal >= 0 && nextInputTreeOrdinal < inputTreeIndices.length) {
    const from = inputTreeIndices[previousInputTreeOrdinal];
    const to = inputTreeIndices[nextInputTreeOrdinal];
    const frameCount = Math.max(1, to - from - 1);
    const frameNumber = Math.max(1, Math.min(frameCount, safeSequenceIndex - from));
    return `source input tree ${previousInputTreeOrdinal + 1} -> target input tree ${nextInputTreeOrdinal + 1}, frame ${frameNumber}/${frameCount}`;
  }

  return `Frame ${safeSequenceIndex + 1} of ${Math.max(1, totalSequenceLength)}`;
}

export function buildSegmentText(sequenceIndex, transitionResolver) {
  const inputTreeIndices = transitionResolver?.fullTreeIndices || [];
  if (!inputTreeIndices.length) return 'Generated frame';

  const inputTreeAtPosition = inputTreeIndices.indexOf(sequenceIndex);
  if (inputTreeAtPosition >= 0) return 'Input tree';

  let previousInputTreeOrdinal = 0;
  for (let i = inputTreeIndices.length - 1; i >= 0; i--) {
    if (inputTreeIndices[i] <= sequenceIndex) {
      previousInputTreeOrdinal = i;
      break;
    }
  }
  const nextInputTreeOrdinal = previousInputTreeOrdinal + 1;

  if (nextInputTreeOrdinal < inputTreeIndices.length) {
    return `source input tree ${previousInputTreeOrdinal + 1} -> target input tree ${nextInputTreeOrdinal + 1}`;
  }

  return 'Input tree';
}

export function buildMsaWindow(hasMsa, currentTreeIndex, transitionResolver, msaStepSize, msaWindowSize, msaColumnCount) {
  if (!hasMsa) return null;
  const frame = getMSAFrameIndexForTimelineIndex(currentTreeIndex, transitionResolver);
  return calculateWindow(frame, msaStepSize, msaWindowSize, msaColumnCount || 0);
}
