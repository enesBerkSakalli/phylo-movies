import { describe, expect, it } from 'vitest';
import { buildPairChangeProfile } from '../../../../src/timeline/data/pairChangeProfile.js';
import {
  TIMELINE_THEME,
  buildPairSpans,
  projectPairStrip,
} from '../../../../src/timeline/stripGeometry.js';
import { buildTimeline } from '../../../../src/timeline/timeline.js';
import { smallExampleMovieData } from '../../../fixtures/timeline/generatedMovieData.js';

const movie = smallExampleMovieData;
const { segments } = buildTimeline(movie);
const profile = buildPairChangeProfile({
  pairs: movie.pairs,
  pairMetrics: movie.pair_metrics,
  temporalEvents: movie.temporal_events,
});

describe('buildPairSpans', () => {
  const spans = buildPairSpans({ segments, profile, frameToMs: (frame) => frame * 100 });
  const bySpanId = new Map(spans.map((span) => [span.pairId, span]));

  it('makes one span per pair, covering the union of its transition segments', () => {
    expect(spans).toHaveLength(9);
    // pair_0_1 owns segments 1-3, between the first two input-tree holds
    expect(bySpanId.get('pair_0_1')).toMatchObject({ startMs: 1500, endMs: 27200 });
    expect(bySpanId.get('pair_1_2')).toMatchObject({ startMs: 28700, endMs: 29000 });
  });

  it('carries the pair kind and RF, and places each SPR move at its frame-range midpoint', () => {
    const span = bySpanId.get('pair_0_1');
    expect(span).toMatchObject({ kind: 'topology', rf: profile.byPairId.get('pair_0_1').rf });
    // frame ranges [1,4] [5,8] [9,13] [14,17] [18,21]; frameToMs is frame * 100
    expect(span.pips).toEqual([
      { ms: 250, taxaCount: 1 },
      { ms: 650, taxaCount: 1 },
      { ms: 1100, taxaCount: 1 },
      { ms: 1550, taxaCount: 1 },
      { ms: 1950, taxaCount: 5 },
    ]);
    expect(bySpanId.get('pair_1_2')).toMatchObject({ kind: 'unchanged', pips: [] });
  });

  it('interpolates between frames when the midpoint falls between two of them', () => {
    const uneven = buildPairSpans({ segments, profile, frameToMs: (frame) => frame * frame });
    // midpoint 2.5 of frames 2 (4ms) and 3 (9ms)
    expect(uneven[0].pips[0].ms).toBeCloseTo(6.5);
  });

  it('drops a move whose frames have no time on the timeline', () => {
    const none = buildPairSpans({ segments, profile, frameToMs: () => null });
    expect(none[0].pips).toEqual([]);
  });
});

