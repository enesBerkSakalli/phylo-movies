import { describe, expect, it } from 'vitest';
import { TreeInterpolator } from '../src/treeVisualisation/deckgl/interpolation/TreeInterpolator.js';
import { PolarPathInterpolator } from '../src/treeVisualisation/deckgl/interpolation/path/PolarPathInterpolator.js';

const EXPECTED_ANIMATED_ARC_SEGMENT_COUNT = 10;

/**
 * Correctness guard for the per-id Float32Array path buffer pool in
 * PolarPathInterpolator. The pool reuses one buffer per link/extension id
 * across frames to cut per-frame garbage. The two hazards it must NOT introduce:
 *   1. Intra-frame aliasing: distinct links in the same frame must have
 *      distinct buffers and distinct contents.
 *   2. Stale reuse: the same link at a different `t` must produce updated
 *      contents, not leftover values from the previous frame.
 */
describe('TreeInterpolator path buffer pool correctness', () => {
  it('uses the reduced fixed segment count for animated curved paths', () => {
    const interpolator = new PolarPathInterpolator();
    const path = interpolator.interpolatePath(curvedPathLink(), curvedPathLink(), 0.5);

    expect(interpolator.segmentCount).toBe(EXPECTED_ANIMATED_ARC_SEGMENT_COUNT);
    expect(path).toHaveLength((EXPECTED_ANIMATED_ARC_SEGMENT_COUNT + 2) * 3);
  });

  it('produces distinct, non-aliased path buffers for distinct links in one frame', () => {
    const interpolator = new TreeInterpolator();
    const from = {
      max_radius: 120,
      nodes: [],
      links: [link('a', 10, 40, 0, Math.PI / 6), link('b', 10, 60, Math.PI, (5 * Math.PI) / 6)],
      labels: [],
      extensions: [],
    };
    const to = {
      max_radius: 120,
      nodes: [],
      links: [link('a', 10, 40, 0, Math.PI / 6), link('b', 10, 60, Math.PI, (5 * Math.PI) / 6)],
      labels: [],
      extensions: [],
    };

    const result = interpolator.interpolateTreeData(from, to, 0.5);
    const pathA = result.links.find((l) => l.id === 'a').path;
    const pathB = result.links.find((l) => l.id === 'b').path;

    // Different buffer objects (no shared single buffer).
    expect(pathA).not.toBe(pathB);
    // Different geometry (b is longer / different angle), so contents differ.
    expect(Array.from(pathA)).not.toEqual(Array.from(pathB));
  });

  it('updates a reused buffer when the same link is interpolated at a new t', () => {
    const interpolator = new TreeInterpolator();
    const from = {
      max_radius: 120,
      nodes: [],
      links: [link('a', 10, 40, 0, 0)],
      labels: [],
      extensions: [],
    };
    const to = {
      max_radius: 120,
      nodes: [],
      links: [link('a', 10, 80, 0, Math.PI / 2)],
      labels: [],
      extensions: [],
    };

    const early = interpolator.interpolateTreeData(from, to, 0.1);
    const earlySnapshot = Array.from(early.links[0].path);

    const late = interpolator.interpolateTreeData(from, to, 0.9);
    const lateSnapshot = Array.from(late.links[0].path);

    // The interpolated geometry must change between t=0.1 and t=0.9, proving the
    // reused buffer is rewritten rather than returning stale contents.
    expect(lateSnapshot).not.toEqual(earlySnapshot);
    expect(lateSnapshot).toHaveLength(earlySnapshot.length);
  });

  it('does not emit non-finite animated path coordinates for invalid polar endpoints', () => {
    const interpolator = new PolarPathInterpolator();

    const path = interpolator.createPathFromPolarData({
      source: { angle: Number.NaN, radius: 10 },
      target: { angle: 0, radius: 20 },
    });

    expect(path).toBeInstanceOf(Float32Array);
    expect(path).toHaveLength(0);
  });
});

function curvedPathLink() {
  return {
    id: 'curved-link',
    polarData: {
      source: { angle: 0, radius: 50 },
      target: { angle: Math.PI / 2, radius: 80 },
    },
  };
}

function position(radius, angle) {
  return [radius * Math.cos(angle), radius * Math.sin(angle), 0];
}

function link(id, sourceRadius, targetRadius, sourceAngle, targetAngle) {
  const sourcePosition = position(sourceRadius, sourceAngle);
  const targetPosition = position(targetRadius, targetAngle);
  return {
    id,
    splitKey: id,
    split_indices: [1],
    sourceId: null,
    targetId: null,
    radialLength: Math.max(0, targetRadius - sourceRadius),
    opacity: 1,
    sourcePosition,
    targetPosition,
    polarData: {
      source: { angle: sourceAngle, radius: sourceRadius },
      target: { angle: targetAngle, radius: targetRadius },
    },
    path: new Float32Array([...sourcePosition, ...targetPosition]),
  };
}
