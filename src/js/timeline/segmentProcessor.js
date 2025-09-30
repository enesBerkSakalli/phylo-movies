import { getDevicePixelRatio, createSnapFunction } from './utils/renderingUtils.js';
import { msToX } from './utils/coordinateUtils.js';
import { createAnchor, createConnection } from './utils/geometryUtils.js';

// Visualization constants
const SEPARATOR_MIN_HEIGHT_PX = 6;            // Minimum tick height in pixels
const SEPARATOR_HEIGHT_FRACTION = 0.6;        // Fraction of available height used for tick
const ID_OFFSET = 1;                          // Convert 0-based index to 1-based id

export function processSegments(
  { startIdx, endIdx, width, height, visStart, visEnd, zoomScale, theme, timelineData, segments, selectedId, lastHoverId, rangeStart, rangeEnd },
  { radiusStrategy, gapStrategy }
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

  for (let i = startIdx; i <= endIdx; i++) {
    // Segment boundaries in milliseconds
    const segStartMs = i === 0 ? 0 : cumulativeDurations[i - 1];
    const segEndMs = cumulativeDurations[i];
    if (segEndMs < visStart || segStartMs > visEnd) continue;

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
        snap,
        { radiusStrategy }
      );
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
        segments,
        { radiusStrategy, gapStrategy }
      );
      if (!connection) continue;
      connections.push(connection);
      if (selectedId === id) selectionConnections.push(connection);
      else if (lastHoverId === id) hoverConnections.push(connection);
    }
  }

  return { separators, anchorPoints, selectionAnchors, hoverAnchors, connections, selectionConnections, hoverConnections };
}
