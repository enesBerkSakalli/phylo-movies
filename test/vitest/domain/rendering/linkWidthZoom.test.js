import { describe, expect, it } from 'vitest';
import { LayerStyles } from '../../../../src/treeVisualisation/deckgl/layers/LayerStyles.js';
import { LAYER_CONFIGS } from '../../../../src/treeVisualisation/deckgl/layers/config/layerConfigs.js';
import { getExtensionsLayerProps } from '../../../../src/treeVisualisation/deckgl/layers/factory/extensions/ExtensionLayers.js';
import {
  getLinkOutlinesLayerProps,
  getLinksLayerProps,
} from '../../../../src/treeVisualisation/deckgl/layers/factory/links/LinkLayers.js';
import {
  NOMINAL_FIT_ZOOM,
  getZoomWidthScale,
} from '../../../../src/treeVisualisation/deckgl/layers/styles/links/zoomWidthScale.js';

const FIT_ZOOM = 1;
const datum = { split_indices: [1], path: new Float32Array([0, 0, 0, 1, 1, 0]) };
const minPixels = LAYER_CONFIGS.links.defaultProps.widthMinPixels;

// On-screen width deck.gl draws: accessor width x layer widthScale, floored by widthMinPixels.
function drawnPixels(buildProps, state) {
  const layerStyles = new LayerStyles();
  try {
    const props = buildProps([datum], state, layerStyles);
    return Math.max(minPixels, props.getWidth(datum) * props.widthScale);
  } finally {
    layerStyles.destroy();
  }
}

const linkPixels = (state) => drawnPixels(getLinksLayerProps, state);
const extensionPixels = (state) => drawnPixels(getExtensionsLayerProps, state);
const atZoom = (strokeWidth, taxaCount, zoom) => ({
  strokeWidth,
  taxaCount,
  zoom,
  fitZoom: FIT_ZOOM,
});

describe('branch width on screen', () => {
  it('uses screen-pixel units so the Branch Width setting is a line weight', () => {
    expect(LAYER_CONFIGS.links.defaultProps.widthUnits).toBe('pixels');
  });

  it.each([6, 50, 1871])(
    'maps Branch Width 1-5 to the same pixels at fit zoom (%i taxa)',
    (taxa) => {
      for (const strokeWidth of [1, 2, 3, 4, 5]) {
        expect(linkPixels(atZoom(strokeWidth, taxa, FIT_ZOOM))).toBeCloseTo(strokeWidth);
        expect(extensionPixels(atZoom(strokeWidth, taxa, FIT_ZOOM))).toBeCloseTo(strokeWidth);
      }
    }
  );

  it('keeps fractional slider steps visible on a dense tree', () => {
    const at = (strokeWidth) => linkPixels(atZoom(strokeWidth, 1871, FIT_ZOOM));
    expect(at(2.5)).toBeGreaterThan(at(2.4));
    expect(at(1.5)).toBeGreaterThan(at(1));
  });

  it('thickens moderately when zooming in, up to a cap', () => {
    const at = (zoom) => linkPixels(atZoom(1, 1871, zoom));
    expect(at(FIT_ZOOM + 2)).toBeCloseTo(2);
    expect(at(FIT_ZOOM + 4)).toBeCloseTo(4);
    expect(at(FIT_ZOOM + 5)).toBeGreaterThan(at(FIT_ZOOM + 2));
    // maxZoom is 6: the deepest zoom must not keep thickening past the cap
    expect(at(FIT_ZOOM + 8)).toBeCloseTo(at(FIT_ZOOM + 4));
    expect(at(FIT_ZOOM + 2)).toBeLessThan(at(FIT_ZOOM + 3));
  });

  it('thins when zooming out but never below one pixel', () => {
    const at = (strokeWidth, zoom) => linkPixels(atZoom(strokeWidth, 1871, zoom));
    expect(at(5, FIT_ZOOM - 2)).toBeCloseTo(2.5);
    expect(at(5, FIT_ZOOM - 4)).toBeCloseTo(1.25);
    expect(at(1, FIT_ZOOM - 4)).toBe(minPixels);
    expect(at(5, FIT_ZOOM - 20)).toBeGreaterThanOrEqual(minPixels);
  });

  it('scales highlight outlines and leaf extensions with the branch they belong to', () => {
    const state = atZoom(3, 1871, FIT_ZOOM + 2);
    const layerStyles = new LayerStyles();
    try {
      const widthScale = getLinksLayerProps([datum], state, layerStyles).widthScale;
      expect(widthScale).toBeCloseTo(2);
      expect(getLinkOutlinesLayerProps([datum], state, layerStyles).widthScale).toBe(widthScale);
      expect(getExtensionsLayerProps([datum], state, layerStyles).widthScale).toBe(widthScale);
    } finally {
      layerStyles.destroy();
    }
    expect(extensionPixels(state)).toBeCloseTo(linkPixels(state));
  });

  it('leaves widths at their base value when the render context carries no zoom', () => {
    expect(getZoomWidthScale({})).toBe(1);
    expect(getZoomWidthScale(undefined)).toBe(1);
    expect(getZoomWidthScale({ zoom: Number.NaN, fitZoom: 1 })).toBe(1);
    expect(linkPixels({ strokeWidth: 3, taxaCount: 1871 })).toBeCloseTo(3);
  });

  it('measures zoom from a nominal fit zoom until the camera reports its own', () => {
    expect(getZoomWidthScale({ zoom: NOMINAL_FIT_ZOOM })).toBe(1);
    expect(getZoomWidthScale({ zoom: NOMINAL_FIT_ZOOM + 2 })).toBeCloseTo(2);
    expect(getZoomWidthScale({ zoom: 4, fitZoom: 4 })).toBe(1);
  });
});
