import { getConnectorLeafPairCandidate } from './ConnectorLeafPairCandidates.js';
import { indexConnectorLeavesBySplitKey } from './ConnectorLeafIndex.js';
import { createRawConnectorConnectionFromCandidate } from './ConnectorRawConnectionFactory.js';
import { resolveConnectorVisualState } from './ConnectorVisualState.js';

export function buildRawConnectorConnections(params) {
  const {
    leftPositions,
    rightPositions,
    jumpingSubtreeSets,
    currentSubtreeSets,
    colorManager,
    subtreeHighlightsEnabled,
    linkConnectionOpacity,
  } = params;
  const rightLeavesBySplitKey = indexConnectorLeavesBySplitKey(rightPositions);
  const connections = [];

  for (const [key, leftInfo] of leftPositions.entries()) {
    const candidate = getConnectorLeafPairCandidate({
      key,
      leftInfo,
      rightLeavesBySplitKey,
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
      subtreeHighlightsEnabled,
      linkConnectionOpacity,
    });

    connections.push(createRawConnectorConnectionFromCandidate(candidate, visualState));
  }

  return connections;
}
