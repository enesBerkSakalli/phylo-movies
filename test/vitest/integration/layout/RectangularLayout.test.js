import { describe, expect, it } from 'vitest';
import { calculateLayoutWorkerResult } from '../../../../src/treeVisualisation/workers/layout.worker.js';
import { rectangularElbowFloat32Path } from '../../../../src/treeVisualisation/deckgl/utils/pathFormat.js';
import {
  getLabelsLayerProps,
  labelPixelSize,
  resolveNameLabels,
  rowPitchPx,
} from '../../../../src/treeVisualisation/deckgl/layers/factory/labels/LabelLayers.js';

// ((A:1,B:2):1,C:3);
const leaf = (name, length, index) => ({ name, length, split_indices: [index], children: [] });
const treeData = {
  name: '',
  length: 0,
  split_indices: [0, 1, 2],
  children: [
    { name: '', length: 1, split_indices: [0, 1], children: [leaf('A', 1, 0), leaf('B', 2, 1)] },
    leaf('C', 3, 2),
  ],
};
const run = (labelsVisible = true) =>
  calculateLayoutWorkerResult(treeData, {
    width: 800,
    height: 600,
    margin: 60,
    branchTransformation: 'none',
    layoutAngleDegrees: 360,
    layoutRotationDegrees: 0,
    labelOffsets: { DEFAULT: 20, EXTENSION: 5 },
    layoutProjectionMode: 'rectangular',
    labelsVisible,
  }).layerData;

describe('rectangular layout', () => {
  it('places x by branch length, leaves in rows and parents between their children', () => {
    const { nodes } = run();
    const byName = Object.fromEntries(nodes.map((node) => [node.name || node.id, node]));
    const [a, b, c] = ['A', 'B', 'C'].map((name) => byName[name].position);
    // Root-to-tip lengths 2, 3, 3 on a 500-unit width.
    expect(a[0]).toBeCloseTo((2 / 3) * 500, 3);
    expect(b[0]).toBeCloseTo(500, 3);
    expect(c[0]).toBeCloseTo(500, 3);
    expect([a[1], b[1], c[1]]).toEqual([0, 250, 500]);
    const parent = nodes.find((node) => !node.isLeaf && node.position[0] > 0);
    expect(parent.position[1]).toBeCloseTo(125, 3);
  });

  it('draws elbow branches and pixel tip labels without guide lines', () => {
    const { links, labels, extensions } = run();
    expect(links.every((link) => link.path.length === 9)).toBe(true);
    expect(extensions).toHaveLength(0);
    expect(labels).toHaveLength(3);
    for (const label of labels) expect(label.textAnchor).not.toBe('end');
    const props = getLabelsLayerProps(
      labels,
      {},
      { getCachedState: () => ({}), getLabelSize: () => 1 }
    );
    expect(props.data).toHaveLength(3);
    // Three rows 250 units apart are far apart on screen: the largest row label, 14 px.
    expect(props.getSize(labels[0])).toBeCloseTo(14);
    expect(Math.hypot(...labels[0].pixelOffset)).toBeCloseTo(6);
  });

  it('sizes row labels by the row pitch, within 9 and 14 px, times the Label Size setting', () => {
    // 101 rows: 5 px apart at fit zoom.
    expect(rowPitchPx(101, 0)).toBe(5);
    expect(rowPitchPx(101, 2)).toBe(20);
    expect(rowPitchPx(1, 0)).toBe(Infinity);
    expect(labelPixelSize('1.8em', 5)).toBe(9);
    expect(labelPixelSize('1.8em', 12.5)).toBeCloseTo(10);
    expect(labelPixelSize('1.8em', 20)).toBe(14);
    // The default 1.8 em is a factor of 1; 3.6 em doubles the size.
    expect(labelPixelSize('3.6em', 20)).toBe(28);
    // Radial and unrooted labels have a fixed size.
    expect(labelPixelSize('1.8em')).toBe(11);
    expect(labelPixelSize('0.9em')).toBe(5.5);
  });

  it('shows all rows once they are far enough apart for the minimum text, none before', () => {
    const labels = Array.from({ length: 101 }, (_, row) => ({
      position: [0, row * 5, 0],
      projectionMode: 'rectangular',
    }));
    // 5 px rows cannot hold 9 px text; at zoom 2 they are 20 px apart.
    expect(resolveNameLabels(labels, { zoom: 0 }).names).toHaveLength(0);
    expect(resolveNameLabels(labels, { zoom: 2 }).names).toHaveLength(101);
    expect(resolveNameLabels(labels, { zoom: 2 }).sizePx).toBe(14);
    // A larger Label Size that no longer fits a row hides the names rather than overlapping them.
    expect(resolveNameLabels(labels, { zoom: 2, fontSize: '3.6em' }).names).toHaveLength(0);
  });

  it('builds the elbow down the parent column, then across', () => {
    expect(Array.from(rectangularElbowFloat32Path([0, 0, 0], [5, 8, 0]))).toEqual([
      0, 0, 0, 0, 8, 0, 5, 8, 0,
    ]);
  });
});
