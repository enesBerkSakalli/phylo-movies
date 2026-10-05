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

  describe('SPR dots when a transition is too narrow for its moves', () => {
    const moves = (count, from = 1100, gap = 20) =>
      Array.from({ length: count }, (_, i) => ({ ms: from + i * gap, taxaCount: 1 }));
    const pipsOf = (spans, extra = {}) =>
      projectPairStrip({ ...view, maxRf: 0.4, spans, ...extra }).pips;

    it('draws one dot at the centre of a narrow transition, whatever its move count', () => {
      // 10px wide: three moves would fuse into one blob
      const pips = pipsOf([topology('a', 1000, 1100, 0.2, moves(3, 1020, 30))]);
      expect(pips).toHaveLength(1);
      expect(pips[0]).toMatchObject({ pairId: 'a', position: [x(1050), y(39)] });
      expect(pipsOf([topology('b', 1000, 1100, 0.2, moves(1, 1050))])).toHaveLength(1);
    });

    it('draws one dot per move when the transition is wide and the moves do not overlap', () => {
      expect(pipsOf([topology('a', 1000, 5000, 0.2, moves(5, 1500, 600))])).toHaveLength(5);
    });

    it('also merges a wide transition whose moves would overlap', () => {
      // 400px wide, but three moves 1px apart
      const pips = pipsOf([topology('a', 1000, 5000, 0.2, moves(3, 2000, 10))]);
      expect(pips).toHaveLength(1);
      expect(pips[0].position[0]).toBeCloseTo(x(3000));
    });

    it('merges dots that would almost touch, not only those that overlap', () => {
      // r = 2.4 each: 5.5px apart leaves a gap under the 2px a dot keeps from its neighbour
      expect(pipsOf([topology('a', 1000, 5000, 0.2, moves(2, 2000, 55))])).toHaveLength(1);
      expect(pipsOf([topology('a', 1000, 5000, 0.2, moves(2, 2000, 80))])).toHaveLength(2);
    });

    it('goes back to per-move dots when zoomed in', () => {
      const spans = [topology('a', 1000, 1100, 0.2, moves(3, 1020, 30))];
      expect(pipsOf(spans)).toHaveLength(1);
      // 10x: the same transition is 100px wide, its moves 30px apart
      const zoomed = { rangeStart: 1000, rangeEnd: 2000, visStart: 900, visEnd: 2100 };
      expect(pipsOf(spans, zoomed)).toHaveLength(3);
    });

    it('grows the merged dot with the move count, but never past its own transition', () => {
      const radiusFor = (count, endMs = 1100) =>
        pipsOf([topology('a', 1000, endMs, 0.2, moves(count, 1020, 5))])[0].radius;
      // 10px wide: room for r = 4
      const radii = [1, 2, 3, 4, 5, 6].map((count) => radiusFor(count));
      for (let i = 1; i < radii.length; i++) expect(radii[i]).toBeGreaterThan(radii[i - 1]);
      expect(Math.max(...radii)).toBeLessThanOrEqual(TIMELINE_THEME.stripPipRadiusMax);
      // 6.7px wide, like 199 transitions on a 1330px strip: neighbours keep a gap
      for (const count of [1, 6, 50]) expect(2 * radiusFor(count, 1067)).toBeLessThan(6.7);
    });

    it('marks the selected transition by its merged dot', () => {
      const spans = [
        topology('a', 1000, 1100, 0.2, moves(3, 1020, 30)),
        topology('b', 1100, 1200, 0.2, moves(2, 1120, 30)),
      ];
      const { pips, selectionPips } = projectPairStrip({
        ...view,
        maxRf: 0.4,
        spans,
        selectedPairId: 'b',
      });
      expect(pips.map((pip) => pip.pairId)).toEqual(['a', 'b']);
      expect(selectionPips).toEqual([pips[1]]);
    });
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
    expect(out.selectionSpan).toHaveLength(3);
  });

  it('brackets the exact selected span under the baseline, so selection is not hue alone', () => {
    const { selectionSpan } = projectPairStrip({
      ...view,
      maxRf: 0.4,
      spans: [topology('b', 4000, 6000, 0.4, [{ ms: 5000, taxaCount: 100 }])],
      selectedPairId: 'b',
      selectedBounds: { start: 4500, end: 5500 },
    });
    const points = selectionSpan.flatMap(({ polygon }) => polygon);
    const [xs, ys] = [0, 1].map((axis) => points.map((point) => point[axis]));

    // A bar along the span with a cap at each end
    expect(selectionSpan).toHaveLength(3);
    expect(Math.min(...xs)).toBeCloseTo(x(4500));
    expect(Math.max(...xs)).toBeCloseTo(x(5500));
    // From the baseline to 4px under it: clear of the biggest dot, which starts 35px from the top
    expect(Math.max(...ys)).toBeCloseTo(y(30));
    expect(Math.min(...ys)).toBeCloseTo(y(34));
    const bar = selectionSpan[0].polygon.map(([, py]) => py);
    expect(Math.max(...bar) - Math.min(...bar)).toBeCloseTo(TIMELINE_THEME.stripSelectionSpanWidth);
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
