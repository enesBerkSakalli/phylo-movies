export function resolveMaxRadius(root, fallback) {
  const fallbackNumber = Number(fallback);
  if (Number.isFinite(fallbackNumber) && fallbackNumber > 0) return fallbackNumber;

  let maxRadius = 0;
  root.each((node) => {
    const radius = Number(node.radius);
    if (Number.isFinite(radius)) {
      maxRadius = Math.max(maxRadius, radius);
    }
  });
  return maxRadius;
}
