const EMPTY_FLOAT32_PATH = new Float32Array(0);

export function pointsToFloat32Path(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return emptyPath();
  }

  const path = new Float32Array(points.length * 3);
  points.forEach((point, index) => {
    const offset = index * 3;
    path[offset] = point?.[0] ?? point?.x ?? 0;
    path[offset + 1] = point?.[1] ?? point?.y ?? 0;
    path[offset + 2] = point?.[2] ?? point?.z ?? 0;
  });

  return isFiniteFlatPath(path) ? path : emptyPath();
}

export function twoPointFloat32Path(from, to) {
  if (!hasFinitePoint(from) || !hasFinitePoint(to)) {
    return emptyPath();
  }

  return new Float32Array([from[0], from[1], from[2] ?? 0, to[0], to[1], to[2] ?? 0]);
}

/**
 * The last segment of a path: for an elbow or arc branch, the part that carries the branch
 * length. Flat paths hold three values per point; a path of one segment is returned as it is.
 */
export function lastPathSegment(path) {
  if (isTypedArray(path)) return path.length > 6 ? path.slice(path.length - 6) : path;
  if (Array.isArray(path) && Array.isArray(path[0])) return path.length > 2 ? path.slice(-2) : path;
  return path;
}

/** The two end points ([x, y, z]) of a path's last segment, or null for an empty or flat 2D path. */
export function lastSegmentPoints(path) {
  const segment = lastPathSegment(path);
  if (isTypedArray(segment)) {
    return segment.length === 6
      ? [Array.from(segment.slice(0, 3)), Array.from(segment.slice(3))]
      : null;
  }
  return Array.isArray(segment) && segment.length === 2 && Array.isArray(segment[0])
    ? segment
    : null;
}

/** Phylogram branch: down/up the parent's column, then across to the child. */
export function rectangularElbowFloat32Path(from, to) {
  if (!hasFinitePoint(from) || !hasFinitePoint(to)) {
    return emptyPath();
  }

  const z = from[2] ?? 0;
  return new Float32Array([from[0], from[1], z, from[0], to[1], z, to[0], to[1], to[2] ?? 0]);
}

export function safeDeckPath(path) {
  return isFiniteDeckPath(path) ? path : emptyPath();
}

function isFiniteDeckPath(path) {
  if (!path) return false;

  if (isTypedArray(path)) {
    return isFiniteFlatPath(path);
  }

  if (Array.isArray(path)) {
    if (!path.length) return true;
    if (Array.isArray(path[0])) {
      return path.length >= 2 && path.every(hasFinitePoint);
    }
    return isFiniteFlatPath(path);
  }

  return false;
}

function isFiniteFlatPath(path) {
  const length = path?.length ?? 0;
  if (length === 0) return true;
  if (length < 4) return false;
  if (length % 2 !== 0 && length % 3 !== 0) return false;

  for (let index = 0; index < length; index += 1) {
    if (!Number.isFinite(path[index])) return false;
  }
  return true;
}

function hasFinitePoint(point) {
  return (
    Number.isFinite(point?.[0]) && Number.isFinite(point?.[1]) && Number.isFinite(point?.[2] ?? 0)
  );
}

function isTypedArray(value) {
  return ArrayBuffer.isView(value) && typeof value?.BYTES_PER_ELEMENT === 'number';
}

function emptyPath() {
  return EMPTY_FLOAT32_PATH;
}
