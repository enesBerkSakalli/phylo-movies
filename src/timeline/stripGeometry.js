import { msToX } from './math/coordinateUtils.js';

/**
 * The strip as plain geometry, no deck.gl: input trees as circles or ticks, and one mark per
 * input-tree pair (not per playback segment): a bar for its RF, dashes for a branch-length-only
 * change, and one pip per SPR move (one per pair when its moves would crowd). Spans are built
 * once, in movie time; projectPairStrip turns them into canvas geometry for the visible range.
 */

// Geometry only: the colours are theme tokens, read by TimelineView
export const TIMELINE_THEME = {
  // The strip reads bottom-up: pips sit under the baseline, RF bars rise from it.
  // Every y is in px from the top of the strip.
  stripBaselineY: 30,
  stripBarMaxHeight: 24,
  stripBarMinHeight: 2,
  stripBarInset: 0.5,
  stripBarMinWidth: 1,
  stripDashWidth: 2,
  stripDashLength: 4,
  stripDashGap: 3,
  stripSelectionSpanWidth: 2,
  stripSelectionBracketDepth: 4, // px under the baseline, clear of the dots
  stripPipY: 39,
  stripPipRadiusBase: 1.5,
  stripPipRadiusPerSqrtTaxon: 0.9,
  stripPipRadiusMax: 4,
  // One dot for a whole pair: sized by its move count, never wider than the pair less this gap
  stripMergedPipRadiusBase: 0.5,
  stripMergedPipGapPx: 2,
  inputTreeStrokeWidth: 3,
  inputTreeRadiusVar: 7,
  inputTreeDenseThresholdPx: 18,
  inputTreeTickLength: 4,
  inputTreeTickWidth: 1,
  activeInputTreeTickWidth: 4,
  separatorWidthMax: 2,
  separatorWidthMin: 1,
  // The grab knob fits the headroom above the tallest bar (stripBaselineY - stripBarMaxHeight)
  scrubberKnobWidth: 10,
  scrubberKnobDepth: 6,
};

const theme = TIMELINE_THEME;

export function getDevicePixelRatio() {
  return typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
}

export function createSnapFunction(dpr) {
  return (v) => Math.round(v * dpr) / dpr;
}

/**
 * @param {Object} args
 * @param {Object[]} args.segments
 * @param {{byPairId: Map<string, Object>}} args.profile - buildPairChangeProfile() result
 * @param {(frameIndex: number) => number|null} args.frameToMs
 * @returns {{pairId: string, startMs: number, endMs: number, kind: string, rf: number|null, pips: {ms: number, taxaCount: number}[]}[]}
 */
export function buildPairSpans({ segments, profile, frameToMs }) {
  const spansByPairId = new Map();
  for (const segment of segments) {
    if (segment.isInputTreeSegment) continue;
    const change = profile.byPairId.get(segment.pairId);
    if (!change) continue;

    const span = spansByPairId.get(segment.pairId);
    if (span) {
      span.endMs = segment.end;
      continue;
    }
    spansByPairId.set(segment.pairId, {
      pairId: segment.pairId,
      startMs: segment.start,
      endMs: segment.end,
      kind: change.kind,
      rf: change.rf,
      pips: change.sprMoves.flatMap((move) => {
        const ms = frameRangeMidpointToMs(move, frameToMs);
        return ms === null ? [] : [{ ms, taxaCount: move.taxaCount }];
      }),
    });
  }
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
      marks.push(...dashes(span.pairId, left, right, width, toY));
    } else if (span.rf > 0) {
      const barHeight = Math.max(
        theme.stripBarMinHeight,
        Math.round((theme.stripBarMaxHeight * span.rf) / maxRf)
      );
      const [x0, x1] = insetBar(left, right);
      marks.push({ pairId: span.pairId, polygon: rect(x0, x1, baseline, baseline + barHeight) });
    }
    pips.push(...spanPips(span, left, right, toX, pipY));
  }

  return {
    marks,
    hoverMarks: marks.filter((mark) => mark.pairId === hoverPairId),
    selectionMarks: marks.filter((mark) => mark.pairId === selectedPairId),
    pips,
    selectionPips: pips.filter((pip) => pip.pairId === selectedPairId),
    selectionSpan: selectedBounds
      ? bracket(toX(selectedBounds.start), toX(selectedBounds.end), toY)
      : [],
  };
}

// A dot per move while they fit. A pair too narrow for them (under two max dots wide), or whose
// dots would come within the gap of touching, gets one dot at its centre instead, sized by its
// move count.
function spanPips({ pairId, pips }, left, right, toX, pipY) {
  const moves = pips.map(({ ms, taxaCount }) => ({
    pairId,
    position: [toX(ms), pipY],
    radius: Math.min(
      theme.stripPipRadiusMax,
      theme.stripPipRadiusBase + theme.stripPipRadiusPerSqrtTaxon * Math.sqrt(taxaCount)
    ),
  }));
  const narrow = right - left < 4 * theme.stripPipRadiusMax;
  const overlapping = moves.some(
    (move, i) =>
      i > 0 &&
      move.position[0] - moves[i - 1].position[0] <
        move.radius + moves[i - 1].radius + theme.stripMergedPipGapPx
  );
  if (!moves.length || !(narrow || overlapping)) return moves;

  const radius = Math.min(
    theme.stripPipRadiusMax,
    theme.stripMergedPipRadiusBase + theme.stripPipRadiusPerSqrtTaxon * Math.sqrt(moves.length),
    (right - left - theme.stripMergedPipGapPx) / 2
  );
  return [{ pairId, position: [(left + right) / 2, pipY], radius: Math.max(1, radius) }];
}

