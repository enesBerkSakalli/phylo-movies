import { describe, expect, it } from 'vitest';
import { PolarLinkInterpolator } from '../../../../src/treeVisualisation/deckgl/interpolation/PolarLinkInterpolator.js';

function createInterpolator() {
  return new PolarLinkInterpolator({
    elementMatcher: {},
    nodeInterpolator: {},
    pathInterpolator: { createPathFromPolarData: () => new Float32Array([0, 0, 0, 1, 1, 0]) },
  });
}

describe('PolarLinkInterpolator datum pool', () => {
  // Datums are pooled per link id and reused across frames via Object.assign, which never
  // removes keys the new source omits. Lifecycle-only fields therefore have to be cleared
  // explicitly, or a link that once entered or exited keeps those values forever.
  it('drops lifecycle fields the next frame does not re-supply', () => {
    const interpolator = createInterpolator();

    interpolator._createLinkDatumFromPositions(
      { id: 'link-a->b', opacity: 0.3, isExiting: true, polarData: {} },
      [0, 0, 0],
      [1, 1, 0],
      {}
    );

    const next = interpolator._createLinkDatumFromPositions(
      { id: 'link-a->b', polarData: {} },
      [0, 0, 0],
      [1, 1, 0],
      {}
    );

    expect(next.opacity).toBeUndefined();
    expect(next.isExiting).toBe(false);
    expect(next.isEntering).toBe(false);
  });

  it('still honours lifecycle fields supplied by the current frame', () => {
    const interpolator = createInterpolator();

    const datum = interpolator._createLinkDatumFromPositions(
      { id: 'link-c->d', opacity: 0.5, isEntering: true, polarData: {} },
      [0, 0, 0],
      [1, 1, 0],
      {}
    );

    expect(datum.opacity).toBe(0.5);
    expect(datum.isEntering).toBe(true);
  });
});
