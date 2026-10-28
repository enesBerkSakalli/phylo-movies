import { describe, it, expect } from 'vitest';
import { hierarchy } from 'd3-hierarchy';
import {
  applyEqualAngleLayout,
  convexHull,
  UNROOTED_WORLD_EXTENT,
} from '../../../../src/treeVisualisation/layout/EqualAngleLayout.js';
import { TidyTreeLayout } from '../../../../src/treeVisualisation/layout/TidyTreeLayout.js';

const TAU = Math.PI * 2;

const NOROVIRUS =
  '(PV588655_P17_GII-17:0.0070942577,PV588657_P17_GII-17:0.0032998631,' +
  '((PV746275_P16_GII-4:0.1804914933,MH218629_P31_GII-4:0.0642463261):0.1576828439,' +
  '(OR536471_P21_GII-3:0.1081536911,MW305600_P21_GII-2:0.1193205239):0.0998237479):0.3541389892);';

function parseNewick(text) {
  let i = 0;
  const readNode = () => {
    const node = { children: [] };
    if (text[i] === '(') {
      do {
        i += 1;
        node.children.push(readNode());
      } while (text[i] === ',');
      i += 1;
    }
    node.name = '';
    while (!':,);'.includes(text[i])) node.name += text[i++];
    node.length = 0;
    if (text[i] === ':') {
      i += 1;
      let number = '';
      while (!',);'.includes(text[i])) number += text[i++];
      node.length = Number(number);
    }
    return node;
  };
  return readNode();
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Random binary tree: every split sends a random share of the leaves left.
function randomTree(leafCount, seed) {
  const random = mulberry32(seed);
  const build = (n) => {
    const length = 0.001 + random() * 0.2;
    if (n === 1) return { name: `t${seed}_${n}_${length}`, length, children: [] };
    const left = 1 + Math.floor(random() * (n - 1));
    return { name: '', length, children: [build(left), build(n - left)] };
  };
  return { name: '', length: 0, children: [build(1), build(leafCount - 1)] };
}

// Random multifurcating tree with zero-length branches, so polytomies and
// coincident nodes are exercised too.
function multifurcating(leafCount, seed) {
  const random = mulberry32(seed);
  const build = (n) => {
    const length = random() < 0.2 ? 0 : random() * 0.2;
    if (n === 1) return { name: `t${seed}`, length, children: [] };
    const parts = Math.min(n, 2 + Math.floor(random() * 3));
    const sizes = Array(parts).fill(1);
    for (let i = parts; i < n; i += 1) sizes[Math.floor(random() * parts)] += 1;
    return { name: '', length, children: sizes.map(build) };
  };
  return { ...build(leafCount), length: 0 };
}

// Ladder: the most unbalanced shape, every split peels off a single leaf.
function caterpillar(leafCount) {
  let tree = { name: 'leaf0', length: 0.05, children: [] };
  for (let i = 1; i < leafCount; i += 1) {
    tree = {
      name: '',
      length: 0.05 + (i % 3) * 0.04,
      children: [tree, { name: `leaf${i}`, length: 0.02 + (i % 4) * 0.03, children: [] }],
    };
  }
  return { ...tree, length: 0 };
}

const place = (data, options) => {
  const root = hierarchy(data);
  applyEqualAngleLayout(root, options);
  return root;
};

const EQUAL_ANGLE = { daylight: false };

// Angular gaps between the neighbouring subtrees of `node` (each child subtree
// plus, off the root, the rest of the tree), seen from the node's position.
function daylightGaps(node) {
  const root = node.ancestors().at(-1);
  const group = new Map();
  node.children.forEach((child, index) => child.each((d) => group.set(d, index)));
  const points = [];
  root.each((d) => {
    const dx = d.x - node.x;
    const dy = d.y - node.y;
    if (d === node || (dx === 0 && dy === 0)) return;
    points.push({ angle: Math.atan2(dy, dx), group: group.has(d) ? group.get(d) : -1 });
  });
  points.sort((a, b) => a.angle - b.angle);
  const gaps = [];
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    if (next.group !== point.group) gaps.push((next.angle - point.angle + TAU) % TAU);
  });
  return gaps;
}

const spread = (node) => {
  const gaps = daylightGaps(node);
  return Math.min(...gaps) / Math.max(...gaps);
};

const junctions = (root) => root.descendants().filter((d) => d.children?.length > 1);
const meanSpread = (root) => {
  const nodes = junctions(root).filter((d) => d.children.length + (d.parent ? 1 : 0) > 2);
  return nodes.reduce((sum, d) => sum + spread(d), 0) / nodes.length;
};

