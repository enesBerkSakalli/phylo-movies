import { describe, expect, it } from 'vitest';
import { SYSTEM_TREE_COLORS } from '../../../../src/constants/TreeColors.js';
import { colorToRgb } from '../../../../src/services/ui/colorUtils.js';
import {
  getInnerLinkColor,
  getSubtreeHighlightRgb,
} from '../../../../src/treeVisualisation/deckgl/layers/styles/links/linkUtils.js';
import { LinkGeometryBuilder } from '../../../../src/treeVisualisation/deckgl/builders/geometry/links/LinkGeometryBuilder.js';

const link = { id: 'link-a->b', splitKey: 'ab' };

describe('link colors without a ColorManager', () => {
  // The store starts with colorManager: null, and the layer factory reads it with optional
  // chaining - so a link layer can be built before one is attached. These accessors run inside
  // deck.gl accessors, where a throw takes down the whole render rather than degrading.
  it('falls back to the default color instead of throwing', () => {
    const cached = { colorManager: null };

    expect(() => getInnerLinkColor(link, cached)).not.toThrow();
    expect(getInnerLinkColor(link, cached)).toEqual(colorToRgb(SYSTEM_TREE_COLORS.defaultColor));
  });

  it('resolves a subtree highlight without a ColorManager', () => {
    expect(() => getSubtreeHighlightRgb(link, null, 'solid')).not.toThrow();
    expect(getSubtreeHighlightRgb(link, null, 'solid')).toHaveLength(3);
  });
});

describe('straight-mode link geometry', () => {
  const builder = new LinkGeometryBuilder({ geometryMode: 'straight' });

  it('drops a link whose endpoints cannot be resolved', () => {
    // Both cartesian and polar coordinates are unusable. Falling back to 0 here would draw a
    // visible branch to the origin; the elbow mode returns an empty path, and so must this.
    const path = builder.createLinkPath({
      source: { x: NaN, y: NaN, radius: NaN, angle: NaN },
      target: { x: NaN, y: NaN, radius: NaN, angle: NaN },
    });

    expect(path).toHaveLength(0);
  });

  it('still builds a path from resolvable endpoints', () => {
    const path = builder.createLinkPath({
      source: { x: 0, y: 0, z: 0 },
      target: { x: 3, y: 4, z: 0 },
    });

    expect(Array.from(path)).toEqual([0, 0, 0, 3, 4, 0]);
  });

  it('derives cartesian coordinates from polar when x/y are absent', () => {
    const path = builder.createLinkPath({
      source: { radius: 0, angle: 0 },
      target: { radius: 2, angle: 0 },
    });

    expect(path).toHaveLength(6);
    expect(path[3]).toBeCloseTo(2);
  });
});
