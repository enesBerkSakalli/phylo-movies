import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { phyloData } from '../../src/services/data/dataService.js';
import * as phyloStoreModule from '../../src/state/phyloStore/store.js';

const { useAppStore } = phyloStoreModule;
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

const tree0 = { name: '', length: 0, split_indices: [0, 1], children: [] };
const tree1 = { name: '', length: 0, split_indices: [0, 1], children: [] };
const tree2 = { name: '', length: 0, split_indices: [0, 1], children: [] };

function makeBackendMovieData() {
  return {
    interpolated_trees: [tree0, tree1, tree2],
    tree_metadata: [
      { tree_pair_key: null, step_in_pair: null, source_tree_global_index: null },
      { tree_pair_key: 'pair_0_2', step_in_pair: 1, source_tree_global_index: 0 },
      { tree_pair_key: null, step_in_pair: null, source_tree_global_index: null },
    ],
    distances: {
      robinson_foulds: [1],
      weighted_robinson_foulds: [1],
    },
    tree_pair_solutions: {
      pair_0_2: {
        affected_subtrees_by_split: {},
        attachment_edges_by_split: {},
      },
    },
    pair_interpolation_ranges: [[0, 2]],
    split_change_timeline: [
      { type: 'original', global_index: 0, tree_index: 0, name: 'Anchor tree 1' },
      {
        type: 'split_event',
        pair_key: 'pair_0_2',
        split: [0],
        step_range_global: [1, 1],
        step_range_local: [1, 1],
      },
      { type: 'original', global_index: 2, tree_index: 1, name: 'Anchor tree 2' },
    ],
    pivot_edge_tracking: [null, [0], null],
    subtree_tracking: [null, [[1]], null],
    sorted_leaves: ['taxon-a', 'taxon-b'],
    msa: {
      sequences: null,
      window_size: 1,
      step_size: 1,
    },
    file_name: 'normalization-test.json',
    pipeline_info: { model_used: 'iqtree' },
    warnings: ['example warning'],
    tree_count: 3,
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

  it('stores derived tree lookup data once during dataset initialization', () => {
    const movieData = makeMovieData();

    useAppStore.getState().initialize(movieData);

    const state = useAppStore.getState();
    expect(state.treeList).toBe(movieData.interpolated_trees);
    expect(state.treeMetadata).toBe(movieData.tree_metadata);
    expect(state.leafNamesByIndex).toEqual(['taxon-a', 'taxon-b']);
    expect(Object.prototype.hasOwnProperty.call(state, 'movieData')).toBe(false);
    expect(state.msaSequences).toBe(movieData.msa.sequences);
    expect(state.subtreeTracking).toEqual([null, [[1]], null]);
    expect(state.splitChangeTimeline).toBe(movieData.split_change_timeline);
    expect(state.fullTreeIndices).toEqual([0, 2]);
    expect(state.pairInterpolationRanges).toEqual([[0, 2]]);
    expect(state.treeIndexByPair).toEqual({ pair_0_2: [1] });
  });

  it('stores scale metadata without the legacy scale duplicate', () => {
    useAppStore.getState().initialize(makeMovieData());

    const legacyScaleKey = ['scale', 'Values'].join('');
    const state = useAppStore.getState();
    expect(state.scaleList).toEqual([
      { index: 0, value: 0 },
      { index: 2, value: 0 },
    ]);
    expect(state.maxScale).toBe(0);
    expect(Object.prototype.hasOwnProperty.call(state, legacyScaleKey)).toBe(false);
  });

  it('stores marked subtree scope without the legacy mode contract', () => {
    const state = useAppStore.getState();

    expect(state.markedSubtreeScope).toBe('current');
    expect(typeof state.setMarkedSubtreeScope).toBe('function');
    expect(Object.prototype.hasOwnProperty.call(state, 'markedSubtreeMode')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state, 'setMarkedSubtreeMode')).toBe(false);
    expect(typeof phyloStoreModule.selectMarkedSubtreeScope).toBe('function');
    expect(typeof phyloStoreModule.selectSetMarkedSubtreeScope).toBe('function');
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
      pairKey: null,
      isOriginal: true,
      isFullTree: true,
    });
    expect(interpolatedContext).toMatchObject({
      treeIndex: 1,
      tree: tree1,
      pairKey: 'pair_0_2',
      isOriginal: false,
      isFullTree: false,
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

  it('opens the node context menu without storing legacy tree data', () => {
    const legacyTreeDataKey = ['contextMenu', 'TreeData'].join('');
    const node = {
      name: 'node-a',
      length: 0,
      split_indices: [0, 1],
      depth: 0,
      height: 0,
      children: [],
    };
    const treeData = { id: 'legacy-tree-payload' };

    useAppStore.getState().showNodeContextMenu(node, treeData, 12, 34);

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
      ['selectCurrentTree.js', 'typeof currentTreeIndex'],
      ['selectFileName.js', 'typeof state.fileName'],
      ['selectLabelsVisible.js', '!== false'],
      ['selectMovieTimelineManager.js', '?? null'],
      ['selectMsaWindow.js', '?? null'],
      ['selectPairSolutions.js', '?? {}'],
      ['selectPlayhead.js', '??'],
      ['selectTaxaColoringWindow.js', '?? null'],
      ['selectTaxaGrouping.js', '?? null'],
      ['selectTransitionResolver.js', '?? null'],
    ];

    const violations = selectorFallbackChecks.flatMap(([fileName, legacyPattern]) => {
      const source = readFileSync(join(repoRoot, 'src/state/phyloStore/selectors', fileName), 'utf8');
      return source.includes(legacyPattern) ? [`${fileName}: ${legacyPattern}`] : [];
    });

    expect(violations).toEqual([]);
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
        file: 'src/components/deckgl/TreeViewportControls.jsx',
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
