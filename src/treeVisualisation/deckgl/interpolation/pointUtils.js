export function pointsMatch(a, b, epsilon = 1e-6) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    Math.abs((a[0] ?? 0) - (b[0] ?? 0)) <= epsilon &&
    Math.abs((a[1] ?? 0) - (b[1] ?? 0)) <= epsilon &&
    Math.abs((a[2] ?? 0) - (b[2] ?? 0)) <= epsilon
  );
}
