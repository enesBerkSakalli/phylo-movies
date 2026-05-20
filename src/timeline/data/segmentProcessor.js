import { getDevicePixelRatio, createSnapFunction, createInputTreeMarker, createInputTreeTick, createConnection, createStripTrack } from '../utils/layerFactories.js';
import { msToX } from '../math/coordinateUtils.js';
import { getSegmentBounds, toTimelineItemId } from '../utils/segmentTiming.js';

const SEPARATOR_HEIGHT_FRACTION = 0.8;
const MIN_SEPARATOR_HEIGHT = 6;

/**
 * Converts timeline segments into visual elements for rendering.
 *
 * Timeline structure:
 * - Input trees (isInputTreeSegment=true): Observed phylogenetic trees, shown as circles
 * - Transitions (isInputTreeSegment=false): Interpolated sequences between input trees, shown as lines
 * - Separators: Vertical ticks marking segment boundaries
 */
export function processSegments({
  startIdx, endIdx, width, height, visStart, visEnd, zoomScale, theme,
  timelineData, segments, selectedSegmentIndex, lastHoverId, rangeStart, rangeEnd
}) {
  if (!timelineData?.cumulativeDurations || !Array.isArray(segments) || segments.length === 0) {
    return {
      inputTreeTicks: [],
      stripTracks: [],
      separators: [],
      inputTreePoints: [],
      activeInputTreeTicks: [],
      selectionInputTrees: [],
      hoverInputTrees: [],
      connections: [],
      selectionConnections: [],
      hoverConnections: []
    };
  }

  const snap = createSnapFunction(getDevicePixelRatio());

  const inputTrees = { normal: [], selected: [], hovered: [] };
  const inputTreeTicks = { normal: [], active: [] };
  const transitions = { normal: [], selected: [], hovered: [] };
  const separators = [];
  const hasTransitions = segments.some(segment => segment && !segment.isInputTreeSegment);
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
    const state = i === selectedSegmentIndex ? 'selected' : segmentId === lastHoverId ? 'hovered' : 'normal';

    const startX = msToX(bounds.start, rangeStart, rangeEnd, width);
    const endX = msToX(bounds.end, rangeStart, rangeEnd, width);

    const separator = createSeparator(startX, width, height, snap, markerProfile.mode);
    if (separator) separators.push(separator);

    if (segment.isInputTreeSegment) {
      if (markerProfile.mode === 'strip') {
        const tick = createInputTreeTick(startX, endX, width, height, theme, snap);
        if (tick) {
          const bucket = state === 'selected' || state === 'hovered' ? 'active' : 'normal';
          inputTreeTicks[bucket].push(tick);
        }
        continue;
      }

      const inputTreeMarker = createInputTreeMarker(
        i, segmentId, startX, endX, width, height,
        theme, zoomScale, snap
      );
      if (inputTreeMarker) inputTrees[state].push(inputTreeMarker);
    } else {
      const connection = createConnection(
        i, segmentId, startX, endX, width, height,
        theme.inputTreeRadiusVar, zoomScale, theme.gapDefault, theme.connectionNeutralRGB, snap, segments
      );
      if (connection) transitions[state].push(connection);
    }
  }

  return {
    inputTreeTicks: inputTreeTicks.normal,
    stripTracks,
    separators,
    inputTreePoints: inputTrees.normal,
    activeInputTreeTicks: inputTreeTicks.active,
    selectionInputTrees: inputTrees.selected,
    hoverInputTrees: inputTrees.hovered,
    connections: transitions.normal,
    selectionConnections: transitions.selected,
    hoverConnections: transitions.hovered
  };
}

function getMarkerProfile(segments, width, theme) {
  const inputTreeCount = segments.reduce((count, segment) => count + (segment?.isInputTreeSegment ? 1 : 0), 0);
  if (inputTreeCount <= 1) return { mode: 'circle', inputTreeCount };

  const pixelsPerInputTree = width / inputTreeCount;
  if (pixelsPerInputTree < theme.inputTreeDenseThresholdPx) return { mode: 'strip', inputTreeCount };
  return { mode: 'circle', inputTreeCount };
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
