import { computeConnectionColor } from './ComparisonColorUtils.js';
import { createConnectorConnection } from './ConnectorConnectionObjects.js';
import { resolveConnectorColorEntry } from './ConnectorColorEntryResolver.js';
import { getConnectorLeafPairCandidate } from './ConnectorLeafPairCandidates.js';
import { indexConnectorLeavesByName } from './ConnectorLeafIndex.js';
import { isConnectorSplitInAnySubtree } from './ConnectorSplitEligibility.js';

export function buildRawConnectorConnections(params) {
  const {
    leftPositions,
    rightPositions,
    jumpingSubtreeSets,
    currentSubtreeSets,
    colorManager,
    markedSubtreesEnabled,
    linkConnectionOpacity,
  } = params;
  const rightLeavesByName = indexConnectorLeavesByName(rightPositions);
  const connections = [];

  for (const [key, leftInfo] of leftPositions.entries()) {
    const candidate = getConnectorLeafPairCandidate({
      key,
      leftInfo,
      rightLeavesByName,
      jumpingSubtreeSets,
    });
    if (!candidate) continue;

    const isCurrentlyMoving = isConnectorSplitInAnySubtree(candidate.splitIndices, currentSubtreeSets);
    const colorEntry = resolveConnectorColorEntry(
      candidate.leftInfo,
      candidate.splitIndices,
      jumpingSubtreeSets,
      leftPositions
    );
    const isPivotEdge = colorManager && typeof colorManager.isNodePivotEdge === 'function'
      && colorManager.isNodePivotEdge(colorEntry);
    const isHistorySubtree = colorManager && typeof colorManager.isNodeHistorySubtree === 'function'
      && colorManager.isNodeHistorySubtree(colorEntry);
    const effectiveMoving = isCurrentlyMoving || isPivotEdge || isHistorySubtree;
    const color = computeConnectionColor(
      colorEntry,
      effectiveMoving,
      colorManager,
      markedSubtreesEnabled,
      linkConnectionOpacity
    );

    connections.push(createConnectorConnection({
      id: `connector-${candidate.leftKey}-${candidate.rightKey}`,
      source: candidate.source,
      target: candidate.target,
      color,
      isCurrentlyMoving: effectiveMoving,
      sourceInfo: candidate.leftInfo,
      targetInfo: candidate.rightInfo,
    }));
  }

  return connections;
}
