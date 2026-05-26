import { describe, expect, it } from 'vitest';
import {
  BRANCH_ANNOTATION_NONE,
  buildBranchSupportIndex,
  canonicalSupportSplitKey,
  classifyMovementBranchValues,
  formatBranchAnnotationLabel,
  formatSupportValue,
  getAvailableBranchAnnotationOptions,
} from '../../../src/domain/tree/branchSupportIndex.js';

const field = ({ path, label, value, role = 'metadata', unit, analysis }) => ({
  path,
  label,
  value,
  value_type: Number.isInteger(value)
    ? 'integer'
    : typeof value === 'number'
      ? 'number'
      : typeof value,
  role,
  ...(unit === undefined ? {} : { unit }),
  ...(analysis === undefined ? {} : { analysis }),
});

const supportField = (
  path,
  label,
  value,
  analysis = { type: 'tree_inference', method: 'bootstrap' }
) =>
  field({
    path,
    label,
    value,
    role: 'branch_support',
    unit: 'percent',
    analysis,
  });

const tree = {
  name: '',
  length: 0,
  split_indices: [0, 1, 2, 3],
  annotations: { fields: {} },
  children: [
    {
      name: '',
      length: 1,
      split_indices: [0, 1],
      annotations: {
        fields: {
          'label.raw_internal': field({
            path: ['label', 'raw_internal'],
            label: 'Raw Internal Label',
            value: '91',
            role: 'source_annotation',
          }),
          'support.bootstrap.value': supportField(
            ['support', 'bootstrap', 'value'],
            'Bootstrap',
            91
          ),
        },
      },
      children: [
        { name: 'A', length: 1, split_indices: [0], annotations: { fields: {} }, children: [] },
        { name: 'B', length: 1, split_indices: [1], annotations: { fields: {} }, children: [] },
      ],
    },
    {
      name: '',
      length: 1,
      split_indices: [2, 3],
      annotations: {
        fields: {
          'label.raw_internal': field({
            path: ['label', 'raw_internal'],
            label: 'Raw Internal Label',
            value: '42',
            role: 'source_annotation',
          }),
          'support.bootstrap.value': supportField(
            ['support', 'bootstrap', 'value'],
            'Bootstrap',
            42
          ),
        },
      },
      children: [
        { name: 'C', length: 1, split_indices: [2], annotations: { fields: {} }, children: [] },
        { name: 'D', length: 1, split_indices: [3], annotations: { fields: {} }, children: [] },
      ],
    },
  ],
};

