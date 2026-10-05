import { msToX } from '../math/coordinateUtils.js';
import { getSegmentBounds } from '../utils/segmentTiming.js';

/**
 * The strip draws one mark per input-tree pair, not per playback segment: a bar for its RF,
 * dashes for a branch-length-only change, and one pip per SPR move. Spans are built once, in
 * movie time; projectPairStrip turns them into canvas geometry for the visible range.
 */

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
