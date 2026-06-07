const HIGHLIGHT_TARGET_EPSILON = 1e-6;

export function resolveCursorTreeIndex(fromIndex, toIndex, timeFactor) {
  return resolveMidpointTreeIndex(fromIndex, toIndex, timeFactor);
}

export function resolveComparisonActiveTreeIndex(fromIndex, toIndex, timeFactor) {
  return resolveMidpointTreeIndex(fromIndex, toIndex, timeFactor);
}

export function resolveHighlightTreeIndex(fromIndex, toIndex, timeFactor) {
  const { from, to, t } = normalizeTransitionIndexInputs(fromIndex, toIndex, timeFactor);
  return t <= HIGHLIGHT_TARGET_EPSILON ? from : to;
}

export function resolveMsaSourceFrameIndex(sourceTreeSequenceIndices = [], sequenceIndex = 0) {
  if (!sourceTreeSequenceIndices?.length) return 0;

  const safeSequenceIndex = Number.isFinite(sequenceIndex) ? sequenceIndex : 0;
  for (let i = sourceTreeSequenceIndices.length - 1; i >= 0; i--) {
    if (sourceTreeSequenceIndices[i] <= safeSequenceIndex) {
      return i;
    }
  }
  return 0;
}

export function findPreviousInputTreeSequenceIndex(inputTreeIndices, position) {
  if (!inputTreeIndices?.length) return 0;
  const ordinal = resolveMsaSourceFrameIndex(inputTreeIndices, position);
  return inputTreeIndices[ordinal] ?? 0;
}

export function findNextInputTreeSequenceIndex(inputTreeIndices, position) {
  if (!inputTreeIndices?.length) return null;
  for (const inputTreeIndex of inputTreeIndices) {
    if (inputTreeIndex > position) {
      return inputTreeIndex;
    }
  }
  return null;
}

export function resolveComparisonRightTreeIndex(inputTreeIndices, activeTreeIndex, fallbackIndex) {
  const nextInputTreeIndex = findNextInputTreeSequenceIndex(inputTreeIndices, activeTreeIndex);
  if (Number.isInteger(nextInputTreeIndex)) return nextInputTreeIndex;

  const lastInputTreeIndex = inputTreeIndices?.[inputTreeIndices.length - 1];
  if (Number.isInteger(lastInputTreeIndex)) return lastInputTreeIndex;

  return Number.isInteger(fallbackIndex) ? fallbackIndex : activeTreeIndex;
}

function resolveMidpointTreeIndex(fromIndex, toIndex, timeFactor) {
  const { from, to, t } = normalizeTransitionIndexInputs(fromIndex, toIndex, timeFactor);
  if (t <= 0) return from;
  if (t >= 1) return to;
  return t < 0.5 ? from : to;
}

function normalizeTransitionIndexInputs(fromIndex, toIndex, timeFactor) {
  const from = Number.isInteger(fromIndex) ? fromIndex : 0;
  const to = Number.isInteger(toIndex) ? toIndex : from;
  const t = Number.isFinite(timeFactor) ? Math.max(0, Math.min(1, timeFactor)) : 0;

  return { from, to, t };
}
