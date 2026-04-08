const { expect } = require('chai');

const { ScrubberAPI } = require('../src/js/timeline/core/ScrubberAPI.js');
const { useAppStore } = require('../src/js/state/phyloStore/store.js');

function createMovieData() {
  return {
    interpolated_trees: [
      { id: 'tree-0' },
      { id: 'tree-1' },
      { id: 'tree-2' }
    ]
  };
}

function createTimelineManager(movieData) {
  return {
    segments: [
      {
        isFullTree: false,
        hasInterpolation: true,
        interpolationData: [
          { originalIndex: 0 },
          { originalIndex: 1 },
          { originalIndex: 2 }
        ]
      }
    ],
    timelineData: {
      totalDuration: 3000,
      segmentDurations: [3000],
      cumulativeDurations: [3000]
    },
    movieData
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
      transitionResolver: { fullTreeIndices: [0, 2] },
      colorManager: null,
      pivotEdgesEnabled: false,
      markedSubtreesEnabled: true
    });
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
      }
    };

    const api = new ScrubberAPI(treeController, {}, timelineManager);
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

    expect(api.lastInterpolationState.progress).to.equal(0.8);
    expect(useAppStore.getState().timelineProgress).to.equal(0.8);
    expect(useAppStore.getState().currentTreeIndex).to.equal(2);
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
      }
    };

    const api = new ScrubberAPI(treeController, {}, timelineManager);
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
    expect(snapshot.interpolationData.fromIndex).to.equal(1);
    expect(snapshot.interpolationData.toIndex).to.equal(2);
  });
});