function countCrossings(root) {
  const edges = root
    .descendants()
    .filter((d) => d.parent)
    .map((d) => ({ a: d.parent, b: d }));
  const side = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  let crossings = 0;
  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      const e = edges[i];
      const f = edges[j];
      if (e.a === f.a || e.a === f.b || e.b === f.a || e.b === f.b) continue;
      if (
        side(e.a, e.b, f.a) * side(e.a, e.b, f.b) < 0 &&
        side(f.a, f.b, e.a) * side(f.a, f.b, e.b) < 0
      ) {
        crossings += 1;
      }
    }
  }
  return crossings;
}

describe('equal-daylight refinement of the equal-angle layout', () => {
  const norovirus = parseNewick(NOROVIRUS);

  it('keeps every branch length exactly', () => {
    for (const data of [norovirus, caterpillar(14), randomTree(120, 7), multifurcating(90, 4)]) {
      const root = place(data);
      for (const node of root.descendants().filter((d) => d.parent)) {
        const length = Math.hypot(node.x - node.parent.x, node.y - node.parent.y);
        expect(length).toBeCloseTo(node.data.length, 9);
        expect(node.visualBranchLength).toBe(node.data.length);
      }
    }
  });

  it('spreads the daylight around the Norovirus root more evenly than equal-angle', () => {
    const before = place(norovirus, EQUAL_ANGLE);
    const after = place(norovirus);

    expect(spread(after)).toBeGreaterThan(spread(before) + 0.1);
    expect(spread(after)).toBeGreaterThan(0.8);
    expect(meanSpread(after)).toBeGreaterThan(meanSpread(before));
  });

  it('turns the two short sibling tips of the Norovirus tree further apart', () => {
    const separation = (root) => {
      const [first, second] = root.children;
      const gap = Math.abs(first.branchAngle - second.branchAngle) % TAU;
      return Math.min(gap, TAU - gap);
    };

    const before = separation(place(norovirus, EQUAL_ANGLE));
    const after = separation(place(norovirus));

    expect(before).toBeCloseTo(Math.PI / 3, 9);
    expect(after).toBeGreaterThan(before + 0.3);
  });

  it('spreads the daylight more evenly on an unbalanced tree', () => {
    const data = caterpillar(14);
    const before = place(data, EQUAL_ANGLE);
    const after = place(data);

    expect(meanSpread(after)).toBeGreaterThan(meanSpread(before) + 0.05);
    expect(spread(after)).toBeGreaterThan(spread(before));
  });

  it('does not introduce edge crossings', () => {
    for (const data of [
      caterpillar(40),
      randomTree(150, 3),
      randomTree(250, 1),
      multifurcating(200, 8),
      multifurcating(300, 2),
    ]) {
      expect(countCrossings(place(data, EQUAL_ANGLE))).toBe(0);
      expect(countCrossings(place(data))).toBe(0);
    }
  });

  it('still rotates the whole embedding with angleOffset', () => {
    const offset = 0.7;
    const base = place(norovirus);
    const turned = place(norovirus, { angleOffset: offset });
    const cos = Math.cos(offset);
    const sin = Math.sin(offset);

    const baseNodes = base.descendants();
    turned.descendants().forEach((node, index) => {
      const reference = baseNodes[index];
      expect(node.x).toBeCloseTo(reference.x * cos - reference.y * sin, 9);
      expect(node.y).toBeCloseTo(reference.x * sin + reference.y * cos, 9);
      if (node.parent) {
        expect(node.branchAngle).toBeCloseTo(reference.branchAngle + offset, 9);
      }
    });
  });

  it('is deterministic', () => {
    const snapshot = (root) =>
      root.descendants().map((d) => [d.x, d.y, d.radius, d.rotatedAngle, d.branchAngle]);

    expect(snapshot(place(norovirus))).toEqual(snapshot(place(norovirus)));
    expect(snapshot(place(randomTree(80, 5)))).toEqual(snapshot(place(randomTree(80, 5))));
  });

  it('keeps x, y, radius, rotatedAngle and branchAngle consistent', () => {
    const root = place(randomTree(60, 21));

    for (const node of root.descendants()) {
      expect(node.radius).toBeCloseTo(Math.hypot(node.x, node.y), 9);
      expect(node.rotatedAngle).toBeCloseTo(Math.atan2(node.y, node.x), 9);
      if (!node.parent) continue;
      const dx = node.x - node.parent.x;
      const dy = node.y - node.parent.y;
      expect(Math.cos(node.branchAngle)).toBeCloseTo(dx / Math.hypot(dx, dy), 9);
      expect(Math.sin(node.branchAngle)).toBeCloseTo(dy / Math.hypot(dx, dy), 9);
    }
  });

  it('keeps zero-length branches finite and in place', () => {
    const data = {
      name: '',
      length: 0,
      children: [
        { name: 'a', length: 0, children: [] },
        { name: 'b', length: 0.1, children: [] },
        {
          name: '',
          length: 0,
          children: [
            { name: 'c', length: 0, children: [] },
            { name: 'd', length: 0.2, children: [] },
          ],
        },
      ],
    };
    const root = place(data);

    for (const node of root.descendants()) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(Number.isFinite(node.branchAngle ?? 0)).toBe(true);
    }
    expect(root.children[0].x).toBe(0);
    expect(root.children[0].y).toBe(0);
  });

  it('stays finite and exact on a 1871-leaf tree', () => {
    const root = place(randomTree(1871, 42));

    for (const node of root.descendants().filter((d) => d.parent)) {
      expect(Math.hypot(node.x - node.parent.x, node.y - node.parent.y)).toBeCloseTo(
        node.data.length,
        8
      );
    }
  });

  it('refines a 9000-leaf tree, which used to stay plain equal angle, quickly and exactly', () => {
    const data = randomTree(9000, 9);
    const started = performance.now();
    const root = place(data);
    // About 0.2 s in Node; the old full scan skipped trees this large.
    expect(performance.now() - started).toBeLessThan(5000);
    const plain = place(data, EQUAL_ANGLE).descendants();
    const nodes = root.descendants();
    expect(nodes.some((node, index) => Math.abs(node.x - plain[index].x) > 1e-9)).toBe(true);
    for (const node of nodes.filter((d) => d.parent)) {
      expect(Math.hypot(node.x - node.parent.x, node.y - node.parent.y)).toBeCloseTo(
        node.data.length,
        8
      );
    }
  });

  it('leaves a ladder too deep for the work budget as plain equal angle', () => {
    const data = caterpillar(5000);
    const refined = place(data).descendants();
    const plain = place(data, EQUAL_ANGLE).descendants();
    expect(refined.every((node, index) => node.x === plain[index].x && node.y === plain[index].y)).toBe(
      true
    );
  });

  it('is what the unrooted construction uses, normalised to the world extent', () => {
    const layout = new TidyTreeLayout(norovirus);
    const root = layout.constructUnrootedTree();

    expect(Math.max(...root.descendants().map((d) => d.radius))).toBeCloseTo(
      UNROOTED_WORLD_EXTENT,
      6
    );
    const reference = place(norovirus);
    root.descendants().forEach((node, index) => {
      const expected = reference.descendants()[index];
      expect(node.x).toBeCloseTo(expected.x * layout.scale, 6);
      expect(node.y).toBeCloseTo(expected.y * layout.scale, 6);
    });
  });
});

