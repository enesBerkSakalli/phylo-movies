import {
  getMetricBranchLength,
  getReadableVisualBranchLength,
} from '../../domain/tree/branchTransform.js';
import { LAYOUT_PROJECTION_MODES } from './hyperbolicProjection/constants.js';
import { medianNeighbourDistance } from '../viewport/nameCoverage.js';

/**
 * Equal-angle unrooted tree embedding (Felsenstein).
 *
 * Every other layout in this directory is polar: a radius accumulated from the
 * root and an angle from d3's cluster(), turned into x/y by
 * generatePolarCoordinates(). That construction inherently privileges the root
 * -- radius grows monotonically away from it, so the root sits at the centre of
 * the picture whether or not it means anything.
 *
 * Equal angle drops that. Each node hands its children a share of its own
 * angular wedge in proportion to leaf count, and a child is placed at
 *
 *     pos(child) = pos(parent) + branchLength * (cos theta, sin theta)
 *
 * where theta bisects the child's wedge. Position accumulates along edges
 * rather than radiating from a centre, so a tree whose root is an arbitrary
 * trifurcation (which is what IQ-TREE writes) draws without inventing a centre
 * that the data does not have.
 *
 * Equal angle alone crowds unbalanced trees, so it is followed by Felsenstein's
 * equal-daylight refinement: at each internal node the subtrees hanging off it
 * (its children plus the rest of the tree) are turned about the node until the
 * angular gaps between them, seen from the node, are equal. Only rotations are
 * applied, so every branch keeps its length and the embedding stays a faithful
 * picture of the branch lengths.
 *
 * Coordinates come out in branch-length units and are deliberately not fitted
 * to the container: the viewport is a camera over an unbounded plane, the same
 * model the MSA viewer uses. angle/radius are still derived per node because
 * the layer factories and label-ring code read them, but here they are
 * descriptions of a position rather than the thing that produced it.
 */

const TAU = Math.PI * 2;

/**
 * World extent the embedding is normalised to.
 *
 * Raw branch lengths are tiny (0.003-0.18 in a typical nucleotide tree), so
 * emitting them unscaled leaves the tree sub-pixel while labels, sized in
 * screen pixels, swamp the canvas.
 *
 * The important part is what this is NOT: it is not derived from the container.
 * The radial layout fits to min(width, height), which is what squeezes a large
 * tree into the viewport. Normalising to a fixed world size keeps the layout
 * viewport-independent -- the same tree occupies the same world coordinates at
 * any window size -- and leaves navigation to the camera.
 */
export const UNROOTED_WORLD_EXTENT = 500;

// Daylight passes are capped and stop early once no subtree turns by more than the tolerance
// (radians). A node is measured against its path to the root and the subtrees hanging off that
// path, each through its convex hull (see equalizeDaylight), so a pass costs about the summed
// depth of the tree rather than nodes squared. The work budget (~0.3 s) caps the passes: the
// 1871-leaf tree of life runs all 5 (about 65 ms), 20,000 leaves about 3, 50,000 one; beyond
// about 80,000 leaves, or a ladder deeper than about 3,000, the tree stays plain equal angle.
const DAYLIGHT_MAX_PASSES = 5;
const DAYLIGHT_TOLERANCE = 1e-3;
const DAYLIGHT_WORK_BUDGET = 2e7;
// Rough cost of measuring or rebuilding one subtree hull, in node visits.
const HULL_WORK = 8;

function cacheLeafCounts(root) {
  root.eachAfter((node) => {
    node.leafCount =
      !node.children || node.children.length === 0
        ? 1
        : node.children.reduce((sum, child) => sum + (child.leafCount || 0), 0);
  });
}

const wrapTau = (angle) => ((angle % TAU) + TAU) % TAU;

// Monotone in atan2(v, u) without the trig call; only the two extremes are converted back.
const pseudoAngle = (v, u) => {
  const p = v / (Math.abs(u) + Math.abs(v));
  return u < 0 ? (v < 0 ? -2 - p : 2 - p) : p;
};

