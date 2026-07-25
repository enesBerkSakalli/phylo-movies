import { H3_EPSILON, H3_IDENTITY4, H3_ORIGIN4 } from './constants.js';
import {
  clamp,
  distance3,
  dot3,
  h3EuclideanDistance,
  minkowski,
  multiplyMatrix4,
  projectPoint4,
  rotationX,
  rotationZ,
  transformPoint4,
} from './hyperboloidMath.js';

export function assignH3Coordinates(root) {
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

export function buildH3CanonicalOrientation(a, b) {
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
