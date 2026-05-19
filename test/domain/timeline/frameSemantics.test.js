import { describe, expect, it } from 'vitest';
import { getSourceFrameIndexForFrameIndex } from '../../../src/timeline/time/frameSemantics.js';

const treeMetadata = [
  {
    tree_pair_key: null,
    step_in_pair: null,
    source_tree_global_index: null,
    frame_type: 'input_tree',
    state_semantics: 'processed_input_tree',
    is_observed_input: true,
  },
  {
    tree_pair_key: 'pair_0_1',
    step_in_pair: 1,
    source_tree_global_index: 0,
    frame_type: 'interpolation_frame',
    state_semantics: 'algorithmic_intermediate',
    is_observed_input: false,
  },
  {
    tree_pair_key: 'pair_0_1',
    step_in_pair: 2,
    source_tree_global_index: 0,
    frame_type: 'interpolation_frame',
    state_semantics: 'algorithmic_intermediate',
    is_observed_input: false,
  },
  {
    tree_pair_key: null,
    step_in_pair: null,
    source_tree_global_index: null,
    frame_type: 'input_tree',
    state_semantics: 'processed_input_tree',
    is_observed_input: true,
  },
  {
    tree_pair_key: null,
    step_in_pair: null,
    source_tree_global_index: null,
    frame_type: 'input_tree',
    state_semantics: 'processed_input_tree',
    is_observed_input: true,
  },
  {
    tree_pair_key: 'pair_2_3',
    step_in_pair: 1,
    source_tree_global_index: 4,
    frame_type: 'interpolation_frame',
    state_semantics: 'algorithmic_intermediate',
    is_observed_input: false,
  },
  {
    tree_pair_key: null,
    step_in_pair: null,
    source_tree_global_index: null,
    frame_type: 'input_tree',
    state_semantics: 'processed_input_tree',
    is_observed_input: true,
  },
];

describe('backend frame semantics', () => {
  it('resolves source frame indices from backend metadata', () => {
    expect(getSourceFrameIndexForFrameIndex(treeMetadata, 2)).toBe(0);
    expect(getSourceFrameIndexForFrameIndex(treeMetadata, 3)).toBe(3);
    expect(getSourceFrameIndexForFrameIndex(treeMetadata, 5)).toBe(4);
    expect(getSourceFrameIndexForFrameIndex(treeMetadata, 99)).toBe(null);
  });

  it('treats legacy metadata without frame_type as input frames when no source frame is present', () => {
    const legacyMetadata = [
      { tree_pair_key: null, step_in_pair: null, source_tree_global_index: null },
      { tree_pair_key: 'pair_0_3', step_in_pair: 1, source_tree_global_index: 0 },
      { tree_pair_key: null, step_in_pair: null, source_tree_global_index: null },
    ];

    expect(getSourceFrameIndexForFrameIndex(legacyMetadata, 1)).toBe(0);
    expect(getSourceFrameIndexForFrameIndex(legacyMetadata, 2)).toBe(2);
  });
});
