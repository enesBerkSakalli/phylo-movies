import { describe, expect, it } from 'vitest';
import { buildTimelineFrameRows } from '../../../src/timeline/data/TimelineFrameRows.js';
import {
  ostrichBugMovieData,
  smallExampleMovieData,
} from '../../fixtures/timeline/generatedMovieData.js';

describe('buildTimelineFrameRows', () => {
  it('maps generated frames to explicit source input-tree context', () => {
    const rows = buildTimelineFrameRows(smallExampleMovieData);

    expect(rows).toHaveLength(smallExampleMovieData.tree_metadata.length);
    expect(rows[0]).toMatchObject({
      frameIndex: 0,
      inputTreeIndex: 0,
      sourceFrameIndex: 0,
      msaWindowIndex: 0,
      frameType: 'input_tree',
      pairKey: null,
      pairStepIndex: null,
    });
    expect(rows[7]).toMatchObject({
      frameIndex: 7,
      inputTreeIndex: 0,
      sourceFrameIndex: 0,
      msaWindowIndex: 0,
      frameType: 'interpolation_frame',
      pairKey: 'pair_0_1',
      pairStepIndex: 7,
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
    const rows = buildTimelineFrameRows(ostrichBugMovieData);

    expect(ostrichBugMovieData).not.toHaveProperty(['sorted', 'leaves'].join('_'));
    expect(rows[0]).toMatchObject({
      frameIndex: 0,
      inputTreeIndex: 0,
      sourceFrameIndex: 0,
    });
    expect(rows.at(-1)).toMatchObject({
      frameIndex: ostrichBugMovieData.tree_metadata.length - 1,
      inputTreeIndex: 1,
      sourceFrameIndex: ostrichBugMovieData.tree_metadata.length - 1,
      frameType: 'input_tree',
    });
  });

  it('requires split_change_timeline original entries for input tree frames', () => {
    const movieData = {
      ...smallExampleMovieData,
      split_change_timeline: [],
    };

    expect(() => buildTimelineFrameRows(movieData)).toThrow(
      /split_change_timeline original entry is required/
    );
  });
});
