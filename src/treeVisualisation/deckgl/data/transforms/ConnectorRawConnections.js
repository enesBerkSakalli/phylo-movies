import { computeConnectionColor } from './ComparisonColorUtils.js';
import { createConnectorConnection } from './ConnectorConnectionObjects.js';
import { resolveConnectorColorEntry } from './ConnectorColorEntryResolver.js';
import { indexConnectorLeavesByName } from './ConnectorLeafIndex.js';
import {
  getEligibleConnectorSplitIndices,
  isConnectorSplitInAnySubtree
} from './ConnectorSplitEligibility.js';

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
    if (!leftInfo.isLeaf || !leftInfo.name) continue;
    if (!leftInfo.position || leftInfo.position.length < 2) continue;

    const splitIndices = getEligibleConnectorSplitIndices(key, jumpingSubtreeSets);
    if (!splitIndices) continue;

    const rightMatch = rightLeavesByName.get(leftInfo.name);
    if (!rightMatch) continue;
    if (!rightMatch.info.position || rightMatch.info.position.length < 2) continue;

    const isCurrentlyMoving = isConnectorSplitInAnySubtree(splitIndices, currentSubtreeSets);
    const source = [leftInfo.position[0], leftInfo.position[1], 0];
    const target = [rightMatch.info.position[0], rightMatch.info.position[1], 0];

    const colorEntry = resolveConnectorColorEntry(leftInfo, splitIndices, jumpingSubtreeSets, leftPositions);
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
      id: `connector-${key}-${rightMatch.key}`,
      source,
      target,
      color,
      isCurrentlyMoving: effectiveMoving,
      sourceInfo: leftInfo,
      targetInfo: rightMatch.info,
    }));
  }

  return connections;
}
