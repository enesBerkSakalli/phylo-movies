const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const sinon = require('sinon');
const { JSDOM } = require('jsdom');
const { clearTimelineModuleCache, installDeckGLMocks } = require('./helpers/deckGLMocks.js');

require.extensions['.css'] = () => {};

const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.requestAnimationFrame = dom.window.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = dom.window.cancelAnimationFrame || ((id) => clearTimeout(id));

installDeckGLMocks();
clearTimelineModuleCache();

const { MovieTimelineManager } = require('../src/timeline/core/MovieTimelineManager.js');
const { AnimationRunner } = require('../src/treeVisualisation/systems/AnimationRunner.js');
const { calculatePlaybackState } = require('../src/domain/animation/AnimationTiming.js');
const { TransitionFrame } = require('../src/timeline/time/TransitionFrame.js');
const { useAppStore } = require('../src/state/phyloStore/store.js');

function loadMovieData() {
  const candidates = [path.join(__dirname, 'data', 'small_example', 'small_example.response.json')];

  for (const filePath of candidates) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {}
  }

  throw new Error('No input JSON found for timeline manager lifecycle test.');
}

function makeContainer(width = 800, height = 80) {
  const container = global.document.createElement('div');
  container.getBoundingClientRect = () => ({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
  });
  global.document.body.appendChild(container);
  return container;
}

