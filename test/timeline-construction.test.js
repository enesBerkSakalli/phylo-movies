const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.requestAnimationFrame = dom.window.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = dom.window.cancelAnimationFrame || ((id) => clearTimeout(id));

const { TimelineDataProcessor } = require('../src/timeline/data/TimelineDataProcessor.js');
const { TimelineDataset } = require('../src/timeline/data/TimelineDataset.js');
const { useAppStore } = require('../src/state/phyloStore/store.js');
const {
  MOVIE_PLAYER_ARIA_LABELS,
} = require('../src/components/movie-player/MoviePlayerBar.contract.js');
const {
  TRANSPORT_CONTROL_GROUP_LABELS,
} = require('../src/components/movie-player/TransportControls.contract.js');

function loadMovieData() {
  const source = path.join(__dirname, 'data', 'small_example', 'small_example.response.json');
  return { data: JSON.parse(fs.readFileSync(source, 'utf8')), source };
}

function setsToSortedArrays(sets) {
  return sets.map((set) => Array.from(set).sort((a, b) => a - b));
}

function sortedArrays(arrays) {
  return arrays.map((array) => Array.from(array).sort((a, b) => a - b));
}

function partitionKey(indices) {
  return `[${indices.join(', ')}]`;
}

function collectMotionEdges(segments) {
  const edges = new Set();
  segments.forEach((segment) => {
    segment.timing
      .filter((interval) => interval.type === 'motion')
      .forEach((interval) => edges.add(`${interval.fromIndex}->${interval.toIndex}`));
  });
  return edges;
}

function collectNoOpHoldTargets(segments) {
  const targets = new Set();
  segments.forEach((segment) => {
    segment.timing
      .filter((interval) => interval.type === 'hold' && interval.holdKind === 'no_op_pair')
      .forEach((interval) => targets.add(`${segment.pairId}:${interval.holdIndex}`));
  });
  return targets;
}

function findPair(movieData, pairId) {
  return movieData.pairs.find((pair) => pair.pair_id === pairId);
}

function expectedChangeContext(movieData, treeIndex) {
  const frame = movieData.frames[treeIndex];
  const pair = findPair(movieData, frame.pair_id);
  const event = movieData.temporal_events.find((entry) => (
    entry.event_type === 'spr_move' &&
    entry.pair_id === frame.pair_id &&
    frame.local_step_index >= entry.local_step_range[0] &&
    frame.local_step_index <= entry.local_step_range[1]
  ));
  const movingSubtree = event.driver_subtree;
  const pivotEdge = event.pivot_edge;
  const movingKey = partitionKey(movingSubtree);
  const pivotKey = partitionKey(pivotEdge);
  const attachment = pair.solution.attachment_edges_by_split[pivotKey][movingKey];
  const movingLeaves = new Set(movingSubtree);

  return {
    highlightedSubtrees: sortedArrays(pair.solution.affected_subtrees_by_split[pivotKey][0]),
    pivotEdge: [...pivotEdge].sort((a, b) => a - b),
    sourceEdgeLeaves: [attachment.source.filter((leaf) => !movingLeaves.has(leaf)).sort((a, b) => a - b)],
    destinationEdgeLeaves: [attachment.destination.filter((leaf) => !movingLeaves.has(leaf)).sort((a, b) => a - b)],
    movingSubtrees: [movingSubtree],
  };
}

function makeTree(index) {
  return {
    name: `frame-${index}`,
    length: 0,
    split_indices: [index],
    children: [],
  };
}

function makeTwoInputPairMovieData({ weightedRfDistance }) {
  return {
    interpolated_trees: [makeTree(0), makeTree(1)],
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
    pairs: [{
      pair_id: 'pair_0_1',
      pair_ordinal: 0,
      source_input_tree_index: 0,
      target_input_tree_index: 1,
      source_frame_index: 0,
      target_frame_index: 1,
      generated_frame_range: null,
      solution: {
        affected_subtrees_by_split: {},
        attachment_edges_by_split: {},
      },
    }],
    temporal_events: [],
    pivot_edge_tracking: [null, null],
    subtree_highlight_tracking: [null, null],
    pair_metrics: {
      rows: [{
        pair_id: 'pair_0_1',
        pair_ordinal: 0,
        robinson_foulds: 0,
        weighted_robinson_foulds: weightedRfDistance,
      }],
      semantics: {},
    },
    msa: { sequences: null, window_size: 1, step_size: 1 },
    file_name: 'two-input-pair.json',
  };
}

