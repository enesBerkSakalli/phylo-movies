export function calculatePathLength(path) {
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

export function calculateDashArray(path) {
  // Calculate path length for proportional dashing
  const pathLength = calculatePathLength(path);

  // For very short paths, ensure we still see a Dash-Gap pattern
  // Instead of clamping at 4px minimum, we scale down
  if (pathLength < 20) {
    // Ensure at least ~2.5 cycles so it looks dashed
    // cycle = dash + gap. Let gap = 0.5 * dash.
    // Length = 2.5 * (1.5 * dash) = 3.75 * dash
    // dash = Length / 3.75
    const dash = Math.max(1, pathLength / 4);
    return [dash, dash * 0.5];
  }

  // Scale dash pattern based on path length for longer paths
  const targetDashes = 6;
  const dashUnit = Math.max(4, Math.min(20, pathLength / (targetDashes * 1.5)));
  const gapUnit = dashUnit * 0.5;

  return [dashUnit, gapUnit];
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
    return [dotSize, gapSize];
  }

  // STANDARD PATHS:
  // Aim for ~8-12 dots per edge to show trajectory
  const targetDots = 10;
  // Dots should be small but visible (e.g., 2-4px)
  const dotSize = Math.max(2, Math.min(6, pathLength / (targetDots * 4)));
  // Gaps should be significantly larger (e.g., 3-4x dot size)
  const gapSize = dotSize * 3.5;

  return [dotSize, gapSize];
}
