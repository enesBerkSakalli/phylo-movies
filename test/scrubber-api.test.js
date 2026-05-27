const { expect } = require('chai');

const { ScrubberAPI } = require('../src/timeline/core/ScrubberAPI.js');
const { TimelineClock } = require('../src/timeline/core/TimelineClock.js');
const { TimelineDataset } = require('../src/timeline/data/TimelineDataset.js');
const { useAppStore } = require('../src/state/phyloStore/store.js');

function createMovieData() {
  return {
    interpolated_trees: [{ id: 'tree-0' }, { id: 'tree-1' }, { id: 'tree-2' }],
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
  };
}

function createTimelineManager(movieData) {
  const segments = [
    {
      isInputTreeSegment: false,
      hasInterpolation: true,
      interpolationData: [{ originalIndex: 0 }, { originalIndex: 1 }, { originalIndex: 2 }],
      timing: [
        { type: 'motion', fromIndex: 0, toIndex: 1, durationMs: 1500 },
        { type: 'motion', fromIndex: 1, toIndex: 2, durationMs: 1500 },
      ],
    },
  ];
  const timelineData = {
    totalDuration: 3000,
    segmentDurations: [3000],
    cumulativeDurations: [3000],
  };
  const timelineDataset = TimelineDataset.fromMovieData(movieData, {
    segments,
    timelineData,
  });
  const timelineClock = new TimelineClock({
    timelineDataset,
  });

  return {
    getTransitionFrameForTimelineProgress: (progress) =>
      timelineClock.getTransitionFrameForProgress(progress),
  };
}

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('ScrubberAPI', () => {
  beforeEach(() => {
    const movieData = createMovieData();
    useAppStore.setState({
      navigationDirection: 'forward',
      comparisonMode: false,
      movieData,
      treeList: movieData.interpolated_trees,
      timelineFrames: [
        { frame_index: 0, frame_type: 'input_tree', is_observed_input: true },
        {
          frame_index: 1,
          frame_type: 'interpolation_frame',
          is_observed_input: false,
          pair_id: 'pair_0_1',
        },
        { frame_index: 2, frame_type: 'input_tree', is_observed_input: true },
      ],
      colorManager: null,
      pivotEdgesEnabled: false,
      subtreeHighlightsEnabled: true,
    });
  });

  afterEach(() => {
    useAppStore.getState().reset();
  });

  it('serializes scrub renders and collapses pending updates to the latest progress', async () => {
    const movieData = createMovieData();
    const timelineManager = createTimelineManager(movieData);
    const resolvers = [];
    const renderCalls = [];
    let activeRenderCount = 0;
    let maxActiveRenderCount = 0;

    const treeController = {
      renderComparisonAwareScrubFrame: async (fromTree, toTree, timeFactor, options) => {
        activeRenderCount += 1;
        maxActiveRenderCount = Math.max(maxActiveRenderCount, activeRenderCount);
        renderCalls.push({ fromTree, toTree, timeFactor, options });

        await new Promise((resolve) => {
          resolvers.push(() => {
            activeRenderCount -= 1;
            resolve();
          });
        });
      },
    };

    const api = new ScrubberAPI(treeController, timelineManager, useAppStore);
    await api.startScrubbing(0);

    const firstUpdate = api.updatePosition(0.2);
    const secondUpdate = api.updatePosition(0.4);
    const thirdUpdate = api.updatePosition(0.8);

    await flushMicrotasks();

    expect(renderCalls).to.have.length(1);
    expect(maxActiveRenderCount).to.equal(1);

    resolvers.shift()();
    await flushMicrotasks();

    expect(renderCalls).to.have.length(2);
    expect(maxActiveRenderCount).to.equal(1);
    expect(renderCalls[1].options.fromTreeIndex).to.equal(1);
    expect(renderCalls[1].options.toTreeIndex).to.equal(2);
    expect(renderCalls[1].timeFactor).to.be.closeTo(0.6, 1e-6);

    resolvers.shift()();
    await Promise.all([firstUpdate, secondUpdate, thirdUpdate]);

    expect(api.lastTransitionState.progress).to.equal(0.8);
    expect(api.lastTransitionState.transitionFrame.cursorTreeIndex).to.equal(2);
    expect(useAppStore.getState().playhead.timelineProgress).to.equal(0.8);
    expect(useAppStore.getState().frameIndex).to.equal(2);
  });

  it('uses target-frame highlights as soon as scrubbed transition motion begins', async () => {
    const movieData = createMovieData();
    const timelineManager = createTimelineManager(movieData);
    const highlightIndices = [];
    const originalUpdateCurrent = useAppStore.getState().updateColorManagerForCurrentIndex;
    const originalUpdateForIndex = useAppStore.getState().updateColorManagerForIndex;

    try {
      useAppStore.setState({
        updateColorManagerForCurrentIndex: () => {},
        updateColorManagerForIndex: (treeIndex) => highlightIndices.push(treeIndex),
      });

      const treeController = {
        renderComparisonAwareScrubFrame: async () => {},
      };

      const api = new ScrubberAPI(treeController, timelineManager, useAppStore);
      await api.startScrubbing(0);
      await api.updatePosition(0.1);

      expect(highlightIndices).to.deep.equal([1]);
    } finally {
      useAppStore.setState({
        updateColorManagerForCurrentIndex: originalUpdateCurrent,
        updateColorManagerForIndex: originalUpdateForIndex,
      });
    }
  });

  it('flushes the latest requested progress before ending a scrub', async () => {
    const movieData = createMovieData();
    const timelineManager = createTimelineManager(movieData);
    const resolvers = [];

    const treeController = {
      renderComparisonAwareScrubFrame: async () => {
        await new Promise((resolve) => {
          resolvers.push(resolve);
        });
      },
    };

    const api = new ScrubberAPI(treeController, timelineManager, useAppStore);
    await api.startScrubbing(0);

    const updatePromise = api.updatePosition(0.2);
    const endPromise = api.endScrubbing(0.9);

    await flushMicrotasks();

    expect(resolvers).to.have.length(1);
    resolvers.shift()();
    await flushMicrotasks();
    expect(resolvers).to.have.length(1);

    resolvers.shift()();
    await updatePromise;

    const snapshot = await endPromise;
    expect(snapshot.progress).to.equal(0.9);
    expect(snapshot.transitionFrame.sourceTreeIndex).to.equal(1);
    expect(snapshot.transitionFrame.targetTreeIndex).to.equal(2);
  });

  it('reports scrub render failures without throwing away the scrub session', async () => {
    const movieData = createMovieData();
    const timelineManager = createTimelineManager(movieData);
    const renderError = new Error('render failed');
    const originalError = console.error;
    const errorCalls = [];

    console.error = (...args) => {
      errorCalls.push(args);
    };

    try {
      const treeController = {
        renderComparisonAwareScrubFrame: async () => {
          throw renderError;
        },
      };

      const api = new ScrubberAPI(treeController, timelineManager, useAppStore);
      await api.startScrubbing(0);

      await api.updatePosition(0.5);
      const snapshot = await api.endScrubbing();

      expect(snapshot).to.equal(null);
      expect(errorCalls).to.have.length(1);
      expect(errorCalls[0][0]).to.equal('[ScrubberAPI] Scrub update failed:');
      expect(errorCalls[0][1]).to.deep.include({ progress: 0.5, error: renderError });
      expect(useAppStore.getState().playhead.timelineProgress).to.equal(0.5);
    } finally {
      console.error = originalError;
    }
  });

  it('uses timeline frames for comparison scrub input trees', async () => {
    const movieData = createMovieData();
    const timelineManager = createTimelineManager(movieData);
    const renderCalls = [];

    useAppStore.setState({
      comparisonMode: true,
    });

    const treeController = {
      renderComparisonAwareScrubFrame: async (...args) => {
        renderCalls.push(args);
      },
    };

    const api = new ScrubberAPI(treeController, timelineManager, useAppStore);

    await api.startScrubbing(0);
    await api.updatePosition(0.2);

    expect(renderCalls).to.have.length(1);
    expect(renderCalls[0][3]).to.include({
      comparisonMode: true,
      rightTreeIndex: 2,
    });
  });

  it('does not fall back to linear interpolation without a timeline transition frame', async () => {
    const renderCalls = [];
    const originalError = console.error;

    console.error = () => {};

    try {
      const treeController = {
        renderComparisonAwareScrubFrame: async (...args) => {
          renderCalls.push(args);
        },
      };

      const api = new ScrubberAPI(treeController, null, useAppStore);
      await api.startScrubbing(0);
      await api.updatePosition(0.5);

      expect(renderCalls).to.deep.equal([]);
      expect(api.lastTransitionState).to.equal(null);
    } finally {
      console.error = originalError;
    }
  });
});
