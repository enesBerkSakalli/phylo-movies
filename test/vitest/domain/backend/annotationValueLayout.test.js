import { describe, expect, it } from 'vitest';
import {
  flattenTreeAnnotationValues,
  forEachAnnotationPair,
  isNestedAnnotationValues,
} from '../../../../src/domain/backend/annotationValueLayout.ts';
import { validatePhyloMovieData } from '../../../../src/domain/backend/phyloMovieSchema.ts';
import { hydrateMovieTreeAtIndex } from '../../../../src/domain/backend/treeHydration.js';

const ANNOTATION_DEFINITIONS = [
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
  },
];

function makeTree(annotationValues) {
  return {
    name: 'root',
    length: 0,
    split_indices: [0, 1],
    annotation_values: annotationValues,
    children: [
      { name: 'A', length: 1, split_indices: [0], children: [] },
      { name: 'B', length: 1, split_indices: [1], children: [] },
    ],
  };
}

function makePayload(tree) {
  return {
    interpolated_trees: [tree, tree, tree],
    annotation_definitions: ANNOTATION_DEFINITIONS,
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
        solution: { affected_subtrees_by_split: {}, attachment_edges_by_split: {} },
      },
    ],
    temporal_events: [],
    subtree_highlight_tracking: [null, null, null],
    pair_metrics: {
      rows: [
        {
          pair_id: 'pair_0_1',
          pair_ordinal: 0,
          robinson_foulds: 0,
          weighted_robinson_foulds: 0,
        },
      ],
      semantics: {},
    },
    msa: { sequences: null, window_size: 10, step_size: 5 },
    file_name: 'annotation-layout.trees',
  };
}

const NESTED = [
  [0, 'internal-1'],
  [1, 88.5],
];
const FLAT = [0, 'internal-1', 1, 88.5];

describe('annotation value layout', () => {
  it('tells the two layouts apart by their first entry', () => {
    expect(isNestedAnnotationValues(NESTED)).toBe(true);
    expect(isNestedAnnotationValues(FLAT)).toBe(false);
    expect(isNestedAnnotationValues([])).toBe(false);
    expect(isNestedAnnotationValues(null)).toBe(false);
  });

  it('reads the same pairs from either layout', () => {
    const fromNested = [];
    const fromFlat = [];
    forEachAnnotationPair(NESTED, (index, value, ordinal) =>
      fromNested.push([index, value, ordinal])
    );
    forEachAnnotationPair(FLAT, (index, value, ordinal) => fromFlat.push([index, value, ordinal]));

    expect(fromNested).toEqual([
      [0, 'internal-1', 0],
      [1, 88.5, 1],
    ]);
    expect(fromFlat).toEqual(fromNested);
  });

  it('reads array-valued annotations without mistaking them for the nested layout', () => {
    const pairs = [];
    forEachAnnotationPair([0, [1, 2, 3]], (index, value) => pairs.push([index, value]));
    expect(pairs).toEqual([[0, [1, 2, 3]]]);
  });

  it('flattens tuple and object nodes, and is idempotent', () => {
    const objectNode = makeTree(NESTED.map((pair) => pair.slice()));
    const tupleNode = [1, 0, 0, [[0, 'x']], [[0.5, 1, 1, null, []]]];

    const once = flattenTreeAnnotationValues([objectNode, tupleNode]);
    expect(once[0].annotation_values).toEqual(FLAT);
    expect(once[1][3]).toEqual([0, 'x']);

    const twice = flattenTreeAnnotationValues(once);
    expect(twice[0].annotation_values).toEqual(FLAT);
    expect(twice[1][3]).toEqual([0, 'x']);
  });

  it('leaves null and empty annotation values alone', () => {
    const trees = [makeTree(undefined), [1, 0, 0, null, []]];
    const flattened = flattenTreeAnnotationValues(trees);
    expect(flattened[0].annotation_values).toBeUndefined();
    expect(flattened[1][3]).toBeNull();
  });
});

