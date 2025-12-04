import { getDevicePixelRatio, createSnapFunction } from '../utils/renderingUtils.js';
import { msToX } from '../utils/coordinateUtils.js';
import { createAnchor, createConnection, calculateRadius } from '../utils/geometryUtils.js';

// Visualization constants
const SEPARATOR_MIN_HEIGHT_PX = 6;            // Minimum tick height in pixels
const SEPARATOR_HEIGHT_FRACTION = 0.6;        // Fraction of available height used for tick
const ID_OFFSET = 1;                          // Convert 0-based index to 1-based id

export function processSegments(
  { startIdx, endIdx, width, height, visStart, visEnd, zoomScale, theme, timelineData, segments, selectedId, lastHoverId, rangeStart, rangeEnd }
) {
  const dpr = getDevicePixelRatio();
  const snap = createSnapFunction(dpr);

  const { anchorFillRGB, anchorStrokeRGB, anchorRadiusVar, gapDefault, connectionNeutralRGB } = theme;
  const { cumulativeDurations } = timelineData;

  const anchorPoints = [];
  const selectionAnchors = [];
  const hoverAnchors = [];
  const connections = [];
  const selectionConnections = [];
  const hoverConnections = [];
  const separators = [];
  // Track consecutive anchors at the same timestamp to avoid overlap
  let lastAnchorMs = null;
  let duplicateAnchorCount = 0;

  for (let i = startIdx; i <= endIdx; i++) {
    // Segment boundaries in milliseconds
    const segStartMs = i === 0 ? 0 : cumulativeDurations[i - 1];
    const segEndMs = cumulativeDurations[i];
    if (segEndMs < visStart || segStartMs > visEnd) {
      continue;
    }

    // Convert ms to pixel space [0, width]
    const xStartPx = msToX(segStartMs, rangeStart, rangeEnd, width);
    const xEndPx = msToX(segEndMs, rangeStart, rangeEnd, width);
    const id = i + ID_OFFSET;
    const isFullTree = !!segments[i]?.isFullTree;

    // Vertical separator tick at segment start (convert to centered coordinates)
    const separatorX = snap(xStartPx - width / 2);
    const separatorHeight = Math.max(
      SEPARATOR_MIN_HEIGHT_PX,
      Math.floor(height * SEPARATOR_HEIGHT_FRACTION)
    );
    separators.push({ path: [[separatorX, -separatorHeight / 2], [separatorX, separatorHeight / 2]] });

    if (isFullTree) {
      const anchor = createAnchor(
        id,
        xStartPx,
        xEndPx,
        width,
        height,
        anchorFillRGB,
        anchorStrokeRGB,
        anchorRadiusVar,
        zoomScale,
        snap
      );

      // If multiple anchors share the same timestamp, offset slightly to keep them visible
      if (lastAnchorMs !== null && segStartMs === lastAnchorMs) {
        duplicateAnchorCount += 1;
        const radius = calculateRadius(anchorRadiusVar, height, zoomScale);
        const spacing = Math.max(4, Math.floor(radius * 3)); // Increased from 2 and 1.2 to 4 and 3
        const minX = -width / 2 + radius;
        const maxX = width / 2 - radius;
        // Prefer shifting inward if we're at an edge; else alternate sides
        const atRightEdge = Math.abs(anchor.position[0] - maxX) < 0.5;
        const atLeftEdge = Math.abs(anchor.position[0] - minX) < 0.5;
        const dir = atRightEdge ? -1 : atLeftEdge ? 1 : ((duplicateAnchorCount % 2 === 1) ? 1 : -1);
        const offset = dir * spacing * Math.ceil((duplicateAnchorCount + 1) / 2);
        const shiftedX = Math.max(minX, Math.min(maxX, anchor.position[0] + offset));
        anchor.position = [snap(shiftedX), 0];
      } else {
        lastAnchorMs = segStartMs;
        duplicateAnchorCount = 0;
      }
      anchorPoints.push(anchor);
      if (selectedId === id) selectionAnchors.push(anchor);
      else if (lastHoverId === id) hoverAnchors.push(anchor);
    } else {
      const connection = createConnection(
        i,
        id,
        xStartPx,
        xEndPx,
        width,
        height,
        anchorRadiusVar,
        zoomScale,
        gapDefault,
        connectionNeutralRGB,
        snap,
        segments
      );
      if (!connection) continue;
      connections.push(connection);
      if (selectedId === id) selectionConnections.push(connection);
      else if (lastHoverId === id) hoverConnections.push(connection);
    }
  }

  return { separators, anchorPoints, selectionAnchors, hoverAnchors, connections, selectionConnections, hoverConnections };
}
