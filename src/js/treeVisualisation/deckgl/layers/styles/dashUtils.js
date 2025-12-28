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
