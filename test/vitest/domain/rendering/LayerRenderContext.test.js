import { describe, expect, it, vi } from 'vitest';
import { LayerStyles } from '../../../../src/treeVisualisation/deckgl/layers/LayerStyles.js';
import {
  createLayerRenderContext,
  getRenderContextChangeCategory,
  selectRenderRelevantFields,
} from '../../../../src/treeVisualisation/systems/LayerRenderContext.js';

const baseRenderContext = {
  styleConfig: { labelOffsets: { DEFAULT: 1, EXTENSION: 2 } },
  strokeWidth: 2,
  fontSize: 12,
  nodeSize: 3,
  branchAnnotationLabelKey: 'support.bootstrap.value',
  taxaCount: 4,
  dimmingEnabled: true,
  dimmingOpacity: 0.4,
  subtreeDimmingEnabled: true,
  subtreeDimmingOpacity: 0.5,
  subtreeHighlightsEnabled: true,
  subtreeHighlightOpacity: 0.6,
  pivotEdgeDashingEnabled: true,
  upcomingChangesEnabled: false,
  highlightColorMode: 'solid',
  subtreeHighlightColor: '#ff0000',
  linkConnectionOpacity: 0.7,
  changePulseEnabled: true,
  changePulsePhase: 0.2,
  colorVersion: 1,
  taxaColorVersion: 2,
};

const renderFieldCases = [
  ['labelOffsets.DEFAULT', 'layout', (context) => (context.styleConfig.labelOffsets.DEFAULT = 3)],
  [
    'labelOffsets.EXTENSION',
    'layout',
    (context) => (context.styleConfig.labelOffsets.EXTENSION = 3),
  ],
  ['strokeWidth', 'layerData', (context) => (context.strokeWidth = 3)],
  ['fontSize', 'layerData', (context) => (context.fontSize = 13)],
  ['nodeSize', 'layerData', (context) => (context.nodeSize = 4)],
  [
    'branchAnnotationLabelKey',
    'layerData',
    (context) => (context.branchAnnotationLabelKey = 'support.ufboot.value'),
  ],
  ['taxaCount', 'layerData', (context) => (context.taxaCount = 5)],
  ['dimmingEnabled', 'paint', (context) => (context.dimmingEnabled = false)],
  ['dimmingOpacity', 'paint', (context) => (context.dimmingOpacity = 0.3)],
  ['subtreeDimmingEnabled', 'paint', (context) => (context.subtreeDimmingEnabled = false)],
  ['subtreeDimmingOpacity', 'paint', (context) => (context.subtreeDimmingOpacity = 0.4)],
  ['subtreeHighlightsEnabled', 'paint', (context) => (context.subtreeHighlightsEnabled = false)],
  ['subtreeHighlightOpacity', 'paint', (context) => (context.subtreeHighlightOpacity = 0.5)],
  ['pivotEdgeDashingEnabled', 'paint', (context) => (context.pivotEdgeDashingEnabled = false)],
  ['upcomingChangesEnabled', 'paint', (context) => (context.upcomingChangesEnabled = true)],
  ['highlightColorMode', 'paint', (context) => (context.highlightColorMode = 'gradient')],
  ['subtreeHighlightColor', 'paint', (context) => (context.subtreeHighlightColor = '#00ff00')],
  ['linkConnectionOpacity', 'paint', (context) => (context.linkConnectionOpacity = 0.8)],
  ['changePulseEnabled', 'paint', (context) => (context.changePulseEnabled = false)],
  ['changePulsePhase', 'paint', (context) => (context.changePulsePhase = 0.3)],
  ['colorVersion', 'paint', (context) => (context.colorVersion = 2)],
  ['taxaColorVersion', 'paint', (context) => (context.taxaColorVersion = 3)],
];

const renderCategoryCases = [
  [
    'layout',
    'onLayoutChange',
    (context) => (context.styleConfig.labelOffsets.DEFAULT = 3),
  ],
  ['layer data', 'onLayerDataChange', (context) => (context.strokeWidth = 3)],
  ['paint', 'onPaintChange', (context) => (context.dimmingEnabled = false)],
];

function createStyleChangeCallbacks() {
  return {
    onLayoutChange: vi.fn(),
    onLayerDataChange: vi.fn(),
    onPaintChange: vi.fn(),
  };
}

