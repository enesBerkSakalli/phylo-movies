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

describe('Timeline construction from backend result', () => {
  it('does not keep unused timeline constants or old anchor label compatibility', () => {
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

    const remainingAnchorLabelCompatibility = labelCompatibilityFiles.filter((filePath) => (
      /\bAnchor Tree\b/.test(fs.readFileSync(filePath, 'utf8'))
    ));
    expect(remainingAnchorLabelCompatibility).to.deep.equal([]);
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

    // Additional correctness check: first interpolation segment indices should match step_range_global exactly
    const firstEvent = (data.split_change_timeline || []).find(e => e && e.type === 'split_event');
    const firstInterpSeg = segments.find(s => s && s.hasInterpolation && !s.isFullTree);
    if (firstEvent && firstInterpSeg && Array.isArray(firstInterpSeg.interpolationData)) {
      const idxs = firstInterpSeg.interpolationData.map(d => d.originalIndex);
      const minIdx = Math.min(...idxs);
      const maxIdx = Math.max(...idxs);
      const [gStart, gEnd] = firstEvent.step_range_global || [];
      // Expect no off-by-one: constructed indices must equal the provided global range
      expect(minIdx).to.equal(gStart);
      expect(maxIdx).to.equal(gEnd);
      // And must not include the preceding anchor index if present
      const firstOriginal = (data.split_change_timeline || []).find(e => e && e.type === 'original');
      if (firstOriginal && Number.isInteger(firstOriginal.global_index)) {
        expect(idxs).to.not.include(firstOriginal.global_index);
      }

      expect(firstInterpSeg).to.include({
        segmentType: 'transition',
        transitionKind: 'split_event',
        globalStart: gStart,
        globalEnd: gEnd,
        localStepStart: firstEvent.step_range_local[0],
        localStepEnd: firstEvent.step_range_local[1]
      });
      expect(firstInterpSeg).to.not.have.property('phase');
      expect(firstInterpSeg).to.not.have.property('stepInPair');
    }

    // Anchors: ensure number and indices match original events from backend
    const originals = (data.split_change_timeline || []).filter(e => e && e.type === 'original');
    const originalIndices = new Set(originals.map(e => e.global_index));
    const anchorSegments = segments.filter(s => s && s.isFullTree);
    const anchorIndices = new Set(anchorSegments.map(s => s.interpolationData?.[0]?.originalIndex).filter(Number.isInteger));
    expect(anchorIndices.size).to.equal(originalIndices.size);
    for (const idx of originalIndices) {
      expect(anchorIndices.has(idx)).to.equal(true);
    }

    // Interpolation segments count should equal backend split_event entries
    const splitEvents = (data.split_change_timeline || []).filter(e => e && e.type === 'split_event');
    const interpSegments = segments.filter(s => s && s.hasInterpolation && !s.isFullTree);
    expect(interpSegments.length).to.equal(splitEvents.length);

    // No anchor index should appear inside any interpolationData
    const allInterpIndices = new Set(
      [].concat(...interpSegments.map(s => (s.interpolationData || []).map(d => d.originalIndex)))
    );
    for (const idx of anchorIndices) {
      expect(allInterpIndices.has(idx)).to.equal(false);
    }

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

  it('leaves source and destination tree indices unmarked', () => {
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
