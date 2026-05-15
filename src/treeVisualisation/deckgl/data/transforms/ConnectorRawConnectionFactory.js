import { createConnectorConnection } from './ConnectorConnectionObjects.js';

export function createRawConnectorConnectionFromCandidate(candidate, visualState) {
  return createConnectorConnection({
    id: `connector-${candidate.leftKey}-${candidate.rightKey}`,
    source: candidate.source,
    target: candidate.target,
    color: visualState.color,
    isCurrentlyMoving: visualState.isMoving,
    sourceInfo: candidate.leftInfo,
    targetInfo: candidate.rightInfo,
  });
}
