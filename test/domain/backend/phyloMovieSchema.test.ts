import { describe, expect, it } from 'vitest';
import {
  hydrateMovieTreeAtIndex,
  validatePhyloMovieData,
} from '../../../src/domain/backend/phyloMovieSchema';
import { toSubtreeKey } from '../../../src/domain/tree/splits';
import { phyloData } from '../../../src/services/data/dataService.js';

const tree = {
  name: 'root',
  length: 0,
  split_indices: [0, 1, 2],
  children: [
    { name: 'A', length: 1, split_indices: [0], children: [] },
    { name: 'B', length: 1, split_indices: [1], children: [] },
    { name: 'C', length: 1, split_indices: [2], children: [] },
  ],
};

const compactTree = [
  0,
  0,
  0,
  null,
  [
    [1, 1, 1, null, []],
    [1, 2, 2, null, []],
    [1, 3, 3, null, []],
  ],
];

const compactTreeDefinitions = {
  tree_name_definitions: ['root', 'A', 'B', 'C'],
  split_definitions: [[0, 1, 2], [0], [1], [2]],
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    interpolated_trees: [tree, tree, tree],
    frames: [
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
        target_frame_index: 2,
      },
      {
        frame_index: 2,
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
    ],
    pairs: [
      {
        pair_id: 'pair_0_1',
        pair_ordinal: 0,
        source_input_tree_index: 0,
        target_input_tree_index: 1,
        source_frame_index: 0,
        target_frame_index: 2,
        generated_frame_range: [1, 1],
        solution: {
          affected_subtrees_by_split: {
            '[0, 1, 2]': [[[1]]],
          },
          attachment_edges_by_split: {
            '[0, 1, 2]': {
              '[1]': {
                source: [0, 1],
                destination: [1, 2],
              },
            },
          },
        },
      },
    ],
    temporal_events: [
      {
        event_id: 'pair_0_1:split:0',
        event_type: 'split_change',
        pair_id: 'pair_0_1',
        pair_ordinal: 0,
        local_step_range: [0, 0],
        frame_range: [1, 1],
        split: [0, 1, 2],
      },
      {
        event_id: 'pair_0_1:spr:0',
        event_type: 'spr_move',
        pair_id: 'pair_0_1',
        pair_ordinal: 0,
        local_step_range: [0, 0],
        frame_range: [1, 1],
        pivot_edge: [0, 1, 2],
        driver_subtree: [1],
        highlight_group: [[1]],
        collapse_path: [{ split: [0, 1], branch_length: 0.25 }],
        expand_path: [{ split: [1, 2], branch_length: 0.5 }],
        collapse_hops: 1,
        expand_hops: 1,
        total_hops: 2,
        collapse_branch_length: 0.25,
        expand_branch_length: 0.5,
        total_branch_length: 0.75,
      },
    ],
    subtree_highlight_tracking: [null, [[1]], null],
    pair_metrics: {
      rows: [
        {
          pair_id: 'pair_0_1',
          pair_ordinal: 0,
          robinson_foulds: 0.5,
          weighted_robinson_foulds: 1.25,
        },
      ],
      semantics: {
        robinson_foulds: {
          topology: 'unrooted_internal_bipartitions',
          normalization: 'symmetric_difference_over_split_count_sum',
          scope: 'adjacent_processed_input_trees',
        },
        weighted_robinson_foulds: {
          topology: 'rooted_clades',
          includes_branch_lengths: true,
          includes_terminal_and_root_splits: true,
          scope: 'adjacent_processed_input_trees',
        },
      },
    },
    msa: {
      sequences: null,
      window_size: 1,
      step_size: 1,
    },
    file_name: 'normalized-contract.nwk',
    ...overrides,
  };
}

function makeInputOnlyPayload(inputCount: number) {
  const interpolatedTrees = Array.from({ length: inputCount }, () => tree);
  const frames = interpolatedTrees.map((_, index) => ({
    frame_index: index,
    frame_type: 'input_tree',
    state_semantics: 'processed_input_tree',
    is_observed_input: true,
    input_tree_index: index,
    pair_id: null,
    pair_ordinal: null,
    local_step_index: null,
    source_frame_index: null,
    target_frame_index: null,
  }));
  const pairs = frames.slice(0, -1).map((frame, index) => ({
    pair_id: `pair_${index}_${index + 1}`,
    pair_ordinal: index,
    source_input_tree_index: index,
    target_input_tree_index: index + 1,
    source_frame_index: frame.frame_index,
    target_frame_index: frames[index + 1].frame_index,
    generated_frame_range: null,
    solution: {
      affected_subtrees_by_split: {},
      attachment_edges_by_split: {},
    },
  }));

  return makePayload({
    interpolated_trees: interpolatedTrees,
    frames,
    pairs,
    temporal_events: [],
    subtree_highlight_tracking: Array.from({ length: inputCount }, () => null),
    pair_metrics: {
      ...makePayload().pair_metrics,
      rows: pairs.map((pair) => ({
        pair_id: pair.pair_id,
        pair_ordinal: pair.pair_ordinal,
        robinson_foulds: 0,
        weighted_robinson_foulds: 0,
      })),
    },
  });
}

