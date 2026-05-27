import { shortestAngle, crossesAngle, longArcDelta } from '../../domain/math/mathUtils.js';

const TAU = Math.PI * 2;

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

export function replaceLastPathPoint(path, point) {
  if (!path) return path;

  if (ArrayBuffer.isView(path) && path.length >= 3) {
    const copy = new path.constructor(path);
    copy[copy.length - 3] = point[0];
    copy[copy.length - 2] = point[1];
    copy[copy.length - 1] = point[2] ?? 0;
    return copy;
  }

  if (Array.isArray(path) && path.length > 0) {
    const copy = path.map((item) => (Array.isArray(item) ? [...item] : item));
    copy[copy.length - 1] = point;
    return copy;
  }

  return path;
}
