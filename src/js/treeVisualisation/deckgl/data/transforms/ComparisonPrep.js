import { colorToRgb } from '../../../../services/ui/colorUtils.js';
import { getBaseNodeColor } from '../../../systems/color/index.js';
import { calculateRadialBundlePoint, buildBundledBezierPath } from '../../../utils/BundleUtils.js';
import { flattenSubtreeEntries } from '../../layers/styles/subtreeMatching.js';

/**
 * Prepares connector data for jumping subtrees between two trees.
 *
 * @param {Object} params - Parameters for comparison preparation
 * @param {Map} params.leftPositions - Position map for the left tree
 * @param {Map} params.rightPositions - Position map for the right tree
 * @param {Object} params.latticeSolutions - Jumping subtree solutions
 * @param {Array} params.activeChangeEdge - Current active change edge [source, target]
 * @param {Object} params.colorManager - Color manager instance
 * @param {Array} params.subtreeTracking - Subtree tracking data
 * @param {number} params.currentTreeIndex - Current tree index
 * @param {boolean} params.markedSubtreesEnabled - Whether marked subtrees are enabled
 * @param {number} params.linkConnectionOpacity - Opacity for connectors
 * @param {Array} [params.leftCenter=[0,0]] - Center of left tree for bundling
 * @param {Array} [params.rightCenter=[0,0]] - Center of right tree for bundling
 * @returns {Array} List of connector objects for Deck.gl PathLayer
 */
export function prepareJumpingSubtreeConnectors({
  leftPositions,
  rightPositions,
  latticeSolutions,
  activeChangeEdge,
  colorManager,
  subtreeTracking,
  currentTreeIndex,
  markedSubtreesEnabled = true,
  linkConnectionOpacity = 0.6,
  leftCenter = [0, 0],
  rightCenter = [0, 0]
}) {
  const edgeKey = `[${activeChangeEdge.join(', ')}]`;
  const allJumpingSubtrees = latticeSolutions[edgeKey] || [];
  const flattenedSubtrees = flattenSubtreeEntries(allJumpingSubtrees);

  if (flattenedSubtrees.length === 0) {
    return [];
  }

  // Convert to Sets for fast lookup
  const jumpingSubtreeSets = flattenedSubtrees.map(st => new Set(st));

  // Get the currently moving subtree
  const currentSubtree = subtreeTracking[currentTreeIndex];
  const currentSubtreeSet = Array.isArray(currentSubtree) && currentSubtree.length > 0
    ? new Set(currentSubtree)
    : null;

  // Index right leaves by name
  const rightLeavesByName = new Map();
  for (const [key, info] of rightPositions) {
    if (info?.isLeaf && info.name) {
      rightLeavesByName.set(info.name, { key, info });
    }
  }

  const rawConnections = [];

  // Iterate over left leaves
  for (const [key, leftInfo] of leftPositions) {
    if (!leftInfo?.isLeaf || !leftInfo.name) continue;

    const splitIndices = key.split('-').map(Number).filter(n => !isNaN(n));
    if (splitIndices.length === 0) continue;

    // Is it in any jumping subtree?
    let isInJumpingSubtree = false;
    for (const subtreeSet of jumpingSubtreeSets) {
      const isSubset = splitIndices.every(leaf => subtreeSet.has(leaf));
      if (splitIndices.length <= subtreeSet.size && isSubset) {
        isInJumpingSubtree = true;
        break;
      }
    }
    if (!isInJumpingSubtree) continue;

    const rightMatch = rightLeavesByName.get(leftInfo.name);
    if (!rightMatch) continue;

    // Is it currently moving?
    let isCurrentlyMoving = false;
    if (currentSubtreeSet) {
      const isSubset = splitIndices.every(leaf => currentSubtreeSet.has(leaf));
      isCurrentlyMoving = splitIndices.length <= currentSubtreeSet.size && isSubset;
    }

    const srcPos = [leftInfo.position[0], leftInfo.position[1], 0];
    const dstPos = [rightMatch.info.position[0], rightMatch.info.position[1], 0];

    // Color
    let colorHex;
    const nodeForColor = leftInfo.node?.originalNode || leftInfo.node || leftInfo;

    if (isCurrentlyMoving && markedSubtreesEnabled) {
      colorHex = colorManager?.getNodeColor?.(nodeForColor);
    } else {
      const monophyleticEnabled = colorManager?.isMonophyleticColoringEnabled?.() ?? true;
      colorHex = getBaseNodeColor(nodeForColor, monophyleticEnabled);
    }

    const [r, g, b] = colorHex ? colorToRgb(colorHex) : [200, 80, 80];

    rawConnections.push({
      id: `connector-${key}-${rightMatch.key}`,
      source: srcPos,
      target: dstPos,
      color: [r, g, b, Math.round(linkConnectionOpacity * 255)],
      isCurrentlyMoving
    });
  }

  if (rawConnections.length === 0) {
    return [];
  }

  // Hierarchical Edge Bundling
  const srcBundlePoint = calculateRadialBundlePoint(rawConnections.map(c => c.source), leftCenter);
  const dstBundlePoint = calculateRadialBundlePoint(rawConnections.map(c => c.target), rightCenter);

  return rawConnections.map((conn, idx) => {
    const path = buildBundledBezierPath(conn.source, conn.target, srcBundlePoint, dstBundlePoint);
    return {
      ...conn,
      id: `${conn.id}-${idx}`,
      path,
      width: 1.5
    };
  }).filter(c => c.path.length > 0);
}
