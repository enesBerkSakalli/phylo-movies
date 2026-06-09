import { describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/state/phyloStore/store.js';
import {
  getLinkOutlineColor,
  getLinkOutlineWidth,
} from '../src/treeVisualisation/deckgl/layers/styles/links/outline/linkOutlineStyles.js';
import { LayerStyles } from '../src/treeVisualisation/deckgl/layers/LayerStyles.js';
import { getSourceDestinationEdgesAtIndex } from '../src/state/phyloStore/internal/changeTracking.helpers.js';

describe('tree highlight state', () => {
  it('bumps colorVersion when subtree highlight color changes so deck.gl color accessors invalidate', () => {
    const previousState = useAppStore.getState();
    const previousColor = previousState.subtreeHighlightColor;
    const previousVersion = previousState.colorVersion;
    const nextColor = previousColor === '#123456' ? '#654321' : '#123456';

    try {
      previousState.setSubtreeHighlightColor(nextColor);

      expect(useAppStore.getState().colorVersion).toBe(previousVersion + 1);
    } finally {
      useAppStore.getState().setSubtreeHighlightColor(previousColor);
      useAppStore.setState({ subtreeHighlightColor: previousColor, colorVersion: previousVersion });
    }
  });

  it('keeps subtree highlight outlines visible without covering branch detail', () => {
    const link = {
      split_indices: [1],
      opacity: 1,
      path: [
        [0, 0, 0],
        [10, 0, 0],
      ],
    };
    const cached = {
      colorManager: {
        getBranchColor: () => '#000000',
      },
      highlightedSubtreeData: [[1, 2]],
      subtreeHighlightsEnabled: true,
      subtreeHighlightOpacity: undefined,
      highlightColorMode: 'solid',
      subtreeHighlightColor: '#ff00ff',
      metricScale: 1,
    };

    expect(getLinkOutlineWidth(link, cached, { getBaseStrokeWidth: () => 1 })).toBe(2.5);
    expect(getLinkOutlineColor(link, cached)[3]).toBe(95);
  });

  it('keeps pivot edge outlines visible throughout the pulse cycle', () => {
    const link = {
      split_indices: [1],
      opacity: 1,
      path: [
        [0, 0, 0],
        [10, 0, 0],
      ],
    };
    const cached = {
      colorManager: {
        isPivotEdge: () => true,
        isCompletedChangeEdge: () => false,
        isUpcomingChangeEdge: () => false,
        isLinkInActiveMoverSubtree: () => false,
      },
      highlightedSubtreeData: [],
      subtreeHighlightsEnabled: true,
      pulseOpacity: 0.4,
      upcomingChangesEnabled: false,
      metricScale: 1,
    };

    expect(getLinkOutlineColor(link, cached)[3]).toBeGreaterThanOrEqual(190);
  });

  it('stops the pivot pulse when only subtree highlights remain', () => {
    const previousState = useAppStore.getState();
    const previousColorManager = previousState.colorManager;
    const previousPulseEnabled = previousState.changePulseEnabled;
    const previousPulsePhase = previousState.changePulsePhase;

    let hasPivotEdge = true;
    const colorManager = {
      highlightedSubtreeSets: [new Set([1])],
      hasPivotEdges: () => hasPivotEdge,
      updatePivotEdge: (edge) => {
        const size = edge instanceof Set ? edge.size : Array.isArray(edge) ? edge.length : 0;
        hasPivotEdge = size > 0;
      },
    };

    const requestAnimationFrame = vi.fn(() => 42);
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);

    try {
      previousState.stopPulseAnimation?.();
      useAppStore.setState({
        colorManager,
        changePulseEnabled: true,
        changePulsePhase: 0,
      });

      useAppStore.getState().startPulseAnimation();
      expect(requestAnimationFrame).toHaveBeenCalledOnce();

      useAppStore.getState().updateColorManagerPivotEdge([]);

      expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
    } finally {
      useAppStore.getState().stopPulseAnimation?.();
      useAppStore.setState({
        colorManager: previousColorManager,
        changePulseEnabled: previousPulseEnabled,
        changePulsePhase: previousPulsePhase,
      });
      vi.unstubAllGlobals();
    }
  });

  it('aligns layer-style fallbacks with the store subtree highlight defaults', () => {
    const layerStyles = new LayerStyles();

    try {
      const cached = layerStyles.getCachedState({
        getColorManager: () => null,
        metricScale: 1,
        nodeSize: 1,
        strokeWidth: 1,
        leafNamesByIndex: [],
      });

      expect(cached.subtreeHighlightOpacity).toBe(0.5);
      expect(cached.highlightColorMode).toBe('solid');
    } finally {
      layerStyles.unsubscribe?.();
    }
  });

  it('preserves taxon index 0 when manually marking moved subtrees', () => {
    const previousState = useAppStore.getState();
    const previousMarkedNodes = previousState.manuallyMarkedNodes;
    const previousColorManager = previousState.colorManager;
    const previousTreeControllers = previousState.treeControllers;
    const colorManager = {
      updateHighlightedSubtrees: vi.fn(),
    };

    try {
      useAppStore.setState({ colorManager, treeControllers: [] });

      useAppStore.getState().setManuallyMarkedNodes([0, 2]);

      expect(useAppStore.getState().manuallyMarkedNodes).toEqual([0, 2]);
      expect(colorManager.updateHighlightedSubtrees).toHaveBeenCalled();
      expect(Array.from(colorManager.updateHighlightedSubtrees.mock.calls.at(-1)[0][0])).toEqual([
        0, 2,
      ]);
    } finally {
      useAppStore.setState({
        manuallyMarkedNodes: previousMarkedNodes,
        colorManager: previousColorManager,
        treeControllers: previousTreeControllers,
      });
    }
  });

  it('invalidates layer data when the branch value label field changes', () => {
    const previousKey = useAppStore.getState().branchAnnotationLabelKey;
    const nextKey =
      previousKey === 'support.bootstrap.value'
        ? 'support.ufboot.value'
        : 'support.bootstrap.value';
    const layerStyles = new LayerStyles();
    const onLayerDataChange = vi.fn();

    try {
      layerStyles.setStyleChangeCallback({ onLayerDataChange });

      useAppStore.getState().setBranchAnnotationLabelKey(nextKey);

      expect(onLayerDataChange).toHaveBeenCalledOnce();
    } finally {
      layerStyles.destroy();
      useAppStore.setState({ branchAnnotationLabelKey: previousKey });
    }
  });

  it('skips missing attachment edge mappings while resolving source and destination colors', () => {
    const result = getSourceDestinationEdgesAtIndex(
      {
        subtreeHighlightTracking: [[[1], [2]]],
        temporalEvents: [
          {
            event_type: 'split_change',
            pair_id: 'pair_0',
            frame_range: [0, 0],
            split: [1, 2],
          },
        ],
        timelineFrames: [
          {
            frame_index: 0,
            frame_type: 'interpolation_frame',
            is_observed_input: false,
            pair_id: 'pair_0',
          },
        ],
        pairs: [
          {
            pair_id: 'pair_0',
            solution: {
              attachment_edges_by_split: {
                '[1, 2]': {
                  '[1]': {
                    source: [1, 5],
                    destination: [1, 6],
                  },
                },
              },
            },
          },
        ],
      },
      0
    );

    expect(result).toEqual({ source: [[5]], dest: [[6]] });
  });
});
