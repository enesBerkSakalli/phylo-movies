import { H3_EPSILON, H3_K } from './constants.js';

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function clampUnitRadius(value) {
  return clamp(value, 0, 1 - H3_EPSILON);
}

export function safeDivide(numerator, denominator, fallback) {
  if (Math.abs(denominator) < H3_EPSILON) return fallback;
  return numerator / denominator;
}

export function computeH3CircleArea(radius) {
  return 2 * Math.PI * (Math.cosh(radius / H3_K) - 1);
}

export function computeH3Radius(area) {
  return H3_K * Math.asinh(Math.sqrt(Math.max(0, area) / (2 * Math.PI * H3_K * H3_K)));
}

export function h3EuclideanDistance(distance) {
  const y = Math.cosh(distance / 2);
  if (!Number.isFinite(y)) return 1 - H3_EPSILON;
  return Math.sqrt(clamp(1 - 1 / (y * y), 0, 1 - H3_EPSILON));
}

export function computeH3DeltaPhi(nodeRadius, parentRadius) {
  const denominator = Math.sinh(parentRadius / H3_K);
  if (Math.abs(denominator) < H3_EPSILON) return Math.PI / 2;
  return Math.atan(Math.tanh(nodeRadius / H3_K) / denominator);
}

export function computeH3DeltaTheta(nodeRadius, parentRadius, phi) {
  const denominator = Math.sinh(parentRadius / H3_K) * Math.sin(phi);
  if (Math.abs(denominator) < H3_EPSILON) return Math.PI / 2;
  return Math.atan(Math.tanh(nodeRadius / H3_K) / denominator);
}

export function rotationX(angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [1, 0, 0, 0, 0, cos, -sin, 0, 0, sin, cos, 0, 0, 0, 0, 1];
}

export function rotationZ(angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [cos, -sin, 0, 0, sin, cos, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function multiplyMatrix4(a, b) {
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

export function transformPoint4(matrix, point) {
  return [
    matrix[0] * point[0] + matrix[1] * point[1] + matrix[2] * point[2] + matrix[3] * point[3],
    matrix[4] * point[0] + matrix[5] * point[1] + matrix[6] * point[2] + matrix[7] * point[3],
    matrix[8] * point[0] + matrix[9] * point[1] + matrix[10] * point[2] + matrix[11] * point[3],
    matrix[12] * point[0] + matrix[13] * point[1] + matrix[14] * point[2] + matrix[15] * point[3],
  ];
}

export function projectPoint4(point) {
  const w = Math.abs(point[3]) > H3_EPSILON ? point[3] : 1;
  return [point[0] / w, point[1] / w, point[2] / w];
}

export function normalizeVector(vector, fallback) {
  const x = Number(vector?.[0]);
  const y = Number(vector?.[1]);
  const z = Number(vector?.[2]);
  const length = Math.hypot(x, y, z);
  if (!Number.isFinite(length) || length <= 1e-9) return [...fallback];
  return [x / length, y / length, z / length];
}

export function minkowski(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] - a[3] * b[3];
}

export function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function distance3(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