// Whether the segment (u1, v1)-(u2, v2) crosses the ray u < 0, v = 0 (the direction opposite the
// reference), where an angular extent measured around the reference would wrap.
const crossesBack = (u1, v1, u2, v2) => v1 * v2 < 0 && (v1 * u2 - v2 * u1) / (v1 - v2) < 0;

/**
 * Convex hull (Andrew's monotone chain) of flat [x0, y0, x1, y1, ...] points, counter-clockwise,
 * as a flat array. Two or fewer points come back as given.
 */
export function convexHull(points) {
  const n = points.length / 2;
  if (n <= 2) return Float64Array.from(points);
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => points[2 * a] - points[2 * b] || points[2 * a + 1] - points[2 * b + 1]
  );
  const turn = (o, a, b) =>
    (points[2 * a] - points[2 * o]) * (points[2 * b + 1] - points[2 * o + 1]) -
    (points[2 * a + 1] - points[2 * o + 1]) * (points[2 * b] - points[2 * o]);
  const chain = (sequence) => {
    const out = [];
    for (const index of sequence) {
      while (out.length >= 2 && turn(out[out.length - 2], out[out.length - 1], index) <= 0) {
        out.pop();
      }
      out.push(index);
    }
    out.pop();
    return out;
  };
  const indices = [...chain(order), ...chain([...order].reverse())];
  const hull = new Float64Array(indices.length * 2);
  indices.forEach((index, k) => {
    hull[2 * k] = points[2 * index];
    hull[2 * k + 1] = points[2 * index + 1];
  });
  return hull;
}

/**
 * Equal-daylight refinement of a placed equal-angle embedding, in place.
 *
 * Nodes are scanned in pre-order so every subtree is a contiguous range and can
 * be measured or rotated with a range loop. At an internal node the neighbours
 * are the child subtrees and the rest of the tree; the rest of the tree (or, at
 * the root, the first child) holds still and the other subtrees turn about the
 * node so that the gaps between consecutive neighbours become equal.
 *
 * A neighbour's extent is only trusted while none of its edges sweeps across the
 * direction opposite its reference (its own branch, or the way back to the
 * parent); then every edge lies inside the measured extent, the turned subtrees
 * end up in disjoint sectors, and a rotation cannot create an edge crossing.
 * Interior nodes, wrapped by the rest of the tree, are left as equal angle
 * placed them.
 *
 * Extents come from subtree hulls rather than a scan of every node: each subtree keeps the convex
 * hull of its points in its own frame (its position and branch direction), which a rotation of an
 * enclosing subtree leaves valid, and is rebuilt only once its own subtree has been refined. The
 * extent of a point set seen from outside its hull is the extent of the hull's corners; a hull
 * that contains the node or straddles the opposite direction is scanned point by point instead, so
 * the result is that of a full scan. The rest of the tree is the path to the root plus the
 * subtrees hanging off it (ggtree's plan in its PERF-TODO: measure per node, rotate only the
 * affected subtrees, keep the unchanged parts).
 *
 * With `labels`, each leaf also reserves its name: the box the drawn label covers (PHYLIP
 * DRAWTREE counts a label's far end the same way when it avoids overlaps), sized for a fit that
 * shows the whole tree across `labels.referencePx` pixels or, where names cannot fit there (a
 * large tree), for the zoom that gives a typical leaf `labels.namePitchPx` of room. A node whose
 * names cannot all have room is refined as if there were no names.
 */