// A bracket under the selected span: selection as a shape, not hue alone
function bracket(left, right, toY) {
  const width = theme.stripSelectionSpanWidth;
  const top = toY(theme.stripBaselineY);
  const bottom = toY(theme.stripBaselineY + theme.stripSelectionBracketDepth);
  return [
    rect(left, right, bottom + width, bottom),
    rect(left, left + width, top, bottom),
    rect(right - width, right, top, bottom),
  ].map((polygon) => ({ polygon }));
}

function insetBar(left, right) {
  const x0 = left + theme.stripBarInset;
  const x1 = right - theme.stripBarInset;
  if (x1 - x0 >= theme.stripBarMinWidth) return [x0, x1];
  const center = (left + right) / 2;
  return [center - theme.stripBarMinWidth / 2, center + theme.stripBarMinWidth / 2];
}

// Only the dashes inside the viewport are made, so a deeply zoomed pair stays cheap.
function dashes(pairId, left, right, width, toY) {
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
  segments,
  selectedSegmentIndex,
  hoverIndex,
  rangeStart,
  rangeEnd,
}) {
  const snap = createSnapFunction(getDevicePixelRatio());

  const inputTrees = { normal: [], selected: [], hovered: [] };
  const inputTreeTicks = { normal: [], active: [] };
  const separators = [];
  // Too many input trees for circles: ticks instead, and no separators
  const inputTreeCount = segments.filter((segment) => segment.isInputTreeSegment).length;
  const dense = inputTreeCount > 1 && width / inputTreeCount < theme.inputTreeDenseThresholdPx;

  for (let i = startIdx; i <= endIdx; i++) {
    const segment = segments[i];

    if (segment.end < visStart || segment.start > visEnd) continue;

    const state = i === selectedSegmentIndex ? 'selected' : i === hoverIndex ? 'hovered' : 'normal';

    const startX = msToX(segment.start, rangeStart, rangeEnd, width);
    const endX = msToX(segment.end, rangeStart, rangeEnd, width);

    if (!dense) separators.push(createSeparator(startX, width, height, snap));

    if (segment.isInputTreeSegment) {
      if (dense) {
        const tick = createInputTreeTick(startX, endX, width, height, snap);
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
        zoomScale,
        snap
      );
      if (inputTreeMarker) inputTrees[state].push(inputTreeMarker);
    }
  }

  return {
    inputTreeTicks: inputTreeTicks.normal,
    baselines: [createBaseline(width, height, snap)],
    separators,
    inputTreePoints: inputTrees.normal,
    activeInputTreeTicks: inputTreeTicks.active,
    selectionInputTrees: inputTrees.selected,
    hoverInputTrees: inputTrees.hovered,
  };
}

function createSeparator(x, width, height, snap) {
  const centeredX = snap(x - width / 2);
  const y = baselineY(height);
  const h = Math.max(MIN_SEPARATOR_HEIGHT, Math.floor(height * SEPARATOR_HEIGHT_FRACTION));
  // Centred on the baseline, but never past the bottom of the strip
  const halfHeight = Math.min(h / 2, y + height / 2);

  return {
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
function baselineY(height) {
  return height / 2 - theme.stripBaselineY;
}

function clampToViewport(x, radius, width) {
  const halfWidth = width / 2;
  return Math.max(-halfWidth + radius, Math.min(halfWidth - radius, x));
}

function calculateRadius(height, zoomScale) {
  const maxRadius = Math.floor(height * 0.25);
  const minRadius = 1;
  return Math.max(minRadius, Math.min(maxRadius, theme.inputTreeRadiusVar * zoomScale));
}

function createInputTreeMarker(segmentIndex, x0, x1, width, height, zoomScale, snap) {
  const center = (x0 + x1) / 2;
  const radius = calculateRadius(height, zoomScale);
  const centeredX = toCanvasCentered(center, width);
  const clampedX = clampToViewport(centeredX, radius, width);

  return {
    segmentIndex,
    position: [snap(clampedX), baselineY(height)],
    radius,
    lineWidth: theme.inputTreeStrokeWidth,
  };
}

function createInputTreeTick(x0, x1, width, height, snap) {
  const center = (x0 + x1) / 2;
  // An odd device-pixel width is crisp only when centred mid-pixel
  const dpr = getDevicePixelRatio();
  const half = Math.round(theme.inputTreeTickWidth * dpr) % 2 === 1 ? 0.5 / dpr : 0;
  const x = snap(center - half) + half - width / 2;
  const y = baselineY(height);

  return {
    path: [
      [x, y],
      [x, y - theme.inputTreeTickLength],
    ],
  };
}

// Centred on the bars' foot, a 1 px line would paint two half-strength rows: it fills the row below
function createBaseline(width, height, snap) {
  const y = baselineY(height) - 0.5;

  return {
    path: [
      [snap(-width / 2), y],
      [snap(width / 2), y],
    ],
  };
}
