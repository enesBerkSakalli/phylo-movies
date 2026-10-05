const HIGHLIGHT_TARGET_EPSILON = 1e-6;

/** The tree the playhead belongs to: the source until the midpoint of a transition. */
export const resolveCursorTreeIndex = (fromIndex, toIndex, timeFactor) =>
  timeFactor < 0.5 ? fromIndex : toIndex;

export const resolveHighlightTreeIndex = (fromIndex, toIndex, timeFactor) =>
  timeFactor <= HIGHLIGHT_TARGET_EPSILON ? fromIndex : toIndex;

export const findPreviousInputTreeSequenceIndex = (inputTreeIndices, position) =>
  inputTreeIndices.findLast((index) => index <= position) ?? inputTreeIndices[0];

export const findNextInputTreeSequenceIndex = (inputTreeIndices, position) =>
  inputTreeIndices.find((index) => index > position) ?? null;

/** The input tree to compare with at `position`: the next one, or the last once past it. */
export const rightComparisonIndex = (inputTreeIndices, position) =>
  findNextInputTreeSequenceIndex(inputTreeIndices, position) ?? inputTreeIndices.at(-1);
