const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

// Pull in ES modules via Babel register (mocha command already uses @babel/register)
const { TimelineDataProcessor } = require('../src/js/timeline/TimelineDataProcessor.js');
const { TimelineMathUtils } = require('../src/js/timeline/TimelineMathUtils.js');
const { useAppStore } = require('../src/js/core/store.js');

function loadMovieData() {
  const candidates = [
    path.join(__dirname, '..', 'data', 'small_example', 'small_example.response.json'),
    path.join(__dirname, '..', 'example.json')
  ];
  for (const p of candidates) {
    try {
      const raw = fs.readFileSync(p, 'utf8');
      const data = JSON.parse(raw);
      return { data, source: p };
    } catch {}
  }
  throw new Error('No input JSON found for timeline construction test.');
}

describe('Timeline construction from backend result', () => {
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
    // eslint-disable-next-line no-console
    console.log(`[timeline-construction.test] Used: ${source}`);
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
  });

  it('leaves anchor tree indices unmarked', () => {
    const highlight = useAppStore.getState().getActualHighlightData();
    expect(highlight).to.deep.equal([]);
  });

  it('provides marked subtrees for first interpolated tree', () => {
    const store = useAppStore.getState();
    store.goToPosition(1); // First interpolation step between tree 0 and 1
    const highlight = useAppStore.getState().getActualHighlightData();
    expect(highlight).to.deep.equal([[13]]);
  });

  it('tracks later interpolation jump solutions', () => {
    const store = useAppStore.getState();
    store.goToPosition(6); // Jump where split [2,3,4,5,6] is active
    const highlight = useAppStore.getState().getActualHighlightData();
    expect(highlight).to.deep.equal([[4], [6]]);
  });

  it('respects per-step lattice sequences when multiple snapshots exist', () => {
    const storeAPI = useAppStore;
    const pairKey = 'pair_0_1';
    const baseState = storeAPI.getState();
    const basePairSolutions = baseState.pairSolutions;
    const pairEntry = basePairSolutions[pairKey];
    const pivotSplit = pairEntry.split_change_events[0].split;
    const pivotKey = `[${pivotSplit.join(', ')}]`;

    const modifiedPairEntry = {
      ...pairEntry,
      jumping_subtree_solutions: {
        ...pairEntry.jumping_subtree_solutions,
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

    const movieDataWithOverride = {
      ...baseState.movieData,
      tree_pair_solutions: modifiedPairSolutions
    };

    storeAPI.setState({
      pairSolutions: modifiedPairSolutions,
      movieData: movieDataWithOverride
    });

    const store = storeAPI.getState();
    store.goToPosition(1); // step_in_pair = 1 (zero-based 0)
    let highlight = storeAPI.getState().getActualHighlightData();
    expect(highlight).to.deep.equal([[13]]);

    store.goToPosition(2); // step_in_pair = 2 (zero-based 1)
    highlight = storeAPI.getState().getActualHighlightData();
    expect(highlight).to.deep.equal([[99]]);
  });
});
