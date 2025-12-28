import { getDevicePixelRatio, createSnapFunction, createAnchor, createConnection } from '../utils/layerFactories.js';
import { msToX } from '../math/coordinateUtils.js';

const SEPARATOR_HEIGHT_FRACTION = 0.8;
const MIN_SEPARATOR_HEIGHT = 6;
const SEGMENT_ID_OFFSET = 1;

/**
 * Converts timeline segments into visual elements for rendering.
 *
 * Timeline structure:
 * - Anchor trees (isFullTree=true): Original phylogenetic trees, shown as circles
 * - Transitions (isFullTree=false): Interpolated sequences between anchors, shown as lines
 * - Separators: Vertical ticks marking segment boundaries
 */
export function processSegments({
  startIdx, endIdx, width, height, visStart, visEnd, zoomScale, theme,
  timelineData, segments, selectedId, lastHoverId, rangeStart, rangeEnd
}) {
  const snap = createSnapFunction(getDevicePixelRatio());
  const { cumulativeDurations } = timelineData;

  const anchorTrees = { normal: [], selected: [], hovered: [] };
  const transitions = { normal: [], selected: [], hovered: [] };
  const separators = [];

  for (let i = startIdx; i <= endIdx; i++) {
    const segment = segments[i];
    const segmentStart = i === 0 ? 0 : cumulativeDurations[i - 1];
    const segmentEnd = cumulativeDurations[i];

    if (segmentEnd < visStart || segmentStart > visEnd) continue;

    const segmentId = i + SEGMENT_ID_OFFSET;
    const state = segmentId === selectedId ? 'selected' : segmentId === lastHoverId ? 'hovered' : 'normal';

    const startX = msToX(segmentStart, rangeStart, rangeEnd, width);
    const endX = msToX(segmentEnd, rangeStart, rangeEnd, width);

    separators.push(createSeparator(startX, width, height, snap));

    if (segment.isFullTree) {
      const anchor = createAnchor(
        segmentId, startX, endX, width, height,
        theme.anchorFillRGB, theme.anchorStrokeRGB, theme.anchorRadiusVar, zoomScale, snap
      );
      anchorTrees[state].push(anchor);
    } else {
      const connection = createConnection(
        i, segmentId, startX, endX, width, height,
        theme.anchorRadiusVar, zoomScale, theme.gapDefault, theme.connectionNeutralRGB, snap, segments
      );
      if (connection) transitions[state].push(connection);
    }
  }

  return {
    separators,
    anchorPoints: anchorTrees.normal,
    selectionAnchors: anchorTrees.selected,
    hoverAnchors: anchorTrees.hovered,
    connections: transitions.normal,
    selectionConnections: transitions.selected,
    hoverConnections: transitions.hovered
  };
}

function createSeparator(x, width, height, snap) {
  const centeredX = snap(x - width / 2);
  const h = Math.max(MIN_SEPARATOR_HEIGHT, Math.floor(height * SEPARATOR_HEIGHT_FRACTION));
  return { path: [[centeredX, -h / 2], [centeredX, h / 2]] };
}
