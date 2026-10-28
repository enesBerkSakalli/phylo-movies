import { normalizeTextAnchor } from '../../styles/labels/labelUtils.js';
import { textWidthPx } from '../../../../../domain/tree/textWidth.js';
import { createBranchIndex } from './labelBranches.js';
import { buildLabelClades } from './labelClades.js';
import { rankedPriority } from './labelCollision.js';

// Free space kept around each name box, so the names that stay never touch.
export const NAME_BOX_PAD_PX = 3;
// Free space kept around the value box.
const VALUE_BOX_PAD_PX = [8, 4];
const GRID_CELL_PX = 128;

// A text box in screen pixels, rotated like the text: centre, unit direction, half sizes.
function textBox(cx, cy, angle, halfLength, halfHeight) {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  return {
    cx,
    cy,
    ux,
    uy,
    halfLength,
    halfHeight,
    reachX: halfLength * Math.abs(ux) + halfHeight * Math.abs(uy),
    reachY: halfLength * Math.abs(uy) + halfHeight * Math.abs(ux),
  };
}

export function nameBox(label, scale, sizePx) {
  const offset = label.pixelOffset ?? [0, 0];
  // deck.gl turns text counter-clockwise by `rotation`; the y-down screen angle is its negative.
  const angle = Number.isFinite(label.rotation) ? -label.rotation : 0;
  const width = textWidthPx(label.text, sizePx);
  const anchor = normalizeTextAnchor(label.textAnchor);
  // From the start point a start-anchored label runs forward and an end-anchored one back.
  const middle = anchor === 'start' ? width / 2 : anchor === 'end' ? -width / 2 : 0;
  return textBox(
    label.position[0] * scale + offset[0] + Math.cos(angle) * middle,
    label.position[1] * scale + offset[1] + Math.sin(angle) * middle,
    angle,
    width / 2 + NAME_BOX_PAD_PX,
    sizePx / 2 + NAME_BOX_PAD_PX
  );
}

// A value is centred on its anchor and never rotated.
function valueBox(label, scale, sizePx) {
  const width = textWidthPx(label.text, sizePx);
  return textBox(
    label.position[0] * scale,
    label.position[1] * scale,
    0,
    width / 2 + VALUE_BOX_PAD_PX[0],
    sizePx / 2 + VALUE_BOX_PAD_PX[1]
  );
}

// Separating-axis test for two boxes rotated like their text.
function boxesOverlap(a, b) {
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  for (const [ax, ay] of [
    [a.ux, a.uy],
    [-a.uy, a.ux],
    [b.ux, b.uy],
    [-b.uy, b.ux],
  ]) {
    const radius = (box) =>
      box.halfLength * Math.abs(box.ux * ax + box.uy * ay) +
      box.halfHeight * Math.abs(-box.uy * ax + box.ux * ay);
    if (Math.abs(dx * ax + dy * ay) > radius(a) + radius(b)) return false;
  }
  return true;
}

const cellRange = (box) => [
  Math.floor((box.cx - box.reachX) / GRID_CELL_PX),
  Math.floor((box.cx + box.reachX) / GRID_CELL_PX),
  Math.floor((box.cy - box.reachY) / GRID_CELL_PX),
  Math.floor((box.cy + box.reachY) / GRID_CELL_PX),
];

/**
 * Boxes already placed, found through a grid of screen cells so crowds stay cheap. `addAll` takes
 * a group whole or not at all.
 */
function createBoxIndex() {
  const cells = new Map();
  const placed = [];
  const forEachCell = (box, visit) => {
    const [x0, x1, y0, y1] = cellRange(box);
    for (let x = x0; x <= x1; x += 1) for (let y = y0; y <= y1; y += 1) visit(x * 65536 + y);
  };
  const isClear = (box) => {
    const [x0, x1, y0, y1] = cellRange(box);
    const tested = new Set();
    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) {
        for (const other of cells.get(x * 65536 + y) ?? []) {
          if (tested.has(other)) continue;
          tested.add(other);
          if (boxesOverlap(box, placed[other])) return false;
        }
      }
    }
    return true;
  };
  const add = (box) => {
    const id = placed.push(box) - 1;
    forEachCell(box, (key) => (cells.has(key) ? cells.get(key).push(id) : cells.set(key, [id])));
  };
  const removeLast = () => {
    const box = placed.pop();
    forEachCell(box, (key) => cells.get(key).pop());
  };
  const addAll = (boxes) => {
    let added = 0;
    for (const box of boxes) {
      if (!isClear(box)) {
        for (; added > 0; added -= 1) removeLast();
        return false;
      }
      add(box);
      added += 1;
    }
    return true;
  };
  return { isClear, add, addAll };
}

