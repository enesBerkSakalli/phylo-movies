import { describe, expect, it } from 'vitest';
import { getSourceFrameIndexForFrameIndex } from '../../../src/timeline/time/frameSemantics.js';

const frames = [
  {
    frame_index: 0,
    frame_type: 'input_tree',
    state_semantics: 'processed_input_tree',
    is_observed_input: true,
    input_tree_index: 0,
    pair_id: null,
    pair_ordinal: null,
    local_step_index: null,
    source_frame_index: null,
    target_frame_index: null,
  },
  {
    frame_index: 1,
    frame_type: 'interpolation_frame',
    state_semantics: 'algorithmic_intermediate',
    is_observed_input: false,
    input_tree_index: null,
    pair_id: 'pair_0_1',
    pair_ordinal: 0,
    local_step_index: 0,
    source_frame_index: 0,
    target_frame_index: 3,
  },
  {
    frame_index: 2,
    frame_type: 'interpolation_frame',
    state_semantics: 'algorithmic_intermediate',
    is_observed_input: false,
    input_tree_index: null,
    pair_id: 'pair_0_1',
    pair_ordinal: 0,
    local_step_index: 1,
    source_frame_index: 0,
    target_frame_index: 3,
  },
  {
    frame_index: 3,
    frame_type: 'input_tree',
    state_semantics: 'processed_input_tree',
    is_observed_input: true,
    input_tree_index: 1,
    pair_id: null,
    pair_ordinal: null,
    local_step_index: null,
    source_frame_index: null,
    target_frame_index: null,
  },
  {
    frame_index: 4,
    frame_type: 'input_tree',
    state_semantics: 'processed_input_tree',
    is_observed_input: true,
    input_tree_index: 2,
    pair_id: null,
    pair_ordinal: null,
    local_step_index: null,
    source_frame_index: null,
    target_frame_index: null,
  },
  {
    frame_index: 5,
    frame_type: 'interpolation_frame',
    state_semantics: 'algorithmic_intermediate',
    is_observed_input: false,
    input_tree_index: null,
    pair_id: 'pair_2_3',
    pair_ordinal: 1,
    local_step_index: 0,
    source_frame_index: 4,
    target_frame_index: 6,
  },
  {
    frame_index: 6,
    frame_type: 'input_tree',
    state_semantics: 'processed_input_tree',
    is_observed_input: true,
    input_tree_index: 3,
    pair_id: null,
    pair_ordinal: null,
    local_step_index: null,
    source_frame_index: null,
    target_frame_index: null,
  },
];

describe('backend frame semantics', () => {
  it('resolves source frame indices from normalized frame rows', () => {
    expect(getSourceFrameIndexForFrameIndex(frames, 2)).toBe(0);
    expect(getSourceFrameIndexForFrameIndex(frames, 3)).toBe(3);
    expect(getSourceFrameIndexForFrameIndex(frames, 5)).toBe(4);
    expect(getSourceFrameIndexForFrameIndex(frames, 99)).toBe(null);
  });

  it('requires source_frame_index to point at an input-tree row', () => {
    const invalidFrames = [
      { ...frames[0], frame_type: 'interpolation_frame', is_observed_input: false },
      { ...frames[1], source_frame_index: 0 },
    ];

    expect(getSourceFrameIndexForFrameIndex(invalidFrames, 1)).toBe(null);
  });
});
