import { describe, expect, it } from 'vitest';
import { getSplitKey } from '../../../../src/domain/tree/splits.js';
import { textWidthEm } from '../../../../src/domain/tree/textWidth.js';
import {
  LABEL_GAP_PX,
  RADIAL_NAME_BUDGET_EM,
} from '../../../../src/treeVisualisation/deckgl/builders/data/labels/LabelDataBuilder.js';
import { createTreeLayerSet } from '../../../../src/treeVisualisation/deckgl/layers/factory/LayerSetFactory.js';
import { rankedPriority } from '../../../../src/treeVisualisation/deckgl/layers/factory/labels/labelCollision.js';
import { createBranchIndex } from '../../../../src/treeVisualisation/deckgl/layers/factory/labels/labelBranches.js';
import { declutterTreeLabels } from '../../../../src/treeVisualisation/deckgl/layers/factory/labels/labelThinning.js';

const valueKey = 'metadata.saturation_eigenvalue_weighted_p_value';
const annotations = (value) => ({ fields: { [valueKey]: { value, role: 'metadata' } } });
const link = (indices, value, extra = {}) => ({
  id: indices.join(','),
  split_indices: indices,
  sourcePosition: [0, 0, 0],
  targetPosition: [20, 10, 0],
  path: new Float32Array([0, 0, 0, 20, 10, 0]),
  isLeaf: indices.length === 1,
  annotations: annotations(value),
  ...extra,
});
const styles = {
  getCachedState: () => ({}),
  getLinkColor: () => [0, 0, 0, 255],
  getLinkWidth: () => 1,
  getLinkDashArray: () => null,
  getLabelSize: () => 1,
  getLabelColor: () => [0, 0, 0, 255],
};
function layersFor(labels, state = {}, nodes = []) {
  // Branches 100 px apart (at zoom 0), so no value hides another.
  const links = Array.from({ length: 80 }, (_, i) =>
    link([i], i / 100, {
      sourcePosition: [i * 100, 0, 0],
      targetPosition: [i * 100 + 20, 10, 0],
      path: new Float32Array([i * 100, 0, 0, i * 100 + 20, 10, 0]),
    })
  );
  return createTreeLayerSet({
    data: { nodes, links, labels, extensions: [], connectors: [] },
    state: {
      labelsVisible: true,
      singleTreeMode: true,
      branchAnnotationLabelKey: valueKey,
      selectedBranchKey: getSplitKey([7]),
      ...state,
    },
    layerStyles: styles,
    skipEmpty: true,
  });
}

const SIZE_PX = 12.6;
// A 70 px wide label (10 characters) that starts LABEL_GAP_PX past its anchor, at 12.6 px text.
const label = (x, y, rank, extra = {}) => ({
  position: [x, y, 0],
  text: 'aaaaaaaaaa',
  rank,
  rotation: 0,
  textAnchor: 'start',
  pixelOffset: [LABEL_GAP_PX, 0],
  ...extra,
});

describe('taxon and branch-value label collisions', () => {
  const labels = Array.from({ length: 80 }, (_, i) => ({
    split_indices: [i],
    splitKey: getSplitKey([i]),
    position: [i * 4, i * 2, 0],
    rank: i,
    pixelOffset: [LABEL_GAP_PX, 0],
    textAnchor: 'start',
    text: `taxon_${i}`,
  }));

  it('leaves movie-mode taxon labels unfiltered', () => {
    const layers = layersFor(labels, { singleTreeMode: false });
    const taxon = layers.find((layer) => layer.id === 'phylo-labels-base');
    expect(taxon.props.data).toHaveLength(labels.length);
  });

  it('ranks crowds so every other value outranks its neighbours, then every 4th, ...', () => {
    const ranks = Array.from({ length: 64 }, (_, rank) => rank);
    // Group k holds the ranks that are an odd multiple of 2^k; lower k outranks higher k.
    const group = (k) => ranks.filter((rank) => rank % 2 ** (k + 1) === 2 ** k);
    const priorities = (k) => group(k).map((rank) => rankedPriority(rank));
    for (let k = 0; k < 5; k += 1) {
      expect(Math.min(...priorities(k))).toBeGreaterThan(Math.max(...priorities(k + 1)));
    }
    expect(new Set(ranks.map((rank) => rankedPriority(rank))).size).toBe(64);
    expect(rankedPriority(undefined)).toBe(0);
  });
});