describe('LayerRenderContext', () => {
  it('provides the layer-only values from one controller-owned state snapshot', () => {
    const state = {
      leafNamesByIndex: ['a', 'b', 'c'],
      viewState: { zoom: 2 },
      strokeWidth: 4,
    };

    const context = createLayerRenderContext(state, { metricScale: 0.5, zoom: 3 });

    expect(context).toMatchObject({
      strokeWidth: 4,
      taxaCount: 3,
      metricScale: 0.5,
      zoom: 3,
    });
  });

  it('selects the complete render-relevant field contract from raw store state', () => {
    const selected = selectRenderRelevantFields({
      ...baseRenderContext,
      taxaCount: undefined,
      leafNamesByIndex: ['a', 'b', 'c', 'd'],
    });

    expect(selected).toEqual({
      labelOffsetsDefault: 1,
      labelOffsetsExtension: 2,
      strokeWidth: 2,
      fontSize: 12,
      nodeSize: 3,
      branchAnnotationLabelKey: 'support.bootstrap.value',
      taxaCount: 4,
      dimmingEnabled: true,
      dimmingOpacity: 0.4,
      subtreeDimmingEnabled: true,
      subtreeDimmingOpacity: 0.5,
      subtreeHighlightsEnabled: true,
      subtreeHighlightOpacity: 0.6,
      pivotEdgeDashingEnabled: true,
      upcomingChangesEnabled: false,
      highlightColorMode: 'solid',
      subtreeHighlightColor: '#ff0000',
      linkConnectionOpacity: 0.7,
      changePulseEnabled: true,
      changePulsePhase: 0.2,
      colorVersion: 1,
      taxaColorVersion: 2,
    });
  });

  it.each(renderFieldCases)('classifies %s changes as %s', (_field, category, mutate) => {
    const previousContext = structuredClone(baseRenderContext);
    const nextContext = structuredClone(baseRenderContext);
    mutate(nextContext);

    expect(getRenderContextChangeCategory(nextContext, previousContext)).toBe(category);
  });

  it('returns no category when render-relevant fields are unchanged', () => {
    expect(
      getRenderContextChangeCategory(
        { ...baseRenderContext, unrelated: 'next' },
        { ...baseRenderContext, unrelated: 'previous' }
      )
    ).toBeNull();
  });

  it('preserves layout-first invalidation when multiple categories change', () => {
    const nextContext = structuredClone(baseRenderContext);
    nextContext.styleConfig.labelOffsets.DEFAULT = 3;
    nextContext.strokeWidth = 3;
    nextContext.dimmingEnabled = false;

    expect(getRenderContextChangeCategory(nextContext, baseRenderContext)).toBe('layout');
  });

  it.each(renderCategoryCases)(
    'dispatches %s changes through LayerStyles',
    (_category, expectedCallback, mutate) => {
      const previousContext = structuredClone(baseRenderContext);
      const nextContext = structuredClone(baseRenderContext);
      const callbacks = createStyleChangeCallbacks();
      const layerStyles = new LayerStyles(previousContext);
      mutate(nextContext);

      try {
        layerStyles.setStyleChangeCallback(callbacks);
        layerStyles.handleRenderContextChange(nextContext, previousContext);

        expect(callbacks[expectedCallback]).toHaveBeenCalledOnce();
        for (const [callbackName, callback] of Object.entries(callbacks)) {
          if (callbackName !== expectedCallback) {
            expect(callback).not.toHaveBeenCalled();
          }
        }
      } finally {
        layerStyles.destroy();
      }
    }
  );

  it('does not dispatch LayerStyles callbacks for unrelated changes', () => {
    const callbacks = createStyleChangeCallbacks();
    const layerStyles = new LayerStyles(baseRenderContext);

    try {
      layerStyles.setStyleChangeCallback(callbacks);
      layerStyles.handleRenderContextChange(
        { ...baseRenderContext, unrelated: 'next' },
        { ...baseRenderContext, unrelated: 'previous' }
      );

      for (const callback of Object.values(callbacks)) {
        expect(callback).not.toHaveBeenCalled();
      }
    } finally {
      layerStyles.destroy();
    }
  });

  it('dispatches only the highest-priority LayerStyles callback', () => {
    const nextContext = structuredClone(baseRenderContext);
    const callbacks = createStyleChangeCallbacks();
    const layerStyles = new LayerStyles(baseRenderContext);
    nextContext.styleConfig.labelOffsets.DEFAULT = 3;
    nextContext.strokeWidth = 3;
    nextContext.dimmingEnabled = false;

    try {
      layerStyles.setStyleChangeCallback(callbacks);
      layerStyles.handleRenderContextChange(nextContext, baseRenderContext);

      expect(callbacks.onLayoutChange).toHaveBeenCalledOnce();
      expect(callbacks.onLayerDataChange).not.toHaveBeenCalled();
      expect(callbacks.onPaintChange).not.toHaveBeenCalled();
    } finally {
      layerStyles.destroy();
    }
  });
});
