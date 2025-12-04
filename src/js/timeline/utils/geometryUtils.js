import { rgba } from '../../msaViewer/utils/colorUtils.js';

/**
 * Convert from canvas coordinates [0, width] to centered coordinates [-width/2, width/2]
 */
function toCanvasCentered(x, canvasWidth) {
  return x - canvasWidth / 2;
}

/**
 * Clamp position to viewport bounds, accounting for circle radius
 */
function clampToViewport(x, radius, width) {
  const halfWidth = width / 2;
  return Math.max(-halfWidth + radius, Math.min(halfWidth - radius, x));
}

export function calculateRadius(anchorRadiusVar, height, zoomScale) {
  const baseRadius = Number.isFinite(anchorRadiusVar)
    ? anchorRadiusVar
    : Math.max(3, Math.min(6, Math.floor(height * 0.18)));
  const maxRadius = Math.floor(height * 0.25);
  const minRadius = 1;
  return Math.max(minRadius, Math.min(maxRadius, baseRadius * zoomScale));
}

/**
 * Calculate gaps between connection and neighboring anchors
 */
function calculateConnectionGaps(i, segments, anchorRadius, gapDefault) {
  const leftNeighborIsAnchor = (i > 0) && segments[i - 1]?.isFullTree;
  const rightNeighborIsAnchor = (i < segments.length - 1) && segments[i + 1]?.isFullTree;

  return {
    leftGap: leftNeighborIsAnchor ? anchorRadius : gapDefault,
    rightGap: rightNeighborIsAnchor ? anchorRadius : gapDefault
  };
}

export function createAnchor(id, x0, x1, width, height, anchorFillRGB, anchorStrokeRGB, anchorRadiusVar, zoomScale, snap) {
  const center = (x0 + x1) / 2;
  const radius = calculateRadius(anchorRadiusVar, height, zoomScale);

  const centeredX = toCanvasCentered(center, width);
  const clampedX = clampToViewport(centeredX, radius, width);
  const position = [snap(clampedX), 0];

  return {
    id,
    position,
    fillColor: rgba(...anchorFillRGB),
    borderColor: rgba(...anchorStrokeRGB),
    radius
  };
}

export function createConnection(i, id, x0, x1, width, height, anchorRadiusVar, zoomScale, gapDefault, connectionNeutralRGB, snap, segments) {
  const anchorRadius = calculateRadius(anchorRadiusVar, height, zoomScale);
  const { leftGap, rightGap } = calculateConnectionGaps(i, segments, anchorRadius, gapDefault);

  const xStart = snap(toCanvasCentered(x0, width) + leftGap);
  const xEnd = snap(toCanvasCentered(x1, width) - rightGap);
  if (xEnd <= xStart) return null;

  const path = [[xStart, 0], [xEnd, 0]];
  const color = rgba(...connectionNeutralRGB, 220);
  return { id, path, color };
}
