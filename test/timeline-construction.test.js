const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Minimal DOM for timeline components that expect window/document
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.requestAnimationFrame = dom.window.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = dom.window.cancelAnimationFrame || ((id) => clearTimeout(id));

// Pull in ES modules via Babel register (mocha command already uses @babel/register)
const { TimelineDataProcessor } = require('../src/timeline/data/TimelineDataProcessor.js');
const { TimelineMathUtils } = require('../src/timeline/math/TimelineMathUtils.js');
const { useAppStore } = require('../src/state/phyloStore/store.js');
const {
  MOVIE_PLAYER_ARIA_LABELS,
} = require('../src/components/movie-player/MoviePlayerBar.contract.js');
const {
  TRANSPORT_CONTROL_GROUP_LABELS,
} = require('../src/components/movie-player/TransportControls.contract.js');

function loadMovieData() {
  const candidates = [
    path.join(__dirname, 'data', 'small_example', 'small_example.response.json'),
    path.join(__dirname, 'data', 'example.json')
  ];
  for (const p of candidates) {
    try {
      const raw = fs.readFileSync(p, 'utf8');
      const data = JSON.parse(raw);
      return { data, source: p };
    } catch { }
  }
  throw new Error('No input JSON found for timeline construction test.');
}

function setsToSortedArrays(sets) {
  return (sets || []).map((set) => Array.from(set).sort((a, b) => a - b));
}

function makeSyntheticTimingMovieData() {
  const trees = Array.from({ length: 4 }, (_, index) => ({
    name: `frame-${index}`,
    length: 0,
    split_indices: [index],
    children: []
  }));

  return {
    interpolated_trees: trees,
    tree_metadata: [
      {
        tree_pair_key: null,
        step_in_pair: null,
        source_tree_global_index: null,
        frame_type: 'input_tree',
        state_semantics: 'processed_input_tree',
        is_observed_input: true
      },
      {
        tree_pair_key: 'pair_7_8',
        step_in_pair: 1,
        source_tree_global_index: 0,
        frame_type: 'interpolation_frame',
        state_semantics: 'algorithmic_intermediate',
        is_observed_input: false
      },
      {
        tree_pair_key: 'pair_7_8',
        step_in_pair: 2,
        source_tree_global_index: 0,
        frame_type: 'interpolation_frame',
        state_semantics: 'algorithmic_intermediate',
        is_observed_input: false
      },
      {
        tree_pair_key: null,
        step_in_pair: null,
        source_tree_global_index: null,
        frame_type: 'input_tree',
        state_semantics: 'processed_input_tree',
        is_observed_input: true
      }
    ],
    split_change_timeline: [
      { type: 'original', tree_index: 7, global_index: 0, name: 'Input Tree 8' },
      {
        type: 'split_event',
        pair_key: 'pair_7_8',
        split: [1, 2],
        step_range_local: [0, 1],
        step_range_global: [1, 2]
      },
      { type: 'original', tree_index: 8, global_index: 3, name: 'Input Tree 9' }
    ],
    tree_pair_solutions: {
      pair_7_8: {
        spr_move_events: [
          {
            pivot_edge: [1, 2],
            driver_subtree: [1],
            highlight_group: [[1]],
            step_range: [0, 0],
            collapse_path: [],
            expand_path: [],
            collapse_hops: 0,
            expand_hops: 0,
            total_hops: 0,
            collapse_branch_length: 0,
            expand_branch_length: 0,
            total_branch_length: 0
          },
          {
            pivot_edge: [1, 2],
            driver_subtree: [2],
            highlight_group: [[2]],
            step_range: [0, 1],
            collapse_path: [],
            expand_path: [],
            collapse_hops: 0,
            expand_hops: 0,
            total_hops: 0,
            collapse_branch_length: 0,
            expand_branch_length: 0,
            total_branch_length: 0
          },
          {
            pivot_edge: [99],
            driver_subtree: [99],
            highlight_group: [[99]],
            step_range: [0, 1],
            collapse_path: [],
            expand_path: [],
            collapse_hops: 0,
            expand_hops: 0,
            total_hops: 0,
            collapse_branch_length: 0,
            expand_branch_length: 0,
            total_branch_length: 0
          }
        ],
        affected_subtrees_by_split: {
          '[1, 2]': [[[1], [2]]]
        },
        attachment_edges_by_split: {}
      }
    }
  };
}