/**
 * A clade shows all of its names or none: the largest clades that fit take their place from the
 * first leaf on; one that does not fit offers its child clades instead, and a clade whose
 * children are all single leaves is hidden whole rather than sampled. A hidden clade leaves no
 * stand-in. A name that runs across another branch does not fit (`onBranch(i)`). Returns the
 * kept label indices.
 */
function placeNameClades(clades, boxes, index, onBranch) {
  const kept = [];
  const pending = [...clades].reverse();
  const clearOfBranches = ({ lo, hi }) => {
    for (let i = lo; i <= hi; i += 1) if (onBranch(i)) return false;
    return true;
  };
  while (pending.length > 0) {
    const clade = pending.pop();
    if (clearOfBranches(clade) && index.addAll(boxes.slice(clade.lo, clade.hi + 1))) {
      for (let i = clade.lo; i <= clade.hi; i += 1) kept.push(i);
    } else if (clade.children.some((child) => child.children.length > 0)) {
      pending.push(...[...clade.children].reverse());
    }
  }
  return kept;
}

const scaleOf = (zoom) => 2 ** (Number.isFinite(zoom) ? zoom : 0);

/**
 * Taxon names and branch values of one still tree, decluttered together on the CPU: the selected
 * branch's value first, then names, then the other values by rank. Names are kept by whole clade
 * (`nodes` give the tree): every name of a clade that fits at this zoom, else its child clades,
 * else nothing; without nodes each name stands alone. Whatever overlaps is hidden outright,
 * never faded. `keepNames` takes names that are already spaced (rectangular rows) as they are,
 * so only values give way. `branches` (`{ path, splitKey }` in world units, drawn about
 * `branchHalfWidthPx` either side) keep names off the lines: a name that runs across a branch
 * other than its own leaf branch or guide line counts as not fitting. `clip` (`{ minX, maxX,
 * minY, maxY }` in the same pixels as the boxes) is the part of the screen names may use: a name
 * that reaches out of it does not fit either. Boxes depend on zoom alone (and on a clip, which a
 * camera fit sets for its own zoom), so panning never reshuffles them.
 */
export function declutterTreeLabels(
  names = [],
  values = [],
  {
    zoom,
    nameSizePx,
    valueSizePx,
    selectedBranchKey = null,
    nodes = [],
    keepNames = false,
    branches = [],
    branchHalfWidthPx = 0.5,
    clip = null,
  } = {}
) {
  const scale = scaleOf(zoom);
  const nameBoxes = names.map((label) => nameBox(label, scale, nameSizePx));
  const valueBoxes = values.map((label) => valueBox(label, scale, valueSizePx));
  const isSelected = (label) => Boolean(selectedBranchKey) && label.splitKey === selectedBranchKey;
  const index = createBoxIndex();

  const keptValues = new Set();
  values.forEach((label, i) => {
    if (!isSelected(label)) return;
    index.add(valueBoxes[i]);
    keptValues.add(i);
  });
  let keptNames;
  if (keepNames) {
    nameBoxes.forEach((box) => index.add(box));
    keptNames = names.map((_, i) => i);
  } else {
    const branchIndex =
      branches.length > 0 ? createBranchIndex(branches, scale, branchHalfWidthPx) : null;
    const onBranch = new Int8Array(names.length);
    const outsideClip = ({ cx, cy, reachX, reachY }) =>
      clip !== null &&
      (cx - reachX < clip.minX ||
        cx + reachX > clip.maxX ||
        cy - reachY < clip.minY ||
        cy + reachY > clip.maxY);
    const crossesBranch = (i) => {
      if (outsideClip(nameBoxes[i])) return true;
      if (!branchIndex) return false;
      if (onBranch[i] === 0)
        onBranch[i] = branchIndex.crosses(nameBoxes[i], names[i].splitKey) ? 1 : -1;
      return onBranch[i] === 1;
    };
    keptNames = placeNameClades(buildLabelClades(nodes, names), nameBoxes, index, crossesBranch);
  }
  values
    .map((label, i) => [i, rankedPriority(label.rank)])
    .filter(([i]) => !keptValues.has(i))
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .forEach(([i]) => {
      if (index.addAll([valueBoxes[i]])) keptValues.add(i);
    });
  return {
    names: keptNames.sort((a, b) => a - b).map((i) => names[i]),
    values: values.filter((_, i) => keptValues.has(i)),
  };
}
