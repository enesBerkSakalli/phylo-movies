import { computeConnectionColor } from './ComparisonColorUtils.js';
import { resolveConnectorColorEntry } from './ConnectorColorEntryResolver.js';
import { resolveConnectorMovementState } from './ConnectorMovementState.js';

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
    linkConnectionOpacity
  );

  return {
    colorEntry,
    movementState,
    color,
    isMoving: movementState.isMoving,
  };
}
