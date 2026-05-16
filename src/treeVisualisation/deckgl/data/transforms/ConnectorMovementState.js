import { isConnectorSplitInAnySubtree } from './ConnectorSplitEligibility.js';

export function resolveConnectorMovementState(params) {
  const {
    splitIndices,
    currentSubtreeSets,
    colorEntry,
    colorManager,
  } = params;

  const isCurrentSubtree = isConnectorSplitInAnySubtree(splitIndices, currentSubtreeSets);
  const isPivotEdge = Boolean(colorManager?.isNodePivotEdge?.(colorEntry));
  const isHistorySubtree = Boolean(colorManager?.isNodeHistorySubtree?.(colorEntry));

  return {
    isCurrentSubtree,
    isPivotEdge,
    isHistorySubtree,
    isMoving: isCurrentSubtree || isPivotEdge || isHistorySubtree,
  };
}