const thin = (labels, zoom, nodes = []) =>
  declutterTreeLabels(labels, [], { zoom, nameSizePx: SIZE_PX, nodes }).names;

describe('name declutter', () => {
  it('keeps the earlier of two side-by-side labels and both once they clear', () => {
    const pair = [label(0, 0, 0), label(0, 8, 1)];
    expect(thin(pair, 0)).toEqual([pair[0]]);
    // 8 world units are 8 * 2^2 = 32 px apart at zoom 2: clear of the 12.6 px lines.
    expect(thin(pair, 2)).toEqual(pair);
  });

  it('drops one of two labels whose lines cross, which anchor sampling cannot see', () => {
    // The first points right along y = 0; the second starts above it and points down across it
    // (deck.gl turns text counter-clockwise, so a downward label has a negative rotation).
    const crossing = [label(0, 0, 0), label(40, -40, 1, { rotation: -Math.PI / 2 })];
    expect(thin(crossing, 0)).toEqual([crossing[0]]);
  });

  it('measures a turned label along the way deck.gl draws it, not mirrored', () => {
    // Rotation is counter-clockwise on screen: -45 degrees runs down and to the right, through
    // the second label's anchor; the mirrored box would run up and to the right instead.
    const diagonal = label(0, 0, 0, { rotation: -Math.PI / 4, pixelOffset: [0, 0] });
    const onTheLine = label(40, 40, 1, { pixelOffset: [0, 0] });
    const offTheLine = label(40, -40, 1, { pixelOffset: [0, 0] });
    expect(thin([diagonal, onTheLine], 0)).toEqual([diagonal]);
    expect(thin([diagonal, offTheLine], 0)).toHaveLength(2);
  });

  it('spaces labels that follow each other along a line by a small gap', () => {
    // A 70 px label starting at 6 px ends at 76 px; the next anchor 100 px on starts at 106 px.
    const inLine = [label(0, 0, 0), label(100, 0, 1)];
    expect(thin(inLine, 0)).toEqual(inLine);
    expect(thin([label(0, 0, 0), label(75, 0, 1)], 0)).toHaveLength(1);
  });

  it('measures a flipped label (text anchored at its end) towards the tip direction', () => {
    // Rotated by half a turn and anchored at its end, the text still runs rightwards from x = 6.
    const flipped = label(0, 0, 0, { rotation: Math.PI, textAnchor: 'end' });
    expect(thin([flipped, label(40, 0, 1)], 0)).toHaveLength(1);
    expect(thin([flipped, label(0, 40, 1)], 0)).toHaveLength(2);
  });

  it('reveals more labels as zoom grows and always keeps the first', () => {
    const row = Array.from({ length: 64 }, (_, i) => label(0, i * 2, i));
    const sizes = [-1, 0, 1, 2, 3, 4].map((zoom) => {
      const kept = thin(row, zoom);
      expect(kept).toContain(row[0]);
      return kept.length;
    });
    for (let i = 1; i < sizes.length; i += 1) expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
    expect(sizes[sizes.length - 1]).toBe(64);
  });

  it('keeps layout order, ignores the pan, and passes tiny sets through', () => {
    const single = [label(0, 0, 0)];
    expect(thin(single, 0)).toEqual(single);
    const row = Array.from({ length: 16 }, (_, i) => label(0, i * 6, i));
    const kept = thin(row, 0);
    expect(kept).toEqual([...kept].sort((a, b) => a.rank - b.rank));
    expect(thin(row, undefined)).toEqual(kept);
  });

});

