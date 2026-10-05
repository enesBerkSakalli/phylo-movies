import { msToX } from './math/coordinateUtils.js';
import { getSegmentBounds } from './utils/segmentTiming.js';
import { rgba } from '../services/ui/colorUtils.js';

/**
 * The strip as plain geometry, no deck.gl: input trees as circles or ticks, and one mark per
 * input-tree pair (not per playback segment): a bar for its RF, dashes for a branch-length-only
 * change, and one pip per SPR move. Spans are built once, in movie time; projectPairStrip turns
 * them into canvas geometry for the visible range.
 */

export function getDevicePixelRatio() {
  return typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
}

export function createSnapFunction(dpr) {
  return (v) => Math.round(v * dpr) / dpr;
}

/**
 * @param {Object} args
 * @param {Object[]} args.segments
 * @param {{cumulativeDurations: number[]}} args.timelineData
 * @param {{byPairId: Map<string, Object>}} args.profile - buildPairChangeProfile() result
 * @param {(frameIndex: number) => number|null} args.frameToMs
 * @returns {{pairId: string, startMs: number, endMs: number, kind: string, rf: number|null, pips: {ms: number, taxaCount: number}[]}[]}
 */
export function buildPairSpans({ segments, timelineData, profile, frameToMs }) {
  const spansByPairId = new Map();
  segments.forEach((segment, index) => {
    if (segment.isInputTreeSegment) return;
    const bounds = getSegmentBounds(index, timelineData);
    const change = profile.byPairId.get(segment.pairId);
    if (!bounds || !change) return;

    const span = spansByPairId.get(segment.pairId);
    if (span) {
      span.endMs = bounds.end;
      return;
    }
    spansByPairId.set(segment.pairId, {
      pairId: segment.pairId,
      startMs: bounds.start,
      endMs: bounds.end,
      kind: change.kind,
      rf: change.rf,
      pips: change.sprMoves.flatMap((move) => {
        const ms = frameRangeMidpointToMs(move, frameToMs);
        return ms === null ? [] : [{ ms, taxaCount: move.taxaCount }];
      }),
    });
  });
  return [...spansByPairId.values()];
}

function frameRangeMidpointToMs({ frameStart, frameEnd }, frameToMs) {
  const midpoint = (frameStart + frameEnd) / 2;
  const before = frameToMs(Math.floor(midpoint));
  const after = frameToMs(Math.ceil(midpoint));
  if (before === null || after === null) return before ?? after;
  return before + (after - before) * (midpoint - Math.floor(midpoint));
}

/**
 * @returns {{marks, hoverMarks, selectionMarks, pips, selectionPips, selectionSpan}} canvas-centred
 *   geometry: marks are {pairId, polygon}, pips are {pairId, position, radius}.
 */
export function projectPairStrip({
  spans,
  maxRf,
  rangeStart,
  rangeEnd,
  visStart,
  visEnd,
  width,
  height,
  theme,
  hoverPairId = null,
  selectedPairId = null,
  selectedBounds = null,
}) {
  const toX = (ms) => msToX(ms, rangeStart, rangeEnd, width) - width / 2;
  const toY = (fromTop) => height / 2 - fromTop;
  const baseline = toY(theme.stripBaselineY);
  const pipY = toY(theme.stripPipY);

  const marks = [];
  const pips = [];
  for (const span of spans) {
    if (span.endMs < visStart || span.startMs > visEnd) continue;

    const left = toX(span.startMs);
    const right = toX(span.endMs);
    if (span.kind === 'branch-lengths') {
      marks.push(...dashes(span.pairId, left, right, width, theme, toY));
    } else if (span.rf > 0) {
      const barHeight = Math.max(
        theme.stripBarMinHeight,
        Math.round((theme.stripBarMaxHeight * span.rf) / maxRf)
      );
      const [x0, x1] = insetBar(left, right, theme);
      marks.push({ pairId: span.pairId, polygon: rect(x0, x1, baseline, baseline + barHeight) });
    }
    for (const { ms, taxaCount } of span.pips) {
      pips.push({
        pairId: span.pairId,
        position: [toX(ms), pipY],
        radius: Math.min(
          theme.stripPipRadiusMax,
          theme.stripPipRadiusBase + theme.stripPipRadiusPerSqrtTaxon * Math.sqrt(taxaCount)
        ),
      });
    }
  }

  return {
    marks,
    hoverMarks: marks.filter((mark) => mark.pairId === hoverPairId),
    selectionMarks: marks.filter((mark) => mark.pairId === selectedPairId),
    pips,
    selectionPips: pips.filter((pip) => pip.pairId === selectedPairId),
    selectionSpan: selectedBounds
      ? [
          {
            polygon: rect(
              toX(selectedBounds.start),
              toX(selectedBounds.end),
              baseline,
              toY(theme.stripBaselineY + theme.stripSelectionSpanWidth)
            ),
          },
        ]
      : [],
  };
}

