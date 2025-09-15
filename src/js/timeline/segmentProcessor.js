import { getDevicePixelRatio, createSnapFunction } from './utils/renderingUtils.js';
import { msToX } from './utils/coordinateUtils.js';
import { createAnchor, createConnection } from './utils/geometryUtils.js';

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
    const segStart = i === 0 ? 0 : cumulativeDurations[i - 1];
    const segEnd = cumulativeDurations[i];
    if (segEnd < visStart || segStart > visEnd) continue;

    const x0 = msToX(segStart, rangeStart, rangeEnd, width);
    const x1 = msToX(segEnd, rangeStart, rangeEnd, width);
    const id = i + 1;
    const isAnchor = !!segments[i]?.isFullTree;

    const tickX = snap(x0 - width / 2);
    const tickH = Math.max(6, Math.floor(height * 0.6));
    separators.push({ path: [[tickX, -tickH / 2], [tickX, tickH / 2]] });

    if (isAnchor) {
      const anchor = createAnchor(id, x0, x1, width, height, anchorFillRGB, anchorStrokeRGB, anchorRadiusVar, zoomScale, snap, { radiusStrategy });
      anchorPoints.push(anchor);
      if (selectedId === id) selectionAnchors.push(anchor);
      else if (lastHoverId === id) hoverAnchors.push(anchor);
    } else {
      const item = createConnection(i, id, x0, x1, width, height, anchorRadiusVar, zoomScale, gapDefault, connectionNeutralRGB, snap, segments, { radiusStrategy, gapStrategy });
      if (!item) continue;
      connections.push(item);
      if (selectedId === id) selectionConnections.push(item);
      else if (lastHoverId === id) hoverConnections.push(item);
    }
  }

  return { separators, anchorPoints, selectionAnchors, hoverAnchors, connections, selectionConnections, hoverConnections };
}