function makeSyntheticTimingMovieData() {
  const trees = Array.from({ length: 4 }, (_, index) => makeTree(index));

  return {
    interpolated_trees: trees,
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
        pair_id: 'opaque-pair',
        pair_ordinal: 0,
        local_step_index: 0,
        source_frame_index: 0,
        target_frame_index: 3,
      },
      {
        frame_index: 2,
        frame_type: 'interpolation_frame',
        state_semantics: 'algorithmic_intermediate',
        is_observed_input: false,
        input_tree_index: null,
        pair_id: 'opaque-pair',
        pair_ordinal: 0,
        local_step_index: 1,
        source_frame_index: 0,
        target_frame_index: 3,
      },
      {
        frame_index: 3,
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
        pair_id: 'opaque-pair',
        pair_ordinal: 0,
        source_input_tree_index: 7,
        target_input_tree_index: 8,
        source_frame_index: 0,
        target_frame_index: 3,
        generated_frame_range: [1, 2],
        solution: {
          affected_subtrees_by_split: {
            '[1, 2]': [[[1], [2]]],
          },
          attachment_edges_by_split: {
            '[1, 2]': {
              '[1]': { source: [1], destination: [1] },
              '[2]': { source: [2], destination: [2] },
            },
          },
        },
      },
    ],
    temporal_events: [
      {
        event_id: 'opaque-pair:split:0',
        event_type: 'split_change',
        pair_id: 'opaque-pair',
        pair_ordinal: 0,
        local_step_range: [0, 1],
        frame_range: [1, 2],
        split: [1, 2],
      },
      {
        event_id: 'opaque-pair:spr:0',
        event_type: 'spr_move',
        pair_id: 'opaque-pair',
        pair_ordinal: 0,
        local_step_range: [0, 0],
        frame_range: [1, 1],
        pivot_edge: [1, 2],
        driver_subtree: [1],
        highlight_group: [[1]],
        collapse_path: [],
        expand_path: [],
        collapse_hops: 0,
        expand_hops: 0,
        total_hops: 0,
        collapse_branch_length: 0,
        expand_branch_length: 0,
        total_branch_length: 0,
      },
      {
        event_id: 'opaque-pair:spr:1',
        event_type: 'spr_move',
        pair_id: 'opaque-pair',
        pair_ordinal: 0,
        local_step_range: [0, 1],
        frame_range: [1, 2],
        pivot_edge: [1, 2],
        driver_subtree: [2],
        highlight_group: [[2]],
        collapse_path: [],
        expand_path: [],
        collapse_hops: 0,
        expand_hops: 0,
        total_hops: 0,
        collapse_branch_length: 0,
        expand_branch_length: 0,
        total_branch_length: 0,
      },
      {
        event_id: 'opaque-pair:spr:ignored',
        event_type: 'spr_move',
        pair_id: 'opaque-pair',
        pair_ordinal: 0,
        local_step_range: [0, 1],
        frame_range: [1, 2],
        pivot_edge: [99],
        driver_subtree: [99],
        highlight_group: [[99]],
        collapse_path: [],
        expand_path: [],
        collapse_hops: 0,
        expand_hops: 0,
        total_hops: 0,
        collapse_branch_length: 0,
        expand_branch_length: 0,
        total_branch_length: 0,
      },
    ],
    pivot_edge_tracking: [null, [1, 2], [1, 2], null],
    subtree_highlight_tracking: [null, [[1]], [[2]], null],
    pair_metrics: {
      rows: [{
        pair_id: 'opaque-pair',
        pair_ordinal: 0,
        robinson_foulds: 1,
        weighted_robinson_foulds: 1,
      }],
      semantics: {},
    },
    msa: { sequences: null, window_size: 1, step_size: 1 },
    file_name: 'synthetic.json',
  };
}

