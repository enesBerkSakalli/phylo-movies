import { calculateWindow } from '../../domain/msa/msaWindowCalculator.js';

const clamp01 = (value) => Math.max(0, Math.min(1, value || 0));

export function buildTimelineStatusSnapshot({
  frameIndex,
  treeListLength,
  inputFrameIndices,
  timelineCursor,
  hasMsa = false,
  msaStepSize = null,
  msaWindowSize = null,
  msaColumnCount = null,
}) {
  const sequenceIndex = timelineCursor?.frameIndex ?? frameIndex;
  const position = buildInterpolationText(sequenceIndex, treeListLength, inputFrameIndices, timelineCursor);
  const segmentText = buildSegmentText(timelineCursor);

  return {
    position,
    segment: {
      text: segmentText,
      tooltip: buildSegmentTooltipText(segmentText),
    },
    msaWindow: buildMsaWindow(
      hasMsa,
      timelineCursor?.msaWindowIndex,
      msaStepSize,
      msaWindowSize,
      msaColumnCount
    ),
    msaWindowSize,
    msaStepSize,
  };
}

export function buildInterpolationText(sequenceIndex, totalSequenceLength, inputTreeIndices, timelineCursor) {
  const coordinateValue = getCoordinateValue(sequenceIndex, totalSequenceLength, timelineCursor);
  return {
    display: buildReadablePositionText(sequenceIndex, totalSequenceLength, inputTreeIndices, timelineCursor),
    fullPrecision: coordinateValue.toString()
  };
}

function getCoordinateValue(sequenceIndex, totalSequenceLength, timelineCursor) {
  const explicitValue = typeof timelineCursor?.timelineProgress === 'number' ? timelineCursor.timelineProgress : null;
  if (explicitValue != null) return clamp01(explicitValue);

  const derivedValue = totalSequenceLength > 1 ? (sequenceIndex / (totalSequenceLength - 1)) : 0;
  return clamp01(derivedValue);
}

function buildReadablePositionText(sequenceIndex, totalSequenceLength, inputTreeIndices, timelineCursor) {
  const inputFrames = Array.isArray(inputTreeIndices) ? inputTreeIndices : [];
  const safeSequenceIndex = Number.isFinite(sequenceIndex) ? sequenceIndex : 0;

  if (!inputFrames.length) {
    return `Frame ${safeSequenceIndex + 1} of ${Math.max(1, totalSequenceLength)}`;
  }

  if (timelineCursor?.isObservedInput && Number.isInteger(timelineCursor.inputTreeIndex)) {
    return `Input tree ${timelineCursor.inputTreeIndex + 1}/${inputFrames.length}`;
  }

  const previousInputTreeOrdinal = Number.isInteger(timelineCursor?.sourceInputTreeIndex)
    ? timelineCursor.sourceInputTreeIndex
    : -1;

  const nextInputTreeOrdinal = Number.isInteger(timelineCursor?.targetInputTreeIndex)
    ? timelineCursor.targetInputTreeIndex
    : previousInputTreeOrdinal + 1;
  if (previousInputTreeOrdinal >= 0 && nextInputTreeOrdinal < inputFrames.length) {
    const from = inputFrames[previousInputTreeOrdinal];
    const to = inputFrames[nextInputTreeOrdinal];
    const frameCount = Math.max(1, to - from - 1);
    const frameNumber = Math.max(1, Math.min(frameCount, safeSequenceIndex - from));
    return `source input tree ${previousInputTreeOrdinal + 1} -> target input tree ${nextInputTreeOrdinal + 1}, frame ${frameNumber}/${frameCount}`;
  }

  return `Frame ${safeSequenceIndex + 1} of ${Math.max(1, totalSequenceLength)}`;
}

export function buildSegmentText(timelineCursor) {
  if (timelineCursor?.isObservedInput) return 'Input tree';
  if (
    Number.isInteger(timelineCursor?.sourceInputTreeIndex) &&
    Number.isInteger(timelineCursor?.targetInputTreeIndex)
  ) {
    return `source input tree ${timelineCursor.sourceInputTreeIndex + 1} -> target input tree ${timelineCursor.targetInputTreeIndex + 1}`;
  }
  return 'Generated frame';
}

export function buildSegmentTooltipText(segmentText) {
  if (segmentText === 'Input tree') {
    return 'An observed tree from one alignment window or uploaded tree set.';
  }
  if (segmentText === 'Generated frame') {
    return 'A generated tree frame in the sequence.';
  }
  return 'Generated frames between a source input tree and target input tree.';
}

export function buildMsaWindow(hasMsa, msaWindowIndex, msaStepSize, msaWindowSize, msaColumnCount) {
  if (!hasMsa) return null;
  if (!Number.isInteger(msaWindowIndex)) return null;
  if (!Number.isFinite(msaColumnCount) || msaColumnCount <= 0) return null;
  return calculateWindow(msaWindowIndex, msaStepSize, msaWindowSize, msaColumnCount || 0);
}
