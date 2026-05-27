import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createTreeScalingDiagnostics } from '../src/treeVisualisation/diagnostics/treeScalingDiagnostics.js';

describe('tree scaling diagnostics', () => {
  it('reports geometry, label-ring, and viewport scaling for movie data', () => {
    const movieData = JSON.parse(
      readFileSync('test/data/small_example/small_example.response.json', 'utf8')
    );
    const report = createTreeScalingDiagnostics(movieData, {
      treeIndices: [0, 22],
      width: 1234,
      height: 777,
    });

    expect(report.global.maxGlobalScale).toBeGreaterThan(0);
    expect(report.global.originalMaxGlobalScale).toBeGreaterThan(0);
    expect(report.global.activeMaxGlobalScale).toBeGreaterThan(0);
    expect(report.dataset.branchTransformation).toBe('normalized-sqrt');
    expect(report.trees).toHaveLength(2);
    expect(report.trees[0].branchGeometry.originalRootToTipMax).toBeGreaterThan(0);
    expect(report.trees[0].branchGeometry.activeRootToTipMax).toBeGreaterThan(0);
    expect(report.trees[0].branchGeometry.maxRadius).toBeGreaterThan(0);
    expect(report.trees[0].labelRing.labelRadius).toBeGreaterThan(
      report.trees[0].branchGeometry.maxRadius
    );
    expect(report.trees[0].viewport.branchOnlyZoom).toBeGreaterThan(
      report.trees[0].viewport.autoVisibleZoom
    );
  });

  it('makes label-ring viewport shrinkage measurable for dense trees', () => {
    const movieData = {
      interpolated_trees: [makeStarTree(350, 0.01), makeStarTree(350, 2)],
      frames: [
        { frame_index: 0, frame_type: 'input_tree', is_observed_input: true },
        { frame_index: 1, frame_type: 'input_tree', is_observed_input: true },
      ],
      msa: {},
    };

    const report = createTreeScalingDiagnostics(movieData, {
      treeIndices: [0, 1],
      width: 1000,
      height: 800,
      fontSize: '1.8em',
    });
    const firstTree = report.trees[0];

    expect(report.global.originalMaxGlobalScale).toBeCloseTo(2);
    expect(report.global.activeMaxGlobalScale).toBeCloseTo(1);
    expect(firstTree.labelRing.leafCount).toBe(350);
    expect(firstTree.branchGeometry.originalRootToTipMax).toBeCloseTo(0.01);
    expect(firstTree.branchGeometry.activeRootToTipMax).toBeCloseTo(1);
    expect(firstTree.branchGeometry.activeToOriginalRootTipRatio).toBeCloseTo(100);
    expect(firstTree.branchGeometry.flooredRootToTipMax).toBe(
      firstTree.branchGeometry.rawRootToTipMax
    );
    expect(firstTree.labelRing.readableLabelRadius).toBeGreaterThan(
      firstTree.labelRing.compactLabelRadius
    );
    expect(firstTree.viewport.autoVisibleZoomDelta).toBeLessThan(-0.5);
    expect(firstTree.viewport.autoVisibleZoomDelta).toBeGreaterThan(-1);
  });

  it('keeps the original-length baseline explicit when the active transform is none', () => {
    const movieData = {
      interpolated_trees: [makeStarTree(20, 0.01), makeStarTree(20, 2)],
      frames: [
        { frame_index: 0, frame_type: 'input_tree', is_observed_input: true },
        { frame_index: 1, frame_type: 'input_tree', is_observed_input: true },
      ],
      msa: {},
    };

    const report = createTreeScalingDiagnostics(movieData, {
      branchTransformation: 'none',
      treeIndices: [0, 1],
      width: 1000,
      height: 800,
    });

    expect(report.dataset.branchTransformation).toBe('none');
    expect(report.global.activeMaxGlobalScale).toBeCloseTo(report.global.originalMaxGlobalScale);
    for (const tree of report.trees) {
      expect(tree.branchGeometry.activeRootToTipMax).toBeCloseTo(
        tree.branchGeometry.originalRootToTipMax
      );
      expect(tree.branchGeometry.activeToOriginalRootTipRatio).toBeCloseTo(1);
    }
  });
});

function makeStarTree(leafCount, branchLength) {
  return {
    name: 'root',
    length: 0,
    split_indices: Array.from({ length: leafCount }, (_value, index) => index),
    children: Array.from({ length: leafCount }, (_value, index) => ({
      name: `taxon_${index}`,
      length: branchLength,
      split_indices: [index],
      children: [],
    })),
  };
}