describe('compact tuple annotation slot', () => {
  // The backend writes this slot as either null or a list of pairs, never
  // absent. The two tuple validators used to disagree about anything else:
  // undefined passed the hydrating path and was rejected by the transport one.
  const dictionaries = {
    tree_name_definitions: ['root', 'A'],
    split_definitions: [[0, 1], [0]],
  };
  const makeTuple = (slot) => [0, 0, 0, slot, [[1, 1, 1, null, []]]];

  function validateBothPaths(slot) {
    const payload = {
      ...makePayload(makeTuple(slot)),
      ...dictionaries,
      interpolated_trees: [makeTuple(slot), makeTuple(slot), makeTuple(slot)],
    };
    const run = (options) => {
      try {
        validatePhyloMovieData(payload, options);
        return 'ok';
      } catch (error) {
        return error.message;
      }
    };
    return { hydrating: run(undefined), transport: run({ hydrateTrees: false }) };
  }

  it.each([
    ['undefined', undefined],
    ['a string', 'nope'],
    ['a number', 7],
    ['an object', {}],
  ])('rejects %s in both paths alike', (_label, slot) => {
    const { hydrating, transport } = validateBothPaths(slot);

    expect(hydrating).toMatch(/annotation_values must be an array or null/);
    expect(hydrating).toBe(transport);
  });

  it('accepts null in both paths alike', () => {
    const { hydrating, transport } = validateBothPaths(null);
    expect(hydrating).toBe('ok');
    expect(transport).toBe('ok');
  });
});

describe('contradictory node annotations', () => {
  // A node carrying both keys is rejected before its children are walked, so a
  // malformed root does not pay for a full subtree descent first.
  function makeContradictoryTree(childCount) {
    const children = Array.from({ length: childCount }, (_value, index) => ({
      name: `taxon-${index}`,
      length: 1,
      split_indices: [index],
      children: [],
    }));
    return {
      name: 'root',
      length: 0,
      split_indices: children.map((_child, index) => index),
      annotations: { fields: {} },
      annotation_values: [],
      children,
    };
  }

  it.each([
    ['hydrating', undefined],
    ['transport', { hydrateTrees: false }],
  ])('rejects a node with both keys on the %s path', (_label, options) => {
    const tree = makeContradictoryTree(2);
    const payload = { ...makePayload(tree), interpolated_trees: [tree, tree, tree] };

    expect(() => validatePhyloMovieData(payload, options)).toThrow(
      /must not include both annotations and annotation_values/
    );
  });

  it('does not descend into children before rejecting', () => {
    const tree = makeContradictoryTree(3);
    // A child that would throw a different error if it were ever reached.
    tree.children[0].split_indices = 'not-an-array';
    const payload = { ...makePayload(tree), interpolated_trees: [tree, tree, tree] };

    expect(() => validatePhyloMovieData(payload, { hydrateTrees: false })).toThrow(
      /must not include both annotations and annotation_values/
    );
  });
});

describe('validatePhyloMovieData annotation layouts', () => {
  it('normalises the transport payload to the flat layout', () => {
    const payload = makePayload(makeTree(NESTED.map((pair) => pair.slice())));
    const validated = validatePhyloMovieData(payload, { hydrateTrees: false });

    expect(validated.interpolated_trees[0].annotation_values).toEqual(FLAT);
  });

  it('hydrates a flattened transport payload identically to a nested one', () => {
    const nestedPayload = makePayload(makeTree(NESTED.map((pair) => pair.slice())));
    const flatPayload = makePayload(makeTree(FLAT.slice()));

    const fromNested = validatePhyloMovieData(nestedPayload, { hydrateTrees: false });
    const fromFlat = validatePhyloMovieData(flatPayload, { hydrateTrees: false });

    expect(hydrateMovieTreeAtIndex(fromFlat, 0)).toEqual(hydrateMovieTreeAtIndex(fromNested, 0));
    expect(hydrateMovieTreeAtIndex(fromNested, 0).annotations.fields).toMatchObject({
      'label.raw_internal': { label: 'Raw Internal Label', value: 'internal-1' },
      'support.iqtree.sh_alrt': { label: 'SH-aLRT', value: 88.5 },
    });
  });

  it('validates a stored run that is already flat', () => {
    const payload = makePayload(makeTree(FLAT.slice()));
    expect(() => validatePhyloMovieData(payload, { hydrateTrees: false })).not.toThrow();
  });

  it('rejects a flat layout with a dangling definition index', () => {
    const payload = makePayload(makeTree([0, 'internal-1', 1]));
    expect(() => validatePhyloMovieData(payload, { hydrateTrees: false })).toThrow(
      /must hold definition\/value pairs/
    );
  });

  it('rejects a flat layout that repeats an annotation field', () => {
    const payload = makePayload(makeTree([0, 'first', 0, 'second']));
    expect(() => validatePhyloMovieData(payload, { hydrateTrees: false })).toThrow(
      /duplicates annotation field label\.raw_internal/
    );
  });
});
