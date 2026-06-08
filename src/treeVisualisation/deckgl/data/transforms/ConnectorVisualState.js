import { computeConnectionColor } from './ComparisonColorUtils.js';
import { resolveConnectorColorEntry } from './ConnectorColorEntryResolver.js';
import { resolveConnectorMovementState } from './ConnectorMovementState.js';
import { getSplitKey, isSubset } from '../../../../domain/tree/splits.js';

export function resolveConnectorVisualState(params) {
  const {
    leftInfo,
    splitIndices,
    jumpingSubtreeSets,
    leftPositions,
    currentSubtreeSets,
    colorManager,
    subtreeHighlightsEnabled,
    linkConnectionOpacity,
    highlightColorMode,
    subtreeHighlightColor,
  } = params;

  const colorEntry = resolveConnectorColorEntry(
    leftInfo,
    splitIndices,
    jumpingSubtreeSets,
    leftPositions
  );
  const movementState = resolveConnectorMovementState({
    splitIndices,
    currentSubtreeSets,
    colorEntry,
    colorManager,
  });
  const color = computeConnectionColor(
    colorEntry,
    movementState.isMoving,
    colorManager,
    subtreeHighlightsEnabled,
    linkConnectionOpacity,
    highlightColorMode,
    subtreeHighlightColor
  );

  return {
    colorEntry,
    movementState,
    color,
    isMoving: movementState.isMoving,
    bundleGroupKey: resolveActiveBundleGroupKey(splitIndices, currentSubtreeSets, colorEntry),
  };
}

function resolveActiveBundleGroupKey(splitIndices, currentSubtreeSets, colorEntry) {
  for (const subtreeSet of currentSubtreeSets) {
    if (isSubset(splitIndices, subtreeSet)) {
      return getSplitKey(subtreeSet);
    }
  }

  return getSplitKey(colorEntry);
}
