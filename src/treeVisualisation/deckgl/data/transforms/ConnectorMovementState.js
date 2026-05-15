import { isConnectorSplitInAnySubtree } from './ConnectorSplitEligibility.js';

export function resolveConnectorMovementState(params) {
  const {
    splitIndices,
    currentSubtreeSets,
    colorEntry,
    colorManager,
  } = params;

  const isCurrentSubtree = isConnectorSplitInAnySubtree(splitIndices, currentSubtreeSets);
  const isPivotEdge = Boolean(
    colorManager
      && typeof colorManager.isNodePivotEdge === 'function'
      && colorManager.isNodePivotEdge(colorEntry)
  );
  const isHistorySubtree = Boolean(
    colorManager
      && typeof colorManager.isNodeHistorySubtree === 'function'
      && colorManager.isNodeHistorySubtree(colorEntry)
  );

  return {
    isCurrentSubtree,
    isPivotEdge,
    isHistorySubtree,
    isMoving: isCurrentSubtree || isPivotEdge || isHistorySubtree,
  };
}