describe('Timeline construction from backend result', () => {
  it('does not keep unused timeline constants or obsolete input-tree label compatibility', () => {
    const constantsSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'timeline', 'constants.js'), 'utf8');
    const removedConstantNames = [
      'MIN_ZOOM_MS',
      'ZOOM_PERCENTAGE_UI',
      'TIMELINE_HEIGHT',
      'MAX_ZOOM_FACTOR',
      'SCRUB_END_TIMEOUT_MS',
      'DEFAULT_TREE_INDEX',
      'MAX_TOOLTIP_LEAVES',
      'DURATION_COMPLEXITY_WEIGHT',
      'EDGE_COMPLEXITY_WEIGHT',
      'DEFAULT_COMPLEXITY',
      'DEFAULT_MAX_EDGES',
      'FALLBACK_MAX_EDGES',
    ];

    const remainingConstants = removedConstantNames.filter((name) => constantsSource.includes(name));
    expect(remainingConstants).to.deep.equal([]);

    const labelCompatibilityFiles = [
      path.join(__dirname, '..', 'src', 'components', 'timeline', 'TimelineSegmentTooltip.jsx'),
      path.join(__dirname, '..', 'src', 'components', 'TransitionInspectorPanel.jsx'),
    ];

    const obsoleteInputTreeLabelPattern = new RegExp(`\\b${['anchor', 'tree'].join('\\s+')}\\b`, 'i');
    const remainingObsoleteInputTreeLabels = labelCompatibilityFiles.filter((filePath) => (
      obsoleteInputTreeLabelPattern.test(fs.readFileSync(filePath, 'utf8'))
    ));
    expect(remainingObsoleteInputTreeLabels).to.deep.equal([]);
  });

  it('keeps the rendered timeline target at an accessible height', () => {
    const cssSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'css', 'movie-timeline', 'container.css'), 'utf8');
    const defaultHeightMatch = cssSource.match(/--timeline-height,\s*(\d+)px/);

    expect(defaultHeightMatch).to.not.equal(null);
    expect(Number(defaultHeightMatch[1])).to.be.at.least(44);
  });

  it('allows timeline legend items to wrap on narrow viewports', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'movie-player', 'MoviePlayerBar.jsx'), 'utf8');
    const legendClassMatch = source.match(/function TimelineLegend[\s\S]*?className="([^"]*)"/);

    expect(legendClassMatch).to.not.equal(null);
    expect(legendClassMatch[1]).to.include('flex-wrap');
    expect(MOVIE_PLAYER_ARIA_LABELS.timelineLegend).to.equal('Timeline legend');
  });

  it('keeps player-bar controls separated into clear workflow lanes', () => {
    const chartSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'movie-player', 'MovieChartSection', 'MovieChartSection.jsx'), 'utf8');

    expect(MOVIE_PLAYER_ARIA_LABELS.primaryControls).to.equal('Primary playback controls');
    expect(MOVIE_PLAYER_ARIA_LABELS.timelineNavigation).to.equal('Timeline navigation controls');
    expect(MOVIE_PLAYER_ARIA_LABELS.playbackSettings).to.equal('Playback settings');
    expect(MOVIE_PLAYER_ARIA_LABELS.timelineTrack).to.equal('Timeline track');
    expect(TRANSPORT_CONTROL_GROUP_LABELS.playback).to.equal('Movie playback controls');
    expect(TRANSPORT_CONTROL_GROUP_LABELS.comparison).to.equal('Comparison view controls');
    expect(chartSource).to.include('aria-label="Chart controls"');
  });

  it('creates segments and consistent timeline data', () => {
    const { data, source } = loadMovieData();

    // Basic structure sanity
    expect(data).to.be.an('object');
    expect(data).to.have.property('interpolated_trees');
    expect(data).to.have.property('tree_metadata');

    const segments = TimelineDataProcessor.createSegments(data);
    expect(segments).to.be.an('array');
    expect(segments.length).to.be.greaterThan(0);

    const timeline = TimelineDataProcessor.createTimelineData(segments);
    expect(timeline).to.have.property('segmentDurations');
    expect(timeline).to.have.property('cumulativeDurations');
    expect(timeline).to.have.property('totalDuration');

    // Durations consistency
    const sum = timeline.segmentDurations.reduce((a, b) => a + b, 0);
    expect(sum).to.equal(timeline.totalDuration);
    const lastCum = timeline.cumulativeDurations[timeline.cumulativeDurations.length - 1] || 0;
    expect(lastCum).to.equal(timeline.totalDuration);

    // If there are interpolation segments, ensure they contribute time
    const anyInterp = segments.some(s => s.hasInterpolation && !s.isFullTree);
    if (anyInterp) {
      const nonZero = timeline.segmentDurations.some(d => d > 0);
      expect(nonZero).to.equal(true);
    }

    // Validate mapping from a known tree index to a segment
    const firstSeg = segments[0];
    const firstTreeIndex = firstSeg?.interpolationData?.[0]?.originalIndex;
    if (Number.isInteger(firstTreeIndex)) {
      const { segmentIndex, timeInSegment, segment } = TimelineMathUtils.findSegmentForTreeIndex(segments, firstTreeIndex);
      expect(segmentIndex).to.be.at.least(0);
      expect(segmentIndex).to.be.below(segments.length);
      expect(segment).to.be.ok;
      // timeInSegment should be within the segment duration bounds
      const segDur = timeline.segmentDurations[segmentIndex] || 0;
      expect(timeInSegment).to.be.at.least(0);
      expect(timeInSegment).to.be.at.most(segDur);
    }

    // Additional correctness check: first interpolation segment keeps the backend range,
    // while including the predecessor frame needed to animate into the first generated state.
    const firstEvent = (data.split_change_timeline || []).find(e => e && e.type === 'split_event');
    const firstInterpSeg = segments.find(s => s && s.hasInterpolation && !s.isFullTree);
    if (firstEvent && firstInterpSeg && Array.isArray(firstInterpSeg.interpolationData)) {
      const idxs = firstInterpSeg.interpolationData.map(d => d.originalIndex);
      const minIdx = Math.min(...idxs);
      const maxIdx = Math.max(...idxs);
      const [gStart, gEnd] = firstEvent.step_range_global || [];
      const expectedContextStart = Math.max(0, gStart - 1);

      expect(minIdx).to.equal(expectedContextStart);
      expect(maxIdx).to.equal(gEnd);

      expect(firstInterpSeg).to.include({
        globalStart: gStart,
        globalEnd: gEnd,
        contextStart: expectedContextStart,
        localStepStart: firstEvent.step_range_local[0],
        localStepEnd: firstEvent.step_range_local[1]
      });
      expect(firstInterpSeg.generatedFrameCount).to.equal(gEnd - gStart + 1);
      expect(firstInterpSeg.animationStepCount).to.equal(firstInterpSeg.interpolationData.length - 1);
    }

    const redundantSegmentFields = [
      'segmentType',
      'transitionKind',
      'pivotEdgeTracker',
      'treeInfo',
      'splitEvent',
      'metadata',
      'tree',
      'phase',
      'stepInPair'
    ];
    for (const segment of segments) {
      for (const field of redundantSegmentFields) {
        expect(segment).to.not.have.property(field);
      }
    }

    // Input trees: ensure number and indices match original events from backend
    const originals = (data.split_change_timeline || []).filter(e => e && e.type === 'original');
    const originalIndices = new Set(originals.map(e => e.global_index));
    const inputTreeSegments = segments.filter(s => s && s.isFullTree);
    const inputTreeIndices = new Set(inputTreeSegments.map(s => s.interpolationData?.[0]?.originalIndex).filter(Number.isInteger));
    expect(inputTreeIndices.size).to.equal(originalIndices.size);
    for (const idx of originalIndices) {
      expect(inputTreeIndices.has(idx)).to.equal(true);
    }

    // Interpolation segments include split events plus topology-preserving branch-length updates.
    const splitEvents = (data.split_change_timeline || []).filter(e => e && e.type === 'split_event');
    const interpSegments = segments.filter(s => s && s.hasInterpolation && !s.isFullTree);
    expect(interpSegments.length).to.be.at.least(splitEvents.length);

    const branchOnlySegment = interpSegments.find(segment => (
      segment.treePairKey === 'pair_1_2' &&
      segment.generatedFrameCount === 0 &&
      segment.globalStart === 36 &&
      segment.globalEnd === 37
    ));
    expect(branchOnlySegment).to.be.ok;
    expect(branchOnlySegment.animationStepCount).to.equal(1);
    expect(branchOnlySegment.interpolationData.map(d => d.originalIndex)).to.deep.equal([36, 37]);

    // Report which dataset was used for clarity when reading logs
    console.log(`[timeline-construction.test] Used: ${source}`);
  });

  it('rejects movie data without split-change timeline entries', () => {
    const tree = { name: '', length: 0, split_indices: [0], children: [] };
    const movieData = {
      interpolated_trees: [tree, tree, tree],
      tree_metadata: [
        { tree_pair_key: null, step_in_pair: null, source_tree_global_index: null },
        { tree_pair_key: null, step_in_pair: null, source_tree_global_index: null },
        { tree_pair_key: null, step_in_pair: null, source_tree_global_index: null }
      ]
    };

    expect(() => TimelineDataProcessor.createSegments(movieData)).to.throw(/split_change_timeline is required/);
  });

  it('canonicalizes transition splits before affected-subtree lookup', () => {
    const tree = { name: '', length: 0, split_indices: [0], children: [] };
    const movieData = {
      interpolated_trees: [null, tree],
      tree_metadata: [null, { tree_pair_key: 'pair_0_1' }],
      split_change_timeline: [{
        type: 'split_event',
        split: [11, 10],
        pair_key: 'pair_0_1',
        step_range_global: [1, 1],
        step_range_local: [0, 0]
      }],
      tree_pair_solutions: {
        pair_0_1: {
          affected_subtrees_by_split: {
            '[10, 11]': [[[13], [12]]]
          }
        }
      }
    };

    const segments = TimelineDataProcessor.createSegments(movieData);

    expect(segments).to.have.lengthOf(1);
    expect(segments[0].affectedSubtrees).to.deep.equal([[[13], [12]]]);
    expect(segments[0].subtreeMoveCount).to.equal(2);
  });

  it('adds input-tree hold timing for observed input tree delimiters without duplicating trees', () => {
    const movieData = makeSyntheticTimingMovieData();
    const segments = TimelineDataProcessor.createSegments(movieData);
    const inputTree = segments.find(segment => segment.isFullTree && segment.globalIndex === 0);

    expect(inputTree).to.be.ok;
    expect(inputTree.interpolationData.map(entry => entry.originalIndex)).to.deep.equal([0]);
    expect(inputTree.timing).to.deep.equal([{
      type: 'hold',
      holdIndex: 0,
      holdKind: 'input_tree',
      durationMs: 1500
    }]);
  });

  it('builds semantic mover and pivot timing for pair_7_8 from backend metadata', () => {
    const movieData = makeSyntheticTimingMovieData();
    const moveEvents = movieData.tree_pair_solutions.pair_7_8.spr_move_events;
    const segments = TimelineDataProcessor.createSegments(movieData);
    const transition = segments.find(segment => segment.treePairKey === 'pair_7_8' && !segment.isFullTree);

    for (const event of moveEvents) {
      expect(event).to.include.keys(['pivot_edge', 'driver_subtree', 'highlight_group', 'step_range']);
      expect(event).to.not.have.property('moving_taxa');
    }
    expect(transition).to.be.ok;
    expect(transition.interpolationData.map(entry => entry.originalIndex)).to.deep.equal([0, 1, 2]);
    expect(transition.timing).to.deep.equal([
      { type: 'motion', fromIndex: 0, toIndex: 1, durationMs: 1000 },
      { type: 'hold', holdIndex: 1, holdKind: 'mover', durationMs: 200 },
      { type: 'motion', fromIndex: 1, toIndex: 2, durationMs: 1000 },
      { type: 'hold', holdIndex: 2, holdKind: 'pivot', durationMs: 900 }
    ]);
  });
});

