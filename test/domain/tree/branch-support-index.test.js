import { describe, expect, it } from 'vitest';
import {
  buildBranchSupportIndex,
  canonicalSupportSplitKey,
  classifyMovementSupport,
  formatBranchAnnotationLabel,
  formatSupportValue,
  getAvailableBranchAnnotationOptions,
} from '../../../src/domain/tree/branchSupportIndex.js';

const field = ({ path, label, value, role = 'metadata', unit, analysis }) => ({
  path,
  label,
  value,
  value_type: Number.isInteger(value) ? 'integer' : (typeof value === 'number' ? 'number' : typeof value),
  role,
  ...(unit === undefined ? {} : { unit }),
  ...(analysis === undefined ? {} : { analysis }),
});

const supportField = (path, label, value, analysis = { type: 'tree_inference', method: 'bootstrap' }) => field({
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
          'label.raw_internal': field({ path: ['label', 'raw_internal'], label: 'Raw Internal Label', value: '91', role: 'source_annotation' }),
          'support.bootstrap.value': supportField(['support', 'bootstrap', 'value'], 'Bootstrap', 91),
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
          'label.raw_internal': field({ path: ['label', 'raw_internal'], label: 'Raw Internal Label', value: '42', role: 'source_annotation' }),
          'support.bootstrap.value': supportField(['support', 'bootstrap', 'value'], 'Bootstrap', 42),
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
      frames: [{
        frame_index: 0,
        frame_type: 'input_tree',
        is_observed_input: true,
        input_tree_index: 7,
      }],
    });

    expect(index.getSupport(7, [0, 1])).toMatchObject({ primary: 91, bootstrap: 91 });
    expect(index.getSupport(7, [2, 3])).toMatchObject({ primary: 91, bootstrap: 91 });
    expect(index.getSupport(99, [0, 1])).toBeNull();
  });

  it('requires canonical timeline frame rows instead of guessing input tree indices', () => {
    expect(() => buildBranchSupportIndex({
      interpolatedTrees: [tree],
      frames: undefined,
    })).toThrow(/canonical timeline frames/);

    expect(() => buildBranchSupportIndex({
      interpolatedTrees: [tree],
      frames: [{ frame_type: 'input_tree', is_observed_input: true }],
    })).toThrow(/frame_index/);

    expect(() => buildBranchSupportIndex({
      interpolatedTrees: [tree],
      frames: [{
        frame_index: 2,
        frame_type: 'input_tree',
        is_observed_input: true,
        input_tree_index: 0,
      }],
    })).toThrow(/references missing interpolated_trees\[2\]/);
  });

  it('formats and classifies source and destination movement support summaries', () => {
    expect(formatSupportValue({ primary: 88.345 })).toBe('88.3');
    expect(formatSupportValue(null)).toBe('-');
    expect(classifyMovementSupport({ primary: 91 }, { primary: 88 }, 70)).toBe('high_support_conflict');
    expect(classifyMovementSupport({ primary: 91 }, { primary: 35 }, 70)).toBe('mixed_support');
    expect(classifyMovementSupport({ primary: 20 }, { primary: 35 }, 70)).toBe('low_support');
    expect(classifyMovementSupport(null, { primary: 90 }, 70)).toBe('support_missing');
  });

  it('builds annotation label selector options from hierarchical annotation fields', () => {
    const annotatedTree = {
      ...tree,
      children: [
        {
          ...tree.children[0],
          annotations: {
            fields: {
              'label.raw_internal': field({ path: ['label', 'raw_internal'], label: 'Raw Internal Label', value: '81.2/98', role: 'source_annotation' }),
              'support.iqtree.sh_alrt': supportField(['support', 'iqtree', 'sh_alrt'], 'SH-aLRT', 81.2, { type: 'tree_inference', method: 'iqtree', mode: 'sh_alrt_ufboot' }),
              'support.iqtree.ufboot': supportField(['support', 'iqtree', 'ufboot'], 'UFBoot', 98, { type: 'tree_inference', method: 'iqtree', mode: 'sh_alrt_ufboot' }),
              'analysis.posterior': field({ path: ['analysis', 'posterior'], label: 'Posterior', value: 0.973, role: 'analysis_metric' }),
              'metadata.tag_name': field({ path: ['metadata', 'tag_name'], label: 'Tag Name', value: 'candidate', role: 'metadata' }),
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
    expect(options.find((option) => option.value === 'support.iqtree.ufboot')?.label).toBe('Support / Iqtree / UFBoot');
    expect(formatBranchAnnotationLabel(annotatedTree.children[0], 'analysis.posterior')).toBe('0.973');
    expect(formatBranchAnnotationLabel(annotatedTree.children[0], 'metadata.tag_name')).toBe('candidate');
    expect(formatBranchAnnotationLabel(annotatedTree.children[0], 'label.raw_internal')).toBe('81.2/98');
    expect(formatBranchAnnotationLabel(annotatedTree.children[0], 'support.iqtree.sh_alrt')).toBe('81.2');
  });
});