describe('projectPairStrip', () => {
  const width = 1000;
  const height = 44;
  // 0.1 px per ms; canvas x is centred, canvas y is up from the middle of the strip
  const x = (ms) => ms * 0.1 - width / 2;
  const y = (fromTop) => height / 2 - fromTop;
  const view = {
    rangeStart: 0,
    rangeEnd: 10000,
    visStart: -1000,
    visEnd: 11000,
    width,
    height,
  };
  const topology = (pairId, startMs, endMs, rf, pips = []) => ({
    pairId,
    startMs,
    endMs,
    kind: 'topology',
    rf,
    pips,
  });

  it('rises a bar from the baseline, scaled so the largest RF fills the bar band', () => {
    const { marks } = projectPairStrip({
      ...view,
      maxRf: 0.4,
      spans: [topology('a', 1000, 3000, 0.2), topology('b', 4000, 5000, 0.4)],
    });
    // inset 0.5px each side; half of maxRf is 12px
    expect(marks[0]).toEqual({
      pairId: 'a',
      polygon: [
        [x(1000) + 0.5, y(30)],
        [x(3000) - 0.5, y(30)],
        [x(3000) - 0.5, y(30) + 12],
        [x(1000) + 0.5, y(30) + 12],
      ],
    });
    expect(marks[1].polygon[2][1]).toBeCloseTo(y(30) + 24);
  });

  it('keeps a small but non-zero RF visible, and draws no bar for zero RF', () => {
    const { marks } = projectPairStrip({
      ...view,
      maxRf: 0.4,
      spans: [topology('tiny', 1000, 3000, 0.001), topology('zero', 4000, 5000, 0)],
    });
    expect(marks).toHaveLength(1);
    expect(marks[0].polygon[2][1]).toBeCloseTo(y(30) + 2);
  });

  it('never draws a bar thinner than 1px', () => {
    const { marks } = projectPairStrip({
      ...view,
      maxRf: 0.4,
      spans: [topology('thin', 5000, 5004, 0.4)],
    });
    const [[left], [right]] = marks[0].polygon;
    expect(right - left).toBeCloseTo(1);
    expect((left + right) / 2).toBeCloseTo(x(5002));
  });

  it('draws a branch-length-only pair as a 2px dashed line on the baseline, not a bar', () => {
    const { marks } = projectPairStrip({
      ...view,
      maxRf: 0.4,
      spans: [
        { pairId: 'bl', startMs: 1000, endMs: 2000, kind: 'branch-lengths', rf: 0, pips: [] },
      ],
    });
    expect(marks.length).toBeGreaterThan(3);
    for (const { pairId, polygon } of marks) {
      expect(pairId).toBe('bl');
      const ys = polygon.map(([, py]) => py);
      expect(Math.max(...ys)).toBeCloseTo(y(29));
      expect(Math.min(...ys)).toBeCloseTo(y(31));
    }
    const [first, second] = marks.map(({ polygon }) => polygon[0][0]);
    expect(first).toBeCloseTo(x(1000));
    expect(second - first).toBeCloseTo(
      TIMELINE_THEME.stripDashLength + TIMELINE_THEME.stripDashGap
    );
    const lastRight = Math.max(...marks.at(-1).polygon.map(([px]) => px));
    expect(lastRight).toBeLessThanOrEqual(x(2000) + 1e-9);
  });

  it('draws nothing for an unchanged pair', () => {
    const out = projectPairStrip({
      ...view,
      maxRf: 0.4,
      spans: [{ pairId: 'u', startMs: 1000, endMs: 2000, kind: 'unchanged', rf: 0, pips: [] }],
    });
    expect(out.marks).toEqual([]);
    expect(out.pips).toEqual([]);
  });

  it('places a pip per SPR move on the pip row, sized by the taxa it moves', () => {
    const { pips } = projectPairStrip({
      ...view,
      maxRf: 0.4,
      spans: [
        topology('a', 1000, 5000, 0.4, [
          { ms: 2000, taxaCount: 0 },
          { ms: 3000, taxaCount: 1 },
          { ms: 4000, taxaCount: 5 },
          { ms: 4500, taxaCount: 100 },
        ]),
      ],
    });
    expect(pips.map((pip) => pip.position)).toEqual(
      [2000, 3000, 4000, 4500].map((ms) => [x(ms), y(39)])
    );
    expect(pips[0].radius).toBeCloseTo(1.5);
    expect(pips[1].radius).toBeCloseTo(1.5 + 0.9);
    expect(pips[2].radius).toBeCloseTo(1.5 + 0.9 * Math.sqrt(5));
    expect(pips[3].radius).toBe(4);
  });

  it('separates the hovered and selected pair, and the exact selected segment span', () => {
    const spans = [
      topology('a', 1000, 3000, 0.2, [{ ms: 2000, taxaCount: 1 }]),
      topology('b', 4000, 6000, 0.4, [{ ms: 5000, taxaCount: 1 }]),
    ];
    const out = projectPairStrip({
      ...view,
      maxRf: 0.4,
      spans,
      hoverPairId: 'a',
      selectedPairId: 'b',
      selectedBounds: { start: 4500, end: 5500 },
    });
    expect(out.marks.map((mark) => mark.pairId)).toEqual(['a', 'b']);
    expect(out.hoverMarks.map((mark) => mark.pairId)).toEqual(['a']);
    expect(out.selectionMarks.map((mark) => mark.pairId)).toEqual(['b']);
    expect(out.pips).toHaveLength(2);
    expect(out.selectionPips).toHaveLength(1);
    expect(out.selectionPips[0].position[0]).toBeCloseTo(x(5000));
    expect(out.selectionSpan).toEqual([
      {
        polygon: [
          [x(4500), y(30)],
          [x(5500), y(30)],
          [x(5500), y(32)],
          [x(4500), y(32)],
        ],
      },
    ]);
  });

  it('has no selection or hover marks when nothing is hovered or selected', () => {
    const out = projectPairStrip({ ...view, maxRf: 0.4, spans: [topology('a', 1000, 3000, 0.2)] });
    expect(out.hoverMarks).toEqual([]);
    expect(out.selectionMarks).toEqual([]);
    expect(out.selectionPips).toEqual([]);
    expect(out.selectionSpan).toEqual([]);
  });

  it('skips pairs outside the visible range', () => {
    const { marks } = projectPairStrip({
      ...view,
      maxRf: 0.4,
      spans: [topology('gone', 20000, 21000, 0.4), topology('seen', 1000, 2000, 0.4)],
    });
    expect(marks.map((mark) => mark.pairId)).toEqual(['seen']);
  });
});
