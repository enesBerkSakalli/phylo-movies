import { calculateRadialBundlePoint } from '../../builders/geometry/connectors/ConnectorGeometryBuilder.js';
import { findLowestCommonAncestor } from '../../builders/geometry/connectors/CommonAncestorBuilder.js';

export const ensureOutside = (pt, center, minRadius, depthOffset = 0) => {
  const dx = pt[0] - center[0];
  const dy = pt[1] - center[1];
  const r = Math.hypot(dx, dy) || 1;

  // Base radius plus offset based on hierarchy depth
  // The deeper in the tree (higher depth value), the closer to the base radius.
  // The shallower (closer to root), the further out.
  // We assume max offset
  const targetRadius = minRadius + depthOffset;

  const scale = Math.max(1, targetRadius / r);
  return [center[0] + dx * scale, center[1] + dy * scale, 0];
};

export const pushOutward = (pt, center, factor = 1.05) => {
  const dx = pt[0] - center[0];
  const dy = pt[1] - center[1];
  return [center[0] + dx * factor, center[1] + dy * factor, 0];
};

export const getAngle = (nodeOrPoint, center) => {
  if (!nodeOrPoint) return 0;
  if (nodeOrPoint.angle !== undefined) return nodeOrPoint.angle;
  if (nodeOrPoint.rotatedAngle !== undefined) return nodeOrPoint.rotatedAngle;
  const pt = nodeOrPoint.position || nodeOrPoint;
  if (!Array.isArray(pt)) return 0;
  return Math.atan2(pt[1] - center[1], pt[0] - center[0]);
};

export const getBundleAncestor = (node, targetDepth = 2) => {
  let curr = node;
  if (!curr) return null;
  while (curr.parent && curr.depth > targetDepth) curr = curr.parent;
  return curr;
};

export const chooseBundlePoint = (connections, fallbackNode, center, radius, isLeft) => {
  const nodes = connections
    .map(c => (isLeft ? c.sourceNode : c.targetNode)?.originalNode || (isLeft ? c.sourceNode : c.targetNode))
    .filter(Boolean);
  const lca = findLowestCommonAncestor(nodes);

  if (lca && lca.x !== undefined && lca.y !== undefined) {
    // Hierarchical layering:
    // Root/Shallow nodes -> Further out
    // Deep/Leaf nodes -> Closer in
    // Heuristic: If we assume typical tree depth ~10-15
    // We want roughly 50-100 units of "bundling space"

    // Default max depth guess if not provided
    const maxDepth = 15;
    const depth = lca.depth !== undefined ? lca.depth : 5;

    // Invert depth: Lower depth (Root) = 0 => High Offset
    // Higher depth (Leaf) = maxDepth => Low Offset
    const depthFactor = Math.max(0, maxDepth - depth);
    const spacingPerLevel = 5; // Distance between hierarchical lanes
    const depthOffset = depthFactor * spacingPerLevel;

    return ensureOutside([lca.x + center[0], lca.y + center[1], 0], center, radius || 0, depthOffset);
  }

  if (fallbackNode && fallbackNode.x !== undefined && fallbackNode.y !== undefined) {
    return ensureOutside([fallbackNode.x + center[0], fallbackNode.y + center[1], 0], center, radius || 0, 20);
  }

  const points = connections.map(c => (isLeft ? c.source : c.target));
  return ensureOutside(calculateRadialBundlePoint(points, center), center, radius || 0, 10);
};
