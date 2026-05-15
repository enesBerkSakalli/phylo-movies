import { getConnectorLeafPairCandidate } from './ConnectorLeafPairCandidates.js';
import { indexConnectorLeavesByName } from './ConnectorLeafIndex.js';
import { createRawConnectorConnectionFromCandidate } from './ConnectorRawConnectionFactory.js';
import { resolveConnectorVisualState } from './ConnectorVisualState.js';

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

    const visualState = resolveConnectorVisualState({
      leftInfo: candidate.leftInfo,
      splitIndices: candidate.splitIndices,
      jumpingSubtreeSets,
      leftPositions,
      currentSubtreeSets,
      colorManager,
      markedSubtreesEnabled,
      linkConnectionOpacity,
    });

    connections.push(createRawConnectorConnectionFromCandidate(candidate, visualState));
  }

  return connections;
}
