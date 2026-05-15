import { getAngle } from './ComparisonGeometryUtils.js';

export function sortConnectorConnectionsByAngle(connections, leftCenter, rightCenter) {
  return connections.slice().sort((a, b) => {
    const aSrc = getAngle(a.sourceInfo, leftCenter);
    const bSrc = getAngle(b.sourceInfo, leftCenter);
    if (aSrc !== bSrc) {
      return aSrc - bSrc;
    }
    const aDst = getAngle(a.targetInfo, rightCenter);
    const bDst = getAngle(b.targetInfo, rightCenter);
    return aDst - bDst;
  });
}

export function splitActivePassiveConnectorConnections(connections) {
  const activeConnections = [];
  const passiveConnections = [];
  connections.forEach((connection) => {
    if (connection.isCurrentlyMoving) {
      activeConnections.push(connection);
    } else {
      passiveConnections.push(connection);
    }
  });
  return { activeConnections, passiveConnections };
}
