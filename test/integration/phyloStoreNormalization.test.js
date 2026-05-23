import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { phyloData } from '../../src/services/data/dataService.js';
import * as phyloStoreModule from '../../src/state/phyloStore/store.js';

const { useAppStore } = phyloStoreModule;
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

const tree0 = {
  name: '',
  length: 0,
  split_indices: [0, 1],
  children: [
    { name: 'taxon-a', length: 0, split_indices: [0], children: [] },
    { name: 'taxon-b', length: 0, split_indices: [1], children: [] },
  ],
};
const tree1 = tree0;
const tree2 = tree0;

function makeBackendMovieData() {
  return {
    interpolated_trees: [tree0, tree1, tree2],
    frames: [
      {
        frame_index: 0,
        frame_type: 'input_tree',
        state_semantics: 'processed_input_tree',
        is_observed_input: true,
        input_tree_index: 0,
        pair_id: null,
        pair_ordinal: null,
        local_step_index: null,
        source_frame_index: null,
        target_frame_index: null,
      },
      {
        frame_index: 1,
        frame_type: 'interpolation_frame',
        state_semantics: 'algorithmic_intermediate',
        is_observed_input: false,
        input_tree_index: null,
        pair_id: 'pair_0_1',
        pair_ordinal: 0,
        local_step_index: 0,
        source_frame_index: 0,
        target_frame_index: 2,
      },
      {
        frame_index: 2,
        frame_type: 'input_tree',
        state_semantics: 'processed_input_tree',
        is_observed_input: true,
        input_tree_index: 1,
        pair_id: null,
        pair_ordinal: null,
        local_step_index: null,
        source_frame_index: null,
        target_frame_index: null,
      },
    ],
    pairs: [
      {
        pair_id: 'pair_0_1',
        pair_ordinal: 0,
        source_input_tree_index: 0,
        target_input_tree_index: 1,
        source_frame_index: 0,
        target_frame_index: 2,
        generated_frame_range: [1, 1],
        solution: {
          affected_subtrees_by_split: {},
          attachment_edges_by_split: {},
        },
      },
    ],
    temporal_events: [
      {
        event_id: 'pair_0_1:split:0',
        event_type: 'split_change',
        pair_id: 'pair_0_1',
        pair_ordinal: 0,
        local_step_range: [0, 0],
        frame_range: [1, 1],
        split: [0],
      },
    ],
    pair_metrics: {
      rows: [{
        pair_id: 'pair_0_1',
        pair_ordinal: 0,
        robinson_foulds: 1,
        weighted_robinson_foulds: 1,
      }],
      semantics: {
        robinson_foulds: {
          topology: 'rooted_clades',
          normalization: 'symmetric_difference_over_union',
          scope: 'adjacent_processed_input_trees',
        },
        weighted_robinson_foulds: {
          topology: 'rooted_clades',
          includes_branch_lengths: true,
          includes_terminal_and_root_splits: true,
          scope: 'adjacent_processed_input_trees',
        },
      },
    },
    subtree_highlight_tracking: [null, [[1]], null],
    msa: {
      sequences: null,
      window_size: 1,
      step_size: 1,
    },
    file_name: 'normalization-test.json',
  };
}

function legacyBackendMovieData() {
  return {
    interpolated_trees: [tree0, tree1, tree2],
    tree_metadata: [],
    tree_pair_solutions: {
      pair_0_1: {
        affected_subtrees_by_split: {},
        attachment_edges_by_split: {},
      },
    },
    pair_interpolation_ranges: [[0, 2]],
    split_change_timeline: [
      { type: 'original', global_index: 0, tree_index: 0, name: 'Input tree 1' },
      {
        type: 'split_event',
        pair_key: 'pair_0_1',
        split: [0],
        step_range_global: [1, 1],
        step_range_local: [1, 1],
      },
      { type: 'original', global_index: 2, tree_index: 1, name: 'Input tree 2' },
    ],
    subtree_highlight_tracking: [null, [[1]], null],
    msa: {
      sequences: null,
      window_size: 1,
      step_size: 1,
    },
    file_name: 'normalization-test.json',
  };
}

function makeMovieData() {
  return phyloData.validate(makeBackendMovieData());
}

