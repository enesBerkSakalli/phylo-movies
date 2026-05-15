import { computeConnectionColor } from './ComparisonColorUtils.js';
import { createConnectorConnection } from './ConnectorConnectionObjects.js';
import { resolveConnectorColorEntry } from './ConnectorColorEntryResolver.js';
import { getConnectorLeafPairCandidate } from './ConnectorLeafPairCandidates.js';
import { indexConnectorLeavesByName } from './ConnectorLeafIndex.js';
import { resolveConnectorMovementState } from './ConnectorMovementState.js';

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

    const colorEntry = resolveConnectorColorEntry(
      candidate.leftInfo,
      candidate.splitIndices,
      jumpingSubtreeSets,
      leftPositions
    );
    const movementState = resolveConnectorMovementState({
      splitIndices: candidate.splitIndices,
      currentSubtreeSets,
      colorEntry,
      colorManager,
    });
    const color = computeConnectionColor(
      colorEntry,
      movementState.isMoving,
      colorManager,
      markedSubtreesEnabled,
      linkConnectionOpacity
    );

    connections.push(createConnectorConnection({
      id: `connector-${candidate.leftKey}-${candidate.rightKey}`,
      source: candidate.source,
      target: candidate.target,
      color,
      isCurrentlyMoving: movementState.isMoving,
      sourceInfo: candidate.leftInfo,
      targetInfo: candidate.rightInfo,
    }));
  }

  return connections;
}