function equalizeDaylight(root, labels = null) {
  const nodes = [];
  root.eachBefore((node) => nodes.push(node));
  const count = nodes.length;
  const slot = new Map(nodes.map((node, i) => [node, i]));
  const kids = nodes.map((node) => node.children?.map((child) => slot.get(child)));
  const end = new Int32Array(count);
  const up = new Int32Array(count);
  let maxKids = 0;
  for (let i = count - 1; i >= 0; i -= 1) {
    end[i] = kids[i] ? end[kids[i][kids[i].length - 1]] : i + 1;
    if (kids[i]) {
      maxKids = Math.max(maxKids, kids[i].length);
      for (const child of kids[i]) up[child] = i;
    }
  }

  const X = Float64Array.from(nodes, (node) => node.x);
  const Y = Float64Array.from(nodes, (node) => node.y);
  const A = Float64Array.from(nodes, (node) => node.branchAngle ?? 0);

  // Label boxes in each leaf's frame: along its branch from s0 to s1, h to either side.
  let box = null;
  if (labels) {
    let span = 0;
    for (const values of [X, Y]) {
      let min = Infinity;
      let max = -Infinity;
      for (const value of values) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
      span = Math.max(span, max - min);
    }
    if (span > 0) {
      // Pixels per tree unit: a fit of the whole tree, or, where names cannot fit there (a large
      // tree), the zoom that gives a typical leaf the room a name needs (what Fit labels picks).
      const leafPoints = [];
      for (let j = 0; j < count; j += 1) if (!kids[j]) leafPoints.push([X[j], Y[j]]);
      const gap = medianNeighbourDistance(leafPoints);
      const readable = labels.namePitchPx > 0 && gap > 0 ? labels.namePitchPx / gap : 0;
      const unit = 1 / Math.max(labels.referencePx / span, readable);
      box = new Float64Array(count * 3);
      for (let j = 0; j < count; j += 1) {
        if (kids[j]) continue;
        box[3 * j] = (labels.gapPx - labels.padPx) * unit;
        box[3 * j + 1] = (labels.gapPx + labels.widthPx(nodes[j]) + labels.padPx) * unit;
        box[3 * j + 2] = (labels.heightPx / 2 + labels.padPx) * unit;
      }
    }
  }
  const variants = box ? [0, 1] : [0];

  // Work of a pass: each internal node measures its path to the root and the hulls hanging off
  // it; rotations touch every node about once per ancestor; hulls are rebuilt once.
  const hullWork = HULL_WORK * variants.length;
  const pathWork = new Float64Array(count);
  const depth = new Int32Array(count);
  let work = count * hullWork;
  for (let j = 1; j < count; j += 1) {
    const parent = up[j];
    depth[j] = depth[parent] + 1;
    pathWork[j] = pathWork[parent] + 1 + (kids[parent].length - 1) * hullWork;
    work += depth[j];
    // A deep (ladder-like) node scans the rest of the tree instead when that is cheaper.
    if (kids[j]) work += Math.min(pathWork[j], count) + kids[j].length * hullWork;
  }
  const passes = Math.min(DAYLIGHT_MAX_PASSES, Math.floor(DAYLIGHT_WORK_BUDGET / work));
  if (maxKids < 2 || passes < 1) return;

  const lo = new Float64Array(maxKids);
  const hi = new Float64Array(maxKids);
  // Each scanned node's position in the frame of the current apex and reference.
  const U = new Float64Array(count);
  const V = new Float64Array(count);

  // Running extent of a point set around the reference direction, which counts
  // as occupied so that the extent always contains it.
  let minP, maxP, minU, minV, maxU, maxV;
  const resetExtent = () => {
    minP = maxP = minV = maxV = 0;
    minU = maxU = 1;
  };
  const consider = (u, v) => {
    if (u === 0 && v === 0) return;
    const p = pseudoAngle(v, u);
    if (p < minP) {
      minP = p;
      minU = u;
      minV = v;
    } else if (p > maxP) {
      maxP = p;
      maxU = u;
      maxV = v;
    }
  };

  // The label box corners of leaf j in the apex frame (cos, sin of the reference), into CU/CV.
  const CU = new Float64Array(4);
  const CV = new Float64Array(4);
  const labelCorners = (j, px, py, cos, sin) => {
    const s0 = box[3 * j];
    const s1 = box[3 * j + 1];
    const h = box[3 * j + 2];
    const c = Math.cos(A[j]);
    const s = Math.sin(A[j]);
    let k = 0;
    for (const along of [s0, s1]) {
      for (const across of [-h, h]) {
        const dx = X[j] + along * c - across * s - px;
        const dy = Y[j] + along * s + across * c - py;
        CU[k] = dx * cos + dy * sin;
        CV[k] = dy * cos - dx * sin;
        k += 1;
      }
    }
  };

  // Scans nodes [from, to) point by point (and, in the label variant, each leaf's box). Returns
  // false as soon as a point or an edge lies on or sweeps across the direction opposite the
  // reference, where the extent would wrap.
  const scan = (from, to, apex, ref, variant) => {
    const px = X[apex];
    const py = Y[apex];
    const cos = Math.cos(ref);
    const sin = Math.sin(ref);
    for (let j = from; j < to; j += 1) {
      const dx = X[j] - px;
      const dy = Y[j] - py;
      const u = dx * cos + dy * sin;
      const v = dy * cos - dx * sin;
      U[j] = u;
      V[j] = v;
      if (v === 0 && u < 0) return false;
      const parent = up[j];
      if (parent !== apex && crossesBack(U[parent], V[parent], u, v)) return false;
      consider(u, v);
      if (variant === 1 && !kids[j]) {
        labelCorners(j, px, py, cos, sin);
        // The box's sides, and its links to the leaf, must not cross the opposite direction.
        for (let k = 0; k < 4; k += 1) {
          if ((CV[k] === 0 && CU[k] < 0) || crossesBack(u, v, CU[k], CV[k])) return false;
          consider(CU[k], CV[k]);
        }
        if (
          crossesBack(CU[0], CV[0], CU[1], CV[1]) ||
          crossesBack(CU[1], CV[1], CU[3], CV[3]) ||
          crossesBack(CU[3], CV[3], CU[2], CV[2]) ||
          crossesBack(CU[2], CV[2], CU[0], CV[0])
        ) {
          return false;
        }
      }
    }
    return true;
  };

  // Hull of each subtree in its root's frame, per variant (0: nodes, 1: nodes and label boxes).
  const hulls = variants.map(() => new Array(count));
  const ownPoints = (j, variant) => {
    if (variant === 0 || kids[j]) return [0, 0];
    const s0 = box[3 * j];
    const s1 = box[3 * j + 1];
    const h = box[3 * j + 2];
    return [0, 0, s0, -h, s0, h, s1, -h, s1, h];
  };
  const rebuildHull = (j) => {
    for (const variant of variants) {
      const points = ownPoints(j, variant);
      for (const k of kids[j] ?? []) {
        // From k's frame into j's: turn by A[k] - A[j], then shift by k's offset in j's frame.
        const turn = A[k] - A[j];
        const tc = Math.cos(turn);
        const ts = Math.sin(turn);
        const c = Math.cos(A[j]);
        const s = Math.sin(A[j]);
        const ox = (X[k] - X[j]) * c + (Y[k] - Y[j]) * s;
        const oy = (Y[k] - Y[j]) * c - (X[k] - X[j]) * s;
        const hull = hulls[variant][k];
        for (let t = 0; t < hull.length; t += 2) {
          points.push(ox + hull[t] * tc - hull[t + 1] * ts, oy + hull[t] * ts + hull[t + 1] * tc);
        }
      }
      hulls[variant][j] = convexHull(points);
    }
  };
  for (let j = count - 1; j > 0; j -= 1) rebuildHull(j);

  // Adds the hull of subtree k, seen from the apex, to the extent. True when added; false when
  // a corner lies on the opposite direction (a real point there, as a scan would find); null
  // when the hull contains the apex or straddles the opposite direction, where the subtree has
  // to be scanned.
  let HU = new Float64Array(16);
  let HV = new Float64Array(16);
  const addHull = (k, apex, ref, variant) => {
    const hull = hulls[variant][k];
    const m = hull.length / 2;
    if (HU.length < m) {
      HU = new Float64Array(m * 2);
      HV = new Float64Array(m * 2);
    }
    const turn = A[k] - ref;
    const tc = Math.cos(turn);
    const ts = Math.sin(turn);
    const c = Math.cos(ref);
    const s = Math.sin(ref);
    const ou = (X[k] - X[apex]) * c + (Y[k] - Y[apex]) * s;
    const ov = (Y[k] - Y[apex]) * c - (X[k] - X[apex]) * s;
    for (let t = 0; t < m; t += 1) {
      HU[t] = ou + hull[2 * t] * tc - hull[2 * t + 1] * ts;
      HV[t] = ov + hull[2 * t] * ts + hull[2 * t + 1] * tc;
    }
    if (m >= 3) {
      // Counter-clockwise: the apex (origin) is inside or on the hull if no edge has it to the right.
      let inside = true;
      for (let t = 0; t < m && inside; t += 1) {
        const n = (t + 1) % m;
        if ((HU[n] - HU[t]) * -HV[t] - (HV[n] - HV[t]) * -HU[t] < 0) inside = false;
      }
      if (inside) return null;
    } else if (m === 2) {
      const cross = HU[0] * HV[1] - HV[0] * HU[1];
      if (cross === 0 && HU[0] * HU[1] + HV[0] * HV[1] <= 0) return null;
    }
    for (let t = 0; t < m; t += 1) if (HV[t] === 0 && HU[t] < 0) return false;
    if (m >= 2) {
      for (let t = 0; t < m; t += 1) {
        const n = (t + 1) % m;
        if (crossesBack(HU[t], HV[t], HU[n], HV[n])) return null;
      }
    }
    for (let t = 0; t < m; t += 1) consider(HU[t], HV[t]);
    return true;
  };
  // Subtree k into the extent, by hulls. Where a hull cannot tell (it holds the apex, as large
  // neighbouring hulls often do), the subtree is opened one level: its root, the branches to its
  // children, and each child's hull in turn, down to single leaves. Only the part around the apex
  // is opened, so a node costs about its depth instead of a scan of every node.
  const addSubtree = (k, apex, ref, variant) => {
    const cos = Math.cos(ref);
    const sin = Math.sin(ref);
    const place = (j) => {
      const dx = X[j] - X[apex];
      const dy = Y[j] - Y[apex];
      U[j] = dx * cos + dy * sin;
      V[j] = dy * cos - dx * sin;
    };
    const stack = [k];
    // Opening costs a hull per level; past what a scan of the subtree costs (a ladder curled
    // around the apex), the scan is cheaper. Points it adds again leave the extent as it is.
    const scanCost = (end[k] - k) / HULL_WORK;
    let opened = 0;
    while (stack.length) {
      if (++opened > scanCost) return scan(k, end[k], apex, ref, variant);
      const j = stack.pop();
      const added = addHull(j, apex, ref, variant);
      if (added === false) return false;
      if (added) continue;
      if (!kids[j]) {
        if (!scan(j, j + 1, apex, ref, variant)) return false;
        continue;
      }
      place(j);
      if (V[j] === 0 && U[j] < 0) return false;
      consider(U[j], V[j]);
      for (const child of kids[j]) {
        place(child);
        if (crossesBack(U[j], V[j], U[child], V[child])) return false;
        stack.push(child);
      }
    }
    return true;
  };

  // The rest of the tree around node i: its path to the root (each node and the branch to its
  // parent) and every subtree hanging off that path, with the branch that holds it.
  const addRest = (i, ref, variant) => {
    const px = X[i];
    const py = Y[i];
    const cos = Math.cos(ref);
    const sin = Math.sin(ref);
    const place = (j) => {
      const dx = X[j] - px;
      const dy = Y[j] - py;
      U[j] = dx * cos + dy * sin;
      V[j] = dy * cos - dx * sin;
    };
    for (let a = up[i]; ; a = up[a]) {
      place(a);
      if (V[a] === 0 && U[a] < 0) return false;
      consider(U[a], V[a]);
      if (a === 0) break;
    }
    let below = i;
    for (let a = up[i]; ; below = a, a = up[a]) {
      if (a !== 0 && crossesBack(U[up[a]], V[up[a]], U[a], V[a])) return false;
      for (const k of kids[a]) {
        if (k === below) continue;
        place(k);
        if (crossesBack(U[a], V[a], U[k], V[k])) return false;
        if (!addSubtree(k, i, ref, variant)) return false;
      }
      if (a === 0) break;
    }
    return true;
  };

  // Fills lo/hi with the extent of each child subtree of node i from child
  // `first` on, unwrapped counter-clockwise starting at direction `start`.
  // Returns false if a subtree's extent cannot be trusted.
  const measure = (i, first, start, variant) => {
    const ks = kids[i];
    let direction = start;
    for (let j = first; j < ks.length; j += 1) {
      const child = ks[j];
      if (j > first) direction += wrapTau(A[child] - A[ks[j - 1]]);
      resetExtent();
      if (!addSubtree(child, i, A[child], variant)) return false;
      lo[j] = direction + Math.atan2(minV, minU);
      hi[j] = direction + Math.atan2(maxV, maxU);
    }
    return true;
  };

  const rotate = (child, px, py, turn) => {
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    for (let j = child; j < end[child]; j += 1) {
      const dx = X[j] - px;
      const dy = Y[j] - py;
      X[j] = px + dx * cos - dy * sin;
      Y[j] = py + dx * sin + dy * cos;
      A[j] += turn;
    }
  };

  // The largest rotation applied at node i, or NaN when the variant leaves the node as it is
  // (an extent it cannot trust, or no daylight left between the neighbours).
  const equalizeWith = (i, variant) => {
    const ks = kids[i];
    const isRoot = i === 0;
    if (isRoot && ks.length < 2) return 0;
    const first = isRoot ? 1 : 0;
    const back = isRoot ? A[ks[0]] : A[i] + Math.PI;

    resetExtent();
    const anchored = isRoot
      ? addSubtree(ks[0], i, back, variant)
      : pathWork[i] < count
        ? addRest(i, back, variant)
        : scan(0, i, i, back, variant) && scan(end[i], count, i, back, variant);
    if (!anchored) return NaN;
    const anchorLo = Math.atan2(minV, minU);
    const anchorHi = Math.atan2(maxV, maxU);

    if (!measure(i, first, wrapTau(A[ks[first]] - back), variant)) return NaN;
    let daylight = TAU + anchorLo - anchorHi;
    for (let j = first; j < ks.length; j += 1) daylight -= hi[j] - lo[j];
    if (!(daylight > 1e-9)) return NaN;

    const gap = daylight / (ks.length - first + 1);
    let cursor = anchorHi + gap;
    let change = 0;
    for (let j = first; j < ks.length; j += 1) {
      const delta = cursor - lo[j];
      const turn = delta - TAU * Math.round(delta / TAU);
      if (turn !== 0) rotate(ks[j], X[i], Y[i], turn);
      change = Math.max(change, Math.abs(turn));
      cursor += hi[j] - lo[j] + gap;
    }
    return change;
  };
  // Names first; where they cannot all have room, the node is refined on its nodes alone.
  const equalize = (i) => {
    for (const variant of [...variants].reverse()) {
      const change = equalizeWith(i, variant);
      if (!Number.isNaN(change)) return change;
    }
    return 0;
  };

  for (let pass = 0; pass < passes; pass += 1) {
    let change = 0;
    // Nodes whose subtree is still being refined; each hull is rebuilt once its subtree is done.
    const open = [];
    for (let i = 0; i < count; i += 1) {
      while (open.length && end[open[open.length - 1]] <= i) rebuildHull(open.pop());
      if (!kids[i]) continue;
      change = Math.max(change, equalize(i));
      if (i > 0) open.push(i);
    }
    while (open.length) rebuildHull(open.pop());
    if (change < DAYLIGHT_TOLERANCE) break;
  }

  for (let i = 1; i < count; i += 1) {
    const node = nodes[i];
    node.x = X[i];
    node.y = Y[i];
    node.branchAngle = A[i];
    node.radius = Math.hypot(X[i], Y[i]);
    node.rotatedAngle = Math.atan2(Y[i], X[i]);
  }
}

