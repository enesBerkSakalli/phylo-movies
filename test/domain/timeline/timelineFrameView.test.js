import { describe, expect, it } from 'vitest';
import { buildTimelineFrameViews } from '../../../src/timeline/data/TimelineFrameView.js';
import {
  ostrichBugMovieData,
  smallExampleMovieData,
} from '../../fixtures/timeline/generatedMovieData.js';

describe('buildTimelineFrameViews', () => {
  it('maps generated frames to explicit source input-tree context', () => {
    const rows = buildTimelineFrameViews(smallExampleMovieData);

    expect(rows).toHaveLength(smallExampleMovieData.frames.length);
    expect(rows[0]).toMatchObject({
      frameIndex: 0,
      inputTreeIndex: 0,
      sourceFrameIndex: 0,
      msaWindowIndex: 0,
      frameType: 'input_tree',
      pairId: null,
      localStepIndex: null,
    });
    expect(rows[7]).toMatchObject({
      frameIndex: 7,
      inputTreeIndex: null,
      sourceFrameIndex: 0,
      msaWindowIndex: 0,
      frameType: 'interpolation_frame',
      pairId: 'pair_0_1',
      pairOrdinal: 0,
      sourceInputTreeIndex: 0,
      targetInputTreeIndex: 1,
      localStepIndex: 6,
    });
    expect(rows[22]).toMatchObject({
      frameIndex: 22,
      inputTreeIndex: 1,
      sourceFrameIndex: 22,
      msaWindowIndex: 1,
      frameType: 'input_tree',
    });
    expect(rows[23]).toMatchObject({
      frameIndex: 23,
      inputTreeIndex: 2,
      sourceFrameIndex: 23,
      msaWindowIndex: 2,
      frameType: 'input_tree',
    });
  });

  it('does not depend on a separate leaf-order response field', () => {
    const rows = buildTimelineFrameViews(ostrichBugMovieData);

    expect(ostrichBugMovieData).not.toHaveProperty(['sorted', 'leaves'].join('_'));
    expect(rows[0]).toMatchObject({
      frameIndex: 0,
      inputTreeIndex: 0,
      sourceFrameIndex: 0,
    });
    expect(rows.at(-1)).toMatchObject({
      frameIndex: ostrichBugMovieData.frames.length - 1,
      inputTreeIndex: 1,
      sourceFrameIndex: ostrichBugMovieData.frames.length - 1,
      frameType: 'input_tree',
    });
  });

  it('reads pair context from pair rows instead of parsing pair identifiers', () => {
    const movieData = {
      ...smallExampleMovieData,
      frames: smallExampleMovieData.frames.map((frame) =>
        frame.pair_id === 'pair_0_1' ? { ...frame, pair_id: 'opaque-transition-a' } : frame
      ),
      pairs: smallExampleMovieData.pairs.map((pair) =>
        pair.pair_id === 'pair_0_1'
          ? {
              ...pair,
              pair_id: 'opaque-transition-a',
              source_input_tree_index: 10,
              target_input_tree_index: 11,
            }
          : pair
      ),
    };

    expect(buildTimelineFrameViews(movieData)[7]).toMatchObject({
      pairId: 'opaque-transition-a',
      sourceInputTreeIndex: 10,
      targetInputTreeIndex: 11,
    });
  });
});