describe('convex hulls the daylight extents are read from', () => {
  it('keeps the corners, counter-clockwise, and drops inner and edge points', () => {
    const hull = Array.from(convexHull([0, 0, 2, 0, 2, 2, 0, 2, 1, 1, 1, 0, 0.5, 1.5]));
    expect(hull).toEqual([0, 0, 2, 0, 2, 2, 0, 2]);
    expect(Array.from(convexHull([3, 4]))).toEqual([3, 4]);
  });
});

describe('label-aware daylight', () => {
  const norovirus = parseNewick(NOROVIRUS);
  // Each leaf reserves its name, as the unrooted construction asks (see TidyTreeLayout).
  const labels = (heightPx = 11) => ({
    widthPx: () => 150,
    gapPx: 6,
    heightPx,
    padPx: 3,
    referencePx: 800,
    namePitchPx: 17,
  });
  const withLabels = (data, heightPx) => place(data, { labels: labels(heightPx) });

  it('keeps every branch length exactly and draws no edge crossings', () => {
    for (const data of [norovirus, caterpillar(40), randomTree(250, 1), multifurcating(200, 8)]) {
      const root = withLabels(data);
      for (const node of root.descendants().filter((d) => d.parent)) {
        expect(Math.hypot(node.x - node.parent.x, node.y - node.parent.y)).toBeCloseTo(
          node.data.length,
          9
        );
      }
      expect(countCrossings(root)).toBe(0);
    }
  });

  it('turns the two short sibling tips further apart to give their names room', () => {
    const separation = (root) => {
      const [first, second] = root.children;
      const gap = Math.abs(first.branchAngle - second.branchAngle) % TAU;
      return Math.min(gap, TAU - gap);
    };
    expect(separation(withLabels(norovirus))).toBeGreaterThan(separation(place(norovirus)) + 0.05);
  });

  it('refines a node on its nodes alone where its names cannot all have room', () => {
    // Names taller than any canvas never fit (a long name runs out along its branch and takes
    // little angle; a tall one blocks its side): the result is plain daylight.
    const snapshot = (root) => root.descendants().map((d) => [d.x, d.y]);
    for (const data of [norovirus, randomTree(120, 7)]) {
      expect(snapshot(withLabels(data, 1e7))).toEqual(snapshot(place(data)));
    }
  });

  it('is deterministic', () => {
    const snapshot = (root) => root.descendants().map((d) => [d.x, d.y, d.branchAngle]);
    expect(snapshot(withLabels(randomTree(80, 5)))).toEqual(snapshot(withLabels(randomTree(80, 5))));
  });
});
