import { nameBox } from '../deckgl/layers/factory/labels/labelThinning.js';

// Fit labels zooms a layout without rows until this share of the names in view is drawn.
export const FIT_LABELS_SHOWN_SHARE = 0.9;
// The busiest spot is looked for among about this many names; every name still counts.
const CANDIDATE_CENTRES = 500;

/**
 * What a single tree's names look like on the canvas, not in the layer: `visible` drawn names
 * that are on it (their box reaches it, or their tip is on it with the text running off the
 * edge), and `inView` leaves with their tip on it (never fewer than `visible`). `drawn` is
 * `{ label, sizePx }` per drawn name, `labels` every leaf's label; the camera is `zoom` and
 * `target` (world point at the canvas centre) over `width` x `height`.
 */
export function measureNameCoverage({ drawn, labels, zoom, target, width, height }) {
  const scale = 2 ** zoom;
  // World origin on the canvas, in pixels.
  const originX = width / 2 - target[0] * scale;
  const originY = height / 2 - target[1] * scale;
  const tipOnScreen = ({ position }) => {
    const x = position[0] * scale + originX;
    const y = position[1] * scale + originY;
    return x >= 0 && x <= width && y >= 0 && y <= height;
  };
  let visible = 0;
  for (const { label, sizePx } of drawn) {
    const { cx, cy, reachX, reachY } = nameBox(label, scale, sizePx);
    if (
      tipOnScreen(label) ||
      (cx + originX + reachX > 0 &&
        cx + originX - reachX < width &&
        cy + originY + reachY > 0 &&
        cy + originY - reachY < height)
    ) {
      visible += 1;
    }
  }
  return { visible, inView: Math.max(labels.filter(tipOnScreen).length, visible) };
}

/**
 * Median distance from each name anchor to its nearest neighbour, in world units: the spacing a
 * typical name has, clumps included (an average over the whole rim or extent hides dense clumps).
 * `points` are [x, y]; fewer than two give Infinity.
 */
export function medianNeighbourDistance(points) {
  if (points.length < 2) return Infinity;
  // Sorted by x, a neighbour search can stop once the x gap alone exceeds the best distance.
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  const nearest = sorted.map(([x, y], index) => {
    let best = Infinity;
    for (const step of [-1, 1]) {
      for (let j = index + step; j >= 0 && j < sorted.length; j += step) {
        const dx = sorted[j][0] - x;
        if (Math.abs(dx) >= best) break;
        best = Math.min(best, Math.hypot(dx, sorted[j][1] - y));
      }
    }
    return best;
  });
  nearest.sort((a, b) => a - b);
  return nearest[Math.floor(nearest.length / 2)];
}

/**
 * Where and how far PearTree's Fit labels takes a layout without rows (radial, unrooted,
 * hyperbolic). The zoom first gives a typical name the `neededPx` it needs; if no name is in view
 * there, the view moves to the busiest spot (the nearest of equals). Then it zooms on in half steps
 * until FIT_LABELS_SHOWN_SHARE of the names in view are drawn, or keeps the zoom that drew most.
 * `anchors` are name positions in world units, `view` the camera ({ target, zoom, width, height,
 * minZoom, maxZoom }), `drawnAt(zoom)` the positions of the names drawn at a zoom. Null when the
 * names give no spacing to fit.
 */
export function chooseLabelView(anchors, view, neededPx, drawnAt) {
  const spacing = medianNeighbourDistance(anchors);
  if (!Number.isFinite(spacing) || !(spacing > 0)) return null;
  const zoom = Math.min(view.maxZoom, Math.max(view.minZoom, Math.log2(neededPx / spacing)));
  const near = (centre, z) => {
    const halfW = view.width / 2 / 2 ** z;
    const halfH = view.height / 2 / 2 ** z;
    return ([x, y]) => Math.abs(x - centre[0]) <= halfW && Math.abs(y - centre[1]) <= halfH;
  };

  // Radial and unrooted names sit on the rim, so the middle of an overview can hold none of them,
  // and the name nearest it may be a lone long branch.
  let target = view.target.slice(0, 2);
  if (!anchors.some(near(target, zoom))) {
    // Sampled centres keep this to about 500 x n checks: a full search took 1.5 s at 10,000 names.
    const step = Math.ceil(anchors.length / CANDIDATE_CENTRES);
    let best = { count: -1, distance: Infinity, centre: target };
    for (let i = 0; i < anchors.length; i += step) {
      const centre = anchors[i];
      const count = anchors.filter(near(centre, zoom)).length;
      const distance = Math.hypot(centre[0] - target[0], centre[1] - target[1]);
      if (count > best.count || (count === best.count && distance < best.distance)) {
        best = { count, distance, centre };
      }
    }
    target = best.centre;
  }

  // Spacing alone can promise room the declutter does not give (an unrooted name also hides when
  // it would cross another branch, and names show by whole clade).
  // At most 12 zoom levels (4096x) on, so an unbounded camera still ends the search.
  const lastZoom = Math.min(view.maxZoom, zoom + 12);
  let best = { share: -1, zoom };
  for (let z = zoom; ; z = Math.min(lastZoom, z + 0.5)) {
    const inBox = near(target, z);
    const inView = anchors.filter(inBox).length;
    const share = inView === 0 ? 0 : drawnAt(z).filter(inBox).length / inView;
    if (share > best.share) best = { share, zoom: z };
    if (share >= FIT_LABELS_SHOWN_SHARE || z >= lastZoom) break;
  }
  return { target, zoom: best.zoom };
}