function insetBar(left, right, theme) {
  const x0 = left + theme.stripBarInset;
  const x1 = right - theme.stripBarInset;
  if (x1 - x0 >= theme.stripBarMinWidth) return [x0, x1];
  const center = (left + right) / 2;
  return [center - theme.stripBarMinWidth / 2, center + theme.stripBarMinWidth / 2];
}

// Only the dashes inside the viewport are made, so a deeply zoomed pair stays cheap.
function dashes(pairId, left, right, width, theme, toY) {
  const period = theme.stripDashLength + theme.stripDashGap;
  const top = toY(theme.stripBaselineY - theme.stripDashWidth / 2);
  const bottom = toY(theme.stripBaselineY + theme.stripDashWidth / 2);
  const first = Math.max(0, Math.floor((-width / 2 - left) / period));
  const result = [];
  for (let x = left + first * period; x < right && x < width / 2; x += period) {
    const end = Math.min(x + theme.stripDashLength, right);
    result.push({ pairId, polygon: rect(x, end, bottom, top) });
  }
  return result;
}

function rect(x0, x1, y0, y1) {
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

const SEPARATOR_HEIGHT_FRACTION = 0.8;
const MIN_SEPARATOR_HEIGHT = 6;

/**
 * Converts timeline segments into visual elements for rendering.
 *
 * Timeline structure:
 * - Input trees (isInputTreeSegment=true): Observed phylogenetic trees, shown as circles
 * - Transitions (isInputTreeSegment=false): Interpolated sequences between input trees; drawn per
 *   pair by projectPairStrip, not here
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
  hoverIndex,
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

    const state = i === selectedSegmentIndex ? 'selected' : i === hoverIndex ? 'hovered' : 'normal';

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
  const y = baselineY(height, theme);
  const h = Math.max(MIN_SEPARATOR_HEIGHT, Math.floor(height * SEPARATOR_HEIGHT_FRACTION));
  // Centred on the baseline, but never past the bottom of the strip
  const halfHeight = Math.min(h / 2, y + height / 2);

  return {
    markerMode,
    path: [
      [centeredX, y - halfHeight],
      [centeredX, y + halfHeight],
    ],
  };
}

function toCanvasCentered(x, canvasWidth) {
  return x - canvasWidth / 2;
}

// The canvas is centred and y points up; the strip's own y counts down from its top.
function baselineY(height, theme) {
  return height / 2 - theme.stripBaselineY;
}

function clampToViewport(x, radius, width) {
  const halfWidth = width / 2;
  return Math.max(-halfWidth + radius, Math.min(halfWidth - radius, x));
}

function calculateRadius(inputTreeRadiusVar, height, zoomScale) {
  const baseRadius = Number.isFinite(inputTreeRadiusVar)
    ? inputTreeRadiusVar
    : Math.max(3, Math.min(6, Math.floor(height * 0.18)));
  const maxRadius = Math.floor(height * 0.25);
  const minRadius = 1;
  return Math.max(minRadius, Math.min(maxRadius, baseRadius * zoomScale));
}

function createInputTreeMarker(segmentIndex, x0, x1, width, height, theme, zoomScale, snap) {
  const center = (x0 + x1) / 2;
  const radius = calculateRadius(theme.inputTreeRadiusVar, height, zoomScale);
  const centeredX = toCanvasCentered(center, width);
  const clampedX = clampToViewport(centeredX, radius, width);

  return {
    segmentIndex,
    position: [snap(clampedX), baselineY(height, theme)],
    fillColor: rgba(...theme.inputTreeFillRGB),
    borderColor: rgba(...theme.inputTreeStrokeRGB),
    radius,
    lineWidth: theme.inputTreeStrokeWidth,
  };
}

function createInputTreeTick(x0, x1, width, height, theme, snap) {
  const center = (x0 + x1) / 2;
  // An odd device-pixel width is crisp only when centred mid-pixel
  const dpr = getDevicePixelRatio();
  const half = Math.round(theme.inputTreeTickWidth * dpr) % 2 === 1 ? 0.5 / dpr : 0;
  const x = snap(center - half) + half - width / 2;
  const y = baselineY(height, theme);

  return {
    path: [
      [x, y],
      [x, y - theme.inputTreeTickLength],
    ],
  };
}

function createBaseline(width, height, theme, snap) {
  const y = baselineY(height, theme);

  return {
    path: [
      [snap(-width / 2), y],
      [snap(width / 2), y],
    ],
  };
}
