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
  const position = buildInterpolationText(
    sequenceIndex,
    treeListLength,
    inputFrameIndices,
    timelineCursor
  );
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

export function buildInterpolationText(
  sequenceIndex,
  totalSequenceLength,
  inputTreeIndices,
  timelineCursor
) {
  const coordinateValue = getCoordinateValue(sequenceIndex, totalSequenceLength, timelineCursor);
  return {
    ...buildReadablePosition(sequenceIndex, totalSequenceLength, inputTreeIndices, timelineCursor),
    fullPrecision: coordinateValue.toString(),
  };
}

function getCoordinateValue(sequenceIndex, totalSequenceLength, timelineCursor) {
  const explicitValue =
    typeof timelineCursor?.timelineProgress === 'number' ? timelineCursor.timelineProgress : null;
  if (explicitValue != null) return clamp01(explicitValue);

  const derivedValue = totalSequenceLength > 1 ? sequenceIndex / (totalSequenceLength - 1) : 0;
  return clamp01(derivedValue);
}

function buildReadablePosition(
  sequenceIndex,
  totalSequenceLength,
  inputTreeIndices,
  timelineCursor
) {
  const inputFrames = Array.isArray(inputTreeIndices) ? inputTreeIndices : [];
  const safeSequenceIndex = Number.isFinite(sequenceIndex) ? sequenceIndex : 0;

  if (!inputFrames.length) {
    return {
      kind: 'frame',
      display: `Frame ${safeSequenceIndex + 1} of ${Math.max(1, totalSequenceLength)}`,
    };
  }

  if (timelineCursor?.isObservedInput && Number.isInteger(timelineCursor.inputTreeIndex)) {
    return {
      kind: 'input',
      display: `Tree ${timelineCursor.inputTreeIndex + 1}/${inputFrames.length}`,
      inputTreeIndex: timelineCursor.inputTreeIndex,
      inputTreeCount: inputFrames.length,
    };
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
    return {
      kind: 'transition',
      display: `Tree ${previousInputTreeOrdinal + 1} -> ${nextInputTreeOrdinal + 1}, frame ${frameNumber}/${frameCount}`,
      sourceInputTreeIndex: previousInputTreeOrdinal,
      targetInputTreeIndex: nextInputTreeOrdinal,
      frameNumber,
      frameCount,
    };
  }

  return {
    kind: 'frame',
    display: `Frame ${safeSequenceIndex + 1} of ${Math.max(1, totalSequenceLength)}`,
  };
}

export function buildSegmentText(timelineCursor) {
  if (timelineCursor?.isObservedInput) return 'Input tree';
  if (
    Number.isInteger(timelineCursor?.sourceInputTreeIndex) &&
    Number.isInteger(timelineCursor?.targetInputTreeIndex)
  ) {
    return `Tree ${timelineCursor.sourceInputTreeIndex + 1} -> ${timelineCursor.targetInputTreeIndex + 1}`;
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
  return 'Generated frames between neighboring input trees.';
}

export function buildMsaWindow(hasMsa, msaWindowIndex, msaStepSize, msaWindowSize, msaColumnCount) {
  if (!hasMsa) return null;
  if (!Number.isInteger(msaWindowIndex)) return null;
  if (!Number.isFinite(msaColumnCount) || msaColumnCount <= 0) return null;
  return calculateWindow(msaWindowIndex, msaStepSize, msaWindowSize, msaColumnCount || 0);
}
