// Reusable output buffers to avoid per-call array allocations
const _flightDashOut = [0, 0];

function calculatePathLength(path) {
  if (!path || path.length < 2) return 0;

  let length = 0;

  // Handle flattened paths (e.g. [x0, y0, z0, x1, y1, z1, ...])
  // We detect this if the first element is a number (vs nested array)
  if (typeof path[0] === 'number') {
    // Determine coordinate stride (2 for XY, 3 for XYZ)
    // Most paths in our system are 2D or 3D flattened arrays
    const isXYZ = path.length % 3 === 0;
    const stride = isXYZ ? 3 : 2;

    for (let i = stride; i < path.length; i += stride) {
      const dx = path[i] - path[i - stride];
      const dy = path[i + 1] - path[i - stride + 1];
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  // Handle nested paths (e.g. [[x0, y0], [x1, y1], ...])
  for (let i = 1; i < path.length; i++) {
    const dx = path[i][0] - path[i - 1][0];
    const dy = path[i][1] - path[i - 1][1];
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

export function calculateFlightDashArray(path) {
  const pathLength = calculatePathLength(path);

  // Flight pattern: small dots with wide gaps

  // HANDLING SHORT PATHS:
  // If the path is short, the previous "wide gap" logic (dot * 3.5)
  // prevented any second dot from appearing.
  // We now force tighter spacing on short segments.
  if (pathLength < 50) {
    const dotSize = Math.max(1.5, pathLength / 12);
    const gapSize = dotSize * 1.5; // Tighter gap for short paths
    _flightDashOut[0] = dotSize;
    _flightDashOut[1] = gapSize;
    return _flightDashOut;
  }

  // STANDARD PATHS:
  // Aim for ~8-12 dots per edge to show trajectory
  const targetDots = 10;
  // Dots should be small but visible (e.g., 2-4px)
  const dotSize = Math.max(2, Math.min(6, pathLength / (targetDots * 4)));
  // Gaps should be significantly larger (e.g., 3-4x dot size)
  const gapSize = dotSize * 3.5;

  _flightDashOut[0] = dotSize;
  _flightDashOut[1] = gapSize;
  return _flightDashOut;
}
