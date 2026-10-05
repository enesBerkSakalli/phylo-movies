import {
  getDevicePixelRatio,
  createSnapFunction,
  createInputTreeMarker,
  createInputTreeTick,
  createBaseline,
} from '../utils/layerFactories.js';
import { msToX } from '../math/coordinateUtils.js';
import { getSegmentBounds, toTimelineItemId } from '../utils/segmentTiming.js';

const SEPARATOR_HEIGHT_FRACTION = 0.8;
const MIN_SEPARATOR_HEIGHT = 6;

/**
 * Converts timeline segments into visual elements for rendering.
 *
 * Timeline structure:
 * - Input trees (isInputTreeSegment=true): Observed phylogenetic trees, shown as circles
 * - Transitions (isInputTreeSegment=false): Interpolated sequences between input trees; drawn per
 *   pair by pairStripGeometry, not here
 * - Baseline: the strip's full-range line the input trees sit on
 * - Separators: Vertical ticks marking segment boundaries
 */
export function processSegments({
  startIdx,
  endIdx,
  width,
  height,
  visStart,
  visEnd,
  zoomScale,
  theme,
  timelineData,
  segments,
  selectedSegmentIndex,
  lastHoverId,
  rangeStart,
  rangeEnd,
}) {
  if (!timelineData?.cumulativeDurations || !Array.isArray(segments) || segments.length === 0) {
    return {
      inputTreeTicks: [],
      baselines: [],
      separators: [],
      inputTreePoints: [],
      activeInputTreeTicks: [],
      selectionInputTrees: [],
      hoverInputTrees: [],
    };
  }

  const snap = createSnapFunction(getDevicePixelRatio());

  const inputTrees = { normal: [], selected: [], hovered: [] };
  const inputTreeTicks = { normal: [], active: [] };
  const separators = [];
  const markerProfile = getMarkerProfile(segments, width, theme);

  for (let i = startIdx; i <= endIdx; i++) {
    const segment = segments[i];

    const bounds = getSegmentBounds(i, timelineData);
    if (!bounds) continue;

    if (bounds.end < visStart || bounds.start > visEnd) continue;

    const segmentId = toTimelineItemId(i);
    const state =
      i === selectedSegmentIndex ? 'selected' : segmentId === lastHoverId ? 'hovered' : 'normal';

    const startX = msToX(bounds.start, rangeStart, rangeEnd, width);
    const endX = msToX(bounds.end, rangeStart, rangeEnd, width);

    const separator = createSeparator(startX, width, height, theme, snap, markerProfile.mode);
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
        i,
        segmentId,
        startX,
        endX,
        width,
        height,
        theme,
        zoomScale,
        snap
      );
      if (inputTreeMarker) inputTrees[state].push(inputTreeMarker);
    }
  }

  return {
    inputTreeTicks: inputTreeTicks.normal,
    baselines: [createBaseline(width, height, theme, snap)],
    separators,
    inputTreePoints: inputTrees.normal,
    activeInputTreeTicks: inputTreeTicks.active,
    selectionInputTrees: inputTrees.selected,
    hoverInputTrees: inputTrees.hovered,
  };
}

function getMarkerProfile(segments, width, theme) {
  const inputTreeCount = segments.reduce(
    (count, segment) => count + (segment?.isInputTreeSegment ? 1 : 0),
    0
  );
  if (inputTreeCount <= 1) return { mode: 'circle', inputTreeCount };

  const pixelsPerInputTree = width / inputTreeCount;
  if (pixelsPerInputTree < theme.inputTreeDenseThresholdPx)
    return { mode: 'strip', inputTreeCount };
  return { mode: 'circle', inputTreeCount };
}

function createSeparator(x, width, height, theme, snap, markerMode) {
  if (markerMode === 'strip') return null;

  const centeredX = snap(x - width / 2);
  const baselineY = height / 2 - theme.stripBaselineY;
  const heightFraction = SEPARATOR_HEIGHT_FRACTION;
  const h = Math.max(MIN_SEPARATOR_HEIGHT, Math.floor(height * heightFraction));
  // Centred on the baseline, but never past the bottom of the strip
  const halfHeight = Math.min(h / 2, baselineY + height / 2);

  return {
    markerMode,
    path: [
      [centeredX, baselineY - halfHeight],
      [centeredX, baselineY + halfHeight],
    ],
  };
}
