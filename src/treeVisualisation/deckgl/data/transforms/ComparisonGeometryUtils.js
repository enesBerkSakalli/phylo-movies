import { calculateRadialBundlePoint } from '../../builders/geometry/connectors/ConnectorGeometryBuilder.js';
import { findLowestCommonAncestorById } from '../../builders/geometry/connectors/CommonAncestorBuilder.js';

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

export function getBundleAncestor(entry, entryById, targetDepth = 2) {
  if (!(entryById instanceof Map)) return null;
  let current = entry;
  if (!current) return null;

  while (getParentId(current) && getDepth(current) > targetDepth) {
    const next = entryById.get(getParentId(current));
    if (!next) break;
    current = next;
  }
  return current;
}

export const chooseBundlePoint = (connections, fallbackEntry, center, radius, isLeft, entryById = null) => {
  const entries = connections
    .map(c => (isLeft ? c.sourceInfo : c.targetInfo))
    .filter(Boolean);
  const lca = entryById ? findLowestCommonAncestorById(entries, entryById) : null;
  const lcaPosition = getPosition(lca);

  if (lcaPosition) {
    // Hierarchical layering:
    // Root/Shallow nodes -> Further out
    // Deep/Leaf nodes -> Closer in
    // Heuristic: If we assume typical tree depth ~10-15
    // We want roughly 50-100 units of "bundling space"

    // Default max depth guess if not provided
    const maxDepth = 15;
    const depth = getDepth(lca, 5);

    // Invert depth: Lower depth (Root) = 0 => High Offset
    // Higher depth (Leaf) = maxDepth => Low Offset
    const depthFactor = Math.max(0, maxDepth - depth);
    const spacingPerLevel = 5; // Distance between hierarchical lanes
    const depthOffset = depthFactor * spacingPerLevel;

    return ensureOutside(lcaPosition, center, radius || 0, depthOffset);
  }

  const fallbackPosition = getPosition(fallbackEntry);
  if (fallbackPosition) {
    return ensureOutside(fallbackPosition, center, radius || 0, 20);
  }

  const points = connections.map(c => (isLeft ? c.source : c.target));
  return ensureOutside(calculateRadialBundlePoint(points, center), center, radius || 0, 10);
};

function getPosition(entry) {
  if (!entry) return null;
  if (Array.isArray(entry.position)) return entry.position;
  return null;
}

function getDepth(entry, fallback = 0) {
  const depth = entry?.depth;
  return Number.isFinite(depth) ? depth : fallback;
}

function getParentId(entry) {
  return entry?.parentId ?? null;
}
