import {
  getMetricBranchLength,
  getReadableVisualBranchLength,
} from '../../domain/tree/branchTransform.js';
import { LAYOUT_PROJECTION_MODES } from './hyperbolicProjection/constants.js';

/**
 * Rectangular (phylogram) layout: x is the root-to-node branch length, leaves
 * take evenly spaced rows in tree order, and each internal node sits midway
 * between its first and last child. Like the unrooted embedding it writes x/y
 * directly in a fixed world extent and leaves fitting to the camera.
 */
export const RECTANGULAR_WORLD_EXTENT = 500;

export function applyRectangularLayout(root) {
  let row = 0;
  root.eachBefore((node) => {
    const data = node.data || {};
    node.metricBranchLength = getMetricBranchLength(data);
    node.visualBranchLength = node.parent ? getReadableVisualBranchLength(data) : 0;
    node.x = node.parent ? node.parent.x + node.visualBranchLength : 0;
  });
  root.eachAfter((node) => {
    if (!node.children || node.children.length === 0) {
      node.y = row++;
    } else {
      node.y = (node.children[0].y + node.children[node.children.length - 1].y) / 2;
    }
  });

  const maxX = Math.max(...root.descendants().map((node) => node.x));
  // Square world: the tree spans the same extent across and down, so a fit
  // shows the whole topology and zooming reveals rows (and their labels).
  const scaleX = maxX > 0 ? RECTANGULAR_WORLD_EXTENT / maxX : 1;
  const scaleY = row > 1 ? RECTANGULAR_WORLD_EXTENT / (row - 1) : 1;
  root.each((node) => {
    node.x *= scaleX;
    node.y *= scaleY;
    node.visualBranchLength *= scaleX;
    node.projectionMode = LAYOUT_PROJECTION_MODES.RECTANGULAR;
    // Labels continue rightward from each tip.
    node.branchAngle = 0;
    node.radius = Math.hypot(node.x, node.y);
    node.rotatedAngle = Math.atan2(node.y, node.x);
  });
  return scaleX;
}