/**
 * Places every node of a d3 hierarchy by equal-angle, writing x/y plus the
 * derived angle/radius the rest of the pipeline expects.
 *
 * @param {object} root - d3 hierarchy root
 * @param {object} [options]
 * @param {number} [options.angleOffset=0] - rotates the whole embedding, so the
 *   existing rotation control keeps working
 * @param {boolean} [options.daylight=true] - refine the equal-angle placement
 *   with equal-daylight rotations; false leaves plain equal angle
 * @param {object} [options.labels] - leaf names for daylight to make room for:
 *   `{ widthPx(node), gapPx, heightPx, padPx, referencePx, namePitchPx }`, the drawn label box
 *   in screen pixels at a fit of the whole tree across `referencePx`, or at the zoom where a
 *   typical leaf has `namePitchPx` of room when that is closer; omitted, only the nodes count
 * @returns {object} the same root, mutated in place (matching TidyTreeLayout)
 */
export function applyEqualAngleLayout(root, options = {}) {
  const angleOffset = Number.isFinite(options.angleOffset) ? options.angleOffset : 0;
  cacheLeafCounts(root);

  root.x = 0;
  root.y = 0;
  root.radius = 0;
  root.rotatedAngle = 0;
  root.projectionMode = LAYOUT_PROJECTION_MODES.UNROOTED;
  root.metricBranchLength = getMetricBranchLength(root.data || {});
  root.visualBranchLength = 0;

  const totalLeaves = root.leafCount || 1;

  // Each node owns the wedge [wedgeStart, wedgeStart + wedgeSize); children
  // divide it by leaf count so dense subtrees get proportionally more room.
  root.wedgeStart = angleOffset;
  root.wedgeSize = TAU;

  root.each((node) => {
    if (!node.children || node.children.length === 0) return;

    let cursor = node.wedgeStart;
    for (const child of node.children) {
      const share = ((child.leafCount || 1) / totalLeaves) * TAU;
      child.wedgeStart = cursor;
      child.wedgeSize = share;
      cursor += share;

      const theta = child.wedgeStart + share / 2;
      // Direction the branch leaves its parent; leaf labels continue along it.
      child.branchAngle = theta;
      const data = child.data || {};
      const visualBranchLength = getReadableVisualBranchLength(data);
      child.metricBranchLength = getMetricBranchLength(data);
      child.visualBranchLength = visualBranchLength;
      child.projectionMode = LAYOUT_PROJECTION_MODES.UNROOTED;

      child.x = node.x + visualBranchLength * Math.cos(theta);
      child.y = node.y + visualBranchLength * Math.sin(theta);

      // Derived, not generative: angle/radius describe where the node landed.
      child.radius = Math.hypot(child.x, child.y);
      child.rotatedAngle = Math.atan2(child.y, child.x);
      child.offset = angleOffset;
    }
  });

  if (options.daylight !== false) equalizeDaylight(root, options.labels ?? null);

  return root;
}

/**
 * Largest distance from the origin in the embedding. The polar layouts get this
 * from the accumulated radius; here it has to come from the placed positions,
 * because radius is derived rather than accumulated.
 */
export function getEqualAngleMaxRadius(root) {
  let max = 0;
  root.each((node) => {
    const r = Math.hypot(node.x || 0, node.y || 0);
    if (r > max) max = r;
  });
  return max;
}

/**
 * Scales a placed embedding to UNROOTED_WORLD_EXTENT, returning the factor
 * applied. Uniform, so every edge keeps its length in proportion and the
 * embedding stays a faithful picture of the branch lengths.
 *
 * @returns {number} the scale factor, 1 when the tree has no extent
 */
export function normalizeEqualAngleExtent(root, targetExtent = UNROOTED_WORLD_EXTENT) {
  const maxRadius = getEqualAngleMaxRadius(root);
  if (!(maxRadius > 0)) return 1;

  const scale = targetExtent / maxRadius;
  root.each((node) => {
    node.x *= scale;
    node.y *= scale;
    node.radius = Math.hypot(node.x, node.y);
    node.visualBranchLength *= scale;
  });
  return scale;
}
