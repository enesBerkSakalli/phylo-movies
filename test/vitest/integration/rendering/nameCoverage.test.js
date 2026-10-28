import { describe, expect, it } from 'vitest';
import {
  FIT_LABELS_SHOWN_SHARE,
  chooseLabelView,
  measureNameCoverage,
  medianNeighbourDistance,
} from '../../../../src/treeVisualisation/viewport/nameCoverage.js';
import { minNameSpacingPx } from '../../../../src/treeVisualisation/deckgl/layers/factory/labels/LabelLayers.js';
import { LAYOUT_PROJECTION_MODES } from '../../../../src/treeVisualisation/layout/hyperbolicProjection/index.js';

// A name at world (x, y) that starts at its tip and runs right.
const label = (x, y, text = 'taxon') => ({
  position: [x, y, 0],
  text,
  pixelOffset: [0, 0],
  rotation: 0,
  textAnchor: 'start',
});
const camera = { zoom: 0, target: [0, 0], width: 800, height: 600 };
const SIZE_PX = 12;

describe('measureNameCoverage', () => {
  const labels = [label(0, 0), label(100, 50), label(-2000, 0), label(0, 3000), label(5000, 5000)];

  it('counts the drawn names that reach the screen, not every drawn name', () => {
    const drawn = labels.map((item) => ({ label: item, sizePx: SIZE_PX }));
    const { visible, inView } = measureNameCoverage({ drawn, labels, ...camera });
    expect(drawn).toHaveLength(5);
    expect(visible).toBe(2);
    expect(inView).toBe(2);
  });

  it('is zero over a blank part of the tree', () => {
    const drawn = labels.map((item) => ({ label: item, sizePx: SIZE_PX }));
    const measured = measureNameCoverage({ drawn, labels, ...camera, target: [900, -900] });
    expect(measured).toEqual({ visible: 0, inView: 0 });
  });

  it('counts leaves in view whose names are hidden', () => {
    const drawn = [{ label: labels[0], sizePx: SIZE_PX }];
    expect(measureNameCoverage({ drawn, labels, ...camera })).toEqual({ visible: 1, inView: 2 });
  });

  it('follows the camera: zoom scales the world about the target, pixels offset names', () => {
    // At zoom 1 the point (100, 50) is 200 px right of and 100 px below the centre of the canvas.
    const near = [label(100, 50)];
    const drawn = [{ label: near[0], sizePx: SIZE_PX }];
    expect(measureNameCoverage({ drawn, labels: near, ...camera, zoom: 1 }).visible).toBe(1);
    expect(measureNameCoverage({ drawn, labels: near, ...camera, zoom: 3 }).visible).toBe(0);
    // A name whose tip lies off the canvas still reaches it when it runs inward.
    const inward = { ...label(-420, 0, 'a long taxon name'), textAnchor: 'start' };
    const reaching = [{ label: inward, sizePx: SIZE_PX }];
    expect(measureNameCoverage({ drawn: reaching, labels: [inward], ...camera })).toEqual({
      visible: 1,
      inView: 1,
    });
  });

  it('counts a name drawn at the edge, its tip on the canvas and its text beyond it', () => {
    const edge = { ...label(399, 0), pixelOffset: [12, 0] };
    const drawn = [{ label: edge, sizePx: SIZE_PX }];
    expect(measureNameCoverage({ drawn, labels: [edge], ...camera })).toEqual({
      visible: 1,
      inView: 1,
    });
  });

  it('never reports fewer leaves in view than names visible', () => {
    const inward = label(-420, 0, 'a long taxon name');
    const measured = measureNameCoverage({
      drawn: [{ label: inward, sizePx: SIZE_PX }],
      labels: [inward],
      ...camera,
    });
    expect(measured.inView).toBeGreaterThanOrEqual(measured.visible);
  });
});

describe('names on a layout without rows', () => {
  it('asks rows less room than a radial name', () => {
    expect(minNameSpacingPx(LAYOUT_PROJECTION_MODES.RECTANGULAR)).toBeLessThan(
      minNameSpacingPx(LAYOUT_PROJECTION_MODES.RADIAL)
    );
  });

  it('measures the median gap to the nearest name, as a full search does', () => {
    // A seeded walk, so a failure reproduces.
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 20;
    for (let trial = 0; trial < 200; trial += 1) {
      const points = Array.from({ length: 2 + (trial % 40) }, () => [
        Math.round(random()),
        Math.round(random()),
      ]);
      const nearest = points
        .map(([x, y], i) =>
          Math.min(
            ...points.filter((_, j) => j !== i).map(([u, v]) => Math.hypot(x - u, y - v))
          )
        )
        .sort((a, b) => a - b);
      expect(medianNeighbourDistance(points)).toBeCloseTo(
        nearest[Math.floor(points.length / 2)]
      );
    }
    expect(medianNeighbourDistance([[0, 0]])).toBe(Infinity);
  });

  // 360 names 1 apart on a ring of radius about 57 around the origin, the middle of an overview.
  const ring = Array.from({ length: 360 }, (_, i) => {
    const angle = (i * Math.PI) / 180;
    return [Math.cos(angle) * 57.3, Math.sin(angle) * 57.3];
  });
  const view = { target: [0, 0, 0], zoom: 0, width: 800, height: 600, minZoom: -4, maxZoom: 6 };
  const allDrawn = () => ring;

  it('zooms until a typical name has room, and moves off an empty middle to the names', () => {
    const fitted = chooseLabelView(ring, view, 17, allDrawn);
    // 17 px for a 1-unit gap: 2^4.09.
    expect(fitted.zoom).toBeCloseTo(Math.log2(17), 2);
    // The middle of the ring holds no names at that zoom; the view moved onto the ring.
    expect(Math.hypot(...fitted.target)).toBeCloseTo(57.3, 0);
  });

  it('keeps a middle that already shows names', () => {
    const onRing = { ...view, target: [57.3, 0, 0] };
    expect(chooseLabelView(ring, onRing, 17, allDrawn).target).toEqual([57.3, 0]);
  });

  it('zooms on until most names in view are drawn, or keeps the zoom that drew the most', () => {
    // Names hide below zoom 5 (a branch-crossing rule, say): it goes on to 5.
    const fromZoom5 = (zoom) => (zoom >= 5 ? ring : []);
    expect(chooseLabelView(ring, view, 17, fromZoom5).zoom).toBeGreaterThanOrEqual(5);
    // Never FIT_LABELS_SHOWN_SHARE (no name drawn at any zoom): it keeps the first zoom with the
    // best share instead of ending at the deepest zoom.
    expect(FIT_LABELS_SHOWN_SHARE).toBe(0.9);
    expect(chooseLabelView(ring, view, 17, () => []).zoom).toBeCloseTo(Math.log2(17), 2);
  });

  it('gives no view for names without spacing, and stays quick on 10,000 names', () => {
    expect(chooseLabelView([[1, 1]], view, 17, allDrawn)).toBeNull();
    const many = Array.from({ length: 10000 }, (_, i) => {
      const angle = (2 * Math.PI * i) / 10000;
      return [Math.cos(angle) * 1591.5, Math.sin(angle) * 1591.5];
    });
    const started = performance.now();
    chooseLabelView(many, view, 17, () => many);
    // A full search of every centre took 1.5 s here.
    expect(performance.now() - started).toBeLessThan(600);
  });
});

