import { resolveTreeElementHighlight, TREE_HIGHLIGHT_ROLE } from '../highlightResolver.js';

/**
 * Flattened link paths are always XYZ (see pathFormat.js). Inferring the stride from
 * `length % 3` instead would read a 3-point XY path as 2 XYZ points.
 */
const FLAT_PATH_STRIDE = 3;

function calculatePathLength(path) {
  if (!path || path.length < 2) return 0;

  let length = 0;

  const elementCount = path.length;

  // Handle flattened paths (e.g. [x0, y0, z0, x1, y1, z1, ...])
  // We detect this if the first element is a number (vs nested array)
  if (typeof path[0] === 'number') {
    for (let i = FLAT_PATH_STRIDE; i < elementCount; i += FLAT_PATH_STRIDE) {
      const dx = path[i] - path[i - FLAT_PATH_STRIDE];
      const dy = path[i + 1] - path[i - FLAT_PATH_STRIDE + 1];
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  // Handle nested paths (e.g. [[x0, y0], [x1, y1], ...])
  for (let i = 1; i < elementCount; i++) {
    const dx = path[i][0] - path[i - 1][0];
    const dy = path[i][1] - path[i - 1][1];
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

function calculateFlightDashArray(path, outputBuffer) {
  const pathLength = calculatePathLength(path);

  // Flight pattern: small dots with wide gaps

  // HANDLING SHORT PATHS:
  // If the path is short, the previous "wide gap" logic (dot * 3.5)
  // prevented any second dot from appearing.
  // We now force tighter spacing on short segments.
  if (pathLength < 50) {
    const dotSize = Math.max(1.5, pathLength / 12);
    outputBuffer[0] = dotSize;
    outputBuffer[1] = dotSize * 1.5; // Tighter gap for short paths
    return outputBuffer;
  }

  // STANDARD PATHS:
  // Aim for ~8-12 dots per edge to show trajectory
  const targetDots = 10;
  // Dots should be small but visible (e.g., 2-4px)
  const dotSize = Math.max(2, Math.min(6, pathLength / (targetDots * 4)));

  outputBuffer[0] = dotSize;
  // Gaps should be significantly larger (e.g., 3-4x dot size)
  outputBuffer[1] = dotSize * 3.5;
  return outputBuffer;
}

/**
 * Resolves the dash pattern for a link's change-history state (shared by the
 * inner line and outline styles, which only differ in which reusable output
 * buffer they write into).
 *
 * @param {Object} link - Link data
 * @param {Object} cached - Cached render state
 * @param {[number, number]} outputBuffer - Caller-owned 2-element buffer to reuse
 * @returns {[number, number] | Float32Array | null} Dash array, or null for a solid line
 */
export function resolveChangeDashArray(link, cached, outputBuffer) {
  const { dashingEnabled, upcomingChangesEnabled } = cached;
  const highlight = resolveTreeElementHighlight(link, cached, 'link');

  // Done: SOLID (no dashing) - completed, stable
  if (upcomingChangesEnabled && highlight.role === TREE_HIGHLIGHT_ROLE.COMPLETED_CHANGE) {
    return null;
  }

  // Next: DOTTED (small dots) - future, anticipation
  if (upcomingChangesEnabled && highlight.role === TREE_HIGHLIGHT_ROLE.UPCOMING_CHANGE) {
    outputBuffer[0] = 3;
    outputBuffer[1] = 6;
    return outputBuffer; // Short on, longer off = dotted
  }

  // Current: DASHED (when dashing enabled) - active, in progress
  if (dashingEnabled && highlight.role === TREE_HIGHLIGHT_ROLE.PIVOT_EDGE) {
    return calculateFlightDashArray(link.path, outputBuffer);
  }

  return null; // Solid line for everything else
}
