import { calculateWindow } from '../../domain/msa/msaWindowCalculator.js';

export function buildMsaWindowStatus(timelineCursor, msaStepSize, msaWindowSize, msaColumnCount) {
  if (!Number.isInteger(timelineCursor?.sourceInputTreeIndex)) return null;
  if (!Number.isFinite(msaColumnCount) || msaColumnCount <= 0) return null;

  const windowRegion = calculateWindow(
    timelineCursor.sourceInputTreeIndex,
    msaStepSize,
    msaWindowSize,
    msaColumnCount
  );

  return {
    windowIndex: timelineCursor.sourceInputTreeIndex,
    startPosition: windowRegion.startPosition,
    midPosition: windowRegion.midPosition,
    endPosition: windowRegion.endPosition,
  };
}

export function buildMsaWindowOverlapStatus(
  timelineCursor,
  msaStepSize,
  msaWindowSize,
  msaColumnCount
) {
  if (!Number.isFinite(msaColumnCount) || msaColumnCount <= 0) return null;
  if (!Number.isInteger(timelineCursor?.sourceInputTreeIndex)) return null;
  if (!Number.isInteger(timelineCursor?.targetInputTreeIndex)) return null;
  if (timelineCursor.sourceInputTreeIndex === timelineCursor.targetInputTreeIndex) return null;

  const source = calculateWindow(
    timelineCursor.sourceInputTreeIndex,
    msaStepSize,
    msaWindowSize,
    msaColumnCount
  );
  const target = calculateWindow(
    timelineCursor.targetInputTreeIndex,
    msaStepSize,
    msaWindowSize,
    msaColumnCount
  );
  const overlapStart = Math.max(source.startPosition, target.startPosition);
  const overlapEnd = Math.min(source.endPosition, target.endPosition);
  const overlap =
    overlapStart <= overlapEnd
      ? {
          startPosition: overlapStart,
          endPosition: overlapEnd,
          columnCount: overlapEnd - overlapStart + 1,
        }
      : null;

  return {
    sourceWindowIndex: timelineCursor.sourceInputTreeIndex,
    targetWindowIndex: timelineCursor.targetInputTreeIndex,
    source,
    target,
    overlap,
    leavingRanges: subtractRange(source, overlap),
    enteringRanges: subtractRange(target, overlap),
    totalStartPosition: Math.min(source.startPosition, target.startPosition),
    totalEndPosition: Math.max(source.endPosition, target.endPosition),
  };
}

export function formatMsaWindowStatusTooltip(status) {
  if (!status) return null;

  return `MSA window ${status.windowIndex + 1}: columns ${status.startPosition}-${status.endPosition}; center ${status.midPosition}`;
}

export function formatMsaWindowStatusLabel(status) {
  if (!status) return null;

  return `${status.startPosition}-${status.endPosition}`;
}

export function formatMsaWindowOverlapLabel(status) {
  if (!status) return null;
  if (!status.overlap) return 'No overlap';

  return `Overlap ${status.overlap.startPosition}-${status.overlap.endPosition}`;
}

export function formatMsaWindowOverlapTooltip(status) {
  if (!status) return null;

  const source = `Source window ${status.sourceWindowIndex + 1}: columns ${status.source.startPosition}-${status.source.endPosition}`;
  const target = `target window ${status.targetWindowIndex + 1}: columns ${status.target.startPosition}-${status.target.endPosition}`;
  const overlap = status.overlap
    ? `shared overlap ${status.overlap.startPosition}-${status.overlap.endPosition} (${status.overlap.columnCount} columns)`
    : 'no shared overlap';

  return `${source}; ${target}; ${overlap}`;
}

function subtractRange(range, overlap) {
  if (!overlap) return [range];

  const ranges = [];
  if (range.startPosition < overlap.startPosition) {
    ranges.push({
      startPosition: range.startPosition,
      endPosition: overlap.startPosition - 1,
    });
  }
  if (range.endPosition > overlap.endPosition) {
    ranges.push({
      startPosition: overlap.endPosition + 1,
      endPosition: range.endPosition,
    });
  }
  return ranges;
}
