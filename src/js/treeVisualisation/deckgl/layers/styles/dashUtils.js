export function calculatePathLength(path) {
  if (!path || path.length < 2) return 0;

  let length = 0;
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

  // Scale dash pattern based on path length
  // Aim for ~5-8 dashes per edge, with min/max bounds
  const targetDashes = 6;
  const dashUnit = Math.max(4, Math.min(20, pathLength / (targetDashes * 1.5)));
  const gapUnit = dashUnit * 0.5;

  return [dashUnit, gapUnit];
}

export function calculateFlightDashArray(path) {
  const pathLength = calculatePathLength(path);

  // Flight pattern: small dots with wide gaps
  // Aim for ~8-12 dots per edge to show trajectory
  const targetDots = 10;
  // Dots should be small but visible (e.g., 2-4px)
  const dotSize = Math.max(2, Math.min(6, pathLength / (targetDots * 4)));
  // Gaps should be significantly larger (e.g., 3-4x dot size)
  const gapSize = dotSize * 3.5;

  return [dotSize, gapSize];
}
