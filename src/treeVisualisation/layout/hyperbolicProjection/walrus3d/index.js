import { LAYOUT_PROJECTION_MODES } from '../constants.js';
import { normalizeHyperbolicProjectionStrength } from '../normalization.js';
import { resolveMaxRadius } from '../geometryUtils.js';
import {
  H3_EPSILON,
  H3_MAX_STABLE_DISPLAY_UNIT_RADIUS,
  H3_ORIGIN4,
  H3_ROOT_DIRECTION,
  H3_STABLE_DISPLAY_MIN_LEAVES,
  H3_STABLE_DISPLAY_RADIUS_SCALE,
} from './constants.js';
import { clamp, clampUnitRadius, normalizeVector, projectPoint4 } from './hyperboloidMath.js';
import { H3_LEAF_RADIUS, assignH3SubtreeMetrics, getH3StableSortKey } from './subtreeMetrics.js';
import { assignH3Angles } from './angleAssignment.js';
import { assignH3Coordinates } from './coordinateFrame.js';

export function applyWalrus3dProjection(root, options = {}) {
  if (!root || typeof root.each !== 'function') return root;

  const strength = normalizeHyperbolicProjectionStrength(options.strength);
  const maxRadius = resolveMaxRadius(root, options.maxRadius);
  if (!Number.isFinite(maxRadius) || maxRadius <= 0) {
    tagWalrus3dProjection(root, strength);
    return root;
  }

  root.eachBefore((node) => {
    const siblings = Array.isArray(node.parent?.children) ? node.parent.children : [node];
    node.h3OriginalRadius = Number.isFinite(node.radius) ? Math.max(0, node.radius) : 0;
    node.h3SiblingIndex = siblings.indexOf(node);
    node.h3StableSortKey = getH3StableSortKey(node);
  });
  assignH3SubtreeMetrics(root);
  assignH3Angles(root);
  assignH3Coordinates(root);

  let maxProjectedUnitRadius = 0;
  root.each((node) => {
    const affine = projectPoint4(node.h3Point4d || H3_ORIGIN4);
    const projectedUnitRadius = clampUnitRadius(Math.hypot(affine[0], affine[1], affine[2]));
    node.h3KleinPosition = affine;
    node.h3ProjectedUnitRadius = projectedUnitRadius;
    maxProjectedUnitRadius = Math.max(maxProjectedUnitRadius, projectedUnitRadius);
  });

  const displayUnitRadius = resolveH3DisplayUnitRadius(root, maxProjectedUnitRadius);
  const displayScale = displayUnitRadius > H3_EPSILON ? maxRadius / displayUnitRadius : 1;

  root.each((node) => {
    const affine = node.h3KleinPosition || [0, 0, 0];
    const projectedUnitRadius = node.h3ProjectedUnitRadius || 0;
    const projectedRadius = projectedUnitRadius * displayScale;
    const position = [affine[0] * displayScale, affine[1] * displayScale, affine[2] * displayScale];
    const azimuth = Math.atan2(position[1], position[0]);
    const direction = normalizeVector(position, H3_ROOT_DIRECTION);

    node.h3ProjectionRadius = projectedRadius;
    node.h3Direction = direction;
    node.h3Distance = 2 * Math.atanh(Math.min(1 - H3_EPSILON, projectedUnitRadius));
    node.h3DisplayUnitRadius = displayUnitRadius;
    node.h3DisplayScale = displayScale;
    node.radius = projectedRadius;
    node.x = position[0];
    node.y = position[1];
    node.z = position[2];
    node.position = position;
    node.angle = azimuth;
    node.rotatedAngle = azimuth;
    node.projectionMode = LAYOUT_PROJECTION_MODES.WALRUS_3D;
    node.hyperbolicProjectionStrength = strength;
  });

  return root;
}

function tagWalrus3dProjection(root, strength) {
  root.each((node) => {
    const z = Number.isFinite(node.z) ? node.z : 0;
    node.z = z;
    node.position = [Number.isFinite(node.x) ? node.x : 0, Number.isFinite(node.y) ? node.y : 0, z];
    node.projectionMode = LAYOUT_PROJECTION_MODES.WALRUS_3D;
    node.hyperbolicProjectionStrength = strength;
    node.h3OriginalRadius = Number.isFinite(node.radius) ? node.radius : 0;
  });
}

function resolveH3DisplayUnitRadius(root, currentMaxProjectedUnitRadius) {
  const leafCount = Number(root?.h3LeafCount);
  if (Number.isFinite(leafCount) && leafCount >= H3_STABLE_DISPLAY_MIN_LEAVES) {
    return clamp(
      Math.sqrt(leafCount) * H3_LEAF_RADIUS * H3_STABLE_DISPLAY_RADIUS_SCALE,
      H3_EPSILON,
      H3_MAX_STABLE_DISPLAY_UNIT_RADIUS
    );
  }
  return currentMaxProjectedUnitRadius;
}