describe('Timeline construction from normalized backend result', () => {
  it('does not keep unused timeline constants or obsolete input-tree labels', () => {
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

    const inputTreeLabelFiles = [
      path.join(__dirname, '..', 'src', 'components', 'timeline', 'TimelineSegmentTooltip.jsx'),
      path.join(__dirname, '..', 'src', 'components', 'TransitionInspectorPanel.jsx'),
    ];

    const obsoleteInputTreeLabelPattern = new RegExp(`\\b${['anchor', 'tree'].join('\\s+')}\\b`, 'i');
    const remainingObsoleteInputTreeLabels = inputTreeLabelFiles.filter((filePath) => (
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

  it('creates segments and timeline data from frames, pairs, and temporal events', () => {
    const { data, source } = loadMovieData();

    expect(data).to.have.property('frames');
    expect(data).to.have.property('pairs');
    expect(data).to.have.property('temporal_events');
    expect(data).to.not.have.property('tree_metadata');
    expect(data).to.not.have.property('tree_pair_solutions');
    expect(data).to.not.have.property('split_change_timeline');

    const segments = TimelineDataProcessor.createSegments(data);
    expect(segments.length).to.be.greaterThan(0);
    const frameIndices = new Set(data.frames.map((frame) => frame.frame_index));

    const timeline = TimelineDataProcessor.createTimelineData(segments);
    const sum = timeline.segmentDurations.reduce((a, b) => a + b, 0);
    expect(sum).to.equal(timeline.totalDuration);
    expect(timeline.cumulativeDurations.at(-1)).to.equal(timeline.totalDuration);

    const firstEvent = data.temporal_events.find((event) => event.event_type === 'split_change');
    const firstInterpSeg = segments.find((segment) => segment.hasInterpolation && !segment.isInputTreeSegment);
    const idxs = firstInterpSeg.interpolationData.map((entry) => entry.originalIndex);
    const expectedContextStart = Math.max(data.pairs[0].source_frame_index, firstEvent.frame_range[0] - 1);

    expect(Math.min(...idxs)).to.equal(expectedContextStart);
    expect(Math.max(...idxs)).to.equal(firstEvent.frame_range[1]);
    expect(firstInterpSeg).to.include({
      pairId: firstEvent.pair_id,
      pairOrdinal: firstEvent.pair_ordinal,
      globalStart: firstEvent.frame_range[0],
      globalEnd: firstEvent.frame_range[1],
      contextStart: expectedContextStart,
      localStepStart: firstEvent.local_step_range[0],
      localStepEnd: firstEvent.local_step_range[1],
    });

    const inputFrames = data.frames.filter((frame) => frame.frame_type === 'input_tree');
    const inputTreeSegments = segments.filter((segment) => segment.isInputTreeSegment);
    expect(inputTreeSegments.map((segment) => segment.globalIndex)).to.deep.equal(
      inputFrames.map((frame) => frame.frame_index)
    );

    const branchOnlySegment = segments.find((segment) => segment.generatedFrameCount === 0);
    expect(branchOnlySegment).to.be.ok;
    expect(branchOnlySegment.interpolationData.map((entry) => entry.originalIndex)).to.deep.equal([
      branchOnlySegment.globalStart,
      branchOnlySegment.globalEnd,
    ]);

    const redundantSegmentFields = [
      'segmentType',
      'transitionKind',
      'pivotEdgeTracker',
      'treeInfo',
      'splitEvent',
      'metadata',
      'tree',
      'phase',
      'stepInPair',
    ];
    for (const segment of segments) {
      if (!segment.isInputTreeSegment) {
        expect(segment.pairId).to.be.a('string');
        expect(segment.sourceGlobalIndex).to.be.a('number');
        expect(segment.targetGlobalIndex).to.be.a('number');
      }
      for (const interval of segment.timing) {
        if (interval.type === 'motion') {
          expect(frameIndices.has(interval.fromIndex)).to.equal(true);
          expect(frameIndices.has(interval.toIndex)).to.equal(true);
        }
        if (interval.type === 'hold') {
          expect(frameIndices.has(interval.holdIndex)).to.equal(true);
        }
      }
      for (const field of redundantSegmentFields) {
        expect(segment).to.not.have.property(field);
      }
    }

    const dataset = TimelineDataset.fromMovieData(data, { segments, timelineData: timeline });
    const missingOccurrences = data.pairs.flatMap((pair) => {
      const missing = [];
      for (let frameIndex = pair.source_frame_index; frameIndex <= pair.target_frame_index; frameIndex += 1) {
        if (dataset.getOccurrencesForFrame(frameIndex).length === 0) {
          missing.push(`${pair.pair_id}:${frameIndex}`);
        }
      }
      return missing;
    });
    expect(missingOccurrences).to.deep.equal([]);

    console.log(`[timeline-construction.test] Used: ${source}`);
  });

  it('fulfills every adjacent frame transition inside each pair range', () => {
    const { data } = loadMovieData();
    const segments = TimelineDataProcessor.createSegments(data);
    const motionEdges = collectMotionEdges(segments);
    const noOpHoldTargets = collectNoOpHoldTargets(segments);

    const missingEdges = data.pairs.flatMap((pair) => {
      const missing = [];
      for (let frameIndex = pair.source_frame_index; frameIndex < pair.target_frame_index; frameIndex += 1) {
        const edge = `${frameIndex}->${frameIndex + 1}`;
        const noOpHoldTarget = `${pair.pair_id}:${frameIndex + 1}`;
        if (!motionEdges.has(edge) && !noOpHoldTargets.has(noOpHoldTarget)) {
          missing.push(`${pair.pair_id}:${edge}`);
        }
      }
      return missing;
    });

    expect(missingEdges).to.deep.equal([]);
  });

  it('adds fulfillment motion from the last split-event frame into the target input tree', () => {
    const movieData = makeSyntheticTimingMovieData();
    const segments = TimelineDataProcessor.createSegments(movieData);
    const motionEdges = collectMotionEdges(segments);
    const fulfillmentSegment = segments.find((segment) => (
      segment.pairId === 'opaque-pair' &&
      !segment.isInputTreeSegment &&
      segment.globalStart === 2 &&
      segment.globalEnd === 3
    ));

    expect(motionEdges.has('2->3')).to.equal(true);
    expect(fulfillmentSegment).to.include({
      treeName: 'Transition fulfillment opaque-pair',
      subtreeMoveCount: 0,
    });
    expect(fulfillmentSegment.interpolationData.map((entry) => entry.originalIndex)).to.deep.equal([2, 3]);
  });

  it('canonicalizes transition splits before affected-subtree lookup', () => {
    const tree = { name: '', length: 0, split_indices: [0], children: [] };
    const movieData = {
      ...makeSyntheticTimingMovieData(),
      interpolated_trees: [tree, tree, tree],
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
          pair_id: 'opaque-pair',
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
      pairs: [{
        ...makeSyntheticTimingMovieData().pairs[0],
        source_frame_index: 0,
        target_frame_index: 2,
        generated_frame_range: [1, 1],
        solution: {
          affected_subtrees_by_split: {
            '[10, 11]': [[[13], [12]]],
          },
          attachment_edges_by_split: {},
        },
      }],
      temporal_events: [{
        event_id: 'opaque-pair:split:0',
        event_type: 'split_change',
        pair_id: 'opaque-pair',
        pair_ordinal: 0,
        local_step_range: [0, 0],
        frame_range: [1, 1],
        split: [11, 10],
      }],
    };

    const segments = TimelineDataProcessor.createSegments(movieData);

    const transition = segments.find((segment) => segment.pairId === 'opaque-pair');
    expect(transition.affectedSubtrees).to.deep.equal([[[13], [12]]]);
    expect(transition.subtreeMoveCount).to.equal(2);
  });

  it('adds input-tree hold timing for observed input tree delimiters without duplicating trees', () => {
    const movieData = makeSyntheticTimingMovieData();
    const segments = TimelineDataProcessor.createSegments(movieData);
    const inputTree = segments.find((segment) => segment.isInputTreeSegment && segment.globalIndex === 0);

    expect(inputTree.interpolationData.map((entry) => entry.originalIndex)).to.deep.equal([0]);
    expect(inputTree.timing).to.deep.equal([{
      type: 'hold',
      holdIndex: 0,
      holdKind: 'input_tree',
      durationMs: 1500,
    }]);
  });

  it('uses a short static hold for exact no-op adjacent input pairs', () => {
    const movieData = makeTwoInputPairMovieData({ weightedRfDistance: 0 });
    const segments = TimelineDataProcessor.createSegments(movieData);
    const transition = segments.find((segment) => segment.pairId === 'pair_0_1');

    expect(transition.isNoOpPair).to.equal(true);
    expect(transition.timing).to.deep.equal([{
      type: 'hold',
      holdIndex: 1,
      holdKind: 'no_op_pair',
      durationMs: 300,
    }]);
  });

  it('keeps branch-length-only pairs as motion when weighted distance changes', () => {
    const movieData = makeTwoInputPairMovieData({ weightedRfDistance: 2 });
    const segments = TimelineDataProcessor.createSegments(movieData);
    const transition = segments.find((segment) => segment.pairId === 'pair_0_1');

    expect(transition.isNoOpPair).to.equal(false);
    expect(transition.timing).to.deep.equal([{
      type: 'motion',
      fromIndex: 0,
      toIndex: 1,
      durationMs: 1000,
    }]);
  });

  it('builds semantic mover and pivot timing from temporal SPR events', () => {
    const movieData = makeSyntheticTimingMovieData();
    const moveEvents = movieData.temporal_events.filter((event) => event.event_type === 'spr_move');
    const segments = TimelineDataProcessor.createSegments(movieData);
    const transition = segments.find((segment) => segment.pairId === 'opaque-pair' && !segment.isInputTreeSegment);

    for (const event of moveEvents) {
      expect(event).to.include.keys(['pivot_edge', 'driver_subtree', 'highlight_group', 'local_step_range']);
      expect(event).to.not.have.property('moving_taxa');
    }
    expect(transition.interpolationData.map((entry) => entry.originalIndex)).to.deep.equal([0, 1, 2]);
    expect(transition.timing).to.deep.equal([
      { type: 'motion', fromIndex: 0, toIndex: 1, durationMs: 1000 },
      { type: 'hold', holdIndex: 1, holdKind: 'mover', durationMs: 200 },
      { type: 'motion', fromIndex: 1, toIndex: 2, durationMs: 1000 },
      { type: 'hold', holdIndex: 2, holdKind: 'mover', durationMs: 200 },
      { type: 'hold', holdIndex: 2, holdKind: 'pivot', durationMs: 900 },
    ]);
  });
});

describe('Active change edge mapping from normalized rows', () => {
  let movieData;

  before(() => {
    const { data } = loadMovieData();
    movieData = data;
  });

  beforeEach(() => {
    useAppStore.getState().reset();
    useAppStore.getState().initialize(movieData);
    useAppStore.setState({
      pivotEdgesEnabled: true,
      subtreeHighlightsEnabled: true,
    });
  });

  afterEach(() => {
    useAppStore.getState().reset();
  });

  it('leaves input-tree endpoint frames without subtree highlights', () => {
    expect(useAppStore.getState().getSubtreeHighlightData()).to.deep.equal([]);
  });

  it('provides current highlighted subtrees from per-frame highlight tracking', () => {
    const store = useAppStore.getState();
    store.goToPosition(1);
    expect(useAppStore.getState().getSubtreeHighlightData()).to.deep.equal(
      movieData.subtree_highlight_tracking[1]
    );
  });

  it('syncs all-mode highlighted subtrees and active edge context into the color manager', () => {
    const storeAPI = useAppStore;
    storeAPI.getState().setSubtreeHighlightScope('all');
    storeAPI.getState().goToPosition(1);

    const state = storeAPI.getState();
    const colorManager = state.getColorManager();
    const expected = expectedChangeContext(movieData, 1);

    expect(state.frameIndex).to.equal(1);
    expect(setsToSortedArrays(colorManager.highlightedSubtreeSets)).to.deep.equal(expected.highlightedSubtrees);
    expect(Array.from(colorManager.currentPivotEdges).sort((a, b) => a - b)).to.deep.equal(expected.pivotEdge);
    expect(setsToSortedArrays(colorManager.sourceEdgeLeaves)).to.deep.equal(expected.sourceEdgeLeaves);
    expect(setsToSortedArrays(colorManager.destinationEdgeLeaves)).to.deep.equal(expected.destinationEdgeLeaves);
    expect(setsToSortedArrays(colorManager.activeMoverSubtrees)).to.deep.equal(expected.movingSubtrees);
  });

  it('syncs the color manager from an explicit frame index without changing navigation state', () => {
    const storeAPI = useAppStore;
    storeAPI.getState().setSubtreeHighlightScope('all');
    storeAPI.getState().goToPosition(1);

    storeAPI.getState().updateColorManagerForIndex(11);

    const state = storeAPI.getState();
    const colorManager = state.getColorManager();
    const expected = expectedChangeContext(movieData, 11);

    expect(state.frameIndex).to.equal(1);
    expect(setsToSortedArrays(colorManager.highlightedSubtreeSets)).to.deep.equal(expected.highlightedSubtrees);
    expect(Array.from(colorManager.currentPivotEdges).sort((a, b) => a - b)).to.deep.equal(expected.pivotEdge);
    expect(setsToSortedArrays(colorManager.sourceEdgeLeaves)).to.deep.equal(expected.sourceEdgeLeaves);
    expect(setsToSortedArrays(colorManager.destinationEdgeLeaves)).to.deep.equal(expected.destinationEdgeLeaves);
    expect(setsToSortedArrays(colorManager.activeMoverSubtrees)).to.deep.equal(expected.movingSubtrees);
  });

  it('calculates upcoming and completed previews from the explicit sync index', () => {
    const storeAPI = useAppStore;
    storeAPI.setState({ upcomingChangesEnabled: true });
    storeAPI.getState().goToPosition(1);

    storeAPI.getState().updateColorManagerForIndex(11);

    const state = storeAPI.getState();
    const colorManager = state.getColorManager();

    expect(state.frameIndex).to.equal(1);
    expect(state.completedChangeEdges).to.deep.equal([[10, 11, 12, 13]]);
    expect(state.upcomingChangeEdges).to.deep.equal([[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]]);
    expect(setsToSortedArrays(colorManager.completedChangeEdges)).to.deep.equal([[10, 11, 12, 13]]);
    expect(setsToSortedArrays(colorManager.upcomingChangeEdges)).to.deep.equal([[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]]);
  });
});