describe('Active change edge mapping (small_example)', () => {
  let movieData;

  before(() => {
    const { data } = loadMovieData();
    movieData = data;
  });

  beforeEach(() => {
    useAppStore.getState().initialize(movieData);
    useAppStore.setState({
      pivotEdgesEnabled: true,
      markedSubtreesEnabled: true
    });
  });

  afterEach(() => {
    useAppStore.getState().reset();
  });

  it('leaves input-tree endpoint frames unmarked', () => {
    const markedSubtrees = useAppStore.getState().getMarkedSubtreeData();
    expect(markedSubtrees).to.deep.equal([]);
  });

  it('provides marked subtrees for first interpolated tree', () => {
    const store = useAppStore.getState();
    store.goToPosition(1); // First interpolation step between tree 0 and 1
    const markedSubtrees = useAppStore.getState().getMarkedSubtreeData();
    expect(markedSubtrees).to.deep.equal([[13]]);
  });

  it('tracks later interpolation affected subtrees', () => {
    const store = useAppStore.getState();
    store.goToPosition(6); // Frame where index 12 is moving
    const markedSubtrees = useAppStore.getState().getMarkedSubtreeData();
    expect(markedSubtrees).to.deep.equal([[12]]);
  });

  it('respects per-step affected-subtree sequences when multiple snapshots exist', () => {
    const storeAPI = useAppStore;
    storeAPI.setState({ markedSubtreeScope: 'all' }); // Force use of pairSolutions
    const pairKey = 'pair_0_1';
    const baseState = storeAPI.getState();
    const basePairSolutions = baseState.pairSolutions;
    const pairEntry = basePairSolutions[pairKey];
    const pivotSplit = movieData.split_change_timeline
      .find(entry => entry && entry.type === 'split_event' && entry.pair_key === pairKey)
      .split;
    const pivotKey = `[${pivotSplit.join(', ')}]`;

    const modifiedPairEntry = {
      ...pairEntry,
      affected_subtrees_by_split: {
        ...pairEntry.affected_subtrees_by_split,
        [pivotKey]: [
          [[13]],
          [[99]]
        ]
      }
    };

    const modifiedPairSolutions = {
      ...basePairSolutions,
      [pairKey]: modifiedPairEntry
    };

    storeAPI.setState({
      pairSolutions: modifiedPairSolutions
    });

    const store = storeAPI.getState();
    store.goToPosition(1); // step_in_pair = 1 (zero-based 0)
    let markedSubtrees = storeAPI.getState().getMarkedSubtreeData();
    expect(Array.isArray(markedSubtrees)).to.equal(true);
    expect(markedSubtrees[0]).to.deep.equal([13]);

    store.goToPosition(2); // step_in_pair = 2 (zero-based 1)
    markedSubtrees = storeAPI.getState().getMarkedSubtreeData();
    const last = markedSubtrees[markedSubtrees.length - 1];
    expect(last).to.deep.equal([99]);
  });

  it('syncs all-mode marked subtrees and active edge context into the color manager on navigation', () => {
    const storeAPI = useAppStore;
    storeAPI.getState().setMarkedSubtreeScope('all');

    storeAPI.getState().goToPosition(1);

    const state = storeAPI.getState();
    const colorManager = state.getColorManager();

    expect(state.currentTreeIndex).to.equal(1);
    expect(setsToSortedArrays(colorManager.markedSubtreeSets)).to.deep.equal([[13], [12]]);
    expect(Array.from(colorManager.currentPivotEdges).sort((a, b) => a - b)).to.deep.equal([10, 11, 12, 13]);
    expect(setsToSortedArrays(colorManager.sourceEdgeLeaves)).to.deep.equal([[10, 11, 12]]);
    expect(setsToSortedArrays(colorManager.destinationEdgeLeaves)).to.deep.equal([[10, 11, 12]]);
    expect(setsToSortedArrays(colorManager.currentMovingSubtrees)).to.deep.equal([[13]]);
  });

  it('syncs the color manager from an explicit tree index without changing navigation state', () => {
    const storeAPI = useAppStore;
    storeAPI.getState().setMarkedSubtreeScope('all');
    storeAPI.getState().goToPosition(1);

    storeAPI.getState().updateColorManagerForIndex(11);

    const state = storeAPI.getState();
    const colorManager = state.getColorManager();

    expect(state.currentTreeIndex).to.equal(1);
    expect(setsToSortedArrays(colorManager.markedSubtreeSets)).to.deep.equal([[4], [6]]);
    expect(Array.from(colorManager.currentPivotEdges).sort((a, b) => a - b)).to.deep.equal([2, 3, 4, 5, 6]);
    expect(setsToSortedArrays(colorManager.sourceEdgeLeaves)).to.deep.equal([[2, 3, 5, 6]]);
    expect(setsToSortedArrays(colorManager.destinationEdgeLeaves)).to.deep.equal([[2, 3, 5, 6]]);
    expect(setsToSortedArrays(colorManager.currentMovingSubtrees)).to.deep.equal([[4]]);
  });

  it('renders color-manager updates once after the full explicit tree-index context is coherent', () => {
    const storeAPI = useAppStore;
    storeAPI.getState().setMarkedSubtreeScope('all');
    storeAPI.setState({ upcomingChangesEnabled: true });
    storeAPI.getState().goToPosition(1);

    let renderCount = 0;
    storeAPI.getState().setTreeControllers([{
      destroy: () => {},
      renderAllElements: () => {
        renderCount += 1;
        const colorManager = storeAPI.getState().getColorManager();
        expect(setsToSortedArrays(colorManager.markedSubtreeSets)).to.deep.equal([[4], [6]]);
        expect(Array.from(colorManager.currentPivotEdges).sort((a, b) => a - b)).to.deep.equal([2, 3, 4, 5, 6]);
        expect(setsToSortedArrays(colorManager.sourceEdgeLeaves)).to.deep.equal([[2, 3, 5, 6]]);
        expect(setsToSortedArrays(colorManager.destinationEdgeLeaves)).to.deep.equal([[2, 3, 5, 6]]);
        expect(setsToSortedArrays(colorManager.currentMovingSubtrees)).to.deep.equal([[4]]);
        expect(setsToSortedArrays(colorManager.completedChangeEdges)).to.deep.equal([[10, 11, 12, 13]]);
        expect(setsToSortedArrays(colorManager.upcomingChangeEdges)).to.deep.equal([[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]]);
      }
    }]);

    storeAPI.getState().updateColorManagerForIndex(11);

    expect(renderCount).to.equal(1);
  });

  it('calculates upcoming and completed previews from the explicit sync index', () => {
    const storeAPI = useAppStore;
    storeAPI.setState({ upcomingChangesEnabled: true });
    storeAPI.getState().goToPosition(1);

    storeAPI.getState().updateColorManagerForIndex(11);

    const state = storeAPI.getState();
    const colorManager = state.getColorManager();

    expect(state.currentTreeIndex).to.equal(1);
    expect(state.completedChangeEdges).to.deep.equal([[10, 11, 12, 13]]);
    expect(state.upcomingChangeEdges).to.deep.equal([[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]]);
    expect(setsToSortedArrays(colorManager.completedChangeEdges)).to.deep.equal([[10, 11, 12, 13]]);
    expect(setsToSortedArrays(colorManager.upcomingChangeEdges)).to.deep.equal([[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]]);
  });
});
