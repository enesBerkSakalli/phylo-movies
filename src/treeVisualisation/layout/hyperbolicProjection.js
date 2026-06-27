export const LAYOUT_PROJECTION_MODES = {
  RADIAL: 'radial',
  HYPERBOLIC: 'hyperbolic',
  WALRUS_3D: 'walrus-3d',
};

export const DEFAULT_LAYOUT_PROJECTION_MODE = LAYOUT_PROJECTION_MODES.RADIAL;
export const DEFAULT_HYPERBOLIC_PROJECTION_STRENGTH = 0.65;

const MIN_PROJECTION_CURVATURE = 0.25;
const MAX_PROJECTION_CURVATURE = 4.5;
const H3_K = 2;
const H3_HEMISPHERE_AREA_SCALE = 7.2;
const H3_LEAF_AREA = 0.005;
const H3_EPSILON = 1e-10;
const H3_LEAF_RADIUS = computeH3Radius(H3_LEAF_AREA);
const H3_STABLE_DISPLAY_MIN_LEAVES = 8;
const H3_STABLE_DISPLAY_RADIUS_SCALE = 1.65;
const H3_MAX_STABLE_DISPLAY_UNIT_RADIUS = 0.95;
const H3_ROOT_DIRECTION = Object.freeze([1, 0, 0]);
const H3_ORIGIN4 = Object.freeze([0, 0, 0, 1]);
const H3_IDENTITY4 = Object.freeze([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

export function normalizeLayoutProjectionMode(mode) {
  if (mode === LAYOUT_PROJECTION_MODES.HYPERBOLIC) return LAYOUT_PROJECTION_MODES.HYPERBOLIC;
  if (mode === LAYOUT_PROJECTION_MODES.WALRUS_3D) return LAYOUT_PROJECTION_MODES.WALRUS_3D;
  return LAYOUT_PROJECTION_MODES.RADIAL;
}

export function normalizeHyperbolicProjectionStrength(strength) {
  const value = Number(strength);
  if (!Number.isFinite(value)) return DEFAULT_HYPERBOLIC_PROJECTION_STRENGTH;
  return Math.min(1, Math.max(0, value));
}

export function applyLayoutProjection(root, options = {}) {
  const projectionMode = normalizeLayoutProjectionMode(options.projectionMode);
  if (projectionMode === LAYOUT_PROJECTION_MODES.RADIAL) {
    return root;
  }

  if (projectionMode === LAYOUT_PROJECTION_MODES.WALRUS_3D) {
    return applyWalrus3dProjection(root, {
      strength: options.strength,
      maxRadius: options.maxRadius,
    });
  }

  return applyHyperbolicRadialProjection(root, {
    strength: options.strength,
    maxRadius: options.maxRadius,
  });
}

export function applyHyperbolicRadialProjection(root, options = {}) {
  if (!root || typeof root.each !== 'function') return root;

  const strength = normalizeHyperbolicProjectionStrength(options.strength);
  if (strength <= 0) {
    tagProjection(root, strength);
    return root;
  }

  const maxRadius = resolveMaxRadius(root, options.maxRadius);
  if (!Number.isFinite(maxRadius) || maxRadius <= 0) {
    tagProjection(root, strength);
    return root;
  }

  const curvature =
    MIN_PROJECTION_CURVATURE + strength * (MAX_PROJECTION_CURVATURE - MIN_PROJECTION_CURVATURE);
  const denominator = Math.tanh(curvature);

  // This is a PhyloMovies projection layer, not a full Walrus/H3 layout:
  // it preserves the existing branch-length radial layout and applies the
  // hyperbolic focus+context compression in the radial dimension.
  root.each((node) => {
    const originalRadius = Number.isFinite(node.radius) ? Math.max(0, node.radius) : 0;
    const normalizedRadius = Math.min(1, originalRadius / maxRadius);
    const ballRadius =
      denominator > 0 ? Math.tanh(curvature * normalizedRadius) / denominator : normalizedRadius;
    const projectedRadius = maxRadius * lerp(normalizedRadius, ballRadius, strength);
    const angle = Number.isFinite(node.rotatedAngle)
      ? node.rotatedAngle
      : Number.isFinite(node.angle)
        ? node.angle
        : 0;

    node.hyperbolicOriginalRadius = originalRadius;
    node.radius = projectedRadius;
    node.x = projectedRadius * Math.cos(angle);
    node.y = projectedRadius * Math.sin(angle);
    node.projectionMode = LAYOUT_PROJECTION_MODES.HYPERBOLIC;
    node.hyperbolicProjectionStrength = strength;
  });

  return root;
}

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

function resolveMaxRadius(root, fallback) {
  const fallbackNumber = Number(fallback);
  if (Number.isFinite(fallbackNumber) && fallbackNumber > 0) return fallbackNumber;

  let maxRadius = 0;
  root.each((node) => {
    const radius = Number(node.radius);
    if (Number.isFinite(radius)) {
      maxRadius = Math.max(maxRadius, radius);
    }
  });
  return maxRadius;
}

function tagProjection(root, strength) {
  root.each((node) => {
    node.projectionMode = LAYOUT_PROJECTION_MODES.HYPERBOLIC;
    node.hyperbolicProjectionStrength = strength;
    node.hyperbolicOriginalRadius = Number.isFinite(node.radius) ? node.radius : 0;
  });
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

function assignH3SubtreeMetrics(root) {
  root.eachAfter((node) => {
    const children = Array.isArray(node.children) ? node.children : [];
    const leafCount =
      children.length > 0 ? children.reduce((sum, child) => sum + (child.h3LeafCount || 1), 0) : 1;

    node.h3LeafCount = leafCount;
    if (children.length === 0) {
      node.h3Area = H3_LEAF_AREA;
      node.h3SubtreeRadius = H3_LEAF_RADIUS;
      return;
    }

    const area =
      H3_HEMISPHERE_AREA_SCALE *
      children.reduce((sum, child) => sum + computeH3CircleArea(child.h3SubtreeRadius), 0);

    node.h3Area = area;
    node.h3SubtreeRadius = computeH3Radius(area);
  });
}

function assignH3Angles(root) {
  root.eachAfter((node) => {
    const children = Array.isArray(node.children) ? node.children : [];
    if (children.length === 0) return;

    const sortedChildren = sortH3Children(children);
    assignH3AnglesForChildren(sortedChildren, node.h3SubtreeRadius, node.depth || 0, node);
  });
}

function sortH3Children(children) {
  return [...children].sort(compareH3StableOrder);
}

function compareH3StableOrder(a, b) {
  const keyDelta = String(a.h3StableSortKey || '').localeCompare(String(b.h3StableSortKey || ''));
  if (keyDelta !== 0) return keyDelta;
  return (a.h3SiblingIndex || 0) - (b.h3SiblingIndex || 0);
}

function getH3StableSortKey(node) {
  const data = node?.data || {};
  const splitKey =
    canonicalSplitKey(data.split_indices) ||
    (typeof data.splitKey === 'string' && data.splitKey.length > 0 ? data.splitKey : null);
  if (splitKey) return `split:${splitKey}`;
  if (typeof node?.id === 'string' && node.id.length > 0) return `id:${node.id}`;
  if (typeof data.name === 'string' && data.name.length > 0) return `name:${data.name}`;
  return `sibling:${node?.h3SiblingIndex ?? 0}`;
}

function canonicalSplitKey(splitIndices) {
  if (!Array.isArray(splitIndices) || splitIndices.length === 0) return null;
  const values = splitIndices.map((value) => Number(value)).filter(Number.isFinite);
  if (values.length === 0) return null;
  values.sort((a, b) => a - b);
  return values.map((value) => String(value).padStart(12, '0')).join(',');
}

function assignH3AnglesForChildren(children, parentRadius, level, parent) {
  const count = children.length;
  if (count === 0) return;

  const first = children[0];
  first.h3Theta = 0;
  first.h3Phi = 0;

  if (count === 1) return;

  if (count === 2) {
    const second = children[1];
    const firstPhi = computeH3DeltaPhi(first.h3SubtreeRadius, parentRadius);
    const secondPhi = computeH3DeltaPhi(second.h3SubtreeRadius, parentRadius);
    const totalPhi = firstPhi + secondPhi;

    first.h3Phi = totalPhi - firstPhi;
    second.h3Phi = totalPhi - secondPhi;
    assignStableH3ChildAngles(children, parentRadius, level, parent);
    return;
  }

  if (count === 3) {
    assignTernaryH3Angles(children, parentRadius);
    assignStableH3ChildAngles(children, parentRadius, level, parent);
    return;
  }

  if (count === 4) {
    assignFourChildH3Angles(children, parentRadius);
    assignStableH3ChildAngles(children, parentRadius, level, parent);
    return;
  }

  assignManyChildH3Angles(children, parentRadius);
  assignStableH3ChildAngles(children, parentRadius, level, parent);
}

function assignStableH3ChildAngles(children, parentRadius, level, parent) {
  const count = children.length;
  if (count === 0) return;
  if (count === 1) {
    children[0].h3Theta = 0;
    children[0].h3Phi = 0;
    return;
  }

  const leafRanks = getH3ParentLeafRanks(parent, children);
  const parentLeafCount = leafRanks ? leafRanks.order.length : 0;
  const parentLeafCenter = parentLeafCount > 0 ? (parentLeafCount - 1) / 2 : 0;
  const fallbackWeights = children.map((child) => Math.max(1, Number(child.h3LeafCount) || 1));
  const totalFallbackWeight = fallbackWeights.reduce((sum, value) => sum + value, 0);
  const firstFallbackCenter = fallbackWeights[0] / 2;
  const twist = level % 2 === 0 ? 0 : Math.PI / 2;
  let cumulativeWeight = 0;

  for (let index = 0; index < children.length; index += 1) {
    const fallbackCenter = cumulativeWeight + fallbackWeights[index] / 2;
    const stableCenter =
      leafRanks && parentLeafCount > 0
        ? getH3ChildLeafCenter(children[index], leafRanks)
        : null;
    const normalizedCenter =
      stableCenter === null
        ? (fallbackCenter - firstFallbackCenter) / totalFallbackWeight
        : (stableCenter - parentLeafCenter) / parentLeafCount;
    children[index].h3Theta = twist + normalizedCenter * Math.PI * 2;
    children[index].h3Phi = computeH3DeltaPhi(children[index].h3SubtreeRadius, parentRadius);
    cumulativeWeight += fallbackWeights[index];
  }
}

function getH3ParentLeafRanks(parent, children) {
  const parentLeaves = getH3SplitValues(parent);
  const order =
    parentLeaves.length > 0
      ? parentLeaves
      : uniqueSortedNumbers(children.flatMap((child) => getH3SplitValues(child)));
  if (order.length === 0) return null;

  const rankByLeaf = new Map();
  order.forEach((leaf, index) => {
    rankByLeaf.set(leaf, index);
  });
  return { order, rankByLeaf };
}

function getH3ChildLeafCenter(child, leafRanks) {
  const leaves = getH3SplitValues(child);
  if (leaves.length === 0) return null;

  let sum = 0;
  let count = 0;
  for (const leaf of leaves) {
    const rank = leafRanks.rankByLeaf.get(leaf);
    if (rank === undefined) continue;
    sum += rank;
    count += 1;
  }
  return count > 0 ? sum / count : null;
}

function getH3SplitValues(node) {
  const data = node?.data || node || {};
  return uniqueSortedNumbers(data.split_indices);
}

function uniqueSortedNumbers(values) {
  if (!Array.isArray(values) || values.length === 0) return [];
  return [...new Set(values.map((value) => Number(value)).filter(Number.isFinite))].sort(
    (a, b) => a - b
  );
}

function assignTernaryH3Angles(children, parentRadius) {
  const layout = computeTernaryH3Layout(
    parentRadius,
    children[0].h3SubtreeRadius,
    children[1].h3SubtreeRadius,
    children[2].h3SubtreeRadius
  );
  children[0].h3Theta = layout.thetaA;
  children[0].h3Phi = layout.phiA;
  children[1].h3Theta = layout.thetaB;
  children[1].h3Phi = layout.phiB;
  children[2].h3Theta = layout.thetaC;
  children[2].h3Phi = layout.phiC;
}

function assignFourChildH3Angles(children, parentRadius) {
  const deltaPhi = children.map((child) => computeH3DeltaPhi(child.h3SubtreeRadius, parentRadius));
  const phi = deltaPhi.map(
    (value, index) =>
      (3 * value +
        deltaPhi[(index + 1) % 4] +
        deltaPhi[(index + 2) % 4] +
        deltaPhi[(index + 3) % 4]) *
      0.1667
  );
  const deltaTheta = children.map((child, index) =>
    computeH3DeltaTheta(child.h3SubtreeRadius, parentRadius, deltaPhi[index])
  );
  const excessTheta =
    (2 * (Math.PI - deltaTheta.reduce((sum, value) => sum + value, 0))) / children.length;

  let theta = deltaTheta[0];
  children[0].h3Theta = theta;
  children[0].h3Phi = phi[0];
  for (let index = 1; index < children.length; index += 1) {
    theta += deltaTheta[index - 1] + excessTheta + deltaTheta[index];
    children[index].h3Theta = theta;
    children[index].h3Phi = phi[index];
  }
}

function assignManyChildH3Angles(children, parentRadius) {
  assignTernaryH3Angles(children, parentRadius);

  const capBottomPhi = Math.max(
    children[0].h3Phi + computeH3DeltaPhi(children[0].h3SubtreeRadius, parentRadius),
    children[1].h3Phi + computeH3DeltaPhi(children[1].h3SubtreeRadius, parentRadius),
    children[2].h3Phi + computeH3DeltaPhi(children[2].h3SubtreeRadius, parentRadius)
  );

  let deltaPhi = computeH3DeltaPhi(children[3].h3SubtreeRadius, parentRadius);
  let phi = capBottomPhi + deltaPhi;
  let theta = computeH3DeltaTheta(children[3].h3SubtreeRadius, parentRadius, phi);
  children[3].h3Theta = theta;
  children[3].h3Phi = phi;
  theta += theta;

  let firstChildInBand = 3;
  for (let index = 4; index < children.length; index += 1) {
    const child = children[index];
    let deltaTheta = computeH3DeltaTheta(child.h3SubtreeRadius, parentRadius, phi);
    let centerTheta = theta + deltaTheta;

    if (centerTheta + deltaTheta > Math.PI * 2) {
      spreadH3ChildrenEvenly(children, firstChildInBand, index, Math.PI * 2 - theta);

      phi += deltaPhi;
      deltaPhi = computeH3DeltaPhi(child.h3SubtreeRadius, parentRadius);
      phi += deltaPhi;

      deltaTheta = computeH3DeltaTheta(child.h3SubtreeRadius, parentRadius, phi);
      centerTheta = deltaTheta;
      firstChildInBand = index;
    }

    child.h3Theta = centerTheta;
    child.h3Phi = phi;
    theta = centerTheta + deltaTheta;
  }

  spreadH3ChildrenEvenly(children, firstChildInBand, children.length - 1, Math.PI * 2 - theta);
}

function spreadH3ChildrenEvenly(children, first, last, excess) {
  const total = last - first + 1;
  if (total <= 1 || !Number.isFinite(excess)) return;
  for (let index = 1; index < total; index += 1) {
    children[first + index].h3Theta += (index * excess) / total;
  }
}

function computeTernaryH3Layout(parentRadius, radiusA, radiusB, radiusC) {
  const a = radiusB + radiusC;
  const b = radiusA + radiusC;
  const c = radiusA + radiusB;
  const x = safeDivide(b * b + c * c - a * a, 2 * b, 0);
  const y = Math.sqrt(Math.max(0, c * c - x * x));

  const centerA = [0, 0, 0];
  const centerB = [x, y, 0];
  const centerC = [b, 0, 0];
  const weightA = radiusA * radiusA;
  const weightB = radiusB * radiusB;
  const weightC = radiusC * radiusC;
  const totalWeight = Math.max(H3_EPSILON, weightA + weightB + weightC);
  const centroid = [
    (weightA * centerA[0] + weightB * centerB[0] + weightC * centerC[0]) / totalWeight,
    (weightA * centerA[1] + weightB * centerB[1] + weightC * centerC[1]) / totalWeight,
    0,
  ];

  const distanceC = distance3(centroid, centerC);
  const distanceB = distance3(centroid, centerB);
  const distanceA = distance3(centroid, centerA);

  return {
    thetaA: -computeTriangleAngle(distanceA, distanceC, radiusA + radiusC),
    phiA: 2 * computeH3DeltaPhi(h3EuclideanDistance(distanceA), parentRadius),
    thetaB: computeTriangleAngle(distanceB, distanceC, radiusB + radiusC),
    phiB: 2 * computeH3DeltaPhi(h3EuclideanDistance(distanceB), parentRadius),
    thetaC: 0,
    phiC: 2 * computeH3DeltaPhi(h3EuclideanDistance(distanceC), parentRadius),
  };
}

function computeTriangleAngle(a, b, c) {
  const denominator = 2 * a * b;
  if (Math.abs(denominator) < H3_EPSILON) return 0;
  return Math.acos(clamp((a * a + b * b - c * c) / denominator, -1, 1));
}

function computeH3DeltaTheta(nodeRadius, parentRadius, phi) {
  const denominator = Math.sinh(parentRadius / H3_K) * Math.sin(phi);
  if (Math.abs(denominator) < H3_EPSILON) return Math.PI / 2;
  return Math.atan(Math.tanh(nodeRadius / H3_K) / denominator);
}

function computeH3DeltaPhi(nodeRadius, parentRadius) {
  const denominator = Math.sinh(parentRadius / H3_K);
  if (Math.abs(denominator) < H3_EPSILON) return Math.PI / 2;
  return Math.atan(Math.tanh(nodeRadius / H3_K) / denominator);
}

function assignH3Coordinates(root) {
  root.h3Point4d = [...H3_ORIGIN4];
  computeH3CoordinatesSubtree(root, [...H3_IDENTITY4]);
}

function computeH3CoordinatesSubtree(parent, parentTransform) {
  const children = Array.isArray(parent.children) ? parent.children : [];
  if (children.length === 0) return;

  const parentRadiusE = h3EuclideanDistance(parent.h3SubtreeRadius);

  for (const child of children) {
    const rot = multiplyMatrix4(rotationX(child.h3Theta || 0), rotationZ(child.h3Phi || 0));
    const childCenterRelative = transformPoint4(rot, [parentRadiusE, 0, 0, 1]);
    const childPoleRelative = transformPoint4(rot, [
      h3EuclideanDistance(parent.h3SubtreeRadius + child.h3SubtreeRadius),
      0,
      0,
      1,
    ]);

    const childCenter = transformPoint4(parentTransform, childCenterRelative);
    const childPole = transformPoint4(parentTransform, childPoleRelative);
    child.h3Point4d = childCenter;

    const childTransform = buildH3CanonicalOrientation(childCenter, childPole);
    computeH3CoordinatesSubtree(child, childTransform);
  }
}

function computeH3CircleArea(radius) {
  return 2 * Math.PI * (Math.cosh(radius / H3_K) - 1);
}

function computeH3Radius(area) {
  return H3_K * Math.asinh(Math.sqrt(Math.max(0, area) / (2 * Math.PI * H3_K * H3_K)));
}

function h3EuclideanDistance(distance) {
  const y = Math.cosh(distance / 2);
  if (!Number.isFinite(y)) return 1 - H3_EPSILON;
  return Math.sqrt(clamp(1 - 1 / (y * y), 0, 1 - H3_EPSILON));
}

function buildH3CanonicalOrientation(a, b) {
  const pa = [...a];
  const pb = [...b];
  const pivot = findH3PivotPoint(pa, pb);
  let transform = buildH3Translation(H3_ORIGIN4, pivot);

  const translatePivotToOrigin = buildH3Translation(pivot, H3_ORIGIN4);
  const paAtOrigin = transformPoint4(translatePivotToOrigin, pa);
  const pbAtOrigin = transformPoint4(translatePivotToOrigin, pb);

  transform = multiplyMatrix4(transform, buildH3Translation(H3_ORIGIN4, paAtOrigin));

  const translatePointToOrigin = buildH3Translation(paAtOrigin, H3_ORIGIN4);
  const poleAtOrigin = projectPoint4(transformPoint4(translatePointToOrigin, pbAtOrigin));
  const rho = Math.hypot(poleAtOrigin[0], poleAtOrigin[1], poleAtOrigin[2]);
  if (rho > H3_EPSILON) {
    const phi = Math.acos(clamp(poleAtOrigin[0] / rho, -1, 1));
    const theta = Math.atan2(poleAtOrigin[2], poleAtOrigin[1]);
    if (Math.abs(phi) >= H3_EPSILON) {
      transform = multiplyMatrix4(transform, rotationX(theta));
      transform = multiplyMatrix4(transform, rotationZ(phi));
    }
  }

  if (doesH3TransformMapOriginToPoint(transform, pa)) return transform;
  return buildH3Translation(H3_ORIGIN4, pa);
}

function doesH3TransformMapOriginToPoint(transform, point) {
  const transformedOrigin = projectPoint4(transformPoint4(transform, H3_ORIGIN4));
  const target = projectPoint4(point);
  return (
    transformedOrigin.every(Number.isFinite) &&
    target.every(Number.isFinite) &&
    distance3(transformedOrigin, target) < 1e-6
  );
}

function buildH3Translation(source, destination) {
  const aa = minkowski(source, source);
  const bb = minkowski(destination, destination);
  const ab = minkowski(source, destination);
  const sourceScale = Math.sqrt(Math.max(0, bb * ab));
  const destinationScale = Math.sqrt(Math.max(0, aa * ab));
  const midpoint = [
    sourceScale * source[0] + destinationScale * destination[0],
    sourceScale * source[1] + destinationScale * destination[1],
    sourceScale * source[2] + destinationScale * destination[2],
    sourceScale * source[3] + destinationScale * destination[3],
  ];

  return multiplyMatrix4(buildH3Reflection(midpoint), buildH3Reflection(source));
}

function buildH3Reflection(point) {
  const [x, y, z, w] = point;
  const ppH = x * x + y * y + z * z - w * w;
  if (Math.abs(ppH) < H3_EPSILON || !Number.isFinite(ppH)) return [...H3_IDENTITY4];

  const scale = -2 / ppH;
  const matrix = [
    x * x,
    x * y,
    x * z,
    -x * w,
    x * y,
    y * y,
    y * z,
    -y * w,
    x * z,
    y * z,
    z * z,
    -z * w,
    x * w,
    y * w,
    z * w,
    -w * w,
  ].map((value) => value * scale);

  matrix[0] += 1;
  matrix[5] += 1;
  matrix[10] += 1;
  matrix[15] += 1;
  return matrix;
}

function findH3PivotPoint(a4, b4) {
  const a = projectPoint4(a4);
  const b = projectPoint4(b4);
  const diff = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const p = dot3(a, diff);
  const q = dot3(b, diff);
  const r = dot3(diff, diff);

  if (r < H3_EPSILON) return [...H3_ORIGIN4];
  return [p * b[0] - q * a[0], p * b[1] - q * a[1], p * b[2] - q * a[2], r];
}

function rotationX(angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [1, 0, 0, 0, 0, cos, -sin, 0, 0, sin, cos, 0, 0, 0, 0, 1];
}

function rotationZ(angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [cos, -sin, 0, 0, sin, cos, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function multiplyMatrix4(a, b) {
  const out = new Array(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      for (let index = 0; index < 4; index += 1) {
        out[row * 4 + col] += a[row * 4 + index] * b[index * 4 + col];
      }
    }
  }
  return out;
}

function transformPoint4(matrix, point) {
  return [
    matrix[0] * point[0] + matrix[1] * point[1] + matrix[2] * point[2] + matrix[3] * point[3],
    matrix[4] * point[0] + matrix[5] * point[1] + matrix[6] * point[2] + matrix[7] * point[3],
    matrix[8] * point[0] + matrix[9] * point[1] + matrix[10] * point[2] + matrix[11] * point[3],
    matrix[12] * point[0] + matrix[13] * point[1] + matrix[14] * point[2] + matrix[15] * point[3],
  ];
}

function projectPoint4(point) {
  const w = Math.abs(point[3]) > H3_EPSILON ? point[3] : 1;
  return [point[0] / w, point[1] / w, point[2] / w];
}

function normalizeVector(vector, fallback = H3_ROOT_DIRECTION) {
  const x = Number(vector?.[0]);
  const y = Number(vector?.[1]);
  const z = Number(vector?.[2]);
  const length = Math.hypot(x, y, z);
  if (!Number.isFinite(length) || length <= 1e-9) return [...fallback];
  return [x / length, y / length, z / length];
}

function minkowski(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] - a[3] * b[3];
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function distance3(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function safeDivide(numerator, denominator, fallback) {
  if (Math.abs(denominator) < H3_EPSILON) return fallback;
  return numerator / denominator;
}

function clampUnitRadius(value) {
  return clamp(value, 0, 1 - H3_EPSILON);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
