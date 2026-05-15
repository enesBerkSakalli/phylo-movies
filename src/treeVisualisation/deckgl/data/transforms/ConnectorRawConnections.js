import { isSubset } from '../../../utils/splitMatching.js';
import { computeConnectionColor } from './ComparisonColorUtils.js';
import { resolveConnectorColorEntry } from './ConnectorColorEntryResolver.js';
import { indexConnectorLeavesByName } from './ConnectorLeafIndex.js';
import { normalizeConnectorSplitValue } from './ConnectorSplitNormalization.js';

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

    const splitIndices = key.split('-')
      .map((val) => normalizeConnectorSplitValue(val))
      .filter((n) => n !== null);
    if (!splitIndices.length) continue;

    if (!isSplitSubsetOfAny(splitIndices, jumpingSubtreeSets)) continue;

    const rightMatch = rightLeavesByName.get(leftInfo.name);
    if (!rightMatch) continue;
    if (!rightMatch.info.position || rightMatch.info.position.length < 2) continue;

    const isCurrentlyMoving = isSplitSubsetOfAny(splitIndices, currentSubtreeSets);
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

    connections.push({
      id: `connector-${key}-${rightMatch.key}`,
      source,
      target,
      color,
      isCurrentlyMoving: effectiveMoving,
      sourceInfo: leftInfo,
      targetInfo: rightMatch.info,
    });
  }

  return connections;
}

function isSplitSubsetOfAny(splitIndices, subtreeSets) {
  for (const subtreeSet of subtreeSets || []) {
    if (isSubset(splitIndices, subtreeSet)) return true;
  }
  return false;
}
