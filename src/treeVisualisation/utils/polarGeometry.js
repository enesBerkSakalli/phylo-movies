import { shortestAngle, crossesAngle, longArcDelta } from '../../domain/math/mathUtils.js';

const TAU = Math.PI * 2;
const CARTESIAN_PROJECTION_MODES = new Set(['walrus-3d']);
const Z_EPSILON = 1e-9;

export function interpolateScalar(from, to, t, fallback = 0) {
  const fromValue = Number.isFinite(from) ? from : fallback;
  const toValue = Number.isFinite(to) ? to : fromValue;
  return fromValue + (toValue - fromValue) * t;
}

export function interpolateOptionalScalar(from, to, t) {
  const fromValue = from == null ? NaN : Number(from);
  const toValue = to == null ? NaN : Number(to);
  const hasFrom = Number.isFinite(fromValue);
  const hasTo = Number.isFinite(toValue);

  if (hasFrom && hasTo) return fromValue + (toValue - fromValue) * t;
  if (hasTo) return toValue;
  if (hasFrom) return fromValue;
  return null;
}

export function rootAwareAngleDelta(fromAngle, toAngle, rootAngle = 0) {
  const from = Number.isFinite(fromAngle) ? fromAngle : 0;
  const to = Number.isFinite(toAngle) ? toAngle : 0;
  const shortDelta = shortestAngle(from, to);
  const shortEndAngle = from + shortDelta;
  return crossesAngle(from, shortEndAngle, rootAngle) ? longArcDelta(shortDelta) : shortDelta;
}

export function interpolatePolarPosition(fromElement, toElement, t, options = {}) {
  if (!fromElement || !toElement) return [0, 0, 0];
  if (usesCartesianPositionInterpolation(fromElement, toElement)) {
    const position = interpolateCartesianPosition(fromElement, toElement, t);
    if (position) return position;
  }

  const angularT = options.velocityEntry?.angularT ?? t;
  const fromRadius = fromElement.polarPosition ?? fromElement.radius ?? 0;
  const toRadius = toElement.polarPosition ?? toElement.radius ?? 0;
  const radius = interpolateScalar(fromRadius, toRadius, t);
  const fromAngle = Number.isFinite(fromElement.angle) ? fromElement.angle : 0;
  const toAngle = Number.isFinite(toElement.angle) ? toElement.angle : 0;
  const angle =
    fromAngle + rootAwareAngleDelta(fromAngle, toAngle, options.rootAngle ?? 0) * angularT;

  return positionFromPolar(radius, angle, 0);
}

export function usesCartesianPositionInterpolation(fromElement, toElement) {
  return (
    hasCartesianProjectionMode(fromElement) ||
    hasCartesianProjectionMode(toElement) ||
    hasNonzeroPositionZ(fromElement) ||
    hasNonzeroPositionZ(toElement)
  );
}

export function interpolateCartesianPosition(fromElement, toElement, t) {
  const fromPosition = readElementPosition(fromElement);
  const toPosition = readElementPosition(toElement);
  if (!fromPosition && !toPosition) return null;
  return interpolateVector3(fromPosition || toPosition, toPosition || fromPosition, t);
}

export function interpolateVector3(fromPosition, toPosition, t) {
  const from = normalizePosition3(fromPosition);
  const to = normalizePosition3(toPosition);
  if (!from && !to) return [0, 0, 0];
  const a = from || to;
  const b = to || from;
  return [
    interpolateScalar(a[0], b[0], t),
    interpolateScalar(a[1], b[1], t),
    interpolateScalar(a[2], b[2], t),
  ];
}

export function normalizePosition3(position) {
  if (!Array.isArray(position) && !ArrayBuffer.isView(position)) return null;
  const x = Number(position[0]);
  const y = Number(position[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const z = Number(position[2]);
  return [x, y, Number.isFinite(z) ? z : 0];
}

export function normalizeDirection3(direction, fallbackPosition, fallback = [0, 0, 1]) {
  const source =
    (Array.isArray(direction) || ArrayBuffer.isView(direction)) && direction.length >= 3
      ? direction
      : fallbackPosition;
  const vector = normalizePosition3(source);
  if (!vector) return fallback;

  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (!Number.isFinite(length) || length <= Z_EPSILON) return fallback;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

export function positionToPolar(position) {
  const x = Array.isArray(position) || ArrayBuffer.isView(position) ? Number(position[0]) : 0;
  const y = Array.isArray(position) || ArrayBuffer.isView(position) ? Number(position[1]) : 0;
  return {
    angle: Math.atan2(Number.isFinite(y) ? y : 0, Number.isFinite(x) ? x : 0),
    radius: Math.hypot(Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0),
  };
}

export function angleFromPosition(position, fallback = 0) {
  if (
    (Array.isArray(position) || ArrayBuffer.isView(position)) &&
    Number.isFinite(position[0]) &&
    Number.isFinite(position[1])
  ) {
    return Math.atan2(position[1], position[0]);
  }
  return Number.isFinite(fallback) ? fallback : 0;
}

export function positionFromPolar(radius, angle, z = 0) {
  const r = Number.isFinite(radius) ? radius : 0;
  const a = Number.isFinite(angle) ? angle : 0;
  return [r * Math.cos(a), r * Math.sin(a), z ?? 0];
}

export function polarToPosition(element) {
  const radius = Number(element?.polarPosition ?? element?.radius) || 0;
  const angle = Number(element?.angle) || 0;
  return positionFromPolar(radius, angle, 0);
}

export function shouldFlipLabel(angle) {
  const normalized = ((angle % TAU) + TAU) % TAU;
  return normalized > Math.PI / 2 && normalized < Math.PI * 1.5;
}

export function labelRotation(angle, needsFlip = shouldFlipLabel(angle)) {
  return needsFlip ? -angle + Math.PI : -angle;
}

export function labelTextAnchor(needsFlip) {
  return needsFlip ? 'end' : 'start';
}

export function firstPathPoint(path) {
  if (!path) return null;

  if (ArrayBuffer.isView(path) && path.length >= 3) {
    return [path[0], path[1], path[2]];
  }

  if (Array.isArray(path) && path.length > 0) {
    const first = path[0];
    return Array.isArray(first) ? first : null;
  }

  return null;
}

export function lastPathPoint(path) {
  if (!path) return null;

  if (ArrayBuffer.isView(path) && path.length >= 3) {
    return [path[path.length - 3], path[path.length - 2], path[path.length - 1]];
  }

  if (Array.isArray(path) && path.length > 0) {
    const last = path[path.length - 1];
    return Array.isArray(last) ? last : null;
  }

  return null;
}

function hasCartesianProjectionMode(element) {
  return CARTESIAN_PROJECTION_MODES.has(element?.projectionMode);
}

function hasNonzeroPositionZ(element) {
  const position = readElementPosition(element);
  return position ? Math.abs(position[2]) > Z_EPSILON : false;
}

function readElementPosition(element) {
  if (!element) return null;
  const rawPosition = element.position;
  if (Array.isArray(rawPosition) || ArrayBuffer.isView(rawPosition)) {
    return normalizePosition3(rawPosition);
  }

  const x = Number(element.x);
  const y = Number(element.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const z = Number(element.z);
  return [x, y, Number.isFinite(z) ? z : 0];
}