describe('branch annotation indexing', () => {
  it('uses complement-aware canonical split keys', () => {
    expect(canonicalSupportSplitKey([0, 1], [0, 1, 2, 3])).toBe('0,1');
    expect(canonicalSupportSplitKey([2, 3], [0, 1, 2, 3])).toBe('0,1');
    expect(canonicalSupportSplitKey([0], [0, 1, 2, 3])).toBe('0');
  });

  it('indexes support from annotation fields by observed input tree index', () => {
    const index = buildBranchSupportIndex({
      interpolatedTrees: [tree],
      frames: [
        {
          frame_index: 0,
          frame_type: 'input_tree',
          is_observed_input: true,
          input_tree_index: 7,
        },
      ],
    });

    expect(index.getSupport(7, [0, 1])).toMatchObject({ primary: 91, bootstrap: 91 });
    expect(index.getSupport(7, [2, 3])).toMatchObject({ primary: 91, bootstrap: 91 });
    expect(index.getSupport(99, [0, 1])).toBeNull();
    expect(index.getBranchValue(7, [0, 1], BRANCH_ANNOTATION_NONE)).toMatchObject({
      key: 'support.bootstrap.value',
      displayValue: '91',
      value: 91,
    });
    expect(index.getBranchValue(7, [0, 1], 'label.raw_internal')).toMatchObject({
      key: 'label.raw_internal',
      displayValue: '91',
      role: 'source_annotation',
    });
    expect(index.getBranchValue(7, [0, 1], 'missing.value')).toBeNull();
  });

  it('resolves nearest ancestor branch values without hard-coding bootstrap fields', () => {
    const index = buildBranchSupportIndex({
      interpolatedTrees: [tree],
      frames: [
        {
          frame_index: 0,
          frame_type: 'input_tree',
          is_observed_input: true,
          input_tree_index: 7,
        },
      ],
    });

    expect(index.getNearestAncestorBranchValue(7, [0], BRANCH_ANNOTATION_NONE)).toMatchObject({
      key: 'support.bootstrap.value',
      label: 'Support / Bootstrap / Bootstrap',
      displayValue: '91',
      role: 'branch_support',
      support: { primary: 91, bootstrap: 91 },
    });
    expect(index.getNearestAncestorBranchValue(7, [2], BRANCH_ANNOTATION_NONE)).toMatchObject({
      key: 'support.bootstrap.value',
      displayValue: '42',
      support: { primary: 42, bootstrap: 42 },
    });
    expect(index.getNearestAncestorBranchValue(7, [0], 'label.raw_internal')).toMatchObject({
      key: 'label.raw_internal',
      label: 'Label / Raw Internal Label',
      displayValue: '91',
      role: 'source_annotation',
    });
    expect(index.getNearestAncestorBranchValue(7, [0], 'missing.value')).toBeNull();
    expect(index.getNearestAncestorBranchValue(7, [0, 1], BRANCH_ANNOTATION_NONE)).toBeNull();
  });

  it('requires canonical timeline frame rows instead of guessing input tree indices', () => {
    expect(() =>
      buildBranchSupportIndex({
        interpolatedTrees: [tree],
        frames: undefined,
      })
    ).toThrow(/canonical timeline frames/);

    expect(() =>
      buildBranchSupportIndex({
        interpolatedTrees: [tree],
        frames: [{ frame_type: 'input_tree', is_observed_input: true }],
      })
    ).toThrow(/frame_index/);

    expect(() =>
      buildBranchSupportIndex({
        interpolatedTrees: [tree],
        frames: [
          {
            frame_index: 2,
            frame_type: 'input_tree',
            is_observed_input: true,
            input_tree_index: 0,
          },
        ],
      })
    ).toThrow(/references missing interpolated_trees\[2\]/);
  });

  it('formats support and classifies source and destination branch values', () => {
    expect(formatSupportValue({ primary: 88.345 })).toBe('88.3');
    expect(formatSupportValue(null)).toBe('-');
    expect(classifyMovementBranchValues({ value: 91 }, { value: 88 }, 70)).toBe(
      'both_high_value'
    );
    expect(classifyMovementBranchValues({ value: 91 }, { value: 88 }, 90)).toBe('mixed_value');
    expect(classifyMovementBranchValues({ value: 91 }, { value: 35 }, 70)).toBe('mixed_value');
    expect(classifyMovementBranchValues({ value: 20 }, { value: 35 }, 70)).toBe('low_value');
    expect(classifyMovementBranchValues(null, { value: 90 }, 70)).toBe('value_missing');
    expect(
      classifyMovementBranchValues(
        { value: 'not numeric', support: { primary: 91 } },
        { value: '88' },
        70
      )
    ).toBe('both_high_value');
  });

  it('builds annotation label selector options from hierarchical annotation fields', () => {
    const annotatedTree = {
      ...tree,
      children: [
        {
          ...tree.children[0],
          annotations: {
            fields: {
              'label.raw_internal': field({
                path: ['label', 'raw_internal'],
                label: 'Raw Internal Label',
                value: '81.2/98',
                role: 'source_annotation',
              }),
              'support.iqtree.sh_alrt': supportField(
                ['support', 'iqtree', 'sh_alrt'],
                'SH-aLRT',
                81.2,
                { type: 'tree_inference', method: 'iqtree', mode: 'sh_alrt_ufboot' }
              ),
              'support.iqtree.ufboot': supportField(['support', 'iqtree', 'ufboot'], 'UFBoot', 98, {
                type: 'tree_inference',
                method: 'iqtree',
                mode: 'sh_alrt_ufboot',
              }),
              'analysis.posterior': field({
                path: ['analysis', 'posterior'],
                label: 'Posterior',
                value: 0.973,
                role: 'analysis_metric',
              }),
              'metadata.tag_name': field({
                path: ['metadata', 'tag_name'],
                label: 'Tag Name',
                value: 'candidate',
                role: 'metadata',
              }),
            },
          },
        },
      ],
    };

    const options = getAvailableBranchAnnotationOptions([annotatedTree]);
    expect(options.map((option) => option.value)).toEqual([
      'none',
      'analysis.posterior',
      'label.raw_internal',
      'metadata.tag_name',
      'support.iqtree.sh_alrt',
      'support.iqtree.ufboot',
    ]);
    expect(options.find((option) => option.value === 'support.iqtree.ufboot')?.label).toBe(
      'Support / Iqtree / UFBoot'
    );
    expect(formatBranchAnnotationLabel(annotatedTree.children[0], 'analysis.posterior')).toBe(
      '0.973'
    );
    expect(formatBranchAnnotationLabel(annotatedTree.children[0], 'metadata.tag_name')).toBe(
      'candidate'
    );
    expect(formatBranchAnnotationLabel(annotatedTree.children[0], 'label.raw_internal')).toBe(
      '81.2/98'
    );
    expect(formatBranchAnnotationLabel(annotatedTree.children[0], 'support.iqtree.sh_alrt')).toBe(
      '81.2'
    );
  });
});
