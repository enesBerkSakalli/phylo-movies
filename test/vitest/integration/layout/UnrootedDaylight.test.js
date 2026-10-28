import { describe, expect, it } from 'vitest';
import { calculateLayoutWorkerResult } from '../../../../src/treeVisualisation/workers/layout.worker.js';
import { LAYOUT_PROJECTION_MODES } from '../../../../src/treeVisualisation/layout/hyperbolicProjection/index.js';
import { UNROOTED_WORLD_EXTENT } from '../../../../src/treeVisualisation/layout/EqualAngleLayout.js';

const leaf = (name, length, index) => ({ name, length, split_indices: [index], children: [] });
const norovirus = {
  name: '',
  length: 0,
  split_indices: [0, 1, 2, 3, 4, 5],
  children: [
    leaf('PV588655_P17_GII-17', 0.0070942577, 0),
    leaf('PV588657_P17_GII-17', 0.0032998631, 1),
    {
      name: '',
      length: 0.3541389892,
      split_indices: [2, 3, 4, 5],
      children: [
        {
          name: '',
          length: 0.1576828439,
          split_indices: [2, 3],
          children: [
            leaf('PV746275_P16_GII-4', 0.1804914933, 2),
            leaf('MH218629_P31_GII-4', 0.0642463261, 3),
          ],
        },
        {
          name: '',
          length: 0.0998237479,
          split_indices: [4, 5],
          children: [
            leaf('OR536471_P21_GII-3', 0.1081536911, 4),
            leaf('MW305600_P21_GII-2', 0.1193205239, 5),
          ],
        },
      ],
    },
  ],
};

const run = (layoutRotationDegrees = 0) =>
  calculateLayoutWorkerResult(norovirus, {
    width: 800,
    height: 600,
    margin: 60,
    branchTransformation: 'none',
    layoutAngleDegrees: 360,
    layoutRotationDegrees,
    layoutProjectionMode: LAYOUT_PROJECTION_MODES.UNROOTED,
    labelsVisible: true,
    labelOffsets: { DEFAULT: 20, EXTENSION: 5 },
  });

describe('unrooted layout through the layout worker', () => {
  it('fans the two short sibling tips apart and keeps labels on their branches', () => {
    const { layout, layerData } = run();
    const byId = new Map(layout.nodes.map((node) => [node.id, node]));
    const [first, second] = layout.leaves.filter((node) => node.name.startsWith('PV5886'));

    for (const node of layout.leaves) {
      const parent = byId.get(node.parentId);
      const length = Math.hypot(node.x - parent.x, node.y - parent.y);
      expect(Math.cos(node.branchAngle)).toBeCloseTo((node.x - parent.x) / length, 9);
      expect(Math.sin(node.branchAngle)).toBeCloseTo((node.y - parent.y) / length, 9);
      expect(layerData.labels.find((label) => label.name === node.name).angle).toBe(
        node.branchAngle
      );
    }

    const apart = Math.abs(first.branchAngle - second.branchAngle) % (2 * Math.PI);
    expect(Math.min(apart, 2 * Math.PI - apart)).toBeGreaterThan(Math.PI / 3 + 0.3);
    expect(layout.max_radius).toBeCloseTo(UNROOTED_WORLD_EXTENT, 6);
  });

  it('is deterministic and turned by the rotation control', () => {
    const base = run().layout.nodes;
    expect(run().layout.nodes.map((n) => [n.x, n.y])).toEqual(base.map((n) => [n.x, n.y]));

    const turned = run(90).layout.nodes;
    base.forEach((node, index) => {
      expect(turned[index].x).toBeCloseTo(-node.y, 6);
      expect(turned[index].y).toBeCloseTo(node.x, 6);
    });
  });
});
