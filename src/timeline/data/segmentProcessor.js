import { getDevicePixelRatio, createSnapFunction, createAnchor, createAnchorTick, createConnection, createStripTrack } from '../utils/layerFactories.js';
import { msToX } from '../math/coordinateUtils.js';
import { getSegmentBounds, toTimelineItemId } from '../utils/segmentTiming.js';

const SEPARATOR_HEIGHT_FRACTION = 0.8;
const MIN_SEPARATOR_HEIGHT = 6;

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
  if (!timelineData?.cumulativeDurations || !Array.isArray(segments) || segments.length === 0) {
    return {
      anchorTicks: [],
      stripTracks: [],
      separators: [],
      anchorPoints: [],
      activeAnchorTicks: [],
      selectionAnchors: [],
      hoverAnchors: [],
      connections: [],
      selectionConnections: [],
      hoverConnections: []
    };
  }

  const snap = createSnapFunction(getDevicePixelRatio());

  const anchorTrees = { normal: [], selected: [], hovered: [] };
  const anchorTicks = { normal: [], active: [] };
  const transitions = { normal: [], selected: [], hovered: [] };
  const separators = [];
  const hasTransitions = segments.some(segment => segment && !segment.isFullTree);
  const markerProfile = getMarkerProfile(segments, width, theme);
  const stripTracks = markerProfile.mode === 'strip' && hasTransitions
    ? [createStripTrack(width, snap)]
    : [];

  for (let i = startIdx; i <= endIdx; i++) {
    const segment = segments[i];

    const bounds = getSegmentBounds(i, timelineData);
    if (!bounds) continue;

    if (bounds.end < visStart || bounds.start > visEnd) continue;

    const segmentId = toTimelineItemId(i);
    const state = segmentId === selectedId ? 'selected' : segmentId === lastHoverId ? 'hovered' : 'normal';

    const startX = msToX(bounds.start, rangeStart, rangeEnd, width);
    const endX = msToX(bounds.end, rangeStart, rangeEnd, width);

    const separator = createSeparator(startX, width, height, snap, markerProfile.mode);
    if (separator) separators.push(separator);

    if (segment.isFullTree) {
      if (markerProfile.mode === 'strip') {
        const tick = createAnchorTick(startX, endX, width, height, theme, snap);
        if (tick) {
          const bucket = state === 'selected' || state === 'hovered' ? 'active' : 'normal';
          anchorTicks[bucket].push(tick);
        }
        continue;
      }

      const anchor = createAnchor(
        segmentId, startX, endX, width, height,
        theme, zoomScale, snap
      );
      if (anchor) anchorTrees[state].push(anchor);
    } else {
      const connection = createConnection(
        i, segmentId, startX, endX, width, height,
        theme.anchorRadiusVar, zoomScale, theme.gapDefault, theme.connectionNeutralRGB, snap, segments
      );
      if (connection) transitions[state].push(connection);
    }
  }

  return {
    anchorTicks: anchorTicks.normal,
    stripTracks,
    separators,
    anchorPoints: anchorTrees.normal,
    activeAnchorTicks: anchorTicks.active,
    selectionAnchors: anchorTrees.selected,
    hoverAnchors: anchorTrees.hovered,
    connections: transitions.normal,
    selectionConnections: transitions.selected,
    hoverConnections: transitions.hovered
  };
}

function getMarkerProfile(segments, width, theme) {
  const anchorCount = segments.reduce((count, segment) => count + (segment?.isFullTree ? 1 : 0), 0);
  if (anchorCount <= 1) return { mode: 'circle', anchorCount };

  const pixelsPerAnchor = width / anchorCount;
  if (pixelsPerAnchor < theme.anchorDenseThresholdPx) return { mode: 'strip', anchorCount };
  return { mode: 'circle', anchorCount };
}

function createSeparator(x, width, height, snap, markerMode) {
  if (markerMode === 'strip') return null;

  const centeredX = snap(x - width / 2);
  const heightFraction = SEPARATOR_HEIGHT_FRACTION;
  const h = Math.max(MIN_SEPARATOR_HEIGHT, Math.floor(height * heightFraction));
  const halfHeight = h / 2;

  return {
    markerMode,
    path: [
      [centeredX, -halfHeight],
      [centeredX, halfHeight]
    ]
  };
}
