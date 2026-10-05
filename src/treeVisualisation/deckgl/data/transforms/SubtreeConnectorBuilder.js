import {
  getSplitIndices,
  getSplitKey,
  isSubset,
  parseSubtreeHighlightEntry,
  toSubtreeKey,
} from '../../../../domain/tree/splits.js';
import { computeConnectionColor } from './ComparisonColorUtils.js';
import { buildConnectorPathConnections } from './ConnectorPathBuilder.js';

const hasLeafPosition = (info) => Boolean(info.isLeaf && info.position?.length >= 2);
const leafTip = (info) => [info.position[0], info.position[1], 0];

/**
 * SubtreeConnectorBuilder
 * Prepares connector data for moving subtrees between two comparison trees.
 */
export function buildSubtreeConnectors(options) {
  const {
    leftPositions,
    rightPositions,
    affectedSubtrees,
    colorManager,
    subtreeHighlightTracking,
    frameIndex,
    subtreeHighlightsEnabled = true,
    linkConnectionOpacity = 0.6,
    highlightColorMode = 'solid',
    subtreeHighlightColor,
    leftCenter,
    rightCenter,
    leftRadius,
    rightRadius,
  } = options;

  const jumpingSets = affectedSubtrees.map((subtree) => new Set(subtree));
  if (jumpingSets.length === 0) {
    return [];
  }
  const currentSets = parseSubtreeHighlightEntry(subtreeHighlightTracking?.[frameIndex]).map(
    (subtree) => new Set(subtree)
  );

  const rightLeaves = new Map();
  for (const [key, info] of rightPositions) {
    const splitKey = getSplitKey(info);
    if (info.isLeaf && splitKey) rightLeaves.set(splitKey, { key, info });
  }

  const connections = [];
  for (const [key, leftInfo] of leftPositions) {
    if (!hasLeafPosition(leftInfo)) continue;
    const splitIndices = getSplitIndices(leftInfo);
    const jumpingSet = jumpingSets.find((set) => isSubset(splitIndices, set));
    const right = rightLeaves.get(getSplitKey(leftInfo));
    if (!jumpingSet || !right || !hasLeafPosition(right.info)) continue;

    // A taxon inside a larger moving subtree is coloured like that subtree's node.
    const colorEntry =
      (splitIndices.length < jumpingSet.size && leftPositions.get(toSubtreeKey(jumpingSet))) ||
      leftInfo;
    const currentSet = currentSets.find((set) => isSubset(splitIndices, set));
    const isMoving = Boolean(
      currentSet ||
      colorManager?.isNodePivotEdge?.(colorEntry) ||
      colorManager?.isNodeHistorySubtree?.(colorEntry)
    );

    connections.push({
      id: `connector-${key}-${right.key}`,
      source: leafTip(leftInfo),
      target: leafTip(right.info),
      color: computeConnectionColor(
        colorEntry,
        isMoving,
        colorManager,
        subtreeHighlightsEnabled,
        linkConnectionOpacity,
        highlightColorMode,
        subtreeHighlightColor
      ),
      isCurrentlyMoving: isMoving,
      bundleGroupKey: getSplitKey(currentSet ?? colorEntry),
      sourceInfo: leftInfo,
      targetInfo: right.info,
    });
  }

  return buildConnectorPathConnections({
    activeConnections: connections.filter((connection) => connection.isCurrentlyMoving),
    passiveConnections: connections.filter((connection) => !connection.isCurrentlyMoving),
    leftCenter,
    rightCenter,
    leftRadius,
    rightRadius,
    leftPositions,
    rightPositions,
  });
}