describe('clade labels', () => {
  const leafNode = (id, parentId, index) => ({
    id,
    parentId,
    isLeaf: true,
    split_indices: [index],
  });
  const innerNode = (id, parentId) => ({ id, parentId, isLeaf: false, split_indices: [] });
  // root { A { 0, 1 }, B { B1 { 2, 3 }, 4 } }
  const nodes = [
    innerNode('root', undefined),
    innerNode('A', 'root'),
    innerNode('B', 'root'),
    innerNode('B1', 'B'),
    leafNode('l0', 'A', 0),
    leafNode('l1', 'A', 1),
    leafNode('l2', 'B1', 2),
    leafNode('l3', 'B1', 3),
    leafNode('l4', 'B', 4),
  ];
  const tips = (ys) =>
    ys.map((y, i) => label(0, y, i, { split_indices: [i], splitKey: getSplitKey([i]) }));
  const keptIndices = (labels) => thin(labels, 0, nodes).map((l) => l.split_indices[0]);

  it('shows every name of a clade that fits', () => {
    expect(keptIndices(tips([0, 40, 100, 140, 200]))).toEqual([0, 1, 2, 3, 4]);
  });

  it('hides a crowded clade whole instead of sampling it, and keeps the clades that fit', () => {
    // Tips 2 and 3 overlap: B1 hides both (a sample would show tip 2), A and tip 4 stay.
    expect(keptIndices(tips([0, 40, 100, 110, 200]))).toEqual([0, 1, 4]);
  });

  it('falls back to the child clades that fit when the whole tree does not', () => {
    // Tip 4 sits on tip 3: the root and B fail, A and B1 fit, tip 4 is hidden.
    const kept = keptIndices(tips([0, 40, 100, 140, 140]));
    expect(kept).toEqual([0, 1, 2, 3]);
  });

  it('lets the selected value take its place before the names', () => {
    const labels = tips([0, 40, 100, 140, 200]);
    // The value box sits on tip 1's name, so clade A cannot show.
    const value = { position: [40, 40, 0], text: '64.05', rank: 0, splitKey: 'picked' };
    const result = declutterTreeLabels(labels, [value], {
      zoom: 0,
      nameSizePx: SIZE_PX,
      valueSizePx: 12,
      selectedBranchKey: 'picked',
      nodes,
    });
    expect(result.values).toEqual([value]);
    expect(result.names.map((l) => l.split_indices[0])).toEqual([2, 3, 4]);
  });
});

