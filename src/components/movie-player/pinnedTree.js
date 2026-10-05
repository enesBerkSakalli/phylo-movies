import { rightComparisonIndex } from '../../domain/indexing/treeIndexSemantics.js';

export function getPinnedTreeLabel(clipboardTreeIndex, inputTreeIndices) {
  if (clipboardTreeIndex === null) return 'None';
  const inputTreePosition = inputTreeIndices.indexOf(clipboardTreeIndex);
  if (inputTreePosition >= 0) return `Input ${inputTreePosition + 1}`;
  return `Tree ${clipboardTreeIndex + 1}`;
}

/**
 * Input tree to pin when stepping in `direction` (-1 or +1). From a pinned tree
 * it moves to the neighbouring input tree; with nothing pinned it starts from
 * the input tree nearest the cursor in that direction.
 */
export function getNextPinnedTreeIndex(
  direction,
  { clipboardTreeIndex, inputTreeIndices, frameIndex }
) {
  if (inputTreeIndices.length === 0) return null;
  const anchor = clipboardTreeIndex ?? frameIndex;

  if (direction > 0) return rightComparisonIndex(inputTreeIndices, anchor);
  return inputTreeIndices.findLast((index) => index < anchor) ?? inputTreeIndices[0];
}