describe('validatePhyloMovieData', () => {
  it('accepts the normalized backend movie contract', () => {
    const result = validatePhyloMovieData(makePayload());

    expect(result.frames).toHaveLength(3);
    expect(result.pairs[0]).toMatchObject({
      pair_id: 'pair_0_1',
      source_input_tree_index: 0,
      target_input_tree_index: 1,
      source_frame_index: 0,
      target_frame_index: 2,
    });
    expect(result.temporal_events.map((event) => event.event_type)).toEqual([
      'split_change',
      'spr_move',
    ]);
    expect(result.pair_metrics.rows[0]).toMatchObject({
      pair_id: 'pair_0_1',
      robinson_foulds: 0.5,
      weighted_robinson_foulds: 1.25,
    });
  });

  it('can preserve compact tuple trees and hydrate one tree on demand', () => {
    const result = validatePhyloMovieData(
      makePayload({
        ...compactTreeDefinitions,
        interpolated_trees: [compactTree, compactTree, compactTree],
      }),
      { hydrateTrees: false }
    );

    expect(result.interpolated_trees[0]).toBe(compactTree);
    expect(Array.isArray(result.interpolated_trees[0])).toBe(true);

    const hydratedTree = hydrateMovieTreeAtIndex(result, 0);
    expect(hydratedTree).toMatchObject(tree);
    expect(hydratedTree.splitKey).toBe(toSubtreeKey([0, 1, 2]));
    expect(hydratedTree.children[0].splitKey).toBe(toSubtreeKey([0]));
  });

  it('accepts structured branch annotation fields on tree nodes', () => {
    const annotatedTree = {
      ...tree,
      annotations: {
        fields: {
          'label.raw_internal': {
            path: ['label', 'raw_internal'],
            label: 'Raw Internal Label',
            value: '88.5/99',
            value_type: 'string',
            role: 'source_annotation',
          },
          'support.iqtree.sh_alrt': {
            path: ['support', 'iqtree', 'sh_alrt'],
            label: 'SH-aLRT',
            value: 88.5,
            value_type: 'number',
            role: 'branch_support',
            unit: 'percent',
            analysis: { type: 'tree_inference', method: 'iqtree', mode: 'sh_alrt_ufboot' },
          },
          'support.iqtree.ufboot': {
            path: ['support', 'iqtree', 'ufboot'],
            label: 'UFBoot',
            value: 99,
            value_type: 'integer',
            role: 'branch_support',
            unit: 'percent',
            analysis: { type: 'tree_inference', method: 'iqtree', mode: 'sh_alrt_ufboot' },
          },
        },
      },
      children: tree.children.map((child) => ({
        ...child,
        annotations: {
          fields: {},
        },
      })),
    };

    const result = validatePhyloMovieData(
      makePayload({
        interpolated_trees: [annotatedTree, annotatedTree, annotatedTree],
      })
    );

    expect(result.interpolated_trees[0].annotations?.fields['support.iqtree.ufboot']).toMatchObject(
      {
        role: 'branch_support',
        value: 99,
        analysis: { method: 'iqtree' },
      }
    );
  });

  it('hydrates compact branch annotation values from top-level definitions', () => {
    const compactTree = {
      ...tree,
      annotation_values: [
        [0, '88.5/99'],
        [1, 88.5],
      ],
      children: tree.children,
    };

    const result = validatePhyloMovieData(
      makePayload({
        annotation_definitions: [
          {
            key: 'label.raw_internal',
            path: ['label', 'raw_internal'],
            label: 'Raw Internal Label',
            value_type: 'string',
            role: 'source_annotation',
          },
          {
            key: 'support.iqtree.sh_alrt',
            path: ['support', 'iqtree', 'sh_alrt'],
            label: 'SH-aLRT',
            value_type: 'number',
            role: 'branch_support',
            unit: 'percent',
            analysis: { type: 'tree_inference', method: 'iqtree', mode: 'sh_alrt' },
          },
        ],
        interpolated_trees: [compactTree, compactTree, compactTree],
      })
    );

    expect(result.interpolated_trees[0].annotations?.fields['label.raw_internal']).toMatchObject({
      value: '88.5/99',
      role: 'source_annotation',
    });
    expect(
      result.interpolated_trees[0].annotations?.fields['support.iqtree.sh_alrt']
    ).toMatchObject({
      value: 88.5,
      role: 'branch_support',
      analysis: { method: 'iqtree', mode: 'sh_alrt' },
    });
  });

  it('hydrates compact tree names and splits from top-level dictionaries', () => {
    const compactTree = {
      name_ref: 0,
      length: 0,
      split_ref: 0,
      children: [
        { name_ref: 1, length: 1, split_ref: 1, children: [] },
        { name_ref: 2, length: 1, split_ref: 2, children: [] },
        { name_ref: 3, length: 1, split_ref: 3, children: [] },
      ],
    };

    const result = validatePhyloMovieData(
      makePayload({
        tree_name_definitions: ['root', 'A', 'B', 'C'],
        split_definitions: [[0, 1, 2], [0], [1], [2]],
        interpolated_trees: [compactTree, compactTree, compactTree],
      })
    );

    expect(result.interpolated_trees[0]).toMatchObject({
      name: 'root',
      split_indices: [0, 1, 2],
      children: [
        { name: 'A', split_indices: [0] },
        { name: 'B', split_indices: [1] },
        { name: 'C', split_indices: [2] },
      ],
    });
  });

  it('hydrates tuple tree nodes into the existing object node shape', () => {
    const tupleTree = [
      0,
      0,
      0,
      null,
      [
        [1, 1, 1, null, []],
        [1, 2, 2, null, []],
        [1, 3, 3, null, []],
      ],
    ];

    const result = validatePhyloMovieData(
      makePayload({
        tree_name_definitions: ['root', 'A', 'B', 'C'],
        split_definitions: [[0, 1, 2], [0], [1], [2]],
        interpolated_trees: [tupleTree, tupleTree, tupleTree],
      })
    );

    expect(result.interpolated_trees[0]).toMatchObject({
      name: 'root',
      length: 0,
      split_indices: [0, 1, 2],
      children: [
        { name: 'A', length: 1, split_indices: [0], children: [] },
        { name: 'B', length: 1, split_indices: [1], children: [] },
        { name: 'C', length: 1, split_indices: [2], children: [] },
      ],
    });
  });

  it('validates the same contract through the data service', () => {
    expect(phyloData.validate(makePayload()).pairs[0].pair_id).toBe('pair_0_1');
  });

  it('accepts dataset provenance for tree source and settings display', () => {
    const result = validatePhyloMovieData(
      makePayload({
        dataset_provenance: {
          source_type: 'Publication bootstrap example',
          source_label: 'publication_data/bootstrap_rogue_taxa/current_results/dataset_24',
          tree_source: '200 IQ-TREE bootstrap-replicate trees ordered by composition distance',
          alignment_source: 'source-24_taxa24_sites14190',
          settings: [
            { label: 'Tree inference', value: 'IQ-TREE 3 default search mode' },
            { label: 'Support labels', value: 'Split-frequency support across 200 trees' },
          ],
          citation: 'Publication example',
        },
      })
    );

    expect(result.dataset_provenance?.source_type).toBe('Publication bootstrap example');
    expect(result.dataset_provenance?.settings[0]).toEqual({
      label: 'Tree inference',
      value: 'IQ-TREE 3 default search mode',
    });
  });

  it('rejects legacy top-level temporal fields', () => {
    for (const key of [
      'tree_metadata',
      'tree_pair_solutions',
      'split_change_timeline',
      'pair_interpolation_ranges',
      'distances',
    ]) {
      expect(() => validatePhyloMovieData(makePayload({ [key]: [] }))).toThrow(
        new RegExp(`phyloMovieData\\.${key} is not part of the backend contract`)
      );
    }
  });

  it('rejects fields outside normalized row contracts', () => {
    const payload = clone(makePayload());
    (payload.frames as Array<Record<string, unknown>>)[1].tree_pair_key = 'pair_0_1';

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /frames\[1\]\.tree_pair_key is not part of the backend contract/
    );
  });

  it('requires frame rows to be parallel to streamed trees', () => {
    const payload = makePayload({ frames: [] });

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /frames length \(0\) must match interpolated_trees length \(3\)/
    );
  });

  it('requires generated frames to reference the matching pair row', () => {
    const payload = clone(makePayload());
    (payload.frames as Array<Record<string, unknown>>)[1].pair_id = 'pair_missing';

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /frames\[1\]\.pair_id must reference pairs/
    );
  });

  it('requires pair rows to anchor to input frames', () => {
    const payload = clone(makePayload());
    (payload.pairs as Array<Record<string, unknown>>)[0].source_frame_index = 1;
    (payload.frames as Array<Record<string, unknown>>)[1].source_frame_index = 1;

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /pairs\[0\]\.source_frame_index must reference an input frame/
    );
  });

  it('uses the pairs array as the only ordinal truth', () => {
    const payload = clone(makePayload());
    (payload.pairs as Array<Record<string, unknown>>)[0].pair_ordinal = 5;
    (payload.frames as Array<Record<string, unknown>>)[1].pair_ordinal = 5;
    (payload.temporal_events as Array<Record<string, unknown>>).forEach((event) => {
      event.pair_ordinal = 5;
    });
    (
      (payload.pair_metrics as Record<string, unknown>).rows as Array<Record<string, unknown>>
    )[0].pair_ordinal = 5;

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /pairs\[0\]\.pair_ordinal must equal adjacent input-frame ordinal 0/
    );
  });

  it('rejects duplicate pair identifiers', () => {
    const payload = clone(makePayload());
    (payload.pairs as Array<Record<string, unknown>>).push({
      ...(payload.pairs as Array<Record<string, unknown>>)[0],
      pair_ordinal: 1,
    });

    expect(() => validatePhyloMovieData(payload)).toThrow(/pairs\[1\]\.pair_id must be unique/);
  });

  it('rejects missing pair between adjacent input frames', () => {
    const payload = makeInputOnlyPayload(2);
    payload.pairs = [];
    payload.pair_metrics.rows = [];

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /missing pair for adjacent input frames 0 -> 1/
    );
  });

  it('rejects duplicate pairs for the same adjacent input frames', () => {
    const payload = makeInputOnlyPayload(3);
    payload.pairs[1] = {
      ...payload.pairs[0],
      pair_id: 'pair_0_1_duplicate',
      pair_ordinal: 1,
    };
    payload.pair_metrics.rows[1] = {
      ...payload.pair_metrics.rows[0],
      pair_id: 'pair_0_1_duplicate',
      pair_ordinal: 1,
    };

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /duplicate pair for adjacent input frames 0 -> 1/
    );
  });

  it('rejects pair rows whose ordinal does not match adjacent input-frame order', () => {
    const payload = makeInputOnlyPayload(3);
    payload.pairs[0].pair_ordinal = 1;
    payload.pair_metrics.rows[0].pair_ordinal = 1;

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /pairs\[0\]\.pair_ordinal must equal adjacent input-frame ordinal 0/
    );
  });

  it('rejects pair rows whose anchors do not match adjacent input frames', () => {
    const payload = makeInputOnlyPayload(3);
    payload.pairs[0].target_frame_index = 2;

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /pairs\[0\] must connect adjacent input frames 0 -> 1/
    );
  });

  it('rejects shuffled pair rows instead of silently reordering them', () => {
    const payload = makeInputOnlyPayload(3);
    payload.pairs = [payload.pairs[1], payload.pairs[0]];

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /pairs\[0\]\.pair_ordinal must equal adjacent input-frame ordinal 0/
    );
  });

  it('requires temporal events to reference the canonical pair row', () => {
    const payload = clone(makePayload());
    (payload.temporal_events as Array<Record<string, unknown>>)[0].pair_id = 'pair_missing';

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /temporal_events\[0\]\.pair_id must reference pairs/
    );
  });

  it('rejects temporal event frame ranges outside the owning pair range', () => {
    const payload = clone(makePayload());
    (payload.temporal_events as Array<Record<string, unknown>>)[0].frame_range = [0, 0];

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /temporal_events\[0\].*frame_range.*inside pair_0_1 generated frame range 1 -> 1/
    );
  });

  it('rejects temporal event local step ranges outside the owning pair rows', () => {
    const payload = clone(makePayload());
    (payload.temporal_events as Array<Record<string, unknown>>)[0].local_step_range = [1, 1];

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /temporal_events\[0\].*local_step_range.*inside pair_0_1 local step range 0 -> 0/
    );
  });

  it('rejects temporal event frame ranges that do not match their local-step rows', () => {
    const payload = clone(makePayload());
    payload.interpolated_trees = [tree, tree, tree, tree];
    payload.frames = [
      payload.frames[0],
      payload.frames[1],
      {
        ...payload.frames[1],
        frame_index: 2,
        local_step_index: 1,
      },
      {
        ...payload.frames[2],
        frame_index: 3,
        input_tree_index: 1,
      },
    ];
    payload.pairs[0] = {
      ...payload.pairs[0],
      target_frame_index: 3,
      generated_frame_range: [1, 2],
    };
    payload.frames[1].target_frame_index = 3;
    payload.frames[2].target_frame_index = 3;
    payload.temporal_events[0].frame_range = [1, 1];
    payload.temporal_events[0].local_step_range = [1, 1];
    payload.temporal_events[1].frame_range = [1, 1];
    payload.temporal_events[1].local_step_range = [0, 0];
    payload.subtree_highlight_tracking = [null, [[1]], [[1]], null];

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /temporal_events\[0\].*frame_range must match local_step_range rows for pair_0_1/
    );
  });

  it('rejects temporal events that reference nonexistent pair frame rows', () => {
    const payload = clone(makePayload());
    (payload.pairs as Array<Record<string, unknown>>)[0].generated_frame_range = null;

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /temporal_events\[0\].*cannot exist because pair_0_1 has no generated frames/
    );
  });

  it('accepts valid temporal event ranges inside the owning pair rows', () => {
    const result = validatePhyloMovieData(makePayload());

    expect(result.temporal_events[0]).toMatchObject({
      pair_id: 'pair_0_1',
      local_step_range: [0, 0],
      frame_range: [1, 1],
    });
  });

  it('rejects old SPR movement fields on temporal events', () => {
    const payload = clone(makePayload());
    (payload.temporal_events as Array<Record<string, unknown>>)[1].moving_subtree = [1];

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /temporal_events\[1\]\.moving_subtree is not part of the backend contract/
    );
  });

  it('rejects SPR movement events without a pivot edge', () => {
    const payload = clone(makePayload());
    (payload.temporal_events as Array<Record<string, unknown>>)[1].pivot_edge = [];

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /temporal_events\[1\]\.pivot_edge must contain at least one number/
    );
  });

  it('requires pair metrics to reference pair rows', () => {
    const payload = clone(makePayload());
    (
      (payload.pair_metrics as Record<string, unknown>).rows as Array<Record<string, unknown>>
    )[0].pair_id = 'pair_missing';

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /pair_metrics\.rows\[0\]\.pair_id must reference pairs/
    );
  });

  it('rejects missing pair metric rows', () => {
    const payload = clone(makePayload());
    ((payload.pair_metrics as Record<string, unknown>).rows as Array<Record<string, unknown>>) = [];

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /pair_metrics.rows is missing row for pair_0_1/
    );
  });

  it('rejects duplicate pair metric rows', () => {
    const payload = clone(makePayload());
    const rows = (payload.pair_metrics as Record<string, unknown>).rows as Array<
      Record<string, unknown>
    >;
    rows.push({ ...rows[0] });

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /pair_metrics\.rows\[1\]\.pair_id must be unique/
    );
  });

  it('rejects pair metric rows with the wrong ordinal', () => {
    const payload = clone(makePayload());
    (
      (payload.pair_metrics as Record<string, unknown>).rows as Array<Record<string, unknown>>
    )[0].pair_ordinal = 1;

    expect(() => validatePhyloMovieData(payload)).toThrow(
      /pair_metrics\.rows\[0\]\.pair_ordinal must match pair_0_1 ordinal 0/
    );
  });

  it('rejects noncanonical backend split-map keys', () => {
    const payload = clone(makePayload());
    (
      (payload.pairs as Array<Record<string, unknown>>)[0].solution as Record<string, unknown>
    ).affected_subtrees_by_split = {
      '1,0': [[[1]]],
    };

    expect(() => validatePhyloMovieData(payload)).toThrow(/canonical backend split key/);
  });

  it('rejects deleted duplicate pivot tracking and requires explicit MSA shapes', () => {
    expect(() =>
      validatePhyloMovieData(
        makePayload({
          pivot_edge_tracking: [null, [0, 1, 2], null],
        })
      )
    ).toThrow(/phyloMovieData\.pivot_edge_tracking is not part of the backend contract/);

    expect(() =>
      validatePhyloMovieData(
        makePayload({
          msa: { sequences: null, window_size: 0, step_size: 1 },
        })
      )
    ).toThrow(/msa\.window_size must be positive/);
  });
});
