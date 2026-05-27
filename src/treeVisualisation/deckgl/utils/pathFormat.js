export function pointsToFloat32Path(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return new Float32Array(0);
  }

  const path = new Float32Array(points.length * 3);
  points.forEach((point, index) => {
    const offset = index * 3;
    path[offset] = point?.[0] ?? point?.x ?? 0;
    path[offset + 1] = point?.[1] ?? point?.y ?? 0;
    path[offset + 2] = point?.[2] ?? point?.z ?? 0;
  });

  return path;
}

export function twoPointFloat32Path(from, to) {
  if (!from || !to) {
    return new Float32Array(0);
  }

  return new Float32Array([from[0], from[1], from[2] ?? 0, to[0], to[1], to[2] ?? 0]);
}
