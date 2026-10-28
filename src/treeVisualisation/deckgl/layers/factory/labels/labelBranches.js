// Index of the drawn branches, so a taxon name can be tested against the lines it would run
// across. Branches are binned into square cells of the world; a name box is then tested exactly
// against the few segments of the cells it covers.

// Segments of a path: flat three-value points (or two), or a list of [x, y] points.
function forEachSegment(path, visit) {
  if (!path || path.length < 4) return;
  if (Array.isArray(path[0])) {
    for (let i = 1; i < path.length; i += 1) {
      visit(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1]);
    }
    return;
  }
  const stride = path.length % 3 === 0 ? 3 : 2;
  for (let i = stride; i < path.length; i += stride) {
    visit(path[i - stride], path[i - stride + 1], path[i], path[i + 1]);
  }
}

// The segments of a branch list in world units, kept per list: the pixel fit indexes the same
// list at every zoom it tries. A list is not edited after it is first indexed.
const flatCache = new WeakMap();
function flatSegments(branches) {
  const cached = flatCache.get(branches);
  if (cached) return cached;
  const owners = new Map();
  const coords = [];
  const owner = [];
  for (const branch of branches) {
    let id = -2;
    if (branch.splitKey) {
      if (!owners.has(branch.splitKey)) owners.set(branch.splitKey, owners.size);
      id = owners.get(branch.splitKey);
    }
    forEachSegment(branch.path, (x0, y0, x1, y1) => {
      if (!Number.isFinite(x0 + y0 + x1 + y1)) return;
      coords.push(x0, y0, x1, y1);
      owner.push(id);
    });
  }
  const flat = { coords: Float64Array.from(coords), owner: Int32Array.from(owner), owners };
  flatCache.set(branches, flat);
  return flat;
}

// Does the segment a-b cross the box (centre, unit direction, half sizes) grown by `grow`? Slab
// clipping in the box's own frame.
function segmentHitsBox(ax, ay, bx, by, box, grow) {
  const { cx, cy, ux, uy } = box;
  const x0 = (ax - cx) * ux + (ay - cy) * uy;
  const y0 = -(ax - cx) * uy + (ay - cy) * ux;
  const dx = (bx - cx) * ux + (by - cy) * uy - x0;
  const dy = -(bx - cx) * uy + (by - cy) * ux - y0;
  const halfX = box.halfLength + grow;
  const halfY = box.halfHeight + grow;
  let t0 = 0;
  let t1 = 1;
  if (dx === 0) {
    if (x0 < -halfX || x0 > halfX) return false;
  } else {
    const a = (-halfX - x0) / dx;
    const b = (halfX - x0) / dx;
    t0 = Math.max(t0, Math.min(a, b));
    t1 = Math.min(t1, Math.max(a, b));
    if (t0 > t1) return false;
  }
  if (dy === 0) return y0 >= -halfY && y0 <= halfY;
  const a = (-halfY - y0) / dy;
  const b = (halfY - y0) / dy;
  return Math.max(t0, Math.min(a, b)) <= Math.min(t1, Math.max(a, b));
}

// A square grid in world units over a branch list, built once per list (the pixel fit and every
// redraw reuse it, at any zoom). Cells are about as many as segments, so a cell holds few of them;
// a screen box is turned into world units and looks up only the cells it covers.
const gridCache = new WeakMap();
function worldGrid(branches) {
  const cached = gridCache.get(branches);
  if (cached) return cached;
  const flat = flatSegments(branches);
  const { coords, owner } = flat;
  const count = owner.length;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < coords.length; i += 2) {
    minX = Math.min(minX, coords[i]);
    maxX = Math.max(maxX, coords[i]);
    minY = Math.min(minY, coords[i + 1]);
    maxY = Math.max(maxY, coords[i + 1]);
  }
  const extent = Math.max(maxX - minX, maxY - minY, 1e-9);
  const cell = extent / Math.min(256, Math.max(1, Math.ceil(Math.sqrt(count))));
  const columns = Math.floor((maxX - minX) / cell) + 1;
  const rows = Math.floor((maxY - minY) / cell) + 1;
  const cells = new Map();
  const cellOf = (v, origin, limit) =>
    Math.min(limit - 1, Math.max(0, Math.floor((v - origin) / cell)));
  for (let id = 0; id < count; id += 1) {
    const [x0, y0, x1, y1] = [
      coords[id * 4],
      coords[id * 4 + 1],
      coords[id * 4 + 2],
      coords[id * 4 + 3],
    ];
    // Pieces no longer than a cell touch at most 2 x 2 cells each.
    const pieces = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / cell));
    for (let k = 0; k < pieces; k += 1) {
      const [pa, pb] = [k / pieces, (k + 1) / pieces];
      const [ax, bx] = [x0 + (x1 - x0) * pa, x0 + (x1 - x0) * pb];
      const [ay, by] = [y0 + (y1 - y0) * pa, y0 + (y1 - y0) * pb];
      const [fromX, toX] = [cellOf(ax, minX, columns), cellOf(bx, minX, columns)];
      const [fromY, toY] = [cellOf(ay, minY, rows), cellOf(by, minY, rows)];
      for (let gx = Math.min(fromX, toX); gx <= Math.max(fromX, toX); gx += 1) {
        for (let gy = Math.min(fromY, toY); gy <= Math.max(fromY, toY); gy += 1) {
          const key = gx * 65536 + gy;
          const list = cells.get(key);
          if (!list) cells.set(key, [id]);
          else if (list[list.length - 1] !== id) list.push(id);
        }
      }
    }
  }
  const grid = { ...flat, cells, cell, minX, minY, columns, rows, cellOf };
  gridCache.set(branches, grid);
  return grid;
}

/**
 * The branches (`{ path, splitKey }`, in world units) at `scale` pixels per unit, each drawn
 * `halfWidthPx` either side of its line. `crosses(box, splitKey)` tells whether a screen box
 * touches any branch except the ones of `splitKey`: a name may sit on its own leaf branch and
 * guide line, never on another one. Nothing is built until the first name is tested, and the
 * grid it then uses is the list's own, so the cost does not grow with the zoom.
 */
export function createBranchIndex(branches, scale, halfWidthPx) {
  let seen = null;
  let query = 0;

  const crosses = (box, splitKey) => {
    const { coords, owner, owners, cells, minX, minY, columns, rows, cellOf } = worldGrid(branches);
    seen ??= new Int32Array(owner.length).fill(-1);
    const own = splitKey && owners.has(splitKey) ? owners.get(splitKey) : -1;
    const reachX = box.reachX + halfWidthPx;
    const reachY = box.reachY + halfWidthPx;
    const lastX = cellOf((box.cx + reachX) / scale, minX, columns);
    const lastY = cellOf((box.cy + reachY) / scale, minY, rows);
    query += 1;
    for (let gx = cellOf((box.cx - reachX) / scale, minX, columns); gx <= lastX; gx += 1) {
      for (let gy = cellOf((box.cy - reachY) / scale, minY, rows); gy <= lastY; gy += 1) {
        const list = cells.get(gx * 65536 + gy);
        if (!list) continue;
        for (let i = 0; i < list.length; i += 1) {
          const id = list[i];
          if (seen[id] === query) continue;
          seen[id] = query;
          if (owner[id] === own) continue;
          const at = id * 4;
          if (
            segmentHitsBox(
              coords[at] * scale,
              coords[at + 1] * scale,
              coords[at + 2] * scale,
              coords[at + 3] * scale,
              box,
              halfWidthPx
            )
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };
  return { crosses };
}