describe('phylo store dataset normalization', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback) => setTimeout(callback, 0));
    vi.stubGlobal('cancelAnimationFrame', (id) => clearTimeout(id));
  });

  afterEach(() => {
    useAppStore.getState().reset();
    vi.unstubAllGlobals();
  });

  it('uses stable empty selector defaults before dataset initialization', () => {
    const state = useAppStore.getState();

    expect(phyloStoreModule.selectInputFrameIndices(state)).toBe(phyloStoreModule.selectInputFrameIndices(state));
    expect(phyloStoreModule.selectPairMetrics(state)).toBe(phyloStoreModule.selectPairMetrics(state));
    expect(phyloStoreModule.selectPairById(state)).toBe(phyloStoreModule.selectPairById(state));
  });

  it('stores canonical dataset data and derives tree lookup selectors', () => {
    const movieData = makeMovieData();

    useAppStore.getState().initialize(movieData);

    const state = useAppStore.getState();
    expect(state.treeList).toBe(movieData.interpolated_trees);
    expect(state.timelineFrames).toBe(movieData.frames);
    expect(state.leafNamesByIndex).toEqual(['taxon-a', 'taxon-b']);
    expect(movieData).not.toHaveProperty(['sorted', 'leaves'].join('_'));
    expect(Object.prototype.hasOwnProperty.call(state, 'movieData')).toBe(false);
    expect(state.msaSequences).toBe(movieData.msa.sequences);
    expect(state.subtreeHighlightTracking).toEqual([null, [[1]], null]);
    expect(state.temporalEvents).toBe(movieData.temporal_events);
    expect(state.pairMetrics).toBe(movieData.pair_metrics);
    expect(state.pairs).toBe(movieData.pairs);
    expect(phyloStoreModule.selectPairById(state).pair_0_1).toBe(movieData.pairs[0]);
    expect(phyloStoreModule.selectInputFrameIndices(state)).toEqual([0, 2]);
    expect(phyloStoreModule.selectPairMetrics(state).rows).toEqual([{
      pair_id: 'pair_0_1',
      pair_ordinal: 0,
      robinson_foulds: 1,
      weighted_robinson_foulds: 1,
    }]);
    expect(Object.prototype.hasOwnProperty.call(state, 'inputFrameIndices')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state, 'pairById')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state, 'pairInterpolationRanges')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state, 'transitionResolver')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state, 'treeIndexByPair')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state, 'distanceRfd')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state, 'distanceWeightedRfd')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state, 'treeMetadata')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state, 'pairSolutions')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state, 'splitChangeTimeline')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state, 'treeDistances')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state, 'pivotEdgeTracking')).toBe(false);
  });

  it('derives scale metadata without storing scale duplicates', () => {
    useAppStore.getState().initialize(makeMovieData());

    const legacyScaleKey = ['scale', 'Values'].join('');
    const state = useAppStore.getState();
    expect(phyloStoreModule.selectScaleList(state)).toEqual([
      { index: 0, value: 0 },
      { index: 2, value: 0 },
    ]);
    expect(phyloStoreModule.selectMaxScale(state)).toBe(0);
    expect(Object.prototype.hasOwnProperty.call(state, 'scaleList')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state, 'maxScale')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state, legacyScaleKey)).toBe(false);
  });

  it('stores subtree highlight scope without the legacy mode contract', () => {
    const state = useAppStore.getState();

    expect(state.subtreeHighlightScope).toBe('current');
    expect(typeof state.setSubtreeHighlightScope).toBe('function');
    expect(Object.prototype.hasOwnProperty.call(state, 'markedSubtreeMode')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state, 'setMarkedSubtreeMode')).toBe(false);
    expect(typeof phyloStoreModule.selectSubtreeHighlightScope).toBe('function');
    expect(typeof phyloStoreModule.selectSetSubtreeHighlightScope).toBe('function');
    expect(phyloStoreModule).not.toHaveProperty('selectMarkedSubtreeMode');
    expect(phyloStoreModule).not.toHaveProperty('selectSetMarkedSubtreeMode');
  });

  it('returns explicit tree context for original and interpolated tree indices', () => {
    useAppStore.getState().initialize(makeMovieData());

    const originalContext = useAppStore.getState().getTreeContext(0);
    const interpolatedContext = useAppStore.getState().getTreeContext(1);

    expect(originalContext).toMatchObject({
      treeIndex: 0,
      tree: tree0,
      pairId: null,
      isOriginal: true,
      isInputTree: true,
    });
    expect(interpolatedContext).toMatchObject({
      treeIndex: 1,
      tree: tree1,
      pairId: 'pair_0_1',
      isOriginal: false,
      isInputTree: false,
    });
  });

  it('closes the MSA viewer without legacy detached viewer state', () => {
    const detachedStateKey = ['msaViewer', 'Detached'].join('');
    const detachedSetterKey = ['setMsaViewer', 'Detached'].join('');
    const state = useAppStore.getState();

    expect(Object.prototype.hasOwnProperty.call(state, detachedStateKey)).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state, detachedSetterKey)).toBe(false);

    state.openMsaViewer();
    expect(useAppStore.getState().isMsaViewerOpen).toBe(true);

    useAppStore.getState().closeMsaViewer();
    expect(useAppStore.getState().isMsaViewerOpen).toBe(false);
  });

  it('opens the node context menu from normalized node data and screen position only', () => {
    const legacyTreeDataKey = ['contextMenu', 'TreeData'].join('');
    const node = {
      name: 'node-a',
      length: 0,
      split_indices: [0, 1],
      depth: 0,
      height: 0,
      children: [],
    };

    useAppStore.getState().showNodeContextMenu(node, { x: 12, y: 34 });

    const openState = useAppStore.getState();
    expect(openState.contextMenuOpen).toBe(true);
    expect(openState.contextMenuPosition).toEqual({ x: 12, y: 34 });
    expect(openState.contextMenuNode).toBe(node);
    expect(Object.prototype.hasOwnProperty.call(openState, legacyTreeDataKey)).toBe(false);

    openState.hideNodeContextMenu();

    const closedState = useAppStore.getState();
    expect(closedState.contextMenuOpen).toBe(false);
    expect(closedState.contextMenuNode).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(closedState, legacyTreeDataKey)).toBe(false);

    const interactionSliceSource = readFileSync(
      join(repoRoot, 'src/state/phyloStore/slices/interaction/treeInteraction.slice.js'),
      'utf8',
    );
    expect(interactionSliceSource).not.toContain('_treeData');
    expect(interactionSliceSource).not.toContain('Legacy caller payload');
  });

  it('keeps selectors on the Zustand state contract without empty object shims', () => {
    const selectorsDir = join(repoRoot, 'src/state/phyloStore/selectors');
    const violations = [];

    for (const entry of readdirSync(selectorsDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
      const source = readFileSync(join(selectorsDir, entry.name), 'utf8');
      if (/\(\s*state\s*=\s*\{\s*\}/.test(source)) {
        violations.push(`${entry.name}: default empty state parameter`);
      }
      if (/state\?\./.test(source)) {
        violations.push(`${entry.name}: optional state access`);
      }
      if (/Array\.isArray\(state\./.test(source)) {
        violations.push(`${entry.name}: defensive store-array check`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps initialized selector fields free of duplicate fallback defaults', () => {
    const selectorFallbackChecks = [
      ['selectContextMenuNode.js', '?? null'],
      ['selectContextMenuPosition.js', '??'],
      ['selectCurrentTree.js', 'typeof frameIndex'],
      ['selectFileName.js', 'typeof state.fileName'],
      ['selectLabelsVisible.js', '!== false'],
      ['selectMovieTimelineManager.js', '?? null'],
      ['selectMsaWindow.js', '?? null'],
      ['selectPairs.js', '??'],
      ['selectPairById.js', '??'],
      ['selectPlayhead.js', '??'],
      ['selectTaxaColoringWindow.js', '?? null'],
      ['selectTaxaGrouping.js', '?? null'],
    ];

    const violations = selectorFallbackChecks.flatMap(([fileName, legacyPattern]) => {
      const source = readFileSync(join(repoRoot, 'src/state/phyloStore/selectors', fileName), 'utf8');
      return source.includes(legacyPattern) ? [`${fileName}: ${legacyPattern}`] : [];
    });

    expect(violations).toEqual([]);
  });

  it('keeps timeline frame index helpers on the validated backend row contract only', () => {
    const source = readFileSync(
      join(repoRoot, 'src/timeline/data/timelineFrameIndex.js'),
      'utf8',
    );

    expect(source).not.toContain('frameType');
    expect(source).not.toContain('frameIndex');
    expect(source).not.toContain('isObservedInput');
  });

  it('does not keep unused pair-frame-range selectors', () => {
    expect(phyloStoreModule).not.toHaveProperty('selectPairFrameRanges');
    expect(existsSync(join(repoRoot, 'src/state/phyloStore/selectors/selectPairFrameRanges.js'))).toBe(false);
  });

  it('does not keep pair-id wrapper selectors over timeline frames', () => {
    expect(phyloStoreModule).not.toHaveProperty('selectPairIdAtIndex');
    expect(existsSync(join(repoRoot, 'src/state/phyloStore/selectors/selectPairIdAtIndex.js'))).toBe(false);
  });

  it('names the canonical input-frame selector by the timeline contract', () => {
    const legacySelectorName = ['select', 'Full', 'Tree', 'Indices'].join('');
    const legacySelectorFile = `${legacySelectorName}.js`;

    expect(phyloStoreModule).toHaveProperty('selectInputFrameIndices');
    expect(phyloStoreModule).not.toHaveProperty(legacySelectorName);
    expect(existsSync(join(repoRoot, 'src/state/phyloStore/selectors', legacySelectorFile))).toBe(false);
    expect(existsSync(join(repoRoot, 'src/state/phyloStore/selectors/selectInputFrameIndices.js'))).toBe(true);
  });

  it('keeps timeline segment semantics on input-tree language', () => {
    const sourceChecks = [
      'src/timeline/data/TimelineSegmentBuilder.js',
      'src/timeline/data/segmentProcessor.js',
      'src/timeline/core/TimelineNavigationController.js',
      'src/timeline/renderers/DeckTimelineRenderer.js',
      'src/timeline/utils/layerFactories.js',
      'src/timeline/utils/segmentUtils.js',
      'src/components/timeline/TimelineSegmentTooltip.jsx',
      'src/components/TransitionInspectorPanel.jsx',
    ];

    const violations = sourceChecks.flatMap((file) => {
      const source = readFileSync(join(repoRoot, file), 'utf8');
      return source.includes('isFullTree') ? [`${file}: isFullTree`] : [];
    });

    expect(violations).toEqual([]);
  });

  it('uses validated backend MSA fields without extractor fallback aliases', () => {
    const lifecycleSource = readFileSync(
      join(repoRoot, 'src/state/phyloStore/slices/dataset/datasetLifecycle.slice.js'),
      'utf8'
    );
    const extractorPath = join(repoRoot, 'src/domain/msa/msaDataExtractor.js');
    const violations = [];

    if (lifecycleSource.includes('msaDataExtractor')) {
      violations.push('datasetLifecycle.slice.js: msaDataExtractor');
    }

    if (existsSync(extractorPath)) {
      const extractorSource = readFileSync(extractorPath, 'utf8');
      for (const pattern of ['window_size || 1000', 'step_size || 50']) {
        if (extractorSource.includes(pattern)) {
          violations.push(`msaDataExtractor.js: ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('does not leak legacy subtree API or state names into frontend state', () => {
    const sourceChecks = [
      'src/state/phyloStore/slices/dataset/treeDataset.slice.js',
      'src/state/phyloStore/slices/dataset/datasetLifecycle.slice.js',
      'src/state/phyloStore/internal/changeTracking.helpers.js',
      'src/treeVisualisation/comparison/ComparisonModeRenderer.js',
      'src/treeVisualisation/deckgl/data/transforms/SubtreeConnectorBuilder.js',
      'src/types/store.ts',
    ];

    const legacyStateName = ['subtree', 'Tracking'].join('');
    const legacyApiKey = ['subtree', 'tracking'].join('_');
    const violations = sourceChecks.flatMap((file) => {
      const source = readFileSync(join(repoRoot, file), 'utf8');
      return [
        source.includes(legacyStateName) ? `${file}: ${legacyStateName}` : null,
        source.includes(legacyApiKey) ? `${file}: ${legacyApiKey}` : null,
      ].filter(Boolean);
    });

    expect(violations).toEqual([]);
  });

  it('rejects the old backend temporal contract before store initialization', () => {
    expect(() => phyloData.validate(legacyBackendMovieData()))
      .toThrow(/tree_metadata is not part of the backend contract/);
  });

  it('keeps store-internal calls on the composed Zustand store contract', () => {
    const sourceChecks = [
      {
        file: 'src/state/phyloStore/store.js',
        patterns: ['updateColorManagerForCurrentIndex?.('],
      },
      {
        file: 'src/state/phyloStore/slices/dataset/datasetLifecycle.slice.js',
        patterns: [
          'resetControllers?.(',
          'resetPlayback?.(',
          'resetMsaData?.(',
          'resetColors?.(',
          'resetComparison?.(',
          'resetInterpolationCaches?.(',
          'setMsaData?.(',
          'initializeColors?.(',
        ],
      },
      {
        file: 'src/state/phyloStore/slices/appearance/treeLayout.slice.js',
        patterns: [
          'resetInterpolationCaches?.(',
          'state.treeControllers || []',
          'controller?.renderAllElements?.(',
        ],
      },
      {
        file: 'src/state/phyloStore/slices/interaction/treeClipboard.slice.js',
        patterns: ['treeList?.length'],
      },
      {
        file: 'src/state/phyloStore/slices/treeChange/subtreeSelection.slice.js',
        patterns: ['pivotEdgeTracking?.[index]'],
      },
      {
        file: 'src/state/phyloStore/internal/changeTracking.helpers.js',
        patterns: [
          'state?.playing',
          'state?.treeControllers',
          'Array.isArray(controllers)',
          'c?.renderAllElements?.(',
        ],
      },
      {
        file: 'src/state/phyloStore/slices/runtime/treeControllersRuntime.slice.js',
        patterns: [
          'Array.isArray(controllers)',
          'controller?.destroy',
          'c?.startAnimation?.(',
          'c?.resetInterpolationCaches?.(',
          'c?.stopAnimation?.(',
          "typeof controller?.destroy === 'function'",
        ],
      },
    ];

    const violations = sourceChecks.flatMap(({ file, patterns }) => {
      const source = readFileSync(join(repoRoot, file), 'utf8');
      return patterns
        .filter((pattern) => source.includes(pattern))
        .map((pattern) => `${file}: ${pattern}`);
    });

    expect(violations).toEqual([]);
  });

  it('keeps controller consumers on the composed controller-array contract', () => {
    const sourceChecks = [
      {
        file: 'src/hooks/useTreeController.js',
        patterns: [
          'Array.isArray(state.treeControllers)',
          'state.treeControllers?.[0]',
          'state.treeControllers?.length',
          'controller?.resetInterpolationCaches?.(',
          'controller?.initializeUniformScaling?.(',
        ],
      },
      {
        file: 'src/components/msa/MSAControls.jsx',
        patterns: ['Array.isArray(treeControllers)', 'controller?.calculateLayout'],
      },
      {
        file: 'src/services/media/canvasRecorder.js',
        patterns: ['Array.isArray(treeControllers)'],
      },
      {
        file: 'src/components/media/SaveImageButton.jsx',
        patterns: ['!treeControllers ||'],
      },
      {
        file: 'src/treeVisualisation/systems/TreeColorManager.js',
        patterns: ['store.treeControllers || []', 'controller?.renderAllElements'],
      },
      {
        file: 'src/components/appearance/Appearance.jsx',
        patterns: ['c?.setCameraMode?.(', 'controller?.renderAllElements?.('],
      },
      {
        file: 'src/components/appearance/color/ColoringPanel.jsx',
        patterns: ['treeControllers ?? []', 'controller?.renderAllElements?.('],
      },
      {
        file: 'src/components/appearance/controls/GeometryDimensions/GeometryDimensions.jsx',
        patterns: ['controller?.renderAllElements?.('],
      },
      {
        file: 'src/components/appearance/controls/VisualStyle/VisualStyle.jsx',
        patterns: ['controller?.renderAllElements?.('],
      },
      {
        file: 'src/components/deckgl/TreeCanvasControls.jsx',
        patterns: [
          'controller?.fitTreeToViewport?.(',
          'controller?.zoomOut?.(',
          'controller?.zoomIn?.(',
          'controller?.resetTreeView?.(',
        ],
      },
      {
        file: 'src/timeline/core/MovieTimelineManager.js',
        patterns: ['treeControllers?.[0]'],
      },
    ];

    const violations = sourceChecks.flatMap(({ file, patterns }) => {
      const source = readFileSync(join(repoRoot, file), 'utf8');
      return patterns
        .filter((pattern) => source.includes(pattern))
        .map((pattern) => `${file}: ${pattern}`);
    });

    expect(violations).toEqual([]);
  });
});