describe('MovieTimelineManager lifecycle', () => {
  let movieData;

  before(() => {
    movieData = loadMovieData();
  });

  afterEach(() => {
    useAppStore.setState({
      playing: false,
      animationStartTime: null,
      animationSpeed: 1,
      transitionDuration: 1,
      pauseDuration: 0,
      playhead: {
        animationProgress: 0,
        timelineProgress: null,
      },
      frameIndex: 0,
      treeList: [],
      movieTimelineManager: null,
      hoveredSegmentIndex: null,
      hoveredSegmentData: null,
      hoveredSegmentPosition: null,
      selectedTimelineSegmentIndex: null,
      isTooltipHovered: false,
    });
  });

  it('requires an explicit normalized tree list', () => {
    expect(() => new MovieTimelineManager(movieData)).to.throw(
      'MovieTimelineManager requires a non-empty normalized treeList'
    );
  });

  it('can exist before a host container is available', () => {
    const manager = new MovieTimelineManager(movieData, movieData.interpolated_trees);

    expect(manager.timeline).to.equal(null);
    expect(manager.container).to.equal(null);
    expect(manager.getSegmentCount()).to.be.greaterThan(0);

    manager.destroy();
  });

  it('exposes canonical timeline cursor lookups before mounting', () => {
    const manager = new MovieTimelineManager(movieData, movieData.interpolated_trees);

    const startCursor = manager.getCursorAtMovieTime(0);
    const progressCursor = manager.getCursorAtTimelineProgress(startCursor.timelineProgress);
    const frameCursor = manager.getCursorForFrame(22, { occurrence: 'last' });

    expect(startCursor).to.include({
      frameIndex: 0,
      inputTreeIndex: 0,
      sourceFrameIndex: 0,
      msaWindowIndex: 0,
      movieTimeMs: 0,
    });
    expect(progressCursor.frameIndex).to.equal(startCursor.frameIndex);
    expect(frameCursor).to.include({
      frameIndex: 22,
      inputTreeIndex: 1,
      sourceFrameIndex: 22,
      msaWindowIndex: 1,
    });
    expect(manager.getFrameOccurrences(22).length).to.be.greaterThan(1);

    manager.destroy();
  });

  it('resolves timeline frames through hydration instead of treating sparse treeList as invalid', () => {
    const treeList = new Array(movieData.interpolated_trees.length);
    const hydratedIndices = [];
    useAppStore.setState({
      treeList,
      ensureTreesHydrated: (indices) => {
        hydratedIndices.push(indices);
        return indices.map((index) => {
          treeList[index] = movieData.interpolated_trees[index];
          return treeList[index];
        });
      },
    });

    const manager = new MovieTimelineManager(movieData, treeList);
    const frame = manager.resolveFrameAtIndex(1);

    expect(hydratedIndices).to.not.deep.equal([]);
    expect(frame.sourceTree).to.equal(movieData.interpolated_trees[0]);
    expect(frame.targetTree).to.equal(movieData.interpolated_trees[1]);

    manager.destroy();
  });

  it('hydrates a sparse target tree when the source frame is already hydrated', () => {
    const treeList = new Array(movieData.interpolated_trees.length);
    treeList[0] = movieData.interpolated_trees[0];
    const hydratedIndices = [];
    useAppStore.setState({
      treeList,
      ensureTreesHydrated: (indices) => {
        hydratedIndices.push(indices);
        return indices.map((index) => {
          treeList[index] = movieData.interpolated_trees[index];
          return treeList[index];
        });
      },
    });

    const manager = new MovieTimelineManager(movieData, treeList);
    const frame = manager.resolveFrameAtIndex(1);

    expect(hydratedIndices).to.deep.equal([[0, 1]]);
    expect(frame.sourceTree).to.equal(movieData.interpolated_trees[0]);
    expect(frame.targetTree).to.equal(movieData.interpolated_trees[1]);
    expect(frame.isStatic).to.equal(false);

    manager.destroy();
  });

  it('exposes timeline-owned status snapshots before mounting', () => {
    const manager = new MovieTimelineManager(movieData, movieData.interpolated_trees);
    const cursor = manager.getCursorForFrame(22, { occurrence: 'last' });

    const status = manager.getTimelineStatusSnapshot({
      timelineCursor: cursor,
      hasMsa: true,
      msaStepSize: 50,
      msaWindowSize: 100,
      msaColumnCount: 1000,
    });

    expect(status.position.display).to.equal('Tree 2/10');
    expect(status.segment.text).to.equal('Input tree');
    expect(status.msaWindow).to.deep.equal({
      startPosition: 1,
      midPosition: 51,
      endPosition: 100,
    });

    manager.destroy();
  });

  it('mounts into an explicit host and unmounts cleanly', async () => {
    const manager = new MovieTimelineManager(movieData, movieData.interpolated_trees);
    const host = makeContainer();

    await manager.mount(host);

    expect(manager.container).to.equal(host);
    expect(manager.timeline).to.exist;
    expect(manager.timeline.container).to.equal(host);
    expect(host.children.length).to.equal(1);

    manager.unmount();

    expect(manager.timeline).to.equal(null);
    expect(manager.container).to.equal(null);
    expect(host.children.length).to.equal(0);
    expect(manager.getSegmentCount()).to.be.greaterThan(0);

    manager.destroy();
  });

  it('keeps timeline viewport controls behind the manager API', () => {
    const manager = new MovieTimelineManager(movieData, movieData.interpolated_trees);
    const calls = [];

    manager.timeline = {
      zoomIn: (factor) => calls.push(['zoomIn', factor]),
      zoomOut: (factor) => calls.push(['zoomOut', factor]),
      fit: () => calls.push(['fit']),
      moveTo: (time) => calls.push(['moveTo', time]),
      getTotalDuration: () => 5000,
      getVisibleTimeRange: () => ({ min: 1000, max: 3000 }),
      destroy: () => calls.push(['destroy']),
    };

    manager.zoomIn();
    manager.zoomOut();
    manager.fit();
    manager.scrollToStart();
    manager.scrollToEnd();

    expect(calls).to.deep.equal([
      ['zoomIn', 0.2],
      ['zoomOut', 0.2],
      ['fit'],
      ['moveTo', 0],
      ['moveTo', 3000],
    ]);

    manager.timeline = null;
    manager.destroy();
  });

  it('routes store timeline controls through manager methods', () => {
    const calls = [];
    useAppStore.setState({
      movieTimelineManager: {
        zoomIn: () => calls.push('zoomIn'),
        zoomOut: () => calls.push('zoomOut'),
        fit: () => calls.push('fit'),
        scrollToStart: () => calls.push('scrollToStart'),
        scrollToEnd: () => calls.push('scrollToEnd'),
      },
    });

    const store = useAppStore.getState();
    store.zoomInTimeline();
    store.zoomOutTimeline();
    store.fitTimeline();
    store.scrollToStartTimeline();
    store.scrollToEndTimeline();

    expect(calls).to.deep.equal(['zoomIn', 'zoomOut', 'fit', 'scrollToStart', 'scrollToEnd']);
  });

  it('remounts into a new host without leaving stale DOM behind', async () => {
    const manager = new MovieTimelineManager(movieData, movieData.interpolated_trees);
    const firstHost = makeContainer(640, 60);
    const secondHost = makeContainer(720, 90);

    await manager.mount(firstHost);
    expect(firstHost.children.length).to.equal(1);

    await manager.mount(secondHost);

    expect(firstHost.children.length).to.equal(0);
    expect(secondHost.children.length).to.equal(1);
    expect(manager.container).to.equal(secondHost);
    expect(manager.timeline).to.exist;
    expect(manager.timeline.container).to.equal(secondHost);

    manager.destroy();
  });

  it('clears transient tooltip and hover state on unmount', () => {
    const manager = new MovieTimelineManager(movieData, movieData.interpolated_trees);
    const host = makeContainer();

    useAppStore.setState({
      hoveredSegmentIndex: 2,
      hoveredSegmentData: { treeName: 'Example' },
      hoveredSegmentPosition: { x: 120, y: 40 },
      isTooltipHovered: true,
    });

    manager.mount(host);
    manager.unmount();

    const state = useAppStore.getState();
    expect(state.isTooltipHovered).to.equal(false);
    expect(state.hoveredSegmentIndex).to.equal(null);
    expect(state.hoveredSegmentData).to.equal(null);
    expect(state.hoveredSegmentPosition).to.equal(null);

    manager.destroy();
  });

  it('stores clicked timeline selection by segment index only', () => {
    const manager = new MovieTimelineManager(movieData, movieData.interpolated_trees);
    const selectedSegment = manager.getSegment(1);

    manager._onTimelineClick({
      segmentIndex: 1,
      ms: 0,
      segment: { stale: 'renderer payload should not be stored' },
    });

    const state = useAppStore.getState();
    expect(state.selectedTimelineSegmentIndex).to.equal(1);
    expect(Object.prototype.hasOwnProperty.call(state, 'selectedTimelineSegmentData')).to.equal(
      false
    );
    expect(manager.getSegment(state.selectedTimelineSegmentIndex)).to.equal(selectedSegment);

    manager.destroy();
  });

  it('clears selected timeline segment on dataset reset', () => {
    useAppStore.setState({ selectedTimelineSegmentIndex: 2 });

    useAppStore.getState().reset();

    const state = useAppStore.getState();
    expect(state.selectedTimelineSegmentIndex).to.equal(null);
    expect(Object.prototype.hasOwnProperty.call(state, 'selectedTimelineSegmentData')).to.equal(
      false
    );
  });

  it('keeps clicked inspector selection visually pinned while playhead sync changes current position', async () => {
    const manager = new MovieTimelineManager(movieData, movieData.interpolated_trees);
    const host = makeContainer();

    useAppStore.setState({
      treeList: movieData.interpolated_trees,
      selectedTimelineSegmentIndex: 0,
      playing: true,
      playhead: {
        animationProgress: 0.9,
        timelineProgress: null,
      },
    });

    await manager.mount(host);
    manager.updateCurrentPosition();

    expect(manager.timeline._selectedSegmentIndex).to.equal(0);
    expect(useAppStore.getState().selectedTimelineSegmentIndex).to.equal(0);

    manager.destroy();
  });

  it('restores scrubber position and inspected segment selection on remount from store state', async () => {
    const manager = new MovieTimelineManager(movieData, movieData.interpolated_trees);
    const firstHost = makeContainer(640, 60);
    const secondHost = makeContainer(640, 60);

    useAppStore.setState({
      playing: false,
      playhead: {
        animationProgress: 0.1,
        timelineProgress: 0.6,
      },
      selectedTimelineSegmentIndex: 2,
    });

    await manager.mount(firstHost);

    const firstScrubberMs = manager.timeline._scrubberMs;
    const firstSelectedSegmentIndex = manager.timeline._selectedSegmentIndex;

    expect(firstScrubberMs).to.be.a('number');
    expect(firstSelectedSegmentIndex).to.equal(2);

    manager.unmount();
    await manager.mount(secondHost);

    expect(manager.timeline._scrubberMs).to.equal(firstScrubberMs);
    expect(manager.timeline._selectedSegmentIndex).to.equal(firstSelectedSegmentIndex);

    manager.destroy();
  });

  it('syncs renderer inspected selection when the store selection is cleared', async () => {
    const manager = new MovieTimelineManager(movieData, movieData.interpolated_trees);
    const host = makeContainer();

    useAppStore.setState({ selectedTimelineSegmentIndex: 1 });
    await manager.mount(host);

    expect(manager.timeline._selectedSegmentIndex).to.equal(1);

    useAppStore.setState({ selectedTimelineSegmentIndex: null });

    expect(manager.timeline._selectedSegmentIndex).to.equal(null);

    manager.destroy();
  });

  it('keeps fractional timeline position when playback resumes after scrubbing', () => {
    const previousPerformance = global.performance;
    const now = 10_000;
    global.performance = {
      ...(previousPerformance || {}),
      now: () => now,
    };

    try {
      const trees = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }];
      const timelineProgress = 0.42;
      const manager = {
        resolveFrameAtTimelineProgress: (progress) => {
          expect(progress).to.equal(timelineProgress);
          return TransitionFrame.from({
            sourceTreeIndex: 1,
            targetTreeIndex: 2,
            transitionProgress: 0.25,
          });
        },
        getTimelineProgressForLinearTreeProgress: () => timelineProgress,
      };

      useAppStore.setState({
        treeList: trees,
        movieTimelineManager: manager,
        animationSpeed: 1,
        playhead: {
          animationProgress: 0,
          timelineProgress,
        },
        playing: false,
      });

      useAppStore.getState().play();

      const state = useAppStore.getState();
      expect(state.playhead).to.deep.equal({
        animationProgress: 0.3125,
        timelineProgress,
      });
      expect(state.frameIndex).to.equal(1);
      expect(state.animationStartTime).to.equal(now - 1250);
    } finally {
      global.performance = previousPerformance;
    }
  });

  it('uses configured transition and pause duration when playback resumes', () => {
    const previousPerformance = global.performance;
    const now = 10_000;
    global.performance = {
      ...(previousPerformance || {}),
      now: () => now,
    };

    try {
      const trees = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }];
      const timelineProgress = 0.42;
      const manager = {
        resolveFrameAtTimelineProgress: () =>
          TransitionFrame.from({
            sourceTreeIndex: 1,
            targetTreeIndex: 2,
            transitionProgress: 0.25,
          }),
        getTimelineProgressForLinearTreeProgress: () => timelineProgress,
      };

      useAppStore.setState({
        treeList: trees,
        movieTimelineManager: manager,
        animationSpeed: 1,
        transitionDuration: 2,
        pauseDuration: 0.5,
        playhead: {
          animationProgress: 0,
          timelineProgress,
        },
        playing: false,
      });

      useAppStore.getState().play();

      const state = useAppStore.getState();
      expect(state.playhead.animationProgress).to.equal(0.3125);
      expect(state.animationStartTime).to.equal(now - 3000);

      const resumedPlayback = calculatePlaybackState({
        timestamp: now,
        startTime: state.animationStartTime,
        speed: state.animationSpeed,
        totalItems: trees.length,
        transitionDuration: state.transitionDuration,
        pauseDuration: state.pauseDuration,
      });
      expect(resumedPlayback.fromIndex).to.equal(1);
      expect(resumedPlayback.toIndex).to.equal(2);
      expect(resumedPlayback.localT).to.equal(0.25);
    } finally {
      global.performance = previousPerformance;
    }
  });

  it('uses semantic timeline duration when playback resumes inside a movie hold', () => {
    const previousPerformance = global.performance;
    const now = 10_000;
    global.performance = {
      ...(previousPerformance || {}),
      now: () => now,
    };

    try {
      const trees = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
      const timelineProgress = 1100 / 4100;
      const manager = {
        timelineData: { totalDuration: 4100 },
        resolveFrameAtTimelineProgress: () =>
          TransitionFrame.from({
            sourceTreeIndex: 1,
            targetTreeIndex: 1,
            transitionProgress: 0,
            holdKind: 'mover',
          }),
        getTimelineProgressForLinearTreeProgress: () => timelineProgress,
      };

      useAppStore.setState({
        treeList: trees,
        movieTimelineManager: manager,
        animationSpeed: 1,
        transitionDuration: 1,
        pauseDuration: 0,
        playhead: {
          animationProgress: 0,
          timelineProgress,
        },
        playing: false,
      });

      useAppStore.getState().play();

      const state = useAppStore.getState();
      expect(state.playhead.animationProgress).to.equal(1 / 3);
      expect(state.animationStartTime).to.equal(now - 1100);
    } finally {
      global.performance = previousPerformance;
    }
  });

  it('uses configured transition duration when advancing animation frames', async () => {
    let renderOptions = null;
    let renderedT = null;
    let syncedProgress = null;

    const runner = new AnimationRunner({
      getState: () => ({
        playing: true,
        animationStartTime: 1_000,
        animationSpeed: 1,
        transitionDuration: 2,
        pauseDuration: 0,
        treeList: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        comparisonMode: false,
      }),
      getOrCacheInterpolationData: () => ({
        dataFrom: { nodes: [] },
        dataTo: { nodes: [] },
      }),
      renderSingleFrame: async (_fromTree, _toTree, easedT, options) => {
        renderedT = easedT;
        renderOptions = options;
      },
      renderComparisonFrame: async () => {},
      setAnimationStage: () => {},
      updateProgress: (progress) => {
        syncedProgress = progress;
      },
      stopAnimation: () => {},
      requestRedraw: () => {},
    });

    runner.isRunning = true;
    const shouldStop = await runner._processFrame(2_000);

    expect(shouldStop).to.equal(false);
    expect(syncedProgress).to.equal(0.25);
    expect(renderOptions.fromTreeIndex).to.equal(0);
    expect(renderOptions.toTreeIndex).to.equal(1);
    expect(renderedT).to.equal(0.5);
  });

  it('uses semantic movie timeline duration when advancing animation frames', async () => {
    const trees = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    let timelineProgressSeen = null;
    let cacheIndices = null;
    let renderOptions = null;
    let syncedProgress = null;
    let syncedMeta = null;
    const manager = {
      timelineData: { totalDuration: 4100 },
      resolveFrameAtTimelineProgress: (progress) => {
        timelineProgressSeen = progress;
        return TransitionFrame.from({
          sourceTree: trees[1],
          targetTree: trees[1],
          sourceTreeIndex: 1,
          targetTreeIndex: 1,
          transitionProgress: 0,
          holdKind: 'mover',
        });
      },
    };

    const runner = new AnimationRunner({
      getState: () => ({
        playing: true,
        animationStartTime: 1_000,
        animationSpeed: 1,
        transitionDuration: 1,
        pauseDuration: 0,
        treeList: trees,
        movieTimelineManager: manager,
        comparisonMode: false,
      }),
      getOrCacheInterpolationData: (_fromTree, _toTree, fromIndex, toIndex) => {
        cacheIndices = { fromIndex, toIndex };
        return {
          dataFrom: { nodes: [] },
          dataTo: { nodes: [] },
        };
      },
      renderSingleFrame: async (_fromTree, _toTree, _easedT, options) => {
        renderOptions = options;
      },
      renderComparisonFrame: async () => {},
      setAnimationStage: () => {},
      updateProgress: (progress, meta) => {
        syncedProgress = progress;
        syncedMeta = meta;
      },
      stopAnimation: () => {},
    });

    runner.isRunning = true;
    const shouldStop = await runner._processFrame(2_100);

    expect(shouldStop).to.equal(false);
    expect(timelineProgressSeen).to.be.closeTo(1100 / 4100, 1e-9);
    expect(cacheIndices).to.deep.equal({ fromIndex: 1, toIndex: 1 });
    expect(renderOptions.fromTreeIndex).to.equal(1);
    expect(renderOptions.toTreeIndex).to.equal(1);
    expect(renderOptions.rawTimeFactor).to.equal(0);
    expect(syncedProgress).to.equal(1 / 3);
    expect(syncedMeta).to.include({
      timelineProgress: 1100 / 4100,
      frameIndex: 1,
      holdKind: 'mover',
    });
  });

  it('syncs playback progress before building interpolation layout data', async () => {
    const callOrder = [];

    const runner = new AnimationRunner({
      getState: () => ({
        playing: true,
        animationStartTime: 1_000,
        animationSpeed: 1,
        transitionDuration: 2,
        pauseDuration: 0,
        treeList: [{ id: 'a' }, { id: 'b' }],
        comparisonMode: false,
      }),
      getOrCacheInterpolationData: () => {
        callOrder.push('layout');
        return {
          dataFrom: { nodes: [] },
          dataTo: { nodes: [] },
        };
      },
      renderSingleFrame: async () => {},
      renderComparisonFrame: async () => {},
      setAnimationStage: () => {},
      updateProgress: () => {
        callOrder.push('progress');
      },
      stopAnimation: () => {},
    });

    runner.isRunning = true;
    await runner._processFrame(2_000);

    expect(callOrder).to.deep.equal(['progress', 'layout']);
  });

  it('defers first playback render so playhead movement is not blocked by layout', async () => {
    const callOrder = [];

    const runner = new AnimationRunner({
      getState: () => ({
        playing: true,
        animationStartTime: 1_000,
        animationSpeed: 1,
        transitionDuration: 2,
        pauseDuration: 0,
        treeList: [{ id: 'a' }, { id: 'b' }],
        comparisonMode: false,
      }),
      getOrCacheInterpolationData: () => {
        callOrder.push('layout');
        return {
          dataFrom: { nodes: [] },
          dataTo: { nodes: [] },
        };
      },
      renderSingleFrame: async () => {
        callOrder.push('render');
      },
      renderComparisonFrame: async () => {},
      setAnimationStage: () => {},
      updateProgress: () => {
        callOrder.push('progress');
      },
      stopAnimation: () => {},
    });

    runner.isRunning = true;
    runner._deferRenderUntilNextFrame = true;
    await runner._processFrame(2_000);

    expect(callOrder).to.deep.equal(['progress']);

    await runner._processFrame(2_020);

    expect(callOrder).to.deep.equal(['progress', 'layout', 'render']);
  });

  it('syncs highlight state to the rendered playback frame before drawing', async () => {
    const highlightIndices = [];
    const renderOrder = [];

    const runner = new AnimationRunner({
      getState: () => ({
        playing: true,
        animationStartTime: 1_000,
        animationSpeed: 1,
        transitionDuration: 2,
        pauseDuration: 0,
        treeList: [{ id: 'a' }, { id: 'b' }],
        comparisonMode: false,
      }),
      getOrCacheInterpolationData: () => ({
        dataFrom: { nodes: [] },
        dataTo: { nodes: [] },
      }),
      renderSingleFrame: async () => {
        renderOrder.push('render');
      },
      renderComparisonFrame: async () => {},
      setAnimationStage: () => {},
      syncHighlightsForIndex: (treeIndex) => {
        highlightIndices.push(treeIndex);
        renderOrder.push('sync');
      },
      updateProgress: () => {},
      stopAnimation: () => {},
    });

    runner.isRunning = true;
    await runner._processFrame(2_100);

    expect(highlightIndices).to.deep.equal([1]);
    expect(renderOrder).to.deep.equal(['sync', 'render']);
  });

  it('syncs target-frame highlights as soon as transition motion begins', async () => {
    const highlightIndices = [];

    const runner = new AnimationRunner({
      getState: () => ({
        playing: true,
        animationStartTime: 1_000,
        animationSpeed: 1,
        transitionDuration: 2,
        pauseDuration: 0,
        treeList: [{ id: 'a' }, { id: 'b' }],
        comparisonMode: false,
      }),
      getOrCacheInterpolationData: () => ({
        dataFrom: { nodes: [] },
        dataTo: { nodes: [] },
      }),
      renderSingleFrame: async () => {},
      renderComparisonFrame: async () => {},
      setAnimationStage: () => {},
      syncHighlightsForIndex: (treeIndex) => highlightIndices.push(treeIndex),
      updateProgress: () => {},
      stopAnimation: () => {},
    });

    runner.isRunning = true;
    await runner._processFrame(1_100);

    expect(highlightIndices).to.deep.equal([1]);
  });

  it('recomputes animation stage when interpolation data changes for the same tree indices', async () => {
    const renderedTValues = [];
    let callCount = 0;

    const runner = new AnimationRunner({
      getState: () => ({
        playing: true,
        animationStartTime: 1_000,
        animationSpeed: 1,
        transitionDuration: 2,
        pauseDuration: 0,
        treeList: [{ id: 'a' }, { id: 'b' }],
        comparisonMode: false,
      }),
      getOrCacheInterpolationData: () => {
        callCount += 1;
        if (callCount === 1) {
          return {
            dataFrom: { layoutCacheKey: 'from-1', nodes: [{ id: 'node-a' }] },
            dataTo: { layoutCacheKey: 'to-1', nodes: [{ id: 'node-a' }] },
          };
        }

        return {
          dataFrom: { layoutCacheKey: 'from-2', nodes: [{ id: 'node-a' }, { id: 'node-b' }] },
          dataTo: { layoutCacheKey: 'to-2', nodes: [{ id: 'node-a' }] },
        };
      },
      renderSingleFrame: async (_fromTree, _toTree, easedT) => {
        renderedTValues.push(easedT);
      },
      renderComparisonFrame: async () => {},
      setAnimationStage: () => {},
      updateProgress: () => {},
      stopAnimation: () => {},
    });

    runner.isRunning = true;
    await runner._processFrame(1_500);
    await runner._processFrame(1_500);

    expect(renderedTValues).to.have.lengthOf(2);
    expect(renderedTValues[0]).to.equal(0.0625);
    expect(renderedTValues[1]).to.equal(renderedTValues[0]);
  });

  it('uses transition lifecycle data when choosing the playback animation stage', async () => {
    const stages = [];
    const renderedTValues = [];
    let callCount = 0;

    const runner = new AnimationRunner({
      getState: () => ({
        playing: true,
        animationStartTime: 1_000,
        animationSpeed: 1,
        transitionDuration: 2,
        pauseDuration: 0,
        treeList: [{ id: 'a' }, { id: 'b' }],
        comparisonMode: false,
      }),
      getOrCacheInterpolationData: () => {
        callCount += 1;
        return {
          dataFrom: { layoutCacheKey: 'from', nodes: [{ id: 'node-a' }] },
          dataTo: { layoutCacheKey: 'to', nodes: [{ id: 'node-a' }] },
          transitionChangeModel:
            callCount === 1
              ? {
                  linkChanges: new Map([['zeroing-1', { lifecycle: 'zeroing' }]]),
                  hasLifecycleChanges: true,
                }
              : null,
        };
      },
      renderSingleFrame: async (_fromTree, _toTree, easedT) => {
        renderedTValues.push(easedT);
      },
      renderComparisonFrame: async () => {},
      setAnimationStage: (nextStage) => {
        stages.push(nextStage);
      },
      updateProgress: () => {},
      stopAnimation: () => {},
    });

    runner.isRunning = true;
    await runner._processFrame(1_500);
    await runner._processFrame(1_500);

    expect(stages).to.deep.equal(['COLLAPSE', 'REORDER']);
    expect(renderedTValues[1]).to.be.at.least(renderedTValues[0]);
  });

  it('renders zeroing lifecycle frames with trees returned by immutable hydration', async () => {
    const sourceTree = { id: 'source-tree' };
    const targetTree = { id: 'target-tree' };
    const transitionChangeModel = {
      linkChanges: new Map([['zeroing-1', { lifecycle: 'zeroing' }]]),
      hasLifecycleChanges: true,
    };
    const state = {
      playing: true,
      animationStartTime: 1_000,
      animationSpeed: 1,
      transitionDuration: 2,
      pauseDuration: 0,
      treeList: [sourceTree, undefined],
      comparisonMode: false,
      ensureTreesHydrated: sinon.spy((indices) =>
        indices.map((index) => (index === 0 ? sourceTree : targetTree))
      ),
    };
    const renderedFrames = [];

    const runner = new AnimationRunner({
      getState: () => state,
      getOrCacheInterpolationData: (fromTree, toTree) => {
        expect(fromTree).to.equal(sourceTree);
        expect(toTree).to.equal(targetTree);
        return {
          dataFrom: { layoutCacheKey: 'from', nodes: [{ id: 'node-a' }] },
          dataTo: { layoutCacheKey: 'to', nodes: [{ id: 'node-a' }] },
          transitionChangeModel,
        };
      },
      renderSingleFrame: async (fromTree, toTree, easedT, options) => {
        renderedFrames.push({ fromTree, toTree, easedT, options });
      },
      renderComparisonFrame: async () => {},
      setAnimationStage: () => {},
      updateProgress: () => {},
      stopAnimation: () => {},
    });

    runner.isRunning = true;
    await runner._processFrame(1_500);

    expect(state.ensureTreesHydrated.calledWithMatch([0, 1])).to.equal(true);
    expect(renderedFrames).to.have.lengthOf(1);
    expect(renderedFrames[0].fromTree).to.equal(sourceTree);
    expect(renderedFrames[0].toTree).to.equal(targetTree);
    expect(renderedFrames[0].options.transitionChangeModel).to.equal(transitionChangeModel);
  });

  it('updates playback animation stage by current lifecycle clock phase without moving render progress backward', async () => {
    const stages = [];
    const renderedTValues = [];
    const transitionChangeModel = {
      linkChanges: new Map([
        ['zeroing-1', { lifecycle: 'zeroing' }],
        ['reviving-2', { lifecycle: 'reviving' }],
      ]),
      hasLifecycleChanges: true,
    };

    const runner = new AnimationRunner({
      getState: () => ({
        playing: true,
        animationStartTime: 1_000,
        animationSpeed: 1,
        transitionDuration: 1,
        pauseDuration: 0,
        treeList: [{ id: 'a' }, { id: 'b' }],
        comparisonMode: false,
      }),
      getOrCacheInterpolationData: () => ({
        dataFrom: { layoutCacheKey: 'from', nodes: [{ id: 'node-a' }] },
        dataTo: { layoutCacheKey: 'to', nodes: [{ id: 'node-a' }] },
        transitionChangeModel,
      }),
      renderSingleFrame: async (_fromTree, _toTree, easedT) => {
        renderedTValues.push(easedT);
      },
      renderComparisonFrame: async () => {},
      setAnimationStage: (nextStage) => {
        stages.push(nextStage);
      },
      updateProgress: () => {},
      stopAnimation: () => {},
    });

    runner.isRunning = true;
    await runner._processFrame(1_390);
    await runner._processFrame(1_400);
    await runner._processFrame(1_550);
    await runner._processFrame(1_560);

    expect(stages).to.deep.equal(['COLLAPSE', 'REORDER', 'EXPAND']);
    expect(renderedTValues).to.have.lengthOf(4);
    for (let index = 1; index < renderedTValues.length; index += 1) {
      expect(renderedTValues[index]).to.be.at.least(renderedTValues[index - 1]);
    }
  });

  it('does not force a redraw after animation render updates layers', async () => {
    const previousRequestAnimationFrame = global.requestAnimationFrame;
    const previousCancelAnimationFrame = global.cancelAnimationFrame;
    let renderCount = 0;
    let redrawCount = 0;

    global.requestAnimationFrame = () => 1;
    global.cancelAnimationFrame = () => {};

    try {
      const runner = new AnimationRunner({
        getState: () => ({
          playing: true,
          animationStartTime: 1_000,
          animationSpeed: 1,
          transitionDuration: 2,
          pauseDuration: 0,
          treeList: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
          comparisonMode: false,
        }),
        getOrCacheInterpolationData: () => ({
          dataFrom: { nodes: [] },
          dataTo: { nodes: [] },
        }),
        renderSingleFrame: async () => {
          renderCount += 1;
        },
        renderComparisonFrame: async () => {},
        setAnimationStage: () => {},
        updateProgress: () => {},
        stopAnimation: () => {},
        requestRedraw: () => {
          redrawCount += 1;
        },
      });

      runner.isRunning = true;
      await runner._onFrame(2_000, runner._runToken);
      runner.stop();

      expect(renderCount).to.equal(1);
      expect(redrawCount).to.equal(0);
    } finally {
      global.requestAnimationFrame = previousRequestAnimationFrame;
      global.cancelAnimationFrame = previousCancelAnimationFrame;
    }
  });

  it('does not overlap renders when playback restarts before a frame settles', async () => {
    const previousRequestAnimationFrame = global.requestAnimationFrame;
    const previousCancelAnimationFrame = global.cancelAnimationFrame;
    const frameCallbacks = [];
    let nextFrameId = 1;
    let releaseRender;
    let renderCount = 0;
    let redrawCount = 0;

    global.requestAnimationFrame = (callback) => {
      frameCallbacks.push(callback);
      return nextFrameId++;
    };
    global.cancelAnimationFrame = () => {};

    const renderPromise = new Promise((resolve) => {
      releaseRender = resolve;
    });

    try {
      const runner = new AnimationRunner({
        getState: () => ({
          playing: true,
          animationStartTime: 1_000,
          animationSpeed: 1,
          transitionDuration: 2,
          pauseDuration: 0,
          treeList: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
          comparisonMode: false,
        }),
        getOrCacheInterpolationData: () => ({
          dataFrom: { nodes: [] },
          dataTo: { nodes: [] },
        }),
        renderSingleFrame: async () => {
          renderCount += 1;
          await renderPromise;
        },
        renderComparisonFrame: async () => {},
        setAnimationStage: () => {},
        updateProgress: () => {},
        stopAnimation: () => {},
        requestRedraw: () => {
          redrawCount += 1;
        },
      });

      runner.start();
      const firstProgressFrame = frameCallbacks[0](2_000);
      await firstProgressFrame;
      expect(renderCount).to.equal(0);

      const firstRenderFrame = frameCallbacks[1](2_020);
      await Promise.resolve();
      expect(renderCount).to.equal(1);

      runner.stop();
      runner.start();
      const secondProgressFrame = frameCallbacks[2](2_025);
      await Promise.resolve();

      expect(renderCount).to.equal(1);

      releaseRender();
      await firstRenderFrame;
      await secondProgressFrame;

      expect(redrawCount).to.equal(0);
    } finally {
      global.requestAnimationFrame = previousRequestAnimationFrame;
      global.cancelAnimationFrame = previousCancelAnimationFrame;
    }
  });

  it('maps generic scrub position through weighted timeline progress', () => {
    const trees = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }];
    const manager = {
      getTimelineProgressForLinearTreeProgress: (progress, treeCount) => {
        expect(progress).to.equal(0.25);
        expect(treeCount).to.equal(trees.length);
        return 0.6;
      },
    };

    useAppStore.setState({
      treeList: trees,
      movieTimelineManager: manager,
      playhead: {
        animationProgress: 0,
        timelineProgress: null,
      },
      frameIndex: 0,
    });

    useAppStore.getState().setScrubPosition(0.25);

    const state = useAppStore.getState();
    expect(state.frameIndex).to.equal(1);
    expect(state.playhead).to.deep.equal({
      animationProgress: 0.25,
      timelineProgress: 0.6,
    });
  });

  it('updates stored timeline progress while playback advances', () => {
    useAppStore.setState({
      playing: true,
      playhead: {
        animationProgress: 0,
        timelineProgress: 0.2,
      },
    });

    useAppStore.getState().updateTimelineState({
      currentSegmentIndex: 1,
      totalSegments: 4,
      treeInSegment: 2,
      treesInSegment: 3,
      timelineProgress: 0.7,
    });

    const state = useAppStore.getState();
    expect(state.playhead.timelineProgress).to.equal(0.7);
    expect(state.currentSegmentIndex).to.equal(1);
    expect(state.treeInSegment).to.equal(2);
    expect(state.treesInSegment).to.equal(3);
  });

  it('does not publish a new playhead when timeline state is unchanged', () => {
    useAppStore.setState({
      playing: true,
      currentSegmentIndex: 1,
      totalSegments: 4,
      treeInSegment: 2,
      treesInSegment: 3,
      playhead: {
        animationProgress: 0.4,
        timelineProgress: 0.7,
      },
      frameIndex: 2,
    });

    const previousPlayhead = useAppStore.getState().playhead;
    let updateCount = 0;
    const unsubscribe = useAppStore.subscribe(() => {
      updateCount += 1;
    });

    try {
      useAppStore.getState().updateTimelineState({
        currentSegmentIndex: 1,
        totalSegments: 4,
        treeInSegment: 2,
        treesInSegment: 3,
        timelineProgress: 0.7,
      });
    } finally {
      unsubscribe();
    }

    const state = useAppStore.getState();
    expect(updateCount).to.equal(0);
    expect(state.playhead).to.equal(previousPlayhead);
  });

  it('coalesces repeated timeline store notifications into one pending frame', () => {
    const previousRequestAnimationFrame = global.requestAnimationFrame;
    const previousCancelAnimationFrame = global.cancelAnimationFrame;
    const frameCallbacks = [];
    let nextFrameId = 1;
    let scheduledCount = 0;

    global.requestAnimationFrame = (callback) => {
      scheduledCount += 1;
      frameCallbacks.push(callback);
      return nextFrameId++;
    };
    global.cancelAnimationFrame = () => {};

    try {
      const manager = new MovieTimelineManager(movieData, movieData.interpolated_trees);
      frameCallbacks.pop()?.(0);
      scheduledCount = 0;

      useAppStore.setState({
        playhead: { animationProgress: 0.1, timelineProgress: 0.1 },
      });
      useAppStore.setState({
        playhead: { animationProgress: 0.2, timelineProgress: 0.2 },
      });
      useAppStore.setState({
        playhead: { animationProgress: 0.3, timelineProgress: 0.3 },
      });

      expect(scheduledCount).to.equal(1);

      frameCallbacks.pop()?.(1_000);
      scheduledCount = 0;

      useAppStore.setState({
        playhead: { animationProgress: 0.4, timelineProgress: 0.4 },
      });

      expect(scheduledCount).to.equal(1);

      manager.destroy();
    } finally {
      global.requestAnimationFrame = previousRequestAnimationFrame;
      global.cancelAnimationFrame = previousCancelAnimationFrame;
    }
  });

  it('binds renderer scrub state to the scrub controller', async () => {
    const manager = new MovieTimelineManager(movieData, movieData.interpolated_trees);
    const host = makeContainer();

    await manager.mount(host);
    expect(manager.timeline.isScrubbing()).to.equal(false);

    await manager.scrubController.startScrubbing(0);
    expect(manager.timeline.isScrubbing()).to.equal(true);

    manager.scrubController.resetOnUnmount();
    expect(manager.timeline.isScrubbing()).to.equal(false);

    manager.destroy();
  });

  it('treats unmount after destroy as a no-op', () => {
    const manager = new MovieTimelineManager(movieData, movieData.interpolated_trees);
    const host = makeContainer();

    manager.mount(host);
    manager.destroy();

    expect(() => manager.unmount()).to.not.throw();
    expect(manager.timeline).to.equal(null);
    expect(manager.container).to.equal(null);
  });
});
