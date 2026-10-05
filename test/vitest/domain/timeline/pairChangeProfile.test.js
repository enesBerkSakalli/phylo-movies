import { describe, expect, it } from 'vitest';
import { buildPairChangeProfile } from '../../../../src/timeline/data/pairChangeProfile.js';

const pair = (ordinal, generatedFrameRange) => ({
  pair_id: `pair_${ordinal}_${ordinal + 1}`,
  pair_ordinal: ordinal,
  source_input_tree_index: ordinal,
  target_input_tree_index: ordinal + 1,
  generated_frame_range: generatedFrameRange,
});

const spr = (pairOrdinal, frameRange, driverSubtree) => ({
  event_type: 'spr_move',
  pair_id: `pair_${pairOrdinal}_${pairOrdinal + 1}`,
  pair_ordinal: pairOrdinal,
  frame_range: frameRange,
  driver_subtree: driverSubtree,
});

const movie = {
  pairs: [pair(0, [1, 9]), pair(1, null), pair(2, null)],
  pairMetrics: {
    rows: [
      { pair_id: 'pair_0_1', pair_ordinal: 0, robinson_foulds: 0.2, weighted_robinson_foulds: 0.5 },
      { pair_id: 'pair_1_2', pair_ordinal: 1, robinson_foulds: 0, weighted_robinson_foulds: 0.3 },
      { pair_id: 'pair_2_3', pair_ordinal: 2, robinson_foulds: 0, weighted_robinson_foulds: 0 },
    ],
  },
  temporalEvents: [
    spr(0, [1, 5], [18, 19]),
    { event_type: 'split_change', pair_id: 'pair_0_1', pair_ordinal: 0, frame_range: [1, 9] },
    spr(0, [6, 9], [20]),
  ],
};

describe('buildPairChangeProfile', () => {
  it('describes each pair as a transition between 1-based input trees with its RF and SPR moves', () => {
    const { byPairId } = buildPairChangeProfile(movie);
    expect(byPairId.get('pair_0_1')).toEqual({
      pairId: 'pair_0_1',
      pairOrdinal: 0,
      sourceTree: 1,
      targetTree: 2,
      rf: 0.2,
      weightedRf: 0.5,
      kind: 'topology',
      sprMoves: [
        { frameStart: 1, frameEnd: 5, taxaCount: 2 },
        { frameStart: 6, frameEnd: 9, taxaCount: 1 },
      ],
      sprMoveCount: 2,
      movedTaxaCount: 3,
    });
  });

  it('tells branch-length-only pairs apart from unchanged ones', () => {
    const { byPairId } = buildPairChangeProfile(movie);
    expect(byPairId.get('pair_1_2').kind).toBe('branch-lengths');
    expect(byPairId.get('pair_2_3').kind).toBe('unchanged');
    expect(byPairId.get('pair_1_2').sprMoveCount).toBe(0);
  });

  it('reports the largest RF so the strip can scale bar heights to the dataset', () => {
    expect(buildPairChangeProfile(movie).maxRf).toBe(0.2);
  });

  it('copes with missing metrics and events', () => {
    const { byPairId, maxRf } = buildPairChangeProfile({ pairs: [pair(0, [1, 3])] });
    expect(byPairId.get('pair_0_1')).toMatchObject({
      rf: null,
      weightedRf: null,
      kind: 'topology',
    });
    expect(maxRf).toBe(0);
  });
});