describe('names and branches', () => {
  // Leaf names run right from x = 3 to about x = 82 at y = row.
  const tip = (index, y) =>
    label(0, y, index, { split_indices: [index], splitKey: getSplitKey([index]) });
  const branch = (path, splitKey = 'other') => ({ path: new Float32Array(path), splitKey });
  const kept = (names, branches, extra = {}) =>
    declutterTreeLabels(names, [], {
      zoom: 0,
      nameSizePx: SIZE_PX,
      branches,
      branchHalfWidthPx: 0.5,
      ...extra,
    }).names;
  const crossing = branch([40, -30, 0, 40, 30, 0]);

  it('hides a name that runs across another branch and keeps one clear of it', () => {
    const names = [tip(0, 0)];
    expect(kept(names, [crossing])).toEqual([]);
    // The branch ends above the name box, or starts past its end.
    expect(kept(names, [branch([40, -30, 0, 40, -12, 0])])).toEqual(names);
    expect(kept(names, [branch([100, -30, 0, 100, 30, 0])])).toEqual(names);
  });

  it('measures the crossing on a slanted name and on a diagonal branch', () => {
    const turned = [label(0, 0, 0, { rotation: -Math.PI / 4, pixelOffset: [0, 0] })];
    // The name runs down-right through (40, 40); this branch passes through that point.
    expect(kept(turned, [branch([20, 60, 0, 60, 20, 0])])).toEqual([]);
    // A parallel branch 40 px up-right of the name's line does not touch it.
    expect(
      kept(turned, [branch([40, 0, 0, 80, 40, 0].map((v, i) => (i % 3 === 0 ? v + 40 : v)))])
    ).toEqual(turned);
  });

  it('lets a name sit on its own leaf branch and guide line', () => {
    const own = tip(0, 0);
    const ownBranch = branch([40, -30, 0, 40, 30, 0], own.splitKey);
    expect(kept([own], [ownBranch])).toEqual([own]);
    // Another leaf's branch at the same place still blocks.
    expect(kept([own], [ownBranch, crossing])).toEqual([]);
  });

  it('hides a whole clade when one of its names crosses a branch', () => {
    const leaf = (id, parentId, index) => ({ id, parentId, isLeaf: true, split_indices: [index] });
    // root { A { 0, 1 }, B { 2, 3 } }
    const nodes = [
      { id: 'root' },
      { id: 'A', parentId: 'root' },
      { id: 'B', parentId: 'root' },
      leaf('l0', 'A', 0),
      leaf('l1', 'A', 1),
      leaf('l2', 'B', 2),
      leaf('l3', 'B', 3),
    ];
    const names = [tip(0, 0), tip(1, 40), tip(2, 100), tip(3, 140)];
    // The branch crosses name 1 only: name 0 would be clear, but its clade hides with it.
    const wall = branch([40, 30, 0, 40, 50, 0]);
    expect(kept(names, [wall], { nodes }).map((l) => l.split_indices[0])).toEqual([2, 3]);
    expect(kept(names, [], { nodes })).toHaveLength(4);
  });

  it('leaves rows that are already spaced alone', () => {
    const rows = [tip(0, 0), tip(1, 40)];
    expect(kept(rows, [crossing], { keepNames: true })).toEqual(rows);
  });

  it('hides a name that reaches out of the clip, whole clades included, and keeps those inside', () => {
    // Names run right from x = 3 to about x = 82.
    const names = [tip(0, 0), tip(1, 40)];
    const room = { minX: -10, maxX: 200, minY: -20, maxY: 60 };
    expect(kept(names, [], { clip: room })).toEqual(names);
    // The second name's box is cut off by the bottom edge.
    expect(kept(names, [], { clip: { ...room, maxY: 30 } })).toEqual([names[0]]);
    expect(kept(names, [], { clip: { ...room, maxX: 60 } })).toEqual([]);
    const leaf = (id, parentId, index) => ({ id, parentId, isLeaf: true, split_indices: [index] });
    const nodes = [
      { id: 'root' },
      { id: 'A', parentId: 'root' },
      leaf('l0', 'A', 0),
      leaf('l1', 'A', 1),
    ];
    expect(kept(names, [], { clip: { ...room, maxY: 30 }, nodes })).toEqual([]);
    // Rows are kept as they are.
    expect(kept(names, [], { keepNames: true, clip: { ...room, maxY: 30 } })).toEqual(names);
  });

  it('indexes about 2,000 leaves and 2,500 branches within a generous time bound', () => {
    const count = 2000;
    const names = [];
    const branches = [];
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * 2 * Math.PI;
      const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
      const hub = Math.floor(i / 4);
      const hubAngle = ((hub * 4 + 1.5) / count) * 2 * Math.PI;
      const splitKey = getSplitKey([i]);
      // Each leaf branch runs from its group's hub at radius 150 to the tip at radius 300.
      branches.push({
        splitKey,
        path: new Float32Array([
          150 * Math.cos(hubAngle),
          150 * Math.sin(hubAngle),
          0,
          300 * dx,
          300 * dy,
          0,
        ]),
      });
      if (i % 4 === 0)
        branches.push({
          splitKey: `hub-${hub}`,
          path: new Float32Array([0, 0, 0, 150 * Math.cos(hubAngle), 150 * Math.sin(hubAngle), 0]),
        });
      names.push({
        position: [300 * dx, 300 * dy, 0],
        text: `taxon_${i}`,
        rank: i,
        split_indices: [i],
        splitKey,
        rotation: -angle,
        textAnchor: 'start',
        pixelOffset: [LABEL_GAP_PX * dx, LABEL_GAP_PX * dy],
      });
    }
    const started = performance.now();
    const result = kept(names, branches, { zoom: 1 });
    expect(performance.now() - started).toBeLessThan(500);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('branch index', () => {
  // Segments of a seeded scatter, long and short, and axis-aligned boxes from a second one.
  const random = (seed) => () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const next = random(7);
  const branches = Array.from({ length: 300 }, (_, i) => {
    const [x, y] = [next() * 400 - 200, next() * 400 - 200];
    const reach = next() < 0.2 ? 150 : 15;
    return {
      splitKey: `b${i}`,
      path: new Float32Array([x, y, 0, x + (next() - 0.5) * reach, y + (next() - 0.5) * reach, 0]),
    };
  });
  const box = (cx, cy, halfLength, halfHeight) => ({
    cx,
    cy,
    ux: 1,
    uy: 0,
    halfLength,
    halfHeight,
    reachX: halfLength,
    reachY: halfHeight,
  });
  // Liang-Barsky clip of a segment against a rectangle.
  const touches = ([ax, ay, bx, by], { cx, cy, halfLength, halfHeight }, grow) => {
    let [t0, t1] = [0, 1];
    for (const [p, q] of [
      [-(bx - ax), ax - (cx - halfLength - grow)],
      [bx - ax, cx + halfLength + grow - ax],
      [-(by - ay), ay - (cy - halfHeight - grow)],
      [by - ay, cy + halfHeight + grow - ay],
    ]) {
      if (p === 0) {
        if (q < 0) return false;
      } else {
        const t = q / p;
        if (p < 0) t0 = Math.max(t0, t);
        else t1 = Math.min(t1, t);
      }
    }
    return t0 <= t1;
  };

  it('finds the same crossings as a scan of every segment, at any zoom', () => {
    for (const zoom of [-2, 0, 3, 6]) {
      const scale = 2 ** zoom;
      const { crosses } = createBranchIndex(branches, scale, 1);
      const pick = random(zoom + 11);
      let hits = 0;
      for (let i = 0; i < 150; i += 1) {
        const probe = box(
          (pick() * 400 - 200) * scale,
          (pick() * 400 - 200) * scale,
          5 + pick() * 40,
          4 + pick() * 6
        );
        const expected = branches.some(({ path }) =>
          touches([path[0] * scale, path[1] * scale, path[3] * scale, path[4] * scale], probe, 1)
        );
        expect(crosses(probe, null)).toBe(expected);
        hits += expected ? 1 : 0;
      }
      // The probes cover both outcomes, or the comparison would prove little (zoomed far out,
      // every probe lies on some branch).
      expect(hits).toBeGreaterThan(0);
      if (zoom >= 0) expect(hits).toBeLessThan(150);
    }
  });

  it('reads no branch until a name is tested, and indexes a list once for every zoom', () => {
    let reads = 0;
    const counted = branches.map((branch) => ({
      splitKey: branch.splitKey,
      get path() {
        reads += 1;
        return branch.path;
      },
    }));
    const at = (zoom) => createBranchIndex(counted, 2 ** zoom, 1);
    const first = at(0);
    expect(reads).toBe(0);
    first.crosses(box(0, 0, 10, 5), null);
    expect(reads).toBe(counted.length);
    // Another zoom, and another index of the same list, read nothing more.
    at(6).crosses(box(0, 0, 10, 5), null);
    expect(reads).toBe(counted.length);
  });
});

describe('declutterTreeLabels', () => {
  const name = (x, y, rank) => label(x, y, rank);
  const value = (x, y, rank, splitKey = `branch-${rank}`) => ({
    position: [x, y, 0],
    text: '64.05',
    rank,
    splitKey,
  });
  const run = (names, values, selectedBranchKey = null) =>
    declutterTreeLabels(names, values, {
      zoom: 0,
      nameSizePx: SIZE_PX,
      valueSizePx: 12,
      selectedBranchKey,
    });

  it('drops a value that sits on a name and keeps one clear of it', () => {
    const names = [name(0, 0, 0)];
    // The name runs from x = 6 to x = 76 along y = 0.
    const result = run(names, [value(40, 0, 0), value(40, 60, 1)]);
    expect(result.names).toHaveLength(1);
    expect(result.values.map((d) => d.rank)).toEqual([1]);
  });

  it('keeps the selected value over a name it covers', () => {
    const result = run([name(0, 0, 0)], [value(40, 0, 0, 'picked')], 'picked');
    expect(result.values).toHaveLength(1);
    expect(result.names).toHaveLength(0);
  });
});

describe('value declutter', () => {
  // A 5-character value centred on its anchor, about 36 px wide at 12 px text.
  const value = (x, y, rank, extra = {}) => ({
    position: [x, y, 0],
    text: '64.05',
    rank,
    splitKey: `branch-${rank}`,
    ...extra,
  });
  const thinValues = (values, zoom, selected = null) =>
    declutterTreeLabels([], values, {
      zoom,
      valueSizePx: 12,
      selectedBranchKey: selected,
    }).values;

  it('drops a value that would sit on a higher-ranked neighbour and keeps clear ones', () => {
    const pair = [value(0, 0, 0), value(20, 0, 1)];
    expect(thinValues(pair, 0)).toEqual([pair[1]]);
    expect(thinValues([value(0, 0, 0), value(60, 0, 1)], 0)).toHaveLength(2);
    // Stacked values need a line each: 14 px boxes plus their free space.
    expect(thinValues([value(0, 0, 0), value(0, 12, 1)], 0)).toHaveLength(1);
    expect(thinValues([value(0, 0, 0), value(0, 22, 1)], 0)).toHaveLength(2);
  });

  it('always keeps the selected value, even against a higher-ranked neighbour', () => {
    const pair = [value(0, 0, 0), value(10, 0, 1)];
    expect(thinValues(pair, 0, pair[0].splitKey)).toEqual([pair[0]]);
    const crowd = Array.from({ length: 50 }, (_, i) => value(i, 0, i));
    expect(thinValues(crowd, -2, crowd[0].splitKey)).toContain(crowd[0]);
  });

  it('shows more values as zoom grows', () => {
    const row = Array.from({ length: 64 }, (_, i) => value(i * 2, 0, i));
    const sizes = [-1, 1, 3, 5].map((zoom) => thinValues(row, zoom).length);
    for (let i = 1; i < sizes.length; i += 1) expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
    expect(sizes[sizes.length - 1]).toBe(64);
  });

});

describe('tree label names', () => {
  it('draws long taxon names shortened and keeps the full name for the tooltip', async () => {
    const { LabelDataBuilder } =
      await import('../../../../src/treeVisualisation/deckgl/builders/data/labels/LabelDataBuilder.js');
    const { createTaxonTooltip } =
      await import('../../../../src/treeVisualisation/deckgl/context/tooltipUtils.js');
    const long =
      'Bacteria_Proteobacteria_Gammaproteobacteria_Chromatiales_Ectothiorhodospiraceae_Thiohalospira_halophila_HL3';
    const leaf = (name, index) => ({
      name,
      split_indices: [index],
      angle: index,
      radius: 10,
      x: 10 * Math.cos(index),
      y: 10 * Math.sin(index),
    });
    const [label, plain] = new LabelDataBuilder().convertLabels(
      [leaf(long, 0), leaf('PV588655_P17_GII-17', 1)],
      20
    );
    // First part and trailing parts, cut in the middle, within the radial budget.
    expect(label.text).toBe('Bacteria_…_Thiohalospira_halophila_HL3');
    expect(textWidthEm(label.text)).toBeLessThanOrEqual(RADIAL_NAME_BUDGET_EM);
    expect(label.name).toBe(long);
    expect(plain.text).toBe('PV588655_P17_GII-17');
    const tooltip = createTaxonTooltip({ object: label }, null);
    expect(JSON.stringify(tooltip)).toContain(long);
  });
});
