import { calculateWindow } from '../../domain/msa/msaWindowCalculator.js';

export function buildMsaTreeStatus(timelineCursor) {
  if (!timelineCursor) return null;

  if (timelineCursor.isObservedInput && Number.isInteger(timelineCursor.inputTreeIndex)) {
    return {
      kind: 'input',
      activeInputTreeIndex: timelineCursor.inputTreeIndex,
      sourceInputTreeIndex: timelineCursor.inputTreeIndex,
      targetInputTreeIndex: null,
    };
  }

  const sourceInputTreeIndex = Number.isInteger(timelineCursor.sourceInputTreeIndex)
    ? timelineCursor.sourceInputTreeIndex
    : null;
  const targetInputTreeIndex = Number.isInteger(timelineCursor.targetInputTreeIndex)
    ? timelineCursor.targetInputTreeIndex
    : null;

  if (sourceInputTreeIndex === null) return null;

  if (targetInputTreeIndex !== null && targetInputTreeIndex !== sourceInputTreeIndex) {
    return {
      kind: 'transition',
      activeInputTreeIndex: sourceInputTreeIndex,
      sourceInputTreeIndex,
      targetInputTreeIndex,
    };
  }

  return {
    kind: 'input',
    activeInputTreeIndex: sourceInputTreeIndex,
    sourceInputTreeIndex,
    targetInputTreeIndex: null,
  };
}

export function formatMsaTreeStatusTooltip(status) {
  if (!status) return null;

  const activeWindow = status.activeInputTreeIndex + 1;
  if (status.kind === 'transition') {
    return `Transition from input tree ${status.sourceInputTreeIndex + 1} to ${status.targetInputTreeIndex + 1}; active MSA window ${activeWindow}`;
  }

  return `Input tree ${status.sourceInputTreeIndex + 1}; active MSA window ${activeWindow}`;
}

export function formatMsaTreeStatusLabel(status) {
  if (!status) return null;

  if (status.kind === 'transition') {
    return `${status.sourceInputTreeIndex + 1} -> ${status.targetInputTreeIndex + 1}`;
  }

  return String(status.sourceInputTreeIndex + 1);
}

export function buildMsaWindowStatus(timelineCursor, msaStepSize, msaWindowSize, msaColumnCount) {
  if (!Number.isInteger(timelineCursor?.msaWindowIndex)) return null;
  if (!Number.isFinite(msaColumnCount) || msaColumnCount <= 0) return null;

  const windowRegion = calculateWindow(
    timelineCursor.msaWindowIndex,
    msaStepSize,
    msaWindowSize,
    msaColumnCount,
  );

  return {
    windowIndex: timelineCursor.msaWindowIndex,
    startPosition: windowRegion.startPosition,
    midPosition: windowRegion.midPosition,
    endPosition: windowRegion.endPosition,
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
